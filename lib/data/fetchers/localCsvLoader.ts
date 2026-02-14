import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { MultiCsvData, createCodeMappings } from './multiCsvFetcher';

/**
 * Finds a file matching a suffix pattern in a directory
 */
async function findFileByPattern(dir: string, pattern: string): Promise<string | null> {
  try {
    const files = await fs.promises.readdir(dir);
    const match = files.find(f => f.endsWith(pattern));
    return match ? path.join(dir, match) : null;
  } catch {
    return null;
  }
}

/**
 * Loads and parses the three CSV files for an NSI dataset from local disk.
 * @param nsiId - The NSI dataset ID (e.g., '1169', '1942')
 * @returns Parsed data, fields, and codeLists arrays
 */
export async function loadLocalCsv(nsiId: string): Promise<MultiCsvData> {
  const dataDir = path.join(process.cwd(), 'source_data', 'nsi', nsiId);

  try {
    await fs.promises.access(dataDir);
  } catch {
    throw new Error(`Dataset directory not found: source_data/nsi/${nsiId}/`);
  }

  const [dataFile, fieldsFile, codeListsFile] = await Promise.all([
    findFileByPattern(dataDir, '-data.csv'),
    findFileByPattern(dataDir, '-fields.csv'),
    findFileByPattern(dataDir, '-codelists.csv'),
  ]);

  if (!dataFile) {
    throw new Error(`Data CSV not found in source_data/nsi/${nsiId}/`);
  }

  const [dataText, fieldsText, codeListsText] = await Promise.all([
    fs.promises.readFile(dataFile, 'utf-8'),
    fieldsFile ? fs.promises.readFile(fieldsFile, 'utf-8') : Promise.resolve(''),
    codeListsFile ? fs.promises.readFile(codeListsFile, 'utf-8') : Promise.resolve(''),
  ]);

  const dataParsed = Papa.parse(dataText, { header: true, skipEmptyLines: true });
  const fieldsParsed = fieldsText
    ? Papa.parse(fieldsText, { header: true, skipEmptyLines: true })
    : { data: [] };
  const codeListsParsed = codeListsText
    ? Papa.parse(codeListsText, { header: true, skipEmptyLines: true })
    : { data: [] };

  return {
    data: dataParsed.data as any[],
    fields: fieldsParsed.data as any[],
    codeLists: codeListsParsed.data as any[]
  };
}

/**
 * Generic processor: applies code mappings and renames standard columns.
 * Works for any NSI dataset by auto-detecting columns from the fields CSV.
 */
export async function processLocalDataset(
  nsiId: string,
  valueColumnName: string = 'Population'
): Promise<{ headers: string[]; rows: Array<Record<string, any>> }> {
  const { data, fields, codeLists } = await loadLocalCsv(nsiId);
  const codeMappings = createCodeMappings(codeLists);

  let processedRows = data.map(row => {
    const processed: Record<string, any> = {};

    for (const [key, value] of Object.entries(row)) {
      const strValue = String(value ?? '');

      if (key === 'Units') {
        continue;
      }

      if (key === 'RevisionColumn') {
        processed['_revision'] = parseInt(strValue.replace(/\D/g, '')) || 0;
        continue;
      }

      const mapping = codeMappings.get(key);

      if (key === 'NUTS') {
        processed['NUTS'] = mapping?.get(strValue) || strValue;
        processed['NUTS_Code'] = strValue;
      } else if (key === 'EKATTE') {
        processed['EKATTE'] = mapping?.get(strValue) || strValue;
        processed['EKATTE_Code'] = strValue;
      } else if (key === 'Residence') {
        processed['Residence'] = mapping?.get(strValue) || (strValue === '0' ? 'Total' : strValue);
        processed['Residence_Code'] = strValue;
      } else if (key === 'GenderID' || key === 'Gender' || key === 'Gender_Child') {
        const genderMapping = codeMappings.get(key);
        processed['Gender'] = genderMapping?.get(strValue) || (strValue === '0' ? 'Total' : strValue);
        processed['Gender_Code'] = strValue;
      } else if (key === 'Age') {
        processed['Age'] = mapping?.get(strValue) || strValue;
        processed['Age_Code'] = strValue;
      } else if (key === 'periods' || key === 'Period' || key === 'Edu_schYear') {
        processed['Year'] = strValue;
      } else if (key === 'ValueColumn' || key === 'Value') {
        processed[valueColumnName] = parseFloat(strValue) || 0;
      } else if (mapping) {
        processed[key] = mapping.get(strValue) || strValue;
        processed[`${key}_Code`] = strValue;
      } else {
        processed[key] = value;
      }
    }

    return processed;
  });

  // Deduplicate by revision: keep only the latest revision per dimension combo
  if (processedRows.length > 0 && '_revision' in processedRows[0]) {
    const best = new Map<string, { row: Record<string, any>; rev: number }>();
    for (const row of processedRows) {
      const rev = row._revision as number;
      const keyParts: string[] = [];
      for (const k of Object.keys(row)) {
        if (k !== '_revision' && k !== valueColumnName) {
          keyParts.push(String(row[k]));
        }
      }
      const key = keyParts.join('|');

      const existing = best.get(key);
      if (!existing || rev > existing.rev) {
        best.set(key, { row, rev });
      }
    }
    processedRows = [...best.values()].map(({ row }) => {
      const { _revision, ...rest } = row;
      return rest;
    });
  }

  const headers = processedRows.length > 0 ? Object.keys(processedRows[0]) : [];

  return { headers, rows: processedRows };
}
