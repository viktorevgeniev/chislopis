'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

interface VitalStatisticsDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

/**
 * Detects whether this is a births or deaths dataset from the data columns.
 */
function detectMetric(data: any[]): { key: string; label: { bg: string; en: string } } {
  if (data.length === 0) return { key: 'Value', label: { bg: 'Стойност', en: 'Value' } };
  const row = data[0];
  if ('LiveBirths' in row) return { key: 'LiveBirths', label: { bg: 'Живородени', en: 'Live Births' } };
  if ('Deaths' in row) return { key: 'Deaths', label: { bg: 'Умирания', en: 'Deaths' } };
  return { key: 'Value', label: { bg: 'Стойност', en: 'Value' } };
}

export function VitalStatisticsDashboard({ data, dataset, locale = 'en' }: VitalStatisticsDashboardProps) {
  const metric = useMemo(() => detectMetric(data), [data]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dataset.title[locale]}</CardTitle>
        <CardDescription>{dataset.description[locale]}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trends">
              {locale === 'bg' ? 'Тенденции' : 'Trends'}
            </TabsTrigger>
            <TabsTrigger value="districts">
              {locale === 'bg' ? 'По области' : 'By District'}
            </TabsTrigger>
            <TabsTrigger value="gender">
              {locale === 'bg' ? 'По пол' : 'By Gender'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <NationalTrends data={data} metric={metric} locale={locale} />
          </TabsContent>

          <TabsContent value="districts">
            <DistrictComparison data={data} metric={metric} locale={locale} />
          </TabsContent>

          <TabsContent value="gender">
            <GenderBreakdown data={data} metric={metric} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface MetricInfo {
  key: string;
  label: { bg: string; en: string };
}

// Tab 1: National trend line over time (total, male, female)
function NationalTrends({ data, metric, locale }: { data: any[]; metric: MetricInfo; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const trendsData = useMemo(() => {
    const filtered = data.filter(
      d => d.EKATTE_Code === 'BG'
    );

    const grouped: Record<string, { total: number; male: number; female: number }> = {};

    filtered.forEach(row => {
      const year = row.Year;
      const genderCode = row.Gender_Code;
      const value = parseFloat(row[metric.key]) || 0;

      if (!year) return;
      if (!grouped[year]) grouped[year] = { total: 0, male: 0, female: 0 };

      if (genderCode === '0') grouped[year].total = value;
      else if (genderCode === '1') grouped[year].male = value;
      else if (genderCode === '2') grouped[year].female = value;
    });

    return Object.entries(grouped)
      .map(([year, vals]) => ({ year, ...vals }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [data, metric.key]);

  useEffect(() => {
    if (!chartRef.current || trendsData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => Number(value).toLocaleString()
      },
      legend: {
        data: [
          locale === 'bg' ? 'Общо' : 'Total',
          locale === 'bg' ? 'Мъже' : 'Male',
          locale === 'bg' ? 'Жени' : 'Female'
        ]
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trendsData.map(d => d.year)
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => value >= 1000 ? (value / 1000).toFixed(0) + 'K' : String(value)
        }
      },
      series: [
        {
          name: locale === 'bg' ? 'Общо' : 'Total',
          type: 'line',
          data: trendsData.map(d => d.total),
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 3 }
        },
        {
          name: locale === 'bg' ? 'Мъже' : 'Male',
          type: 'line',
          data: trendsData.map(d => d.male),
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: locale === 'bg' ? 'Жени' : 'Female',
          type: 'line',
          data: trendsData.map(d => d.female),
          itemStyle: { color: '#ec4899' }
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [trendsData, locale]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// Tab 2: District comparison bar chart
function DistrictComparison({ data, metric, locale }: { data: any[]; metric: MetricInfo; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => {
    return [...new Set(data.map(d => d.Year))].filter(Boolean).sort();
  }, [data]);

  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  const districtData = useMemo(() => {
    const yearToUse = selectedYear || availableYears[availableYears.length - 1];

    const filtered = data.filter(
      d =>
        d.Year === yearToUse &&
        d.EKATTE_Code &&
        d.EKATTE_Code !== 'BG' &&
        d.EKATTE_Code.length === 3 && // District level
        (d.Gender_Code === '0' || d.Gender === 'Total')
    );

    return filtered
      .map(row => ({
        name: row.EKATTE || row.EKATTE_Code,
        value: parseFloat(row[metric.key]) || 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, selectedYear, availableYears, metric.key]);

  useEffect(() => {
    if (!chartRef.current || districtData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const metricColor = metric.key === 'LiveBirths' ? '#10b981' : '#ef4444';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toLocaleString()
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: districtData.map(d => d.name),
        axisLabel: { rotate: 45, interval: 0, fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => value >= 1000 ? (value / 1000).toFixed(0) + 'K' : String(value)
        }
      },
      series: [
        {
          name: metric.label[locale],
          type: 'bar',
          data: districtData.map(d => d.value),
          itemStyle: { color: metricColor }
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [districtData, locale, metric]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vital-district-year" className="text-sm font-medium">
            {locale === 'bg' ? 'Година' : 'Year'}
          </label>
          <Select
            id="vital-district-year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-[120px]"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
        </div>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '500px' }} />
    </div>
  );
}

// Tab 3: Gender breakdown - pie + trend
function GenderBreakdown({ data, metric, locale }: { data: any[]; metric: MetricInfo; locale: 'bg' | 'en' }) {
  const pieRef = useRef<HTMLDivElement>(null);
  const trendRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => {
    return [...new Set(data.map(d => d.Year))].filter(Boolean).sort();
  }, [data]);

  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  // Pie data for selected year
  const pieData = useMemo(() => {
    const yearToUse = selectedYear || availableYears[availableYears.length - 1];

    const filtered = data.filter(
      d =>
        d.Year === yearToUse &&
        d.EKATTE_Code === 'BG' &&
        (d.Gender_Code === '1' || d.Gender_Code === '2')
    );

    return filtered.map(row => ({
      name: row.Gender || (row.Gender_Code === '1' ? 'Male' : 'Female'),
      value: parseFloat(row[metric.key]) || 0
    }));
  }, [data, selectedYear, availableYears, metric.key]);

  // Gender ratio over time
  const ratioData = useMemo(() => {
    const filtered = data.filter(
      d =>
        d.EKATTE_Code === 'BG' &&
        (d.Gender_Code === '1' || d.Gender_Code === '2')
    );

    const grouped: Record<string, { male: number; female: number }> = {};
    filtered.forEach(row => {
      const year = row.Year;
      if (!year) return;
      if (!grouped[year]) grouped[year] = { male: 0, female: 0 };
      const value = parseFloat(row[metric.key]) || 0;
      if (row.Gender_Code === '1') grouped[year].male = value;
      else if (row.Gender_Code === '2') grouped[year].female = value;
    });

    return Object.entries(grouped)
      .map(([year, vals]) => ({
        year,
        ratio: vals.female > 0 ? +(vals.male / vals.female * 100).toFixed(1) : 0
      }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [data, metric.key]);

  // Pie chart
  useEffect(() => {
    if (!pieRef.current || pieData.length === 0) return;

    const chart = echarts.init(pieRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          data: pieData.map(d => ({
            ...d,
            itemStyle: {
              color: d.name === 'Male' || d.name === 'Мъже'
                ? '#3b82f6'
                : '#ec4899'
            }
          })),
          label: {
            formatter: '{b}\n{c}'
          }
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [pieData]);

  // Ratio trend chart
  useEffect(() => {
    if (!trendRef.current || ratioData.length === 0) return;

    const chart = echarts.init(trendRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const p = params[0];
          return `${p.name}<br/>Male per 100 Female: ${p.value}`;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ratioData.map(d => d.year)
      },
      yAxis: {
        type: 'value',
        name: locale === 'bg' ? 'Мъже на 100 жени' : 'Males per 100 Females',
        min: (value) => Math.floor(value.min - 2),
        max: (value) => Math.ceil(value.max + 2)
      },
      series: [
        {
          type: 'line',
          data: ratioData.map(d => d.ratio),
          itemStyle: { color: '#8b5cf6' },
          areaStyle: { color: 'rgba(139, 92, 246, 0.1)' },
          markLine: {
            data: [{ yAxis: 100, name: '1:1' }],
            lineStyle: { type: 'dashed', color: '#9ca3af' },
            label: { formatter: '1:1 ratio' }
          }
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [ratioData, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vital-gender-year" className="text-sm font-medium">
            {locale === 'bg' ? 'Година (за диаграмата)' : 'Year (for pie chart)'}
          </label>
          <Select
            id="vital-gender-year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-[120px]"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-center mb-2">
            {locale === 'bg' ? 'Разпределение по пол' : 'Gender Distribution'} ({selectedYear})
          </p>
          <div ref={pieRef} style={{ width: '100%', height: '300px' }} />
        </div>
        <div>
          <p className="text-sm font-medium text-center mb-2">
            {locale === 'bg' ? 'Съотношение мъже/жени' : 'Male/Female Ratio Over Time'}
          </p>
          <div ref={trendRef} style={{ width: '100%', height: '300px' }} />
        </div>
      </div>
    </div>
  );
}
