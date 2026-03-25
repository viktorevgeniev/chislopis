'use client';

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';

export interface StoryChartHandle {
  setOption(option: EChartsOption, opts?: { notMerge?: boolean }): void;
}

interface StoryChartProps {
  isLoading: boolean;
}

export const StoryChart = forwardRef<StoryChartHandle, StoryChartProps>(
  function StoryChart({ isLoading }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
      if (!containerRef.current) return;
      const instance = echarts.init(containerRef.current);
      instanceRef.current = instance;

      const ro = new ResizeObserver(() => instance.resize());
      ro.observe(containerRef.current);

      return () => {
        ro.disconnect();
        instance.dispose();
        instanceRef.current = null;
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        setOption(option, opts) {
          instanceRef.current?.setOption(option, opts ?? { notMerge: false });
        },
      }),
      [],
    );

    return (
      <div className="relative rounded-lg border bg-card shadow-sm overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height: '400px' }} />
      </div>
    );
  },
);
