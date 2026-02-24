'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// Ordered age bands for display (exclude aggregates like 15-64, 20-64, 15-29)
const AGE_BAND_ORDER = ['15 - 24', '25 - 34', '35 - 44', '45 - 54', '55 - 64', '65+'];

const AGE_COLORS: Record<string, string> = {
  '15 - 24': '#f59e0b',
  '25 - 34': '#10b981',
  '35 - 44': '#3b82f6',
  '45 - 54': '#8b5cf6',
  '55 - 64': '#ef4444',
  '65+': '#64748b',
};

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

interface EmploymentRatesByAgeDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function EmploymentRatesByAgeDashboard({ data, dataset, locale = 'en' }: EmploymentRatesByAgeDashboardProps) {
  const [selectedGender, setSelectedGender] = useState<string>('0');

  const { allQuarters, ageGroups } = useMemo(() => {
    const quarters = new Set<string>();
    const ages = new Set<string>();

    data.forEach(d => {
      if (d.Year) quarters.add(d.Year);
      const code = d.Age10_LFS_Code || '';
      if (code && AGE_BAND_ORDER.includes(code)) ages.add(code);
    });

    return {
      allQuarters: [...quarters].sort(sortQuarters),
      ageGroups: AGE_BAND_ORDER.filter(a => ages.has(a)),
    };
  }, [data]);

  const latestQuarter = allQuarters[allQuarters.length - 1] || '';
  const prevYearQuarter = useMemo(() => {
    if (!latestQuarter) return '';
    const p = parseQuarter(latestQuarter);
    const target = `${p.year - 1}Q${p.quarter}`;
    return allQuarters.includes(target) ? target : '';
  }, [latestQuarter, allQuarters]);

  // KPI: 15-64 total rate
  const kpiData = useMemo(() => {
    if (!latestQuarter) return null;

    const find = (quarter: string, gender: string, age: string) =>
      data.find(d => d.Year === quarter && d.Gender_Code === gender && d.Age10_LFS_Code === age);

    const latest1564 = find(latestQuarter, '0', '15 - 64');
    const prev1564 = prevYearQuarter ? find(prevYearQuarter, '0', '15 - 64') : null;
    const latestRate = latest1564 ? getRate(latest1564) : null;
    const prevRate = prev1564 ? getRate(prev1564) : null;
    const yoyChange = latestRate != null && prevRate != null ? latestRate - prevRate : null;

    // Highest and lowest age band
    const bandRates = ageGroups.map(age => {
      const row = find(latestQuarter, selectedGender, age);
      return { age, rate: row ? getRate(row) : null };
    }).filter(b => b.rate != null) as { age: string; rate: number }[];

    bandRates.sort((a, b) => b.rate - a.rate);
    const highest = bandRates[0] || null;
    const lowest = bandRates[bandRates.length - 1] || null;

    return { latestRate, yoyChange, highest, lowest, latestQuarter };
  }, [data, latestQuarter, prevYearQuarter, ageGroups, selectedGender]);

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
        {/* Global gender filter */}
        <div className="flex flex-wrap gap-4 items-end p-4 bg-muted/30 rounded-lg">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="emp-age-gender" className="text-sm font-medium">
              {locale === 'bg' ? 'Пол' : 'Gender'}
            </label>
            <Select id="emp-age-gender" value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className="w-[140px]">
              <option value="0">{locale === 'bg' ? 'Общо' : 'Total'}</option>
              <option value="1">{locale === 'bg' ? 'Мъже' : 'Male'}</option>
              <option value="2">{locale === 'bg' ? 'Жени' : 'Female'}</option>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? `Заетост 15-64 (${kpiData.latestQuarter})` : `Employment 15-64 (${kpiData.latestQuarter})`}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.latestRate != null ? kpiData.latestRate.toFixed(1) : '—'}%</p>
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
                {locale === 'bg' ? 'Най-висока заетост' : 'Highest Employment'}
              </p>
              {kpiData.highest && (
                <>
                  <p className="text-3xl font-bold mt-1 text-emerald-600">{kpiData.highest.rate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {locale === 'bg' ? 'Възраст' : 'Age'} {kpiData.highest.age}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Най-ниска заетост' : 'Lowest Employment'}
              </p>
              {kpiData.lowest && (
                <>
                  <p className="text-3xl font-bold mt-1 text-red-500">{kpiData.lowest.rate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {locale === 'bg' ? 'Възраст' : 'Age'} {kpiData.lowest.age}
                  </p>
                </>
              )}
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
              {locale === 'bg' ? 'По възраст' : 'By Age Group'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsChart data={data} allQuarters={allQuarters} ageGroups={ageGroups} selectedGender={selectedGender} locale={locale} />
          </TabsContent>
          <TabsContent value="snapshot">
            <DemographicSnapshot data={data} allQuarters={allQuarters} ageGroups={ageGroups} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: Multi-line trend by age band
function TrendsChart({ data, allQuarters, ageGroups, selectedGender, locale }: {
  data: any[];
  allQuarters: string[];
  ageGroups: string[];
  selectedGender: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    return ageGroups.map(age => {
      const filtered = data.filter(d =>
        d.Gender_Code === selectedGender && d.Age10_LFS_Code === age
      );
      const byQuarter: Record<string, number | null> = {};
      filtered.forEach(row => {
        if (row.Year) byQuarter[row.Year] = getRate(row);
      });

      return {
        age,
        label: age === '65+' ? (locale === 'bg' ? '65 и повече' : '65 and over') : age,
        values: allQuarters.map(q => byQuarter[q] ?? null),
      };
    });
  }, [data, allQuarters, ageGroups, selectedGender, locale]);

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
        itemStyle: { color: AGE_COLORS[s.age] || undefined },
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
          ? 'Коефициент на заетост по възрастови групи (%)'
          : 'Employment rate by age group (%)'}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '450px' }} />
    </div>
  );
}

// Tab 2: Grouped bar chart – Male vs Female for latest quarter by age band
function DemographicSnapshot({ data, allQuarters, ageGroups, locale }: {
  data: any[];
  allQuarters: string[];
  ageGroups: string[];
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

    return ageGroups.map(age => {
      const findRate = (gCode: string) => {
        const row = data.find(d =>
          d.Year === quarter && d.Gender_Code === gCode && d.Age10_LFS_Code === age
        );
        return row ? (getRate(row) ?? 0) : 0;
      };

      return {
        age,
        label: age === '65+' ? (locale === 'bg' ? '65+' : '65+') : age,
        male: findRate('1'),
        female: findRate('2'),
      };
    });
  }, [data, allQuarters, ageGroups, selectedQuarter, locale]);

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
      grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        data: barData.map(d => d.label),
        axisLabel: { fontSize: 12 },
      },
      yAxis: {
        type: 'value',
        name: '%',
        max: 100,
      },
      series: [
        {
          name: maleLabel,
          type: 'bar',
          data: barData.map(d => ({
            value: d.male,
            itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
          })),
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => Number(params.value).toFixed(1) + '%',
            fontSize: 10,
          },
        },
        {
          name: femaleLabel,
          type: 'bar',
          data: barData.map(d => ({
            value: d.female,
            itemStyle: { color: '#a855f7', borderRadius: [4, 4, 0, 0] },
          })),
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => Number(params.value).toFixed(1) + '%',
            fontSize: 10,
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

  if (barData.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{locale === 'bg' ? 'Няма данни' : 'No data available'}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="emp-age-quarter" className="text-sm font-medium">
            {locale === 'bg' ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="emp-age-quarter" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
            {allQuarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Мъже (синьо) vs Жени (лилаво) по възрастова група'
            : 'Male (blue) vs Female (purple) by age group'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
    </div>
  );
}
