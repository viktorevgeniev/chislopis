'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// Education level colors – visually distinct, ordered from Higher → Primary
const EDU_COLORS: Record<string, string> = {
  '1': '#10b981',   // Higher – green
  '2': '#3b82f6',   // Upper secondary – blue
  '2_1': '#6366f1', // Secondary vocational – indigo
  '2_2': '#8b5cf6', // Secondary general – purple
  '3': '#f59e0b',   // Lower secondary – amber
  '4': '#ef4444',   // Primary or lower – red
  '0': '#64748b',   // Total – slate
};

// Display order for education levels (excluding Total)
const EDU_ORDER = ['1', '2', '2_1', '2_2', '3', '4'];

function getRate(row: any): number {
  const v = parseFloat(row.Rate);
  return isNaN(v) ? 0 : v;
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

interface ActivityRatesEducationDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function ActivityRatesEducationDashboard({ data, dataset, locale = 'en' }: ActivityRatesEducationDashboardProps) {
  const [selectedAge, setSelectedAge] = useState<string>('15 - 64_gr');

  const { allQuarters, ageGroups, eduLevels } = useMemo(() => {
    const quarters = new Set<string>();
    const ages = new Set<string>();
    const eduMap = new Map<string, string>(); // code → label

    data.forEach(d => {
      if (d.Year) quarters.add(d.Year);
      const ageCode = d.Age10_LFS_Code || '';
      if (ageCode) ages.add(ageCode);
      const eduCode = getEduCode(d);
      if (eduCode && !eduMap.has(eduCode)) eduMap.set(eduCode, getEduLabel(d));
    });

    // Sort edu levels by our defined order
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

  // KPI data: Higher vs Primary gap for latest quarter
  const kpiData = useMemo(() => {
    if (!latestQuarter) return null;

    const findRate = (eduCode: string) => {
      const row = data.find(d =>
        d.Year === latestQuarter &&
        d.Age10_LFS_Code === selectedAge &&
        getEduCode(d) === eduCode
      );
      return row ? getRate(row) : 0;
    };

    const higherRate = findRate('1');
    const primaryRate = findRate('4');
    const totalRate = findRate('0');
    const gap = higherRate - primaryRate;

    return { higherRate, primaryRate, totalRate, gap, latestQuarter };
  }, [data, latestQuarter, selectedAge]);

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
            <label htmlFor="edu-age" className="text-sm font-medium">
              {locale === 'bg' ? 'Възрастова група' : 'Age Group'}
            </label>
            <Select id="edu-age" value={selectedAge} onChange={(e) => setSelectedAge(e.target.value)} className="w-[200px]">
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
                {locale === 'bg' ? `Висше образование (${kpiData.latestQuarter})` : `Higher Education (${kpiData.latestQuarter})`}
              </p>
              <p className="text-3xl font-bold mt-1 text-emerald-600">{kpiData.higherRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'bg' ? 'Най-висок коефициент' : 'Highest activity rate'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? `Основно или по-ниско (${kpiData.latestQuarter})` : `Primary or Lower (${kpiData.latestQuarter})`}
              </p>
              <p className="text-3xl font-bold mt-1 text-red-500">{kpiData.primaryRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'bg' ? 'Най-нисък коефициент' : 'Lowest activity rate'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Образователна разлика' : 'Education Gap'}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.gap.toFixed(1)}<span className="text-lg text-muted-foreground"> pp</span></p>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'bg' ? 'Висше vs Основно' : 'Higher vs Primary'}
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

// Tab 1: Multi-line trend chart by education level
function TrendsChart({ data, allQuarters, eduLevels, selectedAge, locale }: {
  data: any[];
  allQuarters: string[];
  eduLevels: { code: string; label: string }[];
  selectedAge: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Exclude Total (code '0') from trend lines
  const eduToShow = useMemo(() => eduLevels.filter(e => e.code !== '0'), [eduLevels]);

  const seriesData = useMemo(() => {
    return eduToShow.map(edu => {
      const filtered = data.filter(d =>
        d.Age10_LFS_Code === selectedAge &&
        getEduCode(d) === edu.code
      );

      const byQuarter: Record<string, number> = {};
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
        lineStyle: { width: 2 },
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
          ? 'Коефициент на активност по степен на образование (%)'
          : 'Activity rate by education level (%)'}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '450px' }} />
    </div>
  );
}

// Tab 2: Bar chart snapshot for latest quarter, sorted descending
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

    // Exclude Total
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
          value: row ? getRate(row) : 0,
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
        name: locale === 'bg' ? 'Активност' : 'Activity Rate',
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
          <label htmlFor="edu-snapshot-quarter" className="text-sm font-medium">
            {locale === 'bg' ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="edu-snapshot-quarter" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
            {allQuarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Сортирано по коефициент на активност (низходящо)'
            : 'Sorted by activity rate (descending)'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '350px' }} />
    </div>
  );
}
