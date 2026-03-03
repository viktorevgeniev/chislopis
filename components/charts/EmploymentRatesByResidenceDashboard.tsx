'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

function getRate(row: any): number | null {
  if (row.Rate == null || row.Rate === '' || row.Rate === '..' || row.Rate === 'null') return null;
  const v = parseFloat(row.Rate);
  return isNaN(v) ? null : v;
}

function parseQuarter(q: string): { year: number; quarter: number } {
  const match = q.match(/^(\d{4})Q(\d)$/);
  if (!match) return { year: 0, quarter: 0 };
  return { year: parseInt(match[1]), quarter: parseInt(match[2]) };
}

function sortQuarters(a: string, b: string): number {
  const pa = parseQuarter(a);
  const pb = parseQuarter(b);
  return pa.year !== pb.year ? pa.year - pb.year : pa.quarter - pb.quarter;
}

function placeLabel(code: string, locale: 'bg' | 'en'): string {
  if (code === '0') return locale === 'bg' ? 'Общо' : 'Total';
  if (code === '1') return locale === 'bg' ? 'Градове' : 'Urban';
  if (code === '2') return locale === 'bg' ? 'Села' : 'Rural';
  return code;
}

function genderLabel(code: string, locale: 'bg' | 'en'): string {
  if (code === '0') return locale === 'bg' ? 'Общо' : 'Total';
  if (code === '1') return locale === 'bg' ? 'Мъже' : 'Male';
  if (code === '2') return locale === 'bg' ? 'Жени' : 'Female';
  return code;
}

interface EmploymentRatesByResidenceDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function EmploymentRatesByResidenceDashboard({ data, dataset, locale = 'en' }: EmploymentRatesByResidenceDashboardProps) {
  const allQuarters = useMemo(() => {
    const quarters = new Set<string>();
    data.forEach(d => { if (d.Year) quarters.add(d.Year); });
    return [...quarters].sort(sortQuarters);
  }, [data]);

  const latestQuarter = allQuarters[allQuarters.length - 1] || '';
  const prevYearQuarter = useMemo(() => {
    if (!latestQuarter) return '';
    const p = parseQuarter(latestQuarter);
    const target = `${p.year - 1}Q${p.quarter}`;
    return allQuarters.includes(target) ? target : '';
  }, [latestQuarter, allQuarters]);

  // KPI data
  const kpiData = useMemo(() => {
    if (!latestQuarter) return null;

    const find = (quarter: string, place: string, gender: string) =>
      data.find(d => d.Year === quarter && d.Residence_Code === place && d.Gender_Code === gender);

    const totalRow = find(latestQuarter, '0', '0');
    const totalRate = totalRow ? getRate(totalRow) : null;

    const prevRow = prevYearQuarter ? find(prevYearQuarter, '0', '0') : null;
    const prevRate = prevRow ? getRate(prevRow) : null;
    const yoyChange = totalRate != null && prevRate != null ? totalRate - prevRate : null;

    const urbanRow = find(latestQuarter, '1', '0');
    const ruralRow = find(latestQuarter, '2', '0');
    const urbanRate = urbanRow ? getRate(urbanRow) : null;
    const ruralRate = ruralRow ? getRate(ruralRow) : null;
    const urbanRuralGap = urbanRate != null && ruralRate != null ? urbanRate - ruralRate : null;

    // Most vulnerable: Rural Female
    const ruralFemaleRow = find(latestQuarter, '2', '2');
    const ruralFemaleRate = ruralFemaleRow ? getRate(ruralFemaleRow) : null;
    // Strongest: Urban Male
    const urbanMaleRow = find(latestQuarter, '1', '1');
    const urbanMaleRate = urbanMaleRow ? getRate(urbanMaleRow) : null;

    return { totalRate, yoyChange, urbanRate, ruralRate, urbanRuralGap, ruralFemaleRate, urbanMaleRate, latestQuarter };
  }, [data, latestQuarter, prevYearQuarter]);

  if (!data || data.length === 0 || !kpiData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {locale === 'bg' ? 'Няма налични данни' : 'No data available'}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? `Обща заетост (${kpiData.latestQuarter})` : `Total Rate (${kpiData.latestQuarter})`}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.totalRate != null ? kpiData.totalRate.toFixed(1) : '—'}%</p>
              {kpiData.yoyChange != null && (
                <p className={`text-sm mt-2 ${kpiData.yoyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpiData.yoyChange >= 0 ? '\u2191' : '\u2193'} {Math.abs(kpiData.yoyChange).toFixed(1)} pp
                  <span className="text-muted-foreground ml-1">{locale === 'bg' ? 'г/г' : 'YoY'}</span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Градове / Села' : 'Urban / Rural'}
              </p>
              <p className="text-2xl font-bold mt-1">
                <span className="text-blue-500">{kpiData.urbanRate != null ? kpiData.urbanRate.toFixed(1) : '—'}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-amber-600">{kpiData.ruralRate != null ? kpiData.ruralRate.toFixed(1) : '—'}</span>
                <span className="text-lg text-muted-foreground">%</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Урбанизационна разлика' : 'Urbanization Gap'}
              </p>
              <p className="text-3xl font-bold mt-1">
                {kpiData.urbanRuralGap != null ? kpiData.urbanRuralGap.toFixed(1) : '—'}
                <span className="text-lg text-muted-foreground"> pp</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Гр. мъже / Сел. жени' : 'Urban M / Rural F'}
              </p>
              <p className="text-2xl font-bold mt-1">
                <span className="text-emerald-500">{kpiData.urbanMaleRate != null ? kpiData.urbanMaleRate.toFixed(1) : '—'}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-red-500">{kpiData.ruralFemaleRate != null ? kpiData.ruralFemaleRate.toFixed(1) : '—'}</span>
                <span className="text-lg text-muted-foreground">%</span>
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
            <TabsTrigger value="snapshot">
              {locale === 'bg' ? 'Сравнение' : 'Snapshot'}
            </TabsTrigger>
            <TabsTrigger value="heatmap">
              {locale === 'bg' ? 'Сезонност' : 'Seasonal'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsChart data={data} allQuarters={allQuarters} locale={locale} />
          </TabsContent>
          <TabsContent value="snapshot">
            <SnapshotChart data={data} allQuarters={allQuarters} locale={locale} />
          </TabsContent>
          <TabsContent value="heatmap">
            <SeasonalHeatmap data={data} allQuarters={allQuarters} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: Multi-line trends with view toggle (Gender focus vs Location focus)
function TrendsChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'gender' | 'location'>('location');

  const seriesData = useMemo(() => {
    if (viewMode === 'gender') {
      // Gender focus: filter to Total residence, show Male/Female/Total
      return ['0', '1', '2'].map(gCode => {
        const filtered = data.filter(d => d.Residence_Code === '0' && d.Gender_Code === gCode);
        const byQ: Record<string, number | null> = {};
        filtered.forEach(r => { if (r.Year) byQ[r.Year] = getRate(r); });

        return {
          name: genderLabel(gCode, locale),
          color: gCode === '0' ? '#64748b' : gCode === '1' ? '#3b82f6' : '#ec4899',
          width: gCode === '0' ? 3 : 2,
          values: allQuarters.map(q => byQ[q] ?? null),
        };
      });
    } else {
      // Location focus: filter to Total gender, show Urban/Rural/Total
      return ['0', '1', '2'].map(pCode => {
        const filtered = data.filter(d => d.Residence_Code === pCode && d.Gender_Code === '0');
        const byQ: Record<string, number | null> = {};
        filtered.forEach(r => { if (r.Year) byQ[r.Year] = getRate(r); });

        return {
          name: placeLabel(pCode, locale),
          color: pCode === '0' ? '#64748b' : pCode === '1' ? '#3b82f6' : '#f59e0b',
          width: pCode === '0' ? 3 : 2,
          values: allQuarters.map(q => byQ[q] ?? null),
        };
      });
    }
  }, [data, allQuarters, viewMode, locale]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => value != null ? Number(value).toFixed(1) + '%' : 'N/A',
      },
      legend: {
        data: seriesData.map(s => s.name),
        bottom: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100, height: 20, bottom: 30 },
      ],
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allQuarters,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
          formatter: (value: string) => {
            const p = parseQuarter(value);
            return p.quarter === 1 ? String(p.year) : '';
          },
        },
      },
      yAxis: {
        type: 'value',
        name: '%',
        min: (value: { min: number }) => Math.floor(value.min - 3),
        max: (value: { max: number }) => Math.ceil(value.max + 3),
      },
      series: seriesData.map(s => ({
        name: s.name,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: s.width },
        smooth: true,
        symbol: 'none',
        connectNulls: true,
      })),
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [allQuarters, seriesData]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="emp-res-view" className="text-sm font-medium">
            {locale === 'bg' ? 'Изглед' : 'View'}
          </label>
          <Select id="emp-res-view" value={viewMode} onChange={(e) => setViewMode(e.target.value as 'gender' | 'location')} className="w-[180px]">
            <option value="location">{locale === 'bg' ? 'По местоживеене' : 'By Residence'}</option>
            <option value="gender">{locale === 'bg' ? 'По пол' : 'By Gender'}</option>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {viewMode === 'location'
            ? (locale === 'bg' ? 'Градове vs Села (Общо по пол)' : 'Urban vs Rural (Total by sex)')
            : (locale === 'bg' ? 'Мъже vs Жени (Общо по местоживеене)' : 'Male vs Female (Total by residence)')
          }
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '450px' }} />
    </div>
  );
}

// Tab 2: Grouped bar chart – Urban/Rural × Male/Female for latest quarter
function SnapshotChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');

  useEffect(() => {
    if (allQuarters.length > 0 && !selectedQuarter) {
      setSelectedQuarter(allQuarters[allQuarters.length - 1]);
    }
  }, [allQuarters, selectedQuarter]);

  const barData = useMemo(() => {
    const quarter = selectedQuarter || allQuarters[allQuarters.length - 1];

    const places = ['1', '2']; // Urban, Rural
    const genders = ['1', '2']; // Male, Female

    const result: { place: string; placeLabel: string; gender: string; genderLabel: string; value: number }[] = [];

    places.forEach(pCode => {
      genders.forEach(gCode => {
        const row = data.find(d =>
          d.Year === quarter && d.Residence_Code === pCode && d.Gender_Code === gCode
        );
        result.push({
          place: pCode,
          placeLabel: placeLabel(pCode, locale),
          gender: gCode,
          genderLabel: genderLabel(gCode, locale),
          value: row ? (getRate(row) ?? 0) : 0,
        });
      });
    });

    return result;
  }, [data, allQuarters, selectedQuarter, locale]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const maleLabel = genderLabel('1', locale);
    const femaleLabel = genderLabel('2', locale);
    const categories = [placeLabel('1', locale), placeLabel('2', locale)];

    const maleValues = barData.filter(d => d.gender === '1').map(d => d.value);
    const femaleValues = barData.filter(d => d.gender === '2').map(d => d.value);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toFixed(1) + '%',
      },
      legend: { data: [maleLabel, femaleLabel] },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { fontSize: 13, fontWeight: 'bold' },
      },
      yAxis: {
        type: 'value',
        name: '%',
        min: (value: { min: number }) => Math.floor(value.min - 5),
        max: (value: { max: number }) => Math.ceil(value.max + 5),
      },
      series: [
        {
          name: maleLabel,
          type: 'bar',
          data: maleValues.map(v => ({
            value: v,
            itemStyle: { color: '#3b82f6', borderRadius: [6, 6, 0, 0] },
          })),
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => Number(params.value).toFixed(1) + '%',
            fontSize: 12,
            fontWeight: 'bold',
          },
        },
        {
          name: femaleLabel,
          type: 'bar',
          data: femaleValues.map(v => ({
            value: v,
            itemStyle: { color: '#ec4899', borderRadius: [6, 6, 0, 0] },
          })),
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => Number(params.value).toFixed(1) + '%',
            fontSize: 12,
            fontWeight: 'bold',
          },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [barData, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="emp-res-quarter" className="text-sm font-medium">
            {locale === 'bg' ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="emp-res-quarter" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
            {allQuarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Градове vs Села × Мъже vs Жени'
            : 'Urban vs Rural × Male vs Female'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '350px' }} />
    </div>
  );
}

// Tab 3: Seasonal heatmap – Year × Quarter color-coded by rate
function SeasonalHeatmap({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedSegment, setSelectedSegment] = useState<string>('0-0'); // place-gender

  const segments = [
    { value: '0-0', label: locale === 'bg' ? 'Общо' : 'Total' },
    { value: '1-0', label: locale === 'bg' ? 'Градове – Общо' : 'Urban – Total' },
    { value: '1-1', label: locale === 'bg' ? 'Градове – Мъже' : 'Urban – Male' },
    { value: '1-2', label: locale === 'bg' ? 'Градове – Жени' : 'Urban – Female' },
    { value: '2-0', label: locale === 'bg' ? 'Села – Общо' : 'Rural – Total' },
    { value: '2-1', label: locale === 'bg' ? 'Села – Мъже' : 'Rural – Male' },
    { value: '2-2', label: locale === 'bg' ? 'Села – Жени' : 'Rural – Female' },
  ];

  const heatmapData = useMemo(() => {
    const [pCode, gCode] = selectedSegment.split('-');
    const years = new Set<number>();
    const rateMap = new Map<string, number>();

    data.forEach(d => {
      if (d.Residence_Code !== pCode || d.Gender_Code !== gCode) return;
      const parsed = parseQuarter(d.Year);
      if (parsed.year === 0) return;
      const rate = getRate(d);
      if (rate == null) return;
      years.add(parsed.year);
      rateMap.set(`${parsed.year}-${parsed.quarter}`, rate);
    });

    const sortedYears = [...years].sort((a, b) => a - b);
    const quarters = [1, 2, 3, 4];

    const points: [number, number, number | null][] = [];
    sortedYears.forEach((year, yi) => {
      quarters.forEach((q, qi) => {
        const rate = rateMap.get(`${year}-${q}`) ?? null;
        points.push([qi, yi, rate]);
      });
    });

    return { sortedYears, points };
  }, [data, selectedSegment]);

  useEffect(() => {
    if (!chartRef.current || heatmapData.points.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const allRates = heatmapData.points.map(p => p[2]).filter(v => v != null) as number[];
    const minRate = Math.min(...allRates);
    const maxRate = Math.max(...allRates);

    const option: EChartsOption = {
      tooltip: {
        formatter: (params: any) => {
          const [qi, yi, val] = params.data;
          const year = heatmapData.sortedYears[yi];
          return `<strong>${year}Q${qi + 1}</strong><br/>${locale === 'bg' ? 'Заетост' : 'Rate'}: ${val != null ? val.toFixed(1) + '%' : 'N/A'}`;
        },
      },
      grid: { left: '8%', right: '12%', bottom: '8%', top: '5%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['Q1', 'Q2', 'Q3', 'Q4'],
        splitArea: { show: true },
      },
      yAxis: {
        type: 'category',
        data: heatmapData.sortedYears.map(String),
        splitArea: { show: true },
      },
      visualMap: {
        min: Math.floor(minRate - 2),
        max: Math.ceil(maxRate + 2),
        calculable: true,
        orient: 'vertical',
        right: 0,
        top: 'center',
        inRange: {
          color: ['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#16a34a', '#15803d', '#166534'],
        },
      },
      series: [{
        name: locale === 'bg' ? 'Заетост' : 'Employment Rate',
        type: 'heatmap',
        data: heatmapData.points.filter(p => p[2] != null),
        label: {
          show: true,
          formatter: (params: any) => params.data[2] != null ? params.data[2].toFixed(1) : '',
          fontSize: 10,
        },
      }],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [heatmapData, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="emp-res-segment" className="text-sm font-medium">
            {locale === 'bg' ? 'Сегмент' : 'Segment'}
          </label>
          <Select id="emp-res-segment" value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} className="w-[200px]">
            {segments.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Сезонни модели: Година × Тримесечие, цвят = заетост (%)'
            : 'Seasonal patterns: Year × Quarter, color = employment rate (%)'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: Math.max(350, heatmapData.sortedYears.length * 22 + 60) + 'px' }} />
    </div>
  );
}
