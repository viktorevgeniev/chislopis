'use client';

import React, { useEffect, useRef } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';

interface LineChartProps {
  data: any[];
  xKey: string;
  yKey: string | string[];
  title?: string;
  smooth?: boolean;
}

export function LineChart({ data, xKey, yKey, title, smooth = true }: LineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current);

    const xData = data.map(item => item[xKey]);
    const yKeys = Array.isArray(yKey) ? yKey : [yKey];

    const series = yKeys.map((key, index) => ({
      name: key,
      type: 'line' as const,
      data: data.map(item => item[key]),
      smooth,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        width: 2
      }
    }));

    const option: EChartsOption = {
      title: title ? { text: title, left: 'center' } : undefined,
      tooltip: {
        trigger: 'axis'
      },
      legend: yKeys.length > 1
        ? {
            data: yKeys,
            bottom: 0
          }
        : undefined,
      grid: {
        left: '3%',
        right: '4%',
        bottom: yKeys.length > 1 ? '10%' : '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: false
      },
      yAxis: {
        type: 'value'
      },
      series
    };

    chartInstance.current.setOption(option);

    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chartInstance.current?.dispose();
    };
  }, [data, xKey, yKey, title, smooth]);

  return <div ref={chartRef} className="w-full h-full min-h-[400px]" />;
}
