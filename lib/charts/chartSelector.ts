import { ChartType, Dataset, DataCharacteristics } from '@/types/dataset';

/**
 * Analyzes data to extract characteristics for chart selection
 */
export function analyzeData(data: any[], dataset?: Dataset): DataCharacteristics {
  if (!data || data.length === 0) {
    return {
      rowCount: 0,
      columnCount: 0,
      categoricalDimensions: 0,
      numericalDimensions: 0,
      temporalDimensions: 0,
      geographicDimensions: 0,
      dimensions: []
    };
  }

  const headers = Object.keys(data[0]);
  const dimensions: DataCharacteristics['dimensions'] = [];

  let categoricalCount = 0;
  let numericalCount = 0;
  let temporalCount = 0;
  let geographicCount = 0;

  for (const header of headers) {
    const values = data.map(row => row[header]).filter(v => v != null);
    const uniqueValues = Array.from(new Set(values));
    const type = inferColumnType(header, values, uniqueValues);

    dimensions.push({
      name: header,
      type,
      cardinality: uniqueValues.length,
      uniqueValues: uniqueValues.slice(0, 100) // Limit for performance
    });

    // Count dimension types
    switch (type) {
      case 'categorical':
        categoricalCount++;
        break;
      case 'numerical':
        numericalCount++;
        break;
      case 'temporal':
        temporalCount++;
        break;
      case 'geographic':
        geographicCount++;
        break;
    }
  }

  return {
    rowCount: data.length,
    columnCount: headers.length,
    categoricalDimensions: categoricalCount,
    numericalDimensions: numericalCount,
    temporalDimensions: temporalCount,
    geographicDimensions: geographicCount,
    dimensions
  };
}

/**
 * Infers column type from data
 */
function inferColumnType(
  name: string,
  values: any[],
  uniqueValues: any[]
): 'categorical' | 'numerical' | 'temporal' | 'geographic' {
  const nameLower = name.toLowerCase();

  // Temporal detection
  const temporalKeywords = ['year', 'година', 'month', 'месец', 'quarter', 'тримесечие', 'date', 'дата'];
  if (temporalKeywords.some(k => nameLower.includes(k))) {
    return 'temporal';
  }

  // Geographic detection
  const geoKeywords = ['region', 'област', 'district', 'район', 'municipality', 'община', 'city', 'град'];
  if (geoKeywords.some(k => nameLower.includes(k))) {
    return 'geographic';
  }

  // Numerical detection
  const numericCount = values.filter(v => typeof v === 'number' && !isNaN(v)).length;
  if (numericCount / values.length > 0.8) {
    return 'numerical';
  }

  return 'categorical';
}

/**
 * Auto-selects the most appropriate chart type based on data characteristics
 */
export function selectChartType(data: any[], dataset?: Dataset): ChartType {
  const characteristics = analyzeData(data, dataset);

  // Priority 1: Geographic data → Map
  if (characteristics.geographicDimensions >= 1 && characteristics.numericalDimensions >= 1) {
    return 'map';
  }

  // Priority 2: Time series → Line chart (or Bar if few points)
  if (characteristics.temporalDimensions >= 1 && characteristics.numericalDimensions >= 1) {
    return characteristics.rowCount > 50 ? 'line' : 'bar';
  }

  // Priority 3: Single category (≤7 values) → Pie chart
  if (
    characteristics.categoricalDimensions === 1 &&
    characteristics.numericalDimensions === 1
  ) {
    const categoricalDim = characteristics.dimensions.find(d => d.type === 'categorical');
    if (categoricalDim && categoricalDim.cardinality <= 7) {
      return 'pie';
    }
  }

  // Priority 4: Single category (>7 values) → Bar chart
  if (
    characteristics.categoricalDimensions === 1 &&
    characteristics.numericalDimensions === 1
  ) {
    return 'bar';
  }

  // Priority 5: Two categories → Grouped bar chart
  if (
    characteristics.categoricalDimensions === 2 &&
    characteristics.numericalDimensions === 1
  ) {
    return 'bar';
  }

  // Priority 6: Two numerical dimensions → Scatter plot
  if (
    characteristics.numericalDimensions === 2 &&
    characteristics.categoricalDimensions === 0
  ) {
    return 'scatter';
  }

  // Priority 7: Complex data or large datasets → Table
  if (characteristics.rowCount > 500 || characteristics.columnCount > 10) {
    return 'table';
  }

  // Default: Bar chart for most cases
  return 'bar';
}

/**
 * Suggests alternative chart types that could work for the data
 */
export function suggestAlternativeCharts(
  data: any[],
  dataset?: Dataset
): ChartType[] {
  const characteristics = analyzeData(data, dataset);
  const suggestions: ChartType[] = [];

  // Table is always an option
  suggestions.push('table');

  // If there's temporal data, suggest line chart
  if (characteristics.temporalDimensions >= 1 && characteristics.numericalDimensions >= 1) {
    suggestions.push('line', 'bar');
  }

  // If there's geographic data, suggest map
  if (characteristics.geographicDimensions >= 1 && characteristics.numericalDimensions >= 1) {
    suggestions.push('map', 'bar');
  }

  // If there's categorical data with numerical values
  if (characteristics.categoricalDimensions >= 1 && characteristics.numericalDimensions >= 1) {
    suggestions.push('bar');

    const categoricalDim = characteristics.dimensions.find(d => d.type === 'categorical');
    if (categoricalDim && categoricalDim.cardinality <= 10) {
      suggestions.push('pie');
    }
  }

  // If there are two numerical dimensions, suggest scatter
  if (characteristics.numericalDimensions >= 2) {
    suggestions.push('scatter');
  }

  // Remove duplicates and return
  return Array.from(new Set(suggestions));
}

/**
 * Validates if a chart type is appropriate for the given data
 */
export function validateChartType(
  chartType: ChartType,
  data: any[],
  dataset?: Dataset
): { valid: boolean; reason?: string } {
  const characteristics = analyzeData(data, dataset);

  switch (chartType) {
    case 'map':
      if (characteristics.geographicDimensions === 0) {
        return { valid: false, reason: 'No geographic dimensions found' };
      }
      if (characteristics.numericalDimensions === 0) {
        return { valid: false, reason: 'No numerical dimensions found' };
      }
      break;

    case 'line':
      if (characteristics.temporalDimensions === 0) {
        return { valid: false, reason: 'No temporal dimensions found for line chart' };
      }
      if (characteristics.numericalDimensions === 0) {
        return { valid: false, reason: 'No numerical dimensions found' };
      }
      break;

    case 'pie':
      if (characteristics.categoricalDimensions === 0) {
        return { valid: false, reason: 'No categorical dimensions found' };
      }
      if (characteristics.numericalDimensions === 0) {
        return { valid: false, reason: 'No numerical dimensions found' };
      }
      const catDim = characteristics.dimensions.find(d => d.type === 'categorical');
      if (catDim && catDim.cardinality > 15) {
        return { valid: false, reason: 'Too many categories for pie chart (>15)' };
      }
      break;

    case 'scatter':
      if (characteristics.numericalDimensions < 2) {
        return { valid: false, reason: 'Scatter plot requires at least 2 numerical dimensions' };
      }
      break;

    case 'bar':
    case 'table':
      // Bar and table work with most data
      break;
  }

  return { valid: true };
}
