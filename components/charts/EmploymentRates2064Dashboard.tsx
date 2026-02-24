'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dataset } from '@/types/dataset';

function getRate(row: any): number | null {
  if (row.Rate == null || row.Rate === '' || row.Rate === 'null') return null;
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

interface DataPoint {
  period: string;
  male: number | null;
  female: number | null;
  total: number | null;
}

interface EmploymentRates2064DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function EmploymentRates2064Dashboard({ data, dataset, locale = 'en' }: EmploymentRates2064DashboardProps) {
  const { points, allQuarters } = useMemo(() => {
    const byPeriod = new Map<string, { male: number | null; female: number | null; total: number | null }>();

    data.forEach(d => {
      const period = d.Year;
      if (!period) return;
      if (!byPeriod.has(period)) byPeriod.set(period, { male: null, female: null, total: null });
      const entry = byPeriod.get(period)!;
      const rate = getRate(d);
      const gCode = d.Gender_Code || '';
      if (gCode === '0') entry.total = rate;
      else if (gCode === '1') entry.male = rate;
      else if (gCode === '2') entry.female = rate;
    });

    const quarters = [...byPeriod.keys()].sort(sortQuarters);
    const pts: DataPoint[] = quarters.map(q => ({
      period: q,
      ...byPeriod.get(q)!,
    }));

    return { points: pts, allQuarters: quarters };
  }, [data]);

  const latestQuarter = allQuarters[allQuarters.length - 1] || '';
  const latest = points[points.length - 1];

  // YoY: same quarter, previous year
  const yoyData = useMemo(() => {
    if (!latestQuarter || !latest) return null;
    const p = parseQuarter(latestQuarter);
    const target = `${p.year - 1}Q${p.quarter}`;
    const prev = points.find(pt => pt.period === target);
    if (!prev || prev.total == null || latest.total == null) return null;
    return {
      change: latest.total - prev.total,
      prevQuarter: target,
      prevRate: prev.total,
    };
  }, [latestQuarter, latest, points]);

  if (!data || data.length === 0 || !latest) {
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? `Заетост 20-64 (${latestQuarter})` : `Employment 20-64 (${latestQuarter})`}
              </p>
              <p className="text-3xl font-bold mt-1">{latest.total != null ? latest.total.toFixed(1) : '—'}%</p>
              {yoyData && (
                <p className={`text-sm mt-2 ${yoyData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {yoyData.change >= 0 ? '\u2191' : '\u2193'} {Math.abs(yoyData.change).toFixed(1)} pp
                  <span className="text-muted-foreground ml-1">
                    {locale === 'bg' ? `vs ${yoyData.prevQuarter}` : `vs ${yoyData.prevQuarter}`}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Мъже / Жени' : 'Male / Female'}
              </p>
              <p className="text-2xl font-bold mt-1">
                <span className="text-blue-500">{latest.male != null ? latest.male.toFixed(1) : '—'}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-pink-500">{latest.female != null ? latest.female.toFixed(1) : '—'}</span>
                <span className="text-lg text-muted-foreground">%</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Полова разлика' : 'Gender Gap'}
              </p>
              <p className="text-3xl font-bold mt-1">
                {latest.male != null && latest.female != null
                  ? (latest.male - latest.female).toFixed(1)
                  : '—'}
                <span className="text-lg text-muted-foreground"> pp</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'bg' ? 'Мъже − Жени' : 'Male − Female'}
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
              {locale === 'bg' ? 'По пол' : 'By Gender'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsChart points={points} allQuarters={allQuarters} locale={locale} />
          </TabsContent>
          <TabsContent value="snapshot">
            <GenderBarChart points={points} allQuarters={allQuarters} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: Multi-line trend chart (Male / Female / Total)
function TrendsChart({ points, allQuarters, locale }: {
  points: DataPoint[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const totalLabel = locale === 'bg' ? 'Общо' : 'Total';
    const maleLabel = locale === 'bg' ? 'Мъже' : 'Male';
    const femaleLabel = locale === 'bg' ? 'Жени' : 'Female';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => value != null ? Number(value).toFixed(1) + '%' : 'N/A',
      },
      legend: {
        data: [totalLabel, maleLabel, femaleLabel],
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
      series: [
        {
          name: totalLabel,
          type: 'line' as const,
          data: points.map(p => p.total),
          itemStyle: { color: '#64748b' },
          lineStyle: { width: 3 },
          smooth: true,
          symbol: 'none',
          connectNulls: true,
        },
        {
          name: maleLabel,
          type: 'line' as const,
          data: points.map(p => p.male),
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          connectNulls: true,
        },
        {
          name: femaleLabel,
          type: 'line' as const,
          data: points.map(p => p.female),
          itemStyle: { color: '#ec4899' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          connectNulls: true,
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
  }, [allQuarters, points, locale]);

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        {locale === 'bg'
          ? 'Коефициент на заетост 20-64 по пол (%)'
          : 'Employment rate 20-64 by sex (%)'}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '450px' }} />
    </div>
  );
}

// Tab 2: Grouped bar chart – latest quarter gender snapshot
function GenderBarChart({ points, allQuarters, locale }: {
  points: DataPoint[];
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

  const barPoint = useMemo(() => {
    const q = selectedQuarter || allQuarters[allQuarters.length - 1];
    return points.find(p => p.period === q) || null;
  }, [points, allQuarters, selectedQuarter]);

  useEffect(() => {
    if (!chartRef.current || !barPoint) return;
    const chart = echarts.init(chartRef.current);

    const maleLabel = locale === 'bg' ? 'Мъже' : 'Male';
    const femaleLabel = locale === 'bg' ? 'Жени' : 'Female';
    const totalLabel = locale === 'bg' ? 'Общо' : 'Total';

    const categories = [maleLabel, femaleLabel, totalLabel];
    const values = [barPoint.male ?? 0, barPoint.female ?? 0, barPoint.total ?? 0];
    const colors = ['#3b82f6', '#ec4899', '#64748b'];

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toFixed(1) + '%',
      },
      grid: { left: '3%', right: '10%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { fontSize: 13, fontWeight: 'bold' },
      },
      yAxis: {
        type: 'value',
        name: '%',
        min: (value: { min: number }) => Math.floor(value.min - 5),
        max: (value: { max: number }) => Math.ceil(value.max + 3),
      },
      series: [{
        name: locale === 'bg' ? 'Заетост' : 'Employment Rate',
        type: 'bar',
        barWidth: '50%',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: {
            color: colors[i],
            borderRadius: [6, 6, 0, 0],
          },
        })),
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => Number(params.value).toFixed(1) + '%',
          fontSize: 14,
          fontWeight: 'bold',
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
  }, [barPoint, locale]);

  if (!barPoint) {
    return <div className="text-center py-8 text-muted-foreground">{locale === 'bg' ? 'Няма данни' : 'No data available'}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="emp2064-quarter" className="text-sm font-medium">
            {locale === 'bg' ? 'Тримесечие' : 'Quarter'}
          </label>
          <select
            id="emp2064-quarter"
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {allQuarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Сравнение на заетостта по пол'
            : 'Gender employment comparison'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '350px' }} />
    </div>
  );
}
