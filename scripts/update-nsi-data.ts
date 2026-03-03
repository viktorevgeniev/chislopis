/**
 * Downloads/updates NSI open data CSV files for all registered datasets.
 *
 * Usage:
 *   npx tsx scripts/update-nsi-data.ts            # update all datasets
 *   npx tsx scripts/update-nsi-data.ts 1169 1942   # update specific datasets
 *
 * For each dataset, downloads the triplet (data, fields, codelists) from the
 * NSI Open Data portal and saves to source_data/nsi/{nsiId}/.
 *
 * Features:
 *   - Atomic per-dataset updates (temp dir → validate → swap)
 *   - Content comparison to skip unchanged datasets
 *   - Controlled concurrency (3 parallel datasets)
 *   - Graceful error handling (one failure doesn't stop others)
 */

import fs from 'fs';
import path from 'path';
import { datasetRegistry } from '../lib/data/datasetRegistry';

// ── Configuration ──────────────────────────────────────────────────────────────

const NSI_BASE = 'https://www.nsi.bg/opendata';
const SOURCE_DIR = path.join(process.cwd(), 'source_data', 'nsi');
const CONCURRENCY = 3;
const DELAY_BETWEEN_BATCHES_MS = 500;
const REQUEST_TIMEOUT_MS = 60_000;

const ENDPOINTS = [
  { path: 'getopendata.php', suffix: '-data.csv', fallbackPrefix: 'data' },
  { path: 'getfields.php', suffix: '-fields.csv', fallbackPrefix: 'fields' },
  { path: 'getcodelists.php', suffix: '-codelists.csv', fallbackPrefix: 'codelists' },
] as const;

// ── Types ──────────────────────────────────────────────────────────────────────

interface DownloadedFile {
  filename: string;
  content: string;
}

interface DatasetResult {
  nsiId: string;
  status: 'updated' | 'unchanged' | 'failed';
  error?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseFilename(headers: Headers, fallback: string): string {
  const cd = headers.get('content-disposition') || '';
  const match = cd.match(/filename=([^\s;]+)/i);
  return match ? match[1].replace(/["']/g, '').trim() : fallback;
}

async function fetchCsv(
  url: string,
  fallbackFilename: string
): Promise<DownloadedFile> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error(`Got HTML instead of CSV (likely an error page)`);
    }

    const content = await res.text();
    if (!content.trim()) {
      throw new Error('Empty response body');
    }

    const lines = content.trim().split('\n');
    if (lines.length < 1) {
      throw new Error('CSV has no header row');
    }

    const filename = parseFilename(res.headers, fallbackFilename);
    return { filename, content };
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadDataset(nsiId: string): Promise<DatasetResult> {
  const tmpDir = path.join(SOURCE_DIR, `.tmp-${nsiId}`);
  const targetDir = path.join(SOURCE_DIR, nsiId);

  try {
    // Clean up any leftover temp dir from a previous crash
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpDir, { recursive: true });

    // Download all 3 files sequentially (same server, keep it simple)
    const files: DownloadedFile[] = [];
    for (const ep of ENDPOINTS) {
      const url = `${NSI_BASE}/${ep.path}?l=en&id=${nsiId}`;
      const fallback = `${ep.fallbackPrefix}-${nsiId}${ep.suffix}`;
      const file = await fetchCsv(url, fallback);
      files.push(file);
    }

    // Check if content actually changed compared to existing files
    if (fs.existsSync(targetDir)) {
      const allUnchanged = files.every(({ filename, content }) => {
        const existing = path.join(targetDir, filename);
        if (!fs.existsSync(existing)) return false;
        try {
          return fs.readFileSync(existing, 'utf-8') === content;
        } catch {
          return false;
        }
      });

      if (allUnchanged) {
        return { nsiId, status: 'unchanged' };
      }
    }

    // Write new files to temp dir
    for (const { filename, content } of files) {
      fs.writeFileSync(path.join(tmpDir, filename), content, 'utf-8');
    }

    // Atomic swap: clear target, move new files in
    if (fs.existsSync(targetDir)) {
      for (const f of fs.readdirSync(targetDir)) {
        fs.unlinkSync(path.join(targetDir, f));
      }
    } else {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    for (const { filename } of files) {
      fs.renameSync(path.join(tmpDir, filename), path.join(targetDir, filename));
    }

    return { nsiId, status: 'updated' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { nsiId, status: 'failed', error: msg };
  } finally {
    // Always clean up temp dir
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processInBatches(nsiIds: string[]): Promise<DatasetResult[]> {
  const results: DatasetResult[] = [];

  for (let i = 0; i < nsiIds.length; i += CONCURRENCY) {
    const batch = nsiIds.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((id) => downloadDataset(id)));
    results.push(...batchResults);

    const done = Math.min(i + CONCURRENCY, nsiIds.length);
    // Log batch progress with statuses
    const statuses = batchResults.map((r) => `${r.nsiId}:${r.status}`).join(', ');
    console.log(`  [${done}/${nsiIds.length}] ${statuses}`);

    if (i + CONCURRENCY < nsiIds.length) {
      await delay(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  return results;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const filterIds = process.argv.slice(2);

  // Collect unique nsiIds from the registry
  const seen = new Set<string>();
  const nsiIds: string[] = [];

  for (const dataset of datasetRegistry) {
    const nsiId = (dataset as any).localNsiId || dataset.nsiId;
    if (!nsiId) continue;
    if (filterIds.length > 0 && !filterIds.includes(nsiId)) continue;
    if (seen.has(nsiId)) continue;
    seen.add(nsiId);
    nsiIds.push(nsiId);
  }

  if (nsiIds.length === 0) {
    console.log('No datasets to update.');
    if (filterIds.length > 0) {
      console.log(`  Filter IDs: ${filterIds.join(', ')} (none matched registry)`);
    }
    return;
  }

  console.log(`\nUpdating ${nsiIds.length} NSI datasets (concurrency: ${CONCURRENCY})...\n`);

  const results = await processInBatches(nsiIds);

  const updated = results.filter((r) => r.status === 'updated');
  const unchanged = results.filter((r) => r.status === 'unchanged');
  const failed = results.filter((r) => r.status === 'failed');

  console.log(`\n=== SUMMARY ===`);
  console.log(`  Updated:   ${updated.length}`);
  console.log(`  Unchanged: ${unchanged.length}`);
  console.log(`  Failed:    ${failed.length}`);
  console.log(`  Total:     ${results.length}\n`);

  if (updated.length > 0) {
    console.log('Updated datasets:');
    for (const r of updated) console.log(`  + ${r.nsiId}`);
    console.log();
  }

  if (failed.length > 0) {
    console.log('Failed datasets:');
    for (const r of failed) console.log(`  ! ${r.nsiId}: ${r.error}`);
    console.log();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
