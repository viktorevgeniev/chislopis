'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

interface MarriagesDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function MarriagesDashboard({ data, dataset, locale = 'en' }: MarriagesDashboardProps) {
  const availableYears = useMemo(() => {
    return [...new Set(data.map(d => d.Year))].filter(Boolean).sort();
  }, [data]);

  const kpiData = useMemo(() => {
    const national = data.filter(d => d.EKATTE_Code === 'BG');

    const totalByYear: Record<string, { total: number; urban: number; rural: number }> = {};
    national.forEach(row => {
      const year = row.Year;
      if (!year) return;
      if (!totalByYear[year]) totalByYear[year] = { total: 0, urban: 0, rural: 0 };
      const value = parseFloat(row.Marriages) || 0;
      if (row.Residence_Code === '0') totalByYear[year].total = value;
      else if (row.Residence_Code === '1') totalByYear[year].urban = value;
      else if (row.Residence_Code === '2') totalByYear[year].rural = value;
    });

    const years = Object.keys(totalByYear).sort();
    if (years.length === 0) return null;

    const latestYear = years[years.length - 1];
    const prevYear = years.length >= 2 ? years[years.length - 2] : null;
    const latest = totalByYear[latestYear];
    const prev = prevYear ? totalByYear[prevYear] : null;

    const yoyChange = prev && prev.total > 0
      ? ((latest.total - prev.total) / prev.total * 100)
      : 0;

    const urbanPct = latest.total > 0
      ? (latest.urban / latest.total * 100)
      : 0;

    return {
      latestYear,
      latestTotal: latest.total,
      yoyChange,
      urbanPct,
      prevYear
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
                {locale === 'bg' ? `Бракове (${kpiData.latestYear})` : `Marriages (${kpiData.latestYear})`}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.latestTotal.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Годишна промяна' : 'Year-over-Year'}
              </p>
              <p className={`text-3xl font-bold mt-1 ${kpiData.yoyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpiData.yoyChange >= 0 ? '+' : ''}{kpiData.yoyChange.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {locale === 'bg' ? `спрямо ${kpiData.prevYear}` : `vs ${kpiData.prevYear}`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Градски бракове' : 'Urban Share'}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.urbanPct.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-2">
                {locale === 'bg' ? `от общия брой (${kpiData.latestYear})` : `of total (${kpiData.latestYear})`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trends">
              {locale === 'bg' ? 'Тенденции' : 'Trends'}
            </TabsTrigger>
            <TabsTrigger value="regional">
              {locale === 'bg' ? 'По области' : 'Regional'}
            </TabsTrigger>
            <TabsTrigger value="composition">
              {locale === 'bg' ? 'Състав' : 'Composition'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <UrbanRuralTrendsChart data={data} locale={locale} />
          </TabsContent>
          <TabsContent value="regional">
            <RegionalChart data={data} availableYears={availableYears} locale={locale} />
          </TabsContent>
          <TabsContent value="composition">
            <CompositionChart data={data} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: Urban vs Rural trend lines (national level)
function UrbanRuralTrendsChart({ data, locale }: { data: any[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const trendsData = useMemo(() => {
    const national = data.filter(d => d.EKATTE_Code === 'BG');
    const grouped: Record<string, { urban: number; rural: number; total: number }> = {};

    national.forEach(row => {
      const year = row.Year;
      if (!year) return;
      if (!grouped[year]) grouped[year] = { urban: 0, rural: 0, total: 0 };
      const value = parseFloat(row.Marriages) || 0;
      if (row.Residence_Code === '0') grouped[year].total = value;
      else if (row.Residence_Code === '1') grouped[year].urban = value;
      else if (row.Residence_Code === '2') grouped[year].rural = value;
    });

    return Object.entries(grouped)
      .map(([year, vals]) => ({ year, ...vals }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || trendsData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const year = params[0]?.axisValue;
          let html = `<strong>${year}</strong>`;
          for (const p of params) {
            html += `<br/>${p.marker} ${p.seriesName}: ${Number(p.value).toLocaleString()}`;
          }
          // Add ratio if both urban and rural are present
          const urban = params.find((p: any) => p.seriesName.includes('Urban') || p.seriesName.includes('Градски'));
          const rural = params.find((p: any) => p.seriesName.includes('Rural') || p.seriesName.includes('Селски'));
          if (urban && rural && rural.value > 0) {
            html += `<br/><em>${locale === 'bg' ? 'Съотношение' : 'Ratio'}: ${(urban.value / rural.value).toFixed(1)}:1</em>`;
          }
          return html;
        }
      },
      legend: {
        data: [
          locale === 'bg' ? 'Общо' : 'Total',
          locale === 'bg' ? 'Градски' : 'Urban',
          locale === 'bg' ? 'Селски' : 'Rural'
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
          name: locale === 'bg' ? 'Градски' : 'Urban',
          type: 'line',
          data: trendsData.map(d => d.urban),
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 2 }
        },
        {
          name: locale === 'bg' ? 'Селски' : 'Rural',
          type: 'line',
          data: trendsData.map(d => d.rural),
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 2, type: 'dashed' }
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

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}

// Tab 2: Regional comparison - horizontal bar (districts only)
function RegionalChart({ data, availableYears, locale }: { data: any[]; availableYears: string[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  const regionalData = useMemo(() => {
    const yearToUse = selectedYear || availableYears[availableYears.length - 1];

    // District-level: 3-letter EKATTE codes (not starting with BG, and not BG itself)
    const filtered = data.filter(d =>
      d.Year === yearToUse &&
      d.EKATTE_Code &&
      d.EKATTE_Code.length === 3 &&
      d.EKATTE_Code !== 'BG' &&
      d.Residence_Code === '0'
    );

    return filtered
      .map(row => ({
        name: row.EKATTE || row.EKATTE_Code,
        value: parseFloat(row.Marriages) || 0
      }))
      .sort((a, b) => a.value - b.value); // ascending for horizontal bar
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
        axisLabel: { fontSize: 10 }
      },
      series: [{
        name: locale === 'bg' ? 'Бракове' : 'Marriages',
        type: 'bar',
        data: regionalData.map(d => d.value),
        itemStyle: {
          color: '#8b5cf6',
          borderRadius: [0, 4, 4, 0]
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => Number(params.value).toLocaleString(),
          fontSize: 10
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
          <label htmlFor="marriages-regional-year" className="text-sm font-medium">
            {locale === 'bg' ? 'Година' : 'Year'}
          </label>
          <Select
            id="marriages-regional-year"
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
      <div ref={chartRef} style={{ width: '100%', height: '700px' }} />
    </div>
  );
}

// Tab 3: Composition - stacked area (Urban/Rural share over time)
function CompositionChart({ data, locale }: { data: any[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const compData = useMemo(() => {
    const national = data.filter(d => d.EKATTE_Code === 'BG');
    const grouped: Record<string, { urban: number; rural: number }> = {};

    national.forEach(row => {
      const year = row.Year;
      if (!year) return;
      if (!grouped[year]) grouped[year] = { urban: 0, rural: 0 };
      const value = parseFloat(row.Marriages) || 0;
      if (row.Residence_Code === '1') grouped[year].urban = value;
      else if (row.Residence_Code === '2') grouped[year].rural = value;
    });

    return Object.entries(grouped)
      .map(([year, vals]) => ({ year, ...vals }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || compData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const year = params[0]?.axisValue;
          let total = 0;
          for (const p of params) total += p.value;
          let html = `<strong>${year}</strong>`;
          for (const p of params) {
            const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0';
            html += `<br/>${p.marker} ${p.seriesName}: ${Number(p.value).toLocaleString()} (${pct}%)`;
          }
          return html;
        }
      },
      legend: {
        data: [
          locale === 'bg' ? 'Градски' : 'Urban',
          locale === 'bg' ? 'Селски' : 'Rural'
        ]
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: compData.map(d => d.year)
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => value >= 1000 ? (value / 1000).toFixed(0) + 'K' : String(value)
        }
      },
      series: [
        {
          name: locale === 'bg' ? 'Градски' : 'Urban',
          type: 'line',
          stack: 'total',
          areaStyle: { color: 'rgba(59, 130, 246, 0.5)' },
          data: compData.map(d => d.urban),
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 1 }
        },
        {
          name: locale === 'bg' ? 'Селски' : 'Rural',
          type: 'line',
          stack: 'total',
          areaStyle: { color: 'rgba(245, 158, 11, 0.5)' },
          data: compData.map(d => d.rural),
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 1 }
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
  }, [compData, locale]);

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        {locale === 'bg'
          ? 'Градска и селска съставка на браковете'
          : 'Urban and rural composition of marriages over time'}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '420px' }} />
    </div>
  );
}
