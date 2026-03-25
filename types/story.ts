import type { EChartsOption } from '@/lib/echarts';

export interface StoryStep {
  title: { bg: string; en: string };
  content: { bg: string; en: string };
  datasetId: string;
  /**
   * Full ECharts option for this step.
   * The engine will overwrite `dataset.source` at runtime with the fetched
   * and filtered rows — use `{ source: '__injected__' }` as a placeholder.
   * Series should use `encode` to reference dimension names by column name.
   */
  echartsConfig: EChartsOption;
  /**
   * Filters applied to NormalizedData rows before chart injection.
   * All keys are AND-ed; an array value means OR within that key.
   */
  focusFilter?: Record<string, string | string[]>;
  /**
   * When set, the engine groups filtered rows by this column name and builds
   * one explicit named series per unique value, using the first series in
   * `echartsConfig.series` as a template. Useful for gender/residence splits.
   *
   * The first series in echartsConfig must include `encode: { x, y }` to
   * tell the engine which columns to use for x and y values.
   */
  seriesGroupBy?: string;
}

export interface Story {
  slug: string;
  title: { bg: string; en: string };
  description: { bg: string; en: string };
  steps: StoryStep[];
  /** The headline number to display on the story snippet, e.g. "6.45M" */
  highlightValue?: string;
  /** Trend direction for the highlight badge */
  trend?: 'up' | 'down' | 'neutral';
}
