'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface BarChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  title?: string;
  horizontal?: boolean;
}

export function BarChart({ data, xKey, yKey, title, horizontal = false }: BarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);

    const xData = data.map(item => item[xKey]);
    const yData = data.map(item => item[yKey]);

    const option: echarts.EChartsOption = {
      title: title ? { text: title, left: 'center' } : undefined,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: horizontal
        ? {
            type: 'value'
          }
        : {
            type: 'category',
            data: xData,
            axisLabel: {
              rotate: xData.length > 10 ? 45 : 0,
              interval: 0
            }
          },
      yAxis: horizontal
        ? {
            type: 'category',
            data: xData
          }
        : {
            type: 'value'
          },
      series: [
        {
          name: yKey,
          type: 'bar',
          data: yData,
          itemStyle: {
            color: '#3b82f6'
          },
          emphasis: {
            itemStyle: {
              color: '#2563eb'
            }
          }
        }
      ]
    };

    chartInstance.current.setOption(option);

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chartInstance.current?.dispose();
    };
  }, [data, xKey, yKey, title, horizontal]);

  return <div ref={chartRef} className="w-full h-full min-h-[400px]" />;
}
