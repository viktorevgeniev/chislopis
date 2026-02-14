'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

interface BirthsDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function BirthsDashboard({ data, dataset, locale = 'en' }: BirthsDashboardProps) {
  const kpiData = useMemo(() => {
    const national = data.filter(d => d.EKATTE_Code === 'BG' && d.Gender_Code === '0')
      .sort((a, b) => parseInt(a.Year) - parseInt(b.Year));

    if (national.length === 0) return null;

    const first = national[0];
    const latest = national[national.length - 1];
    const peak = national.reduce((max, curr) =>
      (parseFloat(curr.LiveBirths) || 0) > (parseFloat(max.LiveBirths) || 0) ? curr : max
    , national[0]);

    const percentChange = parseFloat(first.LiveBirths) > 0
      ? ((parseFloat(latest.LiveBirths) - parseFloat(first.LiveBirths)) / parseFloat(first.LiveBirths) * 100)
      : 0;

    // Average male/female ratio
    const genderRows = data.filter(d => d.EKATTE_Code === 'BG' && (d.Gender_Code === '1' || d.Gender_Code === '2'));
    const byYear: Record<string, { male: number; female: number }> = {};
    genderRows.forEach(row => {
      if (!row.Year) return;
      if (!byYear[row.Year]) byYear[row.Year] = { male: 0, female: 0 };
      if (row.Gender_Code === '1') byYear[row.Year].male = parseFloat(row.LiveBirths) || 0;
      else byYear[row.Year].female = parseFloat(row.LiveBirths) || 0;
    });
    const ratios = Object.values(byYear).filter(v => v.female > 0).map(v => v.male / v.female);
    const avgRatio = ratios.length > 0 ? ratios.reduce((s, r) => s + r, 0) / ratios.length : 0;

    return {
      latestTotal: parseFloat(latest.LiveBirths) || 0,
      latestYear: latest.Year,
      percentChange,
      firstYear: first.Year,
      peakYear: peak.Year,
      peakValue: parseFloat(peak.LiveBirths) || 0,
      avgRatio
    };
  }, [data]);

  if (!data || data.length === 0 || !kpiData) {
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
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? `Раждания (${kpiData.latestYear})` : `Total Births (${kpiData.latestYear})`}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.latestTotal.toLocaleString()}</p>
              <p className={`text-sm mt-2 ${kpiData.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpiData.percentChange >= 0 ? '\u2191' : '\u2193'} {Math.abs(kpiData.percentChange).toFixed(1)}%
                <span className="text-muted-foreground ml-1">
                  {locale === 'bg' ? `от ${kpiData.firstYear}` : `since ${kpiData.firstYear}`}
                </span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Пикова година' : 'Peak Year'}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.peakYear}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {kpiData.peakValue.toLocaleString()} {locale === 'bg' ? 'раждания' : 'births'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Съотношение М/Ж' : 'Male/Female Ratio'}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.avgRatio.toFixed(3)}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {locale === 'bg' ? 'средно за периода' : 'average over period'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">
              {locale === 'bg' ? 'Тенденции' : 'Trends'}
            </TabsTrigger>
            <TabsTrigger value="gender">
              {locale === 'bg' ? 'По пол' : 'Gender'}
            </TabsTrigger>
            <TabsTrigger value="regional">
              {locale === 'bg' ? 'По области' : 'Regional'}
            </TabsTrigger>
            <TabsTrigger value="growth">
              {locale === 'bg' ? 'Растеж' : 'Growth'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <NationalTrendsChart data={data} locale={locale} />
          </TabsContent>
          <TabsContent value="gender">
            <GenderSplitChart data={data} locale={locale} />
          </TabsContent>
          <TabsContent value="regional">
            <RegionalChart data={data} locale={locale} />
          </TabsContent>
          <TabsContent value="growth">
            <GrowthChart data={data} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: National birth trends - area chart
function NationalTrendsChart({ data, locale }: { data: any[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const trendsData = useMemo(() => {
    return data
      .filter(d => d.EKATTE_Code === 'BG' && d.Gender_Code === '0')
      .map(d => ({ year: d.Year, value: parseFloat(d.LiveBirths) || 0 }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || trendsData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => Number(value).toLocaleString()
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
      series: [{
        name: locale === 'bg' ? 'Живородени' : 'Live Births',
        type: 'line',
        smooth: true,
        data: trendsData.map(d => d.value),
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(99, 102, 241, 0.3)' },
            { offset: 1, color: 'rgba(99, 102, 241, 0.05)' }
          ])
        },
        itemStyle: { color: '#6366f1' },
        lineStyle: { width: 3 }
      }]
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

// Tab 2: Gender split - stacked bar chart
function GenderSplitChart({ data, locale }: { data: any[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const genderData = useMemo(() => {
    const filtered = data.filter(d =>
      d.EKATTE_Code === 'BG' && (d.Gender_Code === '1' || d.Gender_Code === '2')
    );

    const grouped: Record<string, { male: number; female: number }> = {};
    filtered.forEach(row => {
      if (!row.Year) return;
      if (!grouped[row.Year]) grouped[row.Year] = { male: 0, female: 0 };
      if (row.Gender_Code === '1') grouped[row.Year].male = parseFloat(row.LiveBirths) || 0;
      else grouped[row.Year].female = parseFloat(row.LiveBirths) || 0;
    });

    return Object.entries(grouped)
      .map(([year, vals]) => ({ year, ...vals }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || genderData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toLocaleString()
      },
      legend: {
        data: [
          locale === 'bg' ? 'Момчета' : 'Male',
          locale === 'bg' ? 'Момичета' : 'Female'
        ]
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: genderData.map(d => d.year)
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => value >= 1000 ? (value / 1000).toFixed(0) + 'K' : String(value)
        }
      },
      series: [
        {
          name: locale === 'bg' ? 'Момчета' : 'Male',
          type: 'bar',
          stack: 'total',
          data: genderData.map(d => d.male),
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: locale === 'bg' ? 'Момичета' : 'Female',
          type: 'bar',
          stack: 'total',
          data: genderData.map(d => d.female),
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
  }, [genderData, locale]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// Tab 3: Regional top 10 - horizontal bar chart
function RegionalChart({ data, locale }: { data: any[]; locale: 'bg' | 'en' }) {
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

  const regionalData = useMemo(() => {
    const yearToUse = selectedYear || availableYears[availableYears.length - 1];

    const filtered = data.filter(d =>
      d.Year === yearToUse &&
      d.EKATTE_Code &&
      d.EKATTE_Code !== 'BG' &&
      d.EKATTE_Code.length === 3 &&
      d.Gender_Code === '0'
    );

    return filtered
      .map(row => ({
        name: row.EKATTE || row.EKATTE_Code,
        value: parseFloat(row.LiveBirths) || 0
      }))
      .sort((a, b) => a.value - b.value) // ascending for horizontal bar (bottom to top)
      .slice(-10); // top 10
  }, [data, selectedYear, availableYears]);

  useEffect(() => {
    if (!chartRef.current || regionalData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toLocaleString()
      },
      grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => value >= 1000 ? (value / 1000).toFixed(0) + 'K' : String(value)
        }
      },
      yAxis: {
        type: 'category',
        data: regionalData.map(d => d.name),
        axisLabel: { fontSize: 11 }
      },
      series: [{
        name: locale === 'bg' ? 'Живородени' : 'Live Births',
        type: 'bar',
        data: regionalData.map(d => d.value),
        itemStyle: {
          color: '#10b981',
          borderRadius: [0, 4, 4, 0]
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => Number(params.value).toLocaleString()
        }
      }]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [regionalData, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="births-regional-year" className="text-sm font-medium">
            {locale === 'bg' ? 'Година' : 'Year'}
          </label>
          <Select
            id="births-regional-year"
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

// Tab 4: Year-over-year growth - combo bar + line
function GrowthChart({ data, locale }: { data: any[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const growthData = useMemo(() => {
    const national = data
      .filter(d => d.EKATTE_Code === 'BG' && d.Gender_Code === '0')
      .sort((a, b) => parseInt(a.Year) - parseInt(b.Year));

    return national.slice(1).map((row, idx) => {
      const current = parseFloat(row.LiveBirths) || 0;
      const previous = parseFloat(national[idx].LiveBirths) || 0;
      const absolute = current - previous;
      const percent = previous > 0 ? (absolute / previous) * 100 : 0;
      return { year: row.Year, absolute, percent: +percent.toFixed(1) };
    });
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || growthData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: [
          locale === 'bg' ? 'Абсолютна промяна' : 'Absolute Change',
          locale === 'bg' ? 'Промяна (%)' : 'Change (%)'
        ]
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: growthData.map(d => d.year),
        axisLabel: { rotate: 45 }
      },
      yAxis: [
        {
          type: 'value',
          name: locale === 'bg' ? 'Абсолютна' : 'Absolute',
          position: 'left',
          axisLabel: {
            formatter: (value: number) => {
              const sign = value >= 0 ? '+' : '';
              return sign + (Math.abs(value) >= 1000 ? (value / 1000).toFixed(1) + 'K' : String(value));
            }
          }
        },
        {
          type: 'value',
          name: '%',
          position: 'right',
          axisLabel: {
            formatter: (value: number) => (value >= 0 ? '+' : '') + value.toFixed(1) + '%'
          }
        }
      ],
      series: [
        {
          name: locale === 'bg' ? 'Абсолютна промяна' : 'Absolute Change',
          type: 'bar',
          data: growthData.map(d => ({
            value: d.absolute,
            itemStyle: { color: d.absolute >= 0 ? '#10b981' : '#ef4444' }
          }))
        },
        {
          name: locale === 'bg' ? 'Промяна (%)' : 'Change (%)',
          type: 'line',
          yAxisIndex: 1,
          data: growthData.map(d => d.percent),
          itemStyle: { color: '#8b5cf6' },
          lineStyle: { width: 3 },
          markLine: {
            data: [{ yAxis: 0 }],
            lineStyle: { type: 'dashed', color: '#9ca3af' },
            label: { formatter: locale === 'bg' ? 'Нулев растеж' : 'Zero growth' }
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
  }, [growthData, locale]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}
