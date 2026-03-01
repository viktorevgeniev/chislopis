/**
 * Custom ECharts build with tree-shaking.
 * Import from '@/lib/echarts' instead of 'echarts' to get a smaller bundle.
 */

import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, HeatmapChart, ScatterChart, TreemapChart } from 'echarts/charts';
import type { BarSeriesOption, LineSeriesOption, PieSeriesOption, HeatmapSeriesOption, ScatterSeriesOption, TreemapSeriesOption } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent,
  VisualMapComponent,
  DataZoomComponent,
  GraphicComponent,
} from 'echarts/components';
import type {
  GridComponentOption,
  TooltipComponentOption,
  LegendComponentOption,
  TitleComponentOption,
  MarkLineComponentOption,
  VisualMapComponentOption,
  DataZoomComponentOption,
  GraphicComponentOption,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  HeatmapChart,
  ScatterChart,
  TreemapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent,
  VisualMapComponent,
  DataZoomComponent,
  GraphicComponent,
  CanvasRenderer,
]);

export type EChartsOption = echarts.ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | PieSeriesOption
  | HeatmapSeriesOption
  | ScatterSeriesOption
  | TreemapSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | TitleComponentOption
  | MarkLineComponentOption
  | VisualMapComponentOption
  | DataZoomComponentOption
  | GraphicComponentOption
>;

export default echarts;
