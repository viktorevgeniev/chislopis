import { ChartType } from './dataset';

export interface ChartConfig {
  type: ChartType;
  title?: string;
  subtitle?: string;
  xAxis?: {
    label?: string;
    type?: 'category' | 'value' | 'time';
  };
  yAxis?: {
    label?: string;
    type?: 'category' | 'value';
  };
  series?: Array<{
    name: string;
    data: any[];
    type?: string;
  }>;
  legend?: {
    show?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
  };
  tooltip?: {
    show?: boolean;
    trigger?: 'item' | 'axis';
  };
}

export interface MapConfig {
  geoData: any;
  regionKey: string;
  valueKey: string;
  colorScale?: string[];
  showLabels?: boolean;
}

export interface TableConfig {
  columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
    filterable?: boolean;
  }>;
  pagination?: {
    pageSize: number;
    currentPage: number;
  };
}
