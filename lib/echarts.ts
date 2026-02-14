/**
 * Custom ECharts build with tree-shaking.
 * Import from '@/lib/echarts' instead of 'echarts' to get a smaller bundle.
 */

import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, HeatmapChart, ScatterChart } from 'echarts/charts';
import type { BarSeriesOption, LineSeriesOption, PieSeriesOption, HeatmapSeriesOption, ScatterSeriesOption } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent,
  VisualMapComponent,
  DataZoomComponent,
} from 'echarts/components';
import type {
  GridComponentOption,
  TooltipComponentOption,
  LegendComponentOption,
  TitleComponentOption,
  MarkLineComponentOption,
  VisualMapComponentOption,
  DataZoomComponentOption,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  HeatmapChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent,
  VisualMapComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export type EChartsOption = echarts.ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | PieSeriesOption
  | HeatmapSeriesOption
  | ScatterSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | TitleComponentOption
  | MarkLineComponentOption
  | VisualMapComponentOption
  | DataZoomComponentOption
>;

export default echarts;
