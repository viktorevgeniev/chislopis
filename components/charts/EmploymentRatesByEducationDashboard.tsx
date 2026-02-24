'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// Education level colors – ordered from Higher → Primary
const EDU_COLORS: Record<string, string> = {
  '1': '#3b82f6',   // Higher – blue (primary/strong)
  '2': '#10b981',   // Upper secondary – green
  '2_1': '#6366f1', // Secondary vocational – indigo
  '2_2': '#8b5cf6', // Secondary general – purple
  '3': '#f59e0b',   // Lower secondary – amber/warning
  '4': '#ef4444',   // Primary or lower – red/warning
  '0': '#64748b',   // Total – slate
};

// Display order (excluding Total)
const EDU_ORDER = ['1', '2', '2_1', '2_2', '3', '4'];

function getRate(row: any): number | null {
  if (row.Rate == null || row.Rate === '' || row.Rate === '..' || row.Rate === 'null') return null;
  const v = parseFloat(row.Rate);
  return isNaN(v) ? null : v;
}

function getEduCode(row: any): string {
  return row.LFS_EDUlevel_Code || row.LFS_EDUlevel || '';
}

function getEduLabel(row: any): string {
  return row.LFS_EDUlevel || getEduCode(row);
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

interface EmploymentRatesByEducationDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function EmploymentRatesByEducationDashboard({ data, dataset, locale = 'en' }: EmploymentRatesByEducationDashboardProps) {
  const [selectedAge, setSelectedAge] = useState<string>('15 - 64_gr');

  const { allQuarters, ageGroups, eduLevels } = useMemo(() => {
    const quarters = new Set<string>();
    const ages = new Set<string>();
    const eduMap = new Map<string, string>();

    data.forEach(d => {
      if (d.Year) quarters.add(d.Year);
      const ageCode = d.Age10_LFS_Code || '';
      if (ageCode) ages.add(ageCode);
      const eduCode = getEduCode(d);
      if (eduCode && !eduMap.has(eduCode)) eduMap.set(eduCode, getEduLabel(d));
    });

    const sortedEdu = [...eduMap.entries()]
      .sort((a, b) => {
        const ia = EDU_ORDER.indexOf(a[0]);
        const ib = EDU_ORDER.indexOf(b[0]);
        const oa = ia >= 0 ? ia : (a[0] === '0' ? -1 : 99);
        const ob = ib >= 0 ? ib : (b[0] === '0' ? -1 : 99);
        return oa - ob;
      })
      .map(([code, label]) => ({ code, label }));

    return {
      allQuarters: [...quarters].sort(sortQuarters),
      ageGroups: [...ages].sort(),
      eduLevels: sortedEdu,
    };
  }, [data]);

  const latestQuarter = allQuarters[allQuarters.length - 1] || '';
  const prevQuarter = allQuarters.length >= 2 ? allQuarters[allQuarters.length - 2] : '';

  // KPI data
  const kpiData = useMemo(() => {
    if (!latestQuarter) return null;

    const findRate = (quarter: string, eduCode: string) => {
      const row = data.find(d =>
        d.Year === quarter &&
        d.Age10_LFS_Code === selectedAge &&
        getEduCode(d) === eduCode
      );
      return row ? getRate(row) : null;
    };

    const totalRate = findRate(latestQuarter, '0');
    const higherRate = findRate(latestQuarter, '1');
    const lowerSecRate = findRate(latestQuarter, '3');
    const premium = higherRate != null && lowerSecRate != null ? higherRate - lowerSecRate : null;

    // QoQ trend for total
    const prevTotalRate = prevQuarter ? findRate(prevQuarter, '0') : null;
    const qoqChange = totalRate != null && prevTotalRate != null ? totalRate - prevTotalRate : null;

    return { totalRate, premium, qoqChange, higherRate, lowerSecRate, latestQuarter, prevQuarter };
  }, [data, latestQuarter, prevQuarter, selectedAge]);

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
        {/* Global age filter */}
        <div className="flex flex-wrap gap-4 items-end p-4 bg-muted/30 rounded-lg">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="emp-edu-age" className="text-sm font-medium">
              {locale === 'bg' ? 'Възрастова група' : 'Age Group'}
            </label>
            <Select id="emp-edu-age" value={selectedAge} onChange={(e) => setSelectedAge(e.target.value)} className="w-[200px]">
              {ageGroups.map(age => (
                <option key={age} value={age}>
                  {age === '0' ? (locale === 'bg' ? 'Общо (15+)' : 'Total (15+)') : age.replace('_gr', '')}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? `Обща заетост (${kpiData.latestQuarter})` : `Total Employment (${kpiData.latestQuarter})`}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.totalRate != null ? kpiData.totalRate.toFixed(1) : '—'}%</p>
              {kpiData.qoqChange != null && (
                <p className={`text-sm mt-2 ${kpiData.qoqChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpiData.qoqChange >= 0 ? '\u2191' : '\u2193'} {Math.abs(kpiData.qoqChange).toFixed(1)} pp
                  <span className="text-muted-foreground ml-1">
                    {locale === 'bg' ? `vs ${kpiData.prevQuarter}` : `vs ${kpiData.prevQuarter}`}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Образователна премия' : 'Education Premium'}
              </p>
              <p className="text-3xl font-bold mt-1">
                {kpiData.premium != null ? kpiData.premium.toFixed(1) : '—'}
                <span className="text-lg text-muted-foreground"> pp</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'bg' ? 'Висше vs Основно средно' : 'Higher vs Lower secondary'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Висше / Осн. средно' : 'Higher / Lower Sec.'}
              </p>
              <p className="text-2xl font-bold mt-1">
                <span className="text-blue-500">{kpiData.higherRate != null ? kpiData.higherRate.toFixed(1) : '—'}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-amber-500">{kpiData.lowerSecRate != null ? kpiData.lowerSecRate.toFixed(1) : '—'}</span>
                <span className="text-lg text-muted-foreground">%</span>
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
              {locale === 'bg' ? 'По образование' : 'By Education'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsChart data={data} allQuarters={allQuarters} eduLevels={eduLevels} selectedAge={selectedAge} locale={locale} />
          </TabsContent>
          <TabsContent value="snapshot">
            <SnapshotChart data={data} allQuarters={allQuarters} eduLevels={eduLevels} selectedAge={selectedAge} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: Multi-line trend by education level
function TrendsChart({ data, allQuarters, eduLevels, selectedAge, locale }: {
  data: any[];
  allQuarters: string[];
  eduLevels: { code: string; label: string }[];
  selectedAge: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Exclude Total from trend lines
  const eduToShow = useMemo(() => eduLevels.filter(e => e.code !== '0'), [eduLevels]);

  const seriesData = useMemo(() => {
    return eduToShow.map(edu => {
      const filtered = data.filter(d =>
        d.Age10_LFS_Code === selectedAge && getEduCode(d) === edu.code
      );
      const byQuarter: Record<string, number | null> = {};
      filtered.forEach(row => {
        if (row.Year) byQuarter[row.Year] = getRate(row);
      });

      return {
        code: edu.code,
        label: edu.label,
        values: allQuarters.map(q => byQuarter[q] ?? null),
      };
    });
  }, [data, allQuarters, eduToShow, selectedAge]);

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
        type: 'scroll',
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
        min: 0,
        max: 100,
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: EDU_COLORS[s.code] || undefined },
        lineStyle: { width: s.code === '1' ? 3 : 2 },
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
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        {locale === 'bg'
          ? 'Коефициент на заетост по степен на образование (%)'
          : 'Employment rate by education level (%)'}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '450px' }} />
    </div>
  );
}

// Tab 2: Horizontal bar chart snapshot, sorted descending
function SnapshotChart({ data, allQuarters, eduLevels, selectedAge, locale }: {
  data: any[];
  allQuarters: string[];
  eduLevels: { code: string; label: string }[];
  selectedAge: string;
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

    return eduLevels
      .filter(e => e.code !== '0')
      .map(edu => {
        const row = data.find(d =>
          d.Year === quarter &&
          d.Age10_LFS_Code === selectedAge &&
          getEduCode(d) === edu.code
        );
        return {
          code: edu.code,
          label: edu.label,
          value: row ? (getRate(row) ?? 0) : 0,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [data, allQuarters, eduLevels, selectedAge, selectedQuarter]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toFixed(1) + '%',
      },
      grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', name: '%', max: 100 },
      yAxis: {
        type: 'category',
        data: [...barData].reverse().map(d => d.label),
        axisLabel: { fontSize: 11 },
      },
      series: [{
        name: locale === 'bg' ? 'Заетост' : 'Employment Rate',
        type: 'bar',
        data: [...barData].reverse().map(d => ({
          value: d.value,
          itemStyle: {
            color: EDU_COLORS[d.code] || '#3b82f6',
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => Number(params.value).toFixed(1) + '%',
          fontSize: 11,
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
  }, [barData, locale]);

  if (barData.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{locale === 'bg' ? 'Няма данни' : 'No data available'}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="emp-edu-quarter" className="text-sm font-medium">
            {locale === 'bg' ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="emp-edu-quarter" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
            {allQuarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Сортирано по коефициент на заетост (низходящо)'
            : 'Sorted by employment rate (descending)'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '350px' }} />
    </div>
  );
}
