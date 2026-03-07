/**
 * Validates processed NSI datasets against structural and data contracts.
 *
 * Usage:
 *   npx tsx scripts/validate-nsi-data.ts            # validate all datasets
 *   npx tsx scripts/validate-nsi-data.ts 1893 818   # validate specific datasets
 *
 * Two validation tiers:
 *   1. Generic checks — applied to every dataset (row count, value column, Year format, recency)
 *   2. Contract checks — applied to datasets with custom dashboards (required columns,
 *      required filter codes, national/total row presence, temporal format)
 *
 * Exit codes:
 *   0 — all datasets pass (warnings are printed but do not block)
 *   1 — one or more datasets have critical failures (would break dashboards)
 */

import { datasetRegistry } from '../lib/data/datasetRegistry';
import { processLocalDataset } from '../lib/data/fetchers/localCsvLoader';
import { DATASET_CONTRACTS, DatasetContract } from './dataset-contracts';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Issue {
  level: 'FAIL' | 'WARN';
  message: string;
}

interface ValidationResult {
  nsiId: string;
  datasetId: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  issues: Issue[];
}

// ── Generic validation ─────────────────────────────────────────────────────────

function validateGeneric(
  rows: any[],
  valueColumnName: string,
  dimensions: { name: string; type: string }[]
): Issue[] {
  const issues: Issue[] = [];

  // 1. Row count — fail fast, no point continuing if empty
  if (rows.length === 0) {
    issues.push({ level: 'FAIL', message: 'Dataset has 0 rows after processing' });
    return issues;
  }

  const columnNames = new Set(Object.keys(rows[0]));

  // 2. Value column: present and mostly numeric
  if (!columnNames.has(valueColumnName)) {
    issues.push({ level: 'FAIL', message: `Value column '${valueColumnName}' is missing from processed rows` });
  } else {
    const numericCount = rows.filter(r => r[valueColumnName] !== null && !isNaN(Number(r[valueColumnName]))).length;
    const ratio = numericCount / rows.length;
    if (ratio < 0.1) {
      issues.push({
        level: 'FAIL',
        message: `Value column '${valueColumnName}' is >90% null/non-numeric (${(ratio * 100).toFixed(1)}% have a value)`,
      });
    } else if (ratio < 0.5) {
      issues.push({
        level: 'WARN',
        message: `Value column '${valueColumnName}' is >50% null/non-numeric (${(ratio * 100).toFixed(1)}% have a value)`,
      });
    }
  }

  // 3. Year column: must be present after temporal normalisation
  if (!columnNames.has('Year')) {
    issues.push({ level: 'WARN', message: `No 'Year' column found — expected after localCsvLoader temporal normalisation` });
  } else {
    const yearValues = rows.map(r => String(r.Year ?? '')).filter(Boolean);

    if (yearValues.length > 0) {
      const isAnnual = yearValues.every(y => /^\d{4}$/.test(y));
      const isQuarterly = yearValues.every(y => /^\d{4}Q\d$/.test(y));
      const isMonthly = yearValues.every(y => /^\d{4}-\d{2}$/.test(y));

      // 4. Temporal format consistency — mixed formats break sorting in charts
      if (!isAnnual && !isQuarterly && !isMonthly) {
        const sample = [...new Set(yearValues)].slice(0, 5).join(', ');
        issues.push({
          level: 'WARN',
          message: `Year column has inconsistent or unrecognised format. Sample values: [${sample}]`,
        });
      }

      // 5. Data recency — stale data warning
      const currentYear = new Date().getFullYear();
      if (isAnnual) {
        const numericYears = yearValues.map(Number).filter(n => !isNaN(n) && n > 1900 && n < 2200);
        if (numericYears.length > 0) {
          const maxYear = Math.max(...numericYears);
          if (maxYear < currentYear - 5) {
            issues.push({ level: 'WARN', message: `Latest year is ${maxYear} — data may be outdated (>5 years old)` });
          }
        }
      } else if (isQuarterly) {
        const numericYears = yearValues.map(y => parseInt(y.slice(0, 4))).filter(n => !isNaN(n));
        if (numericYears.length > 0) {
          const maxYear = Math.max(...numericYears);
          if (maxYear < currentYear - 3) {
            issues.push({ level: 'WARN', message: `Latest period year is ${maxYear} — data may be outdated (>3 years old)` });
          }
        }
      }
    }
  }

  // 6. Registry dimension columns — flag if a declared dimension is missing
  for (const dim of dimensions) {
    if (dim.type === 'numerical') continue; // value column already checked
    // processLocalDataset creates both Name and Name_Code; either is fine
    if (!columnNames.has(dim.name) && !columnNames.has(`${dim.name}_Code`)) {
      issues.push({
        level: 'FAIL',
        message: `Registry dimension '${dim.name}' (or '${dim.name}_Code') is missing from processed data`,
      });
    }
  }

  return issues;
}

// ── Contract validation ────────────────────────────────────────────────────────

function validateContract(rows: any[], contract: DatasetContract): Issue[] {
  const issues: Issue[] = [];

  if (rows.length === 0) return issues; // generic check already handles empty

  const columnNames = new Set(Object.keys(rows[0]));

  // Required columns
  for (const col of contract.requiredColumns) {
    if (!columnNames.has(col)) {
      issues.push({ level: 'FAIL', message: `Required column '${col}' is missing — dashboard will fail to render` });
    }
  }

  // Temporal format
  if (contract.temporalFormat && columnNames.has('Year')) {
    const badValues = rows
      .map(r => String(r.Year ?? ''))
      .filter(y => y && !contract.temporalFormat!.test(y));
    if (badValues.length > 0) {
      const sample = [...new Set(badValues)].slice(0, 4).join(', ');
      issues.push({
        level: 'FAIL',
        message: `Year column doesn't match expected format ${contract.temporalFormat} — breaks chart sorting/parsing. Bad values: [${sample}]`,
      });
    }
  }

  // National/total code — if absent, every KPI card shows "No data"
  if (contract.nationalCode) {
    const { column, value } = contract.nationalCode;
    if (columnNames.has(column)) {
      const hasNational = rows.some(r => String(r[column] ?? '') === value);
      if (!hasNational) {
        issues.push({
          level: 'FAIL',
          message: `National/total code '${value}' not found in column '${column}' — breaks all KPI cards and national-level charts`,
        });
      }
    }
  }

  // Required code values — each must be present for the corresponding dashboard filter to work
  for (const check of contract.requiredCodeValues ?? []) {
    const { column, values, description } = check;
    if (!columnNames.has(column)) continue; // already caught above as missing column

    const presentValues = new Set(rows.map(r => String(r[column] ?? '')));
    for (const val of values) {
      if (!presentValues.has(val)) {
        issues.push({
          level: 'FAIL',
          message: `Required code '${val}' missing from '${column}' (${description}) — filter returns no rows`,
        });
      }
    }
  }

  // Week column — for weekly datasets
  if (contract.weekColumn) {
    const baseCol = contract.weekColumn;
    const codeCol = baseCol.endsWith('_Code') ? baseCol : `${baseCol}_Code`;
    const actualCol = columnNames.has(codeCol) ? codeCol : columnNames.has(baseCol) ? baseCol : null;

    if (!actualCol) {
      issues.push({
        level: 'FAIL',
        message: `Week column '${baseCol}' (or '${codeCol}') not found — breaks weekly trend and seasonal charts`,
      });
    } else {
      const weekNums = rows
        .map(r => parseInt(String(r[actualCol] ?? '')))
        .filter(n => !isNaN(n));
      if (weekNums.length > 0) {
        const outOfRange = weekNums.filter(n => n < 1 || n > 53);
        if (outOfRange.length > 0) {
          issues.push({
            level: 'WARN',
            message: `${outOfRange.length} rows have week numbers outside the valid 1–53 range`,
          });
        }
      }
    }
  }

  return issues;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const filterIds = process.argv.slice(2);

  // Collect unique nsiIds (same dedup logic as update-nsi-data.ts and prebuild-data.ts)
  const seen = new Set<string>();
  const datasets: {
    nsiId: string;
    datasetId: string;
    valueColumnName: string;
    dimensions: { name: string; type: string }[];
  }[] = [];

  for (const dataset of datasetRegistry) {
    const nsiId = dataset.localNsiId || dataset.nsiId;
    if (!nsiId) continue;
    if (filterIds.length > 0 && !filterIds.includes(nsiId)) continue;
    if (seen.has(nsiId)) continue;
    seen.add(nsiId);
    datasets.push({
      nsiId,
      datasetId: dataset.id,
      valueColumnName: dataset.valueColumnName || 'Value',
      dimensions: (dataset.dimensions || []) as { name: string; type: string }[],
    });
  }

  if (datasets.length === 0) {
    console.log('\nNo datasets matched the given filter. Check the NSI IDs.\n');
    process.exit(0);
  }

  console.log(`\nValidating ${datasets.length} NSI dataset(s)...\n`);

  const results: ValidationResult[] = [];

  for (const { nsiId, datasetId, valueColumnName, dimensions } of datasets) {
    const issues: Issue[] = [];

    try {
      const { rows } = await processLocalDataset(nsiId, valueColumnName);

      issues.push(...validateGeneric(rows, valueColumnName, dimensions));

      const contract = DATASET_CONTRACTS[nsiId];
      if (contract) {
        issues.push(...validateContract(rows, contract));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      issues.push({ level: 'FAIL', message: `Failed to process dataset: ${msg}` });
    }

    const fails = issues.filter(i => i.level === 'FAIL');
    const warns = issues.filter(i => i.level === 'WARN');
    const status: ValidationResult['status'] = fails.length > 0 ? 'FAIL' : warns.length > 0 ? 'WARN' : 'PASS';

    results.push({ nsiId, datasetId, status, issues });

    const icon = status === 'PASS' ? '✓' : status === 'WARN' ? '⚠' : '✗';
    console.log(`  [${icon}] ${datasetId} (${nsiId})`);
    for (const issue of issues) {
      const prefix = issue.level === 'FAIL' ? '    FAIL:' : '    WARN:';
      console.log(`${prefix} ${issue.message}`);
    }
  }

  // Summary
  const passCount = results.filter(r => r.status === 'PASS').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const totalIssues = results.flatMap(r => r.issues);
  const totalFails = totalIssues.filter(i => i.level === 'FAIL').length;
  const totalWarns = totalIssues.filter(i => i.level === 'WARN').length;

  console.log(`\n=== VALIDATION SUMMARY ===`);
  console.log(`  PASS: ${passCount}`);
  console.log(`  WARN: ${warnCount}`);
  console.log(`  FAIL: ${failCount}`);
  console.log(`  Total: ${results.length} datasets, ${totalFails} error(s), ${totalWarns} warning(s)\n`);

  if (failCount > 0) {
    console.log('VALIDATION FAILED — critical issues detected that would break dashboards.');
    console.log('Fix the issues above before data can be merged.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error during validation:', err);
  process.exit(1);
});
