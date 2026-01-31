/**
 * Fetches and converts JSON-stat format data from NSI
 */
export async function fetchJSONStat(url: string): Promise<any[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonData = await response.json();

    // Convert JSON-stat to flat array format
    return convertJSONStatToArray(jsonData);
  } catch (error) {
    console.error('Error fetching JSON-stat:', error);
    throw error;
  }
}

/**
 * Converts JSON-stat format to array of objects
 */
function convertJSONStatToArray(jsonStat: any): any[] {
  // JSON-stat v1.0 and v2.0 format support
  if (!jsonStat || !jsonStat.value) {
    throw new Error('Invalid JSON-stat format: missing value array');
  }

  const dimensions = jsonStat.dimension || jsonStat.id;
  if (!dimensions) {
    throw new Error('Invalid JSON-stat format: missing dimensions');
  }

  const dimNames = Array.isArray(jsonStat.id)
    ? jsonStat.id
    : Object.keys(dimensions);

  const dimSizes: number[] = [];
  const dimCategories: any[][] = [];

  // Extract dimension metadata
  dimNames.forEach((dimName: string) => {
    const dim = dimensions[dimName];
    const categories = dim.category?.index || dim.category?.label || [];
    const categoryKeys = Array.isArray(categories)
      ? categories
      : Object.keys(categories);

    dimSizes.push(categoryKeys.length);
    dimCategories.push(categoryKeys);
  });

  // Convert flat value array to array of objects
  const result: any[] = [];
  const values = jsonStat.value;

  for (let i = 0; i < values.length; i++) {
    const row: any = {};

    // Calculate indices for each dimension
    let remainder = i;
    for (let d = dimNames.length - 1; d >= 0; d--) {
      const dimSize = dimSizes[d];
      const dimIndex = remainder % dimSize;
      remainder = Math.floor(remainder / dimSize);

      const dimName = dimNames[d];
      const dimValue = dimCategories[d][dimIndex];

      row[dimName] = dimValue;
    }

    row.value = values[i];
    result.push(row);
  }

  return result;
}

/**
 * Validates JSON-stat data structure
 */
export function validateJSONStatData(data: any): boolean {
  return !!(
    data &&
    typeof data === 'object' &&
    Array.isArray(data.value) &&
    (data.dimension || data.id)
  );
}
