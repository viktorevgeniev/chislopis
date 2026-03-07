/**
 * Pre-builds all local NSI datasets from CSV into ready-to-serve JSON files.
 * Run with: npx tsx scripts/prebuild-data.ts [nsiId1 nsiId2 ...]
 *
 * This eliminates runtime CSV parsing, codelist mapping, and revision dedup.
 * Output: public/data/{nsiId}.json for each dataset with localNsiId.
 *
 * For large datasets, DATASET_AGGREGATORS reduces rows to only what each
 * dashboard actually uses, cutting pre-built JSON sizes by 80-99%.
 */

import fs from 'fs';
import path from 'path';
import { datasetRegistry } from '../lib/data/datasetRegistry';
import { processLocalDataset } from '../lib/data/fetchers/localCsvLoader';
import { normalizeData } from '../lib/data/transformers/normalizeData';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data');

// ---------------------------------------------------------------------------
// Per-dataset aggregators: reduce rows to only what each dashboard needs.
// Keys are nsiId strings.
// ---------------------------------------------------------------------------
const DATASET_AGGREGATORS: Record<string, (rows: any[]) => any[]> = {

  // WeeklyMortalityDashboard — 1,005,720 rows → ~1,200
  '1893': (rows) => {
    const result: any[] = [];

    // Slice A: national seasonal — keep full week detail (SeasonalTrendsChart + KPIs)
    result.push(...rows.filter(r =>
      r.District_Projection_Code === 'BG' &&
      r.Gender_Code === '0' &&
      r.Ages_Code === '0'
    ));

    // Slice B: national demographic — sum Deaths across weeks, one row per year×gender×age
    // (DemographicChart sums across weeks; pre-summed rows are equivalent)
    const demoMap = new Map<string, any>();
    for (const r of rows) {
      if (
        r.District_Projection_Code !== 'BG' ||
        (r.Gender_Code !== '1' && r.Gender_Code !== '2') ||
        r.Ages_Code === '0'
      ) continue;
      const key = `${r.Year}|${r.Gender_Code}|${r.Ages_Code}`;
      if (!demoMap.has(key)) {
        demoMap.set(key, { ...r, Deaths: 0 });
      }
      demoMap.get(key)!.Deaths += parseFloat(r.Deaths) || 0;
    }
    result.push(...demoMap.values());

    // Slice C: regional — sum Deaths across weeks, one row per year×district
    // (RegionalChart sums across weeks; pre-summed rows are equivalent)
    const regionMap = new Map<string, any>();
    for (const r of rows) {
      if (
        r.District_Projection_Code === 'BG' ||
        r.Gender_Code !== '0' ||
        r.Ages_Code !== '0'
      ) continue;
      const key = `${r.Year}|${r.District_Projection_Code}`;
      if (!regionMap.has(key)) {
        regionMap.set(key, { ...r, Deaths: 0 });
      }
      regionMap.get(key)!.Deaths += parseFloat(r.Deaths) || 0;
    }
    result.push(...regionMap.values());

    return result;
  },

  // MortalityDashboard — keep only rows the 4 chart tabs access
  '1678': (rows) => {
    return rows.filter(r => {
      const nuts = r.NUTS_Code || '';
      // National rows: keep all (used by KPIs, CauseTrends, AgeGender, CausesOverview)
      if (nuts === 'BG') return true;
      // NUTS level 3 district rows (5-char, e.g. BG311): keep only totals
      // (RegionalChart filters: NUTS.length===5, Gender=0, Ages_COD=0, cause=0)
      if (nuts.length === 5) {
        const causeCode = r.COD_ICD10ch_Code ?? r.COD_ICD10ch ?? '';
        return r.Ages_COD_Code === '0' && causeCode === '0' && r.Gender_Code === '0';
      }
      // Drop NUTS1 (2-char), NUTS2 (4-char), and everything else
      return false;
    });
  },

  // MortalityRatesDashboard — keep only top-level cause codes (no subcategories)
  '1125': (rows) => {
    return rows.filter(r => {
      const code = String(r.COD_Shortlist_Code ?? r.COD_Shortlist ?? '');
      return !code.includes('.');
    });
  },

  // HealthEstablishmentsDashboard — keep only top-level facility type codes
  '1206': (rows) => {
    const TOP_LEVEL = new Set(['1', '2', '3']);
    return rows.filter(r => {
      const code = String(r.HlthEst_2011_2013_Code ?? r.HlthEst_2011_2013 ?? '');
      return TOP_LEVEL.has(code);
    });
  },

  // PopulationByDistrictsDashboard — keep only national (BG) + 3-letter district codes
  '1169': (rows) => {
    return rows.filter(r => {
      const code = String(r.EKATTE_Code ?? r.EKATTE ?? '');
      return code === 'BG' || /^[A-Z]{3}$/.test(code);
    });
  },
};

async function main() {
  // Optional: filter to specific nsiIds passed as CLI args
  const filterIds = process.argv.slice(2);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const localDatasets = datasetRegistry
    .filter(d => d.localNsiId)
    .filter(d => filterIds.length === 0 || filterIds.includes(d.localNsiId!));

  console.log(
    filterIds.length > 0
      ? `Pre-building ${localDatasets.length} dataset(s): ${filterIds.join(', ')}\n`
      : `Found ${localDatasets.length} local datasets to pre-build.\n`
  );

  let success = 0;
  let failed = 0;
  const errors: { id: string; error: string }[] = [];

  for (const dataset of localDatasets) {
    const nsiId = dataset.localNsiId!;
    const outPath = path.join(OUTPUT_DIR, `${nsiId}.json`);

    try {
      const processed = await processLocalDataset(nsiId, dataset.valueColumnName || 'Value');
      const aggregator = DATASET_AGGREGATORS[nsiId];
      const rows = aggregator ? aggregator(processed.rows) : processed.rows;
      const normalized = normalizeData(rows);

      if (nsiId in DATASET_AGGREGATORS) {
        console.log(`  [AGG] ${dataset.id} (${nsiId}) — ${processed.rows.length} → ${rows.length} rows`);
      }

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
