import Papa from 'papaparse';

export interface MultiCsvData {
  data: any[];
  fields: any[];
  codeLists: any[];
}

export interface ProcessedPopulationData {
  headers: string[];
  rows: Array<Record<string, any>>;
}

/**
 * Fetches and parses multiple CSV files from NSI Open Data API
 * @param dataUrl - URL for the main data CSV
 * @param fieldsUrl - URL for the fields information CSV
 * @param codeListsUrl - URL for the code lists CSV
 */
export async function fetchMultiCsv(
  dataUrl: string,
  fieldsUrl?: string,
  codeListsUrl?: string
): Promise<MultiCsvData> {
  const [dataResponse, fieldsResponse, codeListsResponse] = await Promise.all([
    fetch(dataUrl),
    fieldsUrl ? fetch(fieldsUrl) : Promise.resolve(null),
    codeListsUrl ? fetch(codeListsUrl) : Promise.resolve(null)
  ]);

  if (!dataResponse.ok) {
    throw new Error(`Failed to fetch data: ${dataResponse.statusText}`);
  }

  const dataText = await dataResponse.text();
  const fieldsText = fieldsResponse ? await fieldsResponse.text() : '';
  const codeListsText = codeListsResponse ? await codeListsResponse.text() : '';

  const dataParsed = Papa.parse(dataText, { header: true, skipEmptyLines: true });
  const fieldsParsed = fieldsText ? Papa.parse(fieldsText, { header: true, skipEmptyLines: true }) : { data: [] };
  const codeListsParsed = codeListsText ? Papa.parse(codeListsText, { header: true, skipEmptyLines: true }) : { data: [] };

  return {
    data: dataParsed.data,
    fields: fieldsParsed.data,
    codeLists: codeListsParsed.data
  };
}

/**
 * Creates mapping dictionaries from code lists
 * @param codeLists - Array of code list entries
 */
export function createCodeMappings(codeLists: any[]): Map<string, Map<string, string>> {
  const mappings = new Map<string, Map<string, string>>();

  for (const entry of codeLists) {
    const codeList = entry['Code list'];
    const code = String(entry['Code'] ?? ''); // Ensure string type
    // Try different possible column names for the English name
    const name = entry['Name of Code list or Code in English']
      || entry['Name_en']
      || entry['Name']
      || code;

    if (!codeList) continue;

    if (!mappings.has(codeList)) {
      mappings.set(codeList, new Map());
    }
    mappings.get(codeList)!.set(code, name);
  }

  return mappings;
}

/**
 * Applies code mappings to the data and renames columns
 * @param data - Raw data array
 * @param codeMappings - Mapping dictionaries
 */
export function processPopulationData(
  data: any[],
  codeMappings: Map<string, Map<string, string>>
): ProcessedPopulationData {
  const processedRows = data.map(row => {
    const processed: Record<string, any> = {};

    // Convert codes to strings and apply mappings
    for (const [key, value] of Object.entries(row)) {
      const strValue = String(value ?? '');

      // Apply code mappings based on column name
      if (key === 'NUTS') {
        const nutsMap = codeMappings.get('NUTS');
        processed['NUTS'] = nutsMap?.get(strValue) || strValue;
        processed['NUTS_Code'] = strValue; // Keep original code for filtering
      } else if (key === 'Residence') {
        const resMap = codeMappings.get('Residence');
        // Map: 0 = Total, 1 = Urban, 2 = Rural
        const mapped = resMap?.get(strValue);
        if (strValue === '0') {
          processed['Residence'] = 'Total';
        } else {
          processed['Residence'] = mapped || strValue;
        }
        processed['Residence_Code'] = strValue;
      } else if (key === 'GenderID' || key === 'Gender') {
        const genderMap = codeMappings.get('GenderID');
        // Map: 0 = Total, 1 = Male, 2 = Female
        const mapped = genderMap?.get(strValue);
        if (strValue === '0') {
          processed['Gender'] = 'Total';
        } else {
          processed['Gender'] = mapped || strValue;
        }
        processed['Gender_Code'] = strValue;
      } else if (key === 'Age') {
        const ageMap = codeMappings.get('Age');
        processed['Age'] = ageMap?.get(strValue) || strValue;
        processed['Age_Code'] = strValue;
      } else if (key === 'periods' || key === 'Period') {
        processed['Year'] = strValue;
      } else if (key === 'ValueColumn' || key === 'Value') {
        // Convert to number
        processed['Population'] = parseFloat(strValue) || 0;
      } else {
        processed[key] = value;
      }
    }

    return processed;
  });

  // Get headers from first row
  const headers = processedRows.length > 0 ? Object.keys(processedRows[0]) : [];

  return {
    headers,
    rows: processedRows
  };
}

/**
 * Main function to fetch and process NSI multi-CSV dataset
 */
export async function fetchAndProcessMultiCsv(
  dataUrl: string,
  fieldsUrl?: string,
  codeListsUrl?: string
): Promise<ProcessedPopulationData> {
  const { data, codeLists } = await fetchMultiCsv(dataUrl, fieldsUrl, codeListsUrl);

  const codeMappings = createCodeMappings(codeLists);
  const processedData = processPopulationData(data, codeMappings);

  return processedData;
}
