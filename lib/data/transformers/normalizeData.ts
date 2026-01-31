import { NormalizedData, DataDimension } from '@/types/dataset';

/**
 * Normalizes data from different formats into a common structure
 */
export function normalizeData(data: any[]): NormalizedData {
  if (!data || data.length === 0) {
    return {
      headers: [],
      rows: [],
      metadata: {
        rowCount: 0,
        columnCount: 0,
        dimensions: []
      }
    };
  }

  const headers = Object.keys(data[0]);
  const dimensions = analyzeDimensions(data, headers);

  return {
    headers,
    rows: data,
    metadata: {
      rowCount: data.length,
      columnCount: headers.length,
      dimensions
    }
  };
}

/**
 * Analyzes data to determine dimension types and characteristics
 */
function analyzeDimensions(data: any[], headers: string[]): DataDimension[] {
  const dimensions: DataDimension[] = [];

  for (const header of headers) {
    const values = data.map(row => row[header]).filter(v => v != null);
    const uniqueValues = Array.from(new Set(values));
    const cardinality = uniqueValues.length;

    // Determine dimension type
    const type = inferDimensionType(header, uniqueValues, values);

    dimensions.push({
      name: header,
      type,
      cardinality,
      isKey: isKeyDimension(header, type, cardinality, data.length)
    });
  }

  return dimensions;
}

/**
 * Infers the type of a dimension based on its values
 */
function inferDimensionType(
  name: string,
  uniqueValues: any[],
  allValues: any[]
): DataDimension['type'] {
  // Check for temporal patterns
  if (isTemporalDimension(name, uniqueValues)) {
    return 'temporal';
  }

  // Check for geographic patterns
  if (isGeographicDimension(name, uniqueValues)) {
    return 'geographic';
  }

  // Check if mostly numerical
  const numericCount = allValues.filter(v => typeof v === 'number' && !isNaN(v)).length;
  const numericRatio = numericCount / allValues.length;

  if (numericRatio > 0.8) {
    return 'numerical';
  }

  // Default to categorical
  return 'categorical';
}

/**
 * Checks if dimension represents temporal data
 */
function isTemporalDimension(name: string, values: any[]): boolean {
  const nameLower = name.toLowerCase();

  // Check name patterns
  const temporalKeywords = ['year', 'година', 'month', 'месец', 'quarter', 'тримесечие', 'date', 'дата', 'time', 'време', 'period', 'период'];
  if (temporalKeywords.some(keyword => nameLower.includes(keyword))) {
    return true;
  }

  // Check if values look like years (4-digit numbers between 1900-2100)
  if (values.length > 0) {
    const sample = values.slice(0, 10);
    const yearPattern = sample.filter(v => {
      const num = typeof v === 'number' ? v : parseInt(String(v), 10);
      return num >= 1900 && num <= 2100;
    });

    if (yearPattern.length / sample.length > 0.5) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if dimension represents geographic data
 */
function isGeographicDimension(name: string, values: any[]): boolean {
  const nameLower = name.toLowerCase();

  // Check name patterns
  const geoKeywords = [
    'region', 'област', 'district', 'район',
    'municipality', 'община', 'city', 'град',
    'country', 'държава', 'location', 'локация'
  ];

  if (geoKeywords.some(keyword => nameLower.includes(keyword))) {
    return true;
  }

  // Check if values contain known Bulgarian regions
  const bulgarianRegions = [
    'софия', 'пловдив', 'варна', 'бургас', 'русе', 'стара загора',
    'плевен', 'сливен', 'добрич', 'шумен', 'перник', 'хасково',
    'montana', 'montana', 'ямбол', 'видин', 'враца', 'благоевград',
    'кърджали', 'кюстендил', 'ловеч', 'разград', 'силистра', 'смолян',
    'софия-град', 'софия-област', 'търговище', 'габрово', 'пазарджик',
    'sofia', 'plovdiv', 'varna', 'burgas', 'ruse'
  ];

  const valueLower = values.map(v => String(v).toLowerCase());
  const matchCount = valueLower.filter(v =>
    bulgarianRegions.some(region => v.includes(region))
  ).length;

  return matchCount / values.length > 0.2;
}

/**
 * Determines if dimension is likely a key/identifier
 */
function isKeyDimension(
  name: string,
  type: DataDimension['type'],
  cardinality: number,
  totalRows: number
): boolean {
  // High cardinality relative to total rows suggests it's a key
  if (cardinality / totalRows > 0.9) {
    return true;
  }

  // Temporal and geographic dimensions are often keys
  if (type === 'temporal' || type === 'geographic') {
    return true;
  }

  // Low cardinality categorical is likely not a key
  if (type === 'categorical' && cardinality < 10) {
    return false;
  }

  return false;
}

/**
 * Filters data based on criteria
 */
export function filterData(
  data: NormalizedData,
  filters: Record<string, any>
): NormalizedData {
  const filteredRows = data.rows.filter(row => {
    return Object.entries(filters).every(([key, value]) => {
      if (Array.isArray(value)) {
        return value.includes(row[key]);
      }
      return row[key] === value;
    });
  });

  return {
    ...data,
    rows: filteredRows,
    metadata: {
      ...data.metadata,
      rowCount: filteredRows.length
    }
  };
}

/**
 * Sorts data by specified column
 */
export function sortData(
  data: NormalizedData,
  sortBy: string,
  direction: 'asc' | 'desc' = 'asc'
): NormalizedData {
  const sortedRows = [...data.rows].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (aVal === bVal) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    const comparison = aVal < bVal ? -1 : 1;
    return direction === 'asc' ? comparison : -comparison;
  });

  return {
    ...data,
    rows: sortedRows
  };
}
