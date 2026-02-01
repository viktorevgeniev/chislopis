export type CategoryId =
  | 'demographics'
  | 'economy'
  | 'labor'
  | 'social'
  | 'regional'
  | 'sectoral'
  | 'finance';

export type ChartType = 'line' | 'bar' | 'pie' | 'map' | 'table' | 'scatter';

export type DataFormat = 'csv' | 'json-stat';

export type UpdateFrequency = 'monthly' | 'quarterly' | 'yearly' | 'daily';

export interface DataDimension {
  name: string;
  type: 'categorical' | 'numerical' | 'temporal' | 'geographic';
  cardinality: number;
  isKey: boolean;
}

export interface Dataset {
  id: string;
  nsiId: string;
  title: {
    bg: string;
    en: string;
  };
  description: {
    bg: string;
    en: string;
  };
  category: CategoryId;
  subcategory: string;
  format: DataFormat;
  urls: {
    bg: string;
    en: string;
  };
  // Optional URLs for multi-CSV datasets (NSI Open Data format)
  fieldsUrl?: {
    bg: string;
    en: string;
  };
  codeListsUrl?: {
    bg: string;
    en: string;
  };
  updateFrequency: UpdateFrequency;
  lastUpdated: string;
  dimensions: DataDimension[];
  suggestedChartTypes: ChartType[];
  hasGeographic: boolean;
  hasTimeSeries: boolean;
  // Optional flag for custom visualization components
  customVisualization?: string;
}

export interface NormalizedData {
  headers: string[];
  rows: Array<Record<string, any>>;
  metadata: {
    rowCount: number;
    columnCount: number;
    dimensions: DataDimension[];
  };
}

export interface DataCharacteristics {
  rowCount: number;
  columnCount: number;
  categoricalDimensions: number;
  numericalDimensions: number;
  temporalDimensions: number;
  geographicDimensions: number;
  dimensions: Array<{
    name: string;
    type: DataDimension['type'];
    cardinality: number;
    uniqueValues: any[];
  }>;
}
