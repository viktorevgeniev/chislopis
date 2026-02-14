'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

const SERIES_COLORS: Record<string, string> = {
  'Urban-Total': '#3b82f6',
  'Rural-Total': '#f59e0b',
  'Urban-Male': '#2563eb',
  'Urban-Female': '#ec4899',
  'Rural-Male': '#d97706',
  'Rural-Female': '#f43f5e',
  'Total-Total': '#64748b',
  'Total-Male': '#6366f1',
  'Total-Female': '#a855f7',
};

function getRate(row: any): number {
  const v = parseFloat(row.Rate);
  return isNaN(v) ? 0 : v;
}

function getPlaceCode(row: any): string {
  return row.PlaceResidence_Code || row.Residence_Code || '';
}

function getPlaceLabel(row: any): string {
  return row.PlaceResidence || row.Residence || getPlaceCode(row);
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

function getGenderLabel(code: string, locale: 'bg' | 'en'): string {
  if (code === '0') return locale === 'bg' ? 'Общо' : 'Total';
  if (code === '1') return locale === 'bg' ? 'Мъже' : 'Male';
  if (code === '2') return locale === 'bg' ? 'Жени' : 'Female';
  return code;
}

function getResidenceLabel(code: string, locale: 'bg' | 'en'): string {
  if (code === '0') return locale === 'bg' ? 'Общо' : 'Total';
  if (code === '1') return locale === 'bg' ? 'Град' : 'Urban';
  if (code === '2') return locale === 'bg' ? 'Село' : 'Rural';
  return code;
}

interface ActivityRatesResidenceDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function ActivityRatesResidenceDashboard({ data, dataset, locale = 'en' }: ActivityRatesResidenceDashboardProps) {
  const allQuarters = useMemo(() => {
    const quarters = new Set<string>();
    data.forEach(d => { if (d.Year) quarters.add(d.Year); });
    return [...quarters].sort(sortQuarters);
  }, [data]);

  const latestQuarter = allQuarters[allQuarters.length - 1] || '';

  // KPI data
  const kpiData = useMemo(() => {
    if (!latestQuarter) return null;

    const find = (quarter: string, place: string, gender: string) =>
      data.find(d => d.Year === quarter && getPlaceCode(d) === place && d.Gender_Code === gender);

    const latest = find(latestQuarter, '0', '0');
    const latestRate = latest ? getRate(latest) : 0;

    // QoQ: previous quarter
    const latestIdx = allQuarters.indexOf(latestQuarter);
    const prevQuarter = latestIdx > 0 ? allQuarters[latestIdx - 1] : '';
    const prev = prevQuarter ? find(prevQuarter, '0', '0') : null;
    const qoqChange = prev ? latestRate - getRate(prev) : 0;

    // YoY: same quarter last year
    const p = parseQuarter(latestQuarter);
    const yoyQuarter = `${p.year - 1}Q${p.quarter}`;
    const yoy = allQuarters.includes(yoyQuarter) ? find(yoyQuarter, '0', '0') : null;
    const yoyChange = yoy ? latestRate - getRate(yoy) : 0;

    // Urban vs Rural gap
    const urban = find(latestQuarter, '1', '0');
    const rural = find(latestQuarter, '2', '0');
    const urbanRate = urban ? getRate(urban) : 0;
    const ruralRate = rural ? getRate(rural) : 0;

    return { latestRate, qoqChange, yoyChange, urbanRate, ruralRate, latestQuarter, hasYoy: !!yoy };
  }, [data, latestQuarter, allQuarters]);

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
                {locale === 'bg' ? `Обща активност (${kpiData.latestQuarter})` : `Total Activity (${kpiData.latestQuarter})`}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.latestRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Промяна QoQ' : 'QoQ Change'}
              </p>
              <p className={`text-3xl font-bold mt-1 ${kpiData.qoqChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {kpiData.qoqChange >= 0 ? '+' : ''}{kpiData.qoqChange.toFixed(1)}<span className="text-lg text-muted-foreground"> pp</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Промяна YoY' : 'YoY Change'}
              </p>
              {kpiData.hasYoy ? (
                <p className={`text-3xl font-bold mt-1 ${kpiData.yoyChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {kpiData.yoyChange >= 0 ? '+' : ''}{kpiData.yoyChange.toFixed(1)}<span className="text-lg text-muted-foreground"> pp</span>
                </p>
              ) : (
                <p className="text-2xl font-bold mt-1 text-muted-foreground">N/A</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Град / Село' : 'Urban / Rural'}
              </p>
              <p className="text-2xl font-bold mt-1">
                <span className="text-blue-500">{kpiData.urbanRate.toFixed(1)}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-amber-500">{kpiData.ruralRate.toFixed(1)}</span>
                <span className="text-lg text-muted-foreground">%</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'bg' ? 'Разлика' : 'Gap'}: {(kpiData.urbanRate - kpiData.ruralRate).toFixed(1)} pp
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trends">
              {locale === 'bg' ? 'Тенденции' : 'Trends'}
            </TabsTrigger>
            <TabsTrigger value="snapshot">
              {locale === 'bg' ? 'Сравнение' : 'Comparison'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsChart data={data} allQuarters={allQuarters} locale={locale} />
          </TabsContent>
          <TabsContent value="snapshot">
            <SnapshotChart data={data} allQuarters={allQuarters} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: Multi-line trend – Urban vs Rural with gender drill-down
function TrendsChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [showGender, setShowGender] = useState<boolean>(false);

  const seriesData = useMemo(() => {
    // Build series combinations
    const places = ['1', '2']; // Urban, Rural (exclude Total for clarity)
    const genders = showGender ? ['1', '2'] : ['0'];

    const series: { key: string; placeCode: string; genderCode: string; label: string; values: (number | null)[] }[] = [];

    for (const place of places) {
      for (const gender of genders) {
        const filtered = data.filter(d =>
          getPlaceCode(d) === place && d.Gender_Code === gender
        );

        const byQuarter: Record<string, number> = {};
        filtered.forEach(row => {
          if (row.Year) byQuarter[row.Year] = getRate(row);
        });

        const placeLabel = getResidenceLabel(place, locale);
        const genderLabel = gender === '0' ? '' : ` (${getGenderLabel(gender, locale)})`;
        const colorKey = `${placeLabel}-${getGenderLabel(gender, 'en')}`;

        series.push({
          key: colorKey,
          placeCode: place,
          genderCode: gender,
          label: `${placeLabel}${genderLabel}`,
          values: allQuarters.map(q => byQuarter[q] ?? null),
        });
      }
    }

    return series;
  }, [data, allQuarters, showGender, locale]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => value != null ? Number(value).toFixed(1) + '%' : 'N/A',
      },
      legend: {
        data: seriesData.map(s => s.label),
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
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: SERIES_COLORS[s.key] || undefined },
        lineStyle: { width: 2, type: s.genderCode === '2' ? 'dashed' as const : 'solid' as const },
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
      <div className="flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showGender}
            onChange={(e) => setShowGender(e.target.checked)}
            className="rounded border-gray-300"
          />
          {locale === 'bg' ? 'Показване по пол (Мъже / Жени)' : 'Show gender breakdown (Male / Female)'}
        </label>
      </div>
      <p className="text-sm text-muted-foreground">
        {locale === 'bg'
          ? 'Коефициент на активност – Град vs Село (%)'
          : 'Activity rate – Urban vs Rural (%)'}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '450px' }} />
    </div>
  );
}

// Tab 2: Grouped bar chart – Urban vs Rural by gender for selected quarter
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

    return places.map(placeCode => {
      const male = data.find(d => d.Year === quarter && getPlaceCode(d) === placeCode && d.Gender_Code === '1');
      const female = data.find(d => d.Year === quarter && getPlaceCode(d) === placeCode && d.Gender_Code === '2');
      return {
        place: getResidenceLabel(placeCode, locale),
        male: male ? getRate(male) : 0,
        female: female ? getRate(female) : 0,
      };
    });
  }, [data, allQuarters, selectedQuarter, locale]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const maleLabel = locale === 'bg' ? 'Мъже' : 'Male';
    const femaleLabel = locale === 'bg' ? 'Жени' : 'Female';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toFixed(1) + '%',
      },
      legend: { data: [maleLabel, femaleLabel] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: barData.map(d => d.place),
        axisLabel: { fontSize: 13 },
      },
      yAxis: { type: 'value', name: '%', max: 100 },
      series: [
        {
          name: maleLabel,
          type: 'bar',
          data: barData.map(d => d.male),
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top', formatter: (p: any) => Number(p.value).toFixed(1) + '%', fontSize: 11 },
          barGap: '20%',
        },
        {
          name: femaleLabel,
          type: 'bar',
          data: barData.map(d => d.female),
          itemStyle: { color: '#ec4899', borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top', formatter: (p: any) => Number(p.value).toFixed(1) + '%', fontSize: 11 },
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
          <label htmlFor="res-snapshot-quarter" className="text-sm font-medium">
            {locale === 'bg' ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="res-snapshot-quarter" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
            {allQuarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Мъже vs Жени по местоживеене'
            : 'Male vs Female by place of residence'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '350px' }} />
    </div>
  );
}
