/**
 * Pre-builds all local NSI datasets from CSV into ready-to-serve JSON files.
 * Run with: npx tsx scripts/prebuild-data.ts
 *
 * This eliminates runtime CSV parsing, codelist mapping, and revision dedup.
 * Output: public/data/{nsiId}.json for each dataset with localNsiId.
 */

import fs from 'fs';
import path from 'path';
import { datasetRegistry } from '../lib/data/datasetRegistry';
import { processLocalDataset } from '../lib/data/fetchers/localCsvLoader';
import { normalizeData } from '../lib/data/transformers/normalizeData';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data');

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const localDatasets = datasetRegistry.filter(d => d.localNsiId);
  console.log(`Found ${localDatasets.length} local datasets to pre-build.\n`);

  let success = 0;
  let failed = 0;
  const errors: { id: string; error: string }[] = [];

  for (const dataset of localDatasets) {
    const nsiId = dataset.localNsiId!;
    const outPath = path.join(OUTPUT_DIR, `${nsiId}.json`);

    try {
      const processed = await processLocalDataset(nsiId, dataset.valueColumnName || 'Value');
      const normalized = normalizeData(processed.rows);

      fs.writeFileSync(outPath, JSON.stringify(normalized));
      success++;
      console.log(`  [OK] ${dataset.id} (${nsiId}) — ${normalized.metadata.rowCount} rows`);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ id: `${dataset.id} (${nsiId})`, error: msg });
      console.log(`  [FAIL] ${dataset.id} (${nsiId}) — ${msg}`);
    }
  }

  console.log(`\nDone: ${success} succeeded, ${failed} failed out of ${localDatasets.length}.`);

  if (errors.length > 0) {
    console.log('\nFailed datasets:');
    for (const e of errors) {
      console.log(`  - ${e.id}: ${e.error}`);
    }
  }
}

main().catch(err => {
  console.error('Prebuild failed:', err);
  process.exit(1);
});
