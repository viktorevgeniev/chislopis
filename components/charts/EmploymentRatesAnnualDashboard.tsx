'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// 10-year age bands for bar chart (non-overlapping buckets)
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
  if (row.Rate == null || row.Rate === '' || row.Rate === '..' || row.Rate === 'null') return null;
  const v = parseFloat(row.Rate);
  return isNaN(v) ? null : v;
}

function sortYears(a: string, b: string): number {
  return parseInt(a) - parseInt(b);
}

interface EmploymentRatesAnnualDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function EmploymentRatesAnnualDashboard({ data, dataset, locale = 'en' }: EmploymentRatesAnnualDashboardProps) {
  const [selectedAge, setSelectedAge] = useState<string>('15 - 64');
  const [selectedGender, setSelectedGender] = useState<string>('0');

  const { allYears, ageGroups } = useMemo(() => {
    const years = new Set<string>();
    const ages = new Set<string>();

    data.forEach(d => {
      if (d.Year) years.add(d.Year);
      const code = d.Age10_LFS_Code || '';
      if (code) ages.add(code);
    });

    return {
      allYears: [...years].sort(sortYears),
      ageGroups: [...ages].sort(),
    };
  }, [data]);

  const latestYear = allYears[allYears.length - 1] || '';
  const prevYear = allYears.length >= 2 ? allYears[allYears.length - 2] : '';

  // KPI data
  const kpiData = useMemo(() => {
    if (!latestYear) return null;

    const findRate = (year: string, gender: string, age: string) => {
      const row = data.find(d => d.Year === year && d.Gender_Code === gender && d.Age10_LFS_Code === age);
      return row ? getRate(row) : null;
    };

    const latestRate = findRate(latestYear, selectedGender, selectedAge);
    const prevRate = prevYear ? findRate(prevYear, selectedGender, selectedAge) : null;
    const yoyChange = latestRate != null && prevRate != null ? latestRate - prevRate : null;

    // Gender gap for selected age
    const maleRate = findRate(latestYear, '1', selectedAge);
    const femaleRate = findRate(latestYear, '2', selectedAge);
    const genderGap = maleRate != null && femaleRate != null ? maleRate - femaleRate : null;

    return { latestRate, yoyChange, maleRate, femaleRate, genderGap, latestYear };
  }, [data, latestYear, prevYear, selectedAge, selectedGender]);

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
        {/* Global filters */}
        <div className="flex flex-wrap gap-4 items-end p-4 bg-muted/30 rounded-lg">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="emp-ann-age" className="text-sm font-medium">
              {locale === 'bg' ? 'Възрастова група' : 'Age Group'}
            </label>
            <Select id="emp-ann-age" value={selectedAge} onChange={(e) => setSelectedAge(e.target.value)} className="w-[160px]">
              {ageGroups.map(age => (
                <option key={age} value={age}>
                  {age === '0' ? (locale === 'bg' ? 'Общо (15+)' : 'Total (15+)') : age}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="emp-ann-gender" className="text-sm font-medium">
              {locale === 'bg' ? 'Пол' : 'Gender'}
            </label>
            <Select id="emp-ann-gender" value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className="w-[140px]">
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
                {locale === 'bg' ? `Заетост ${selectedAge} (${kpiData.latestYear})` : `Employment ${selectedAge} (${kpiData.latestYear})`}
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
                {locale === 'bg' ? 'Мъже / Жени' : 'Male / Female'}
              </p>
              <p className="text-2xl font-bold mt-1">
                <span className="text-blue-500">{kpiData.maleRate != null ? kpiData.maleRate.toFixed(1) : '—'}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-pink-500">{kpiData.femaleRate != null ? kpiData.femaleRate.toFixed(1) : '—'}</span>
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
                {kpiData.genderGap != null ? kpiData.genderGap.toFixed(1) : '—'}
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
            <TabsTrigger value="demographic">
              {locale === 'bg' ? 'По възраст' : 'By Age Group'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsChart data={data} allYears={allYears} selectedAge={selectedAge} selectedGender={selectedGender} locale={locale} />
          </TabsContent>
          <TabsContent value="demographic">
            <DemographicChart data={data} allYears={allYears} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: Multi-line trend — if Total gender selected, show Male/Female/Total; otherwise single line
function TrendsChart({ data, allYears, selectedAge, selectedGender, locale }: {
  data: any[];
  allYears: string[];
  selectedAge: string;
  selectedGender: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    if (selectedGender === '0') {
      // Show Total, Male, Female
      return ['0', '1', '2'].map(gCode => {
        const gLabel = gCode === '0' ? (locale === 'bg' ? 'Общо' : 'Total')
          : gCode === '1' ? (locale === 'bg' ? 'Мъже' : 'Male')
          : (locale === 'bg' ? 'Жени' : 'Female');
        const color = gCode === '0' ? '#64748b' : gCode === '1' ? '#3b82f6' : '#ec4899';

        const filtered = data.filter(d => d.Gender_Code === gCode && d.Age10_LFS_Code === selectedAge);
        const byYear: Record<string, number | null> = {};
        filtered.forEach(r => { if (r.Year) byYear[r.Year] = getRate(r); });

        return {
          name: gLabel,
          color,
          width: gCode === '0' ? 3 : 2,
          values: allYears.map(y => byYear[y] ?? null),
        };
      });
    } else {
      const gLabel = selectedGender === '1' ? (locale === 'bg' ? 'Мъже' : 'Male') : (locale === 'bg' ? 'Жени' : 'Female');
      const color = selectedGender === '1' ? '#3b82f6' : '#ec4899';

      const filtered = data.filter(d => d.Gender_Code === selectedGender && d.Age10_LFS_Code === selectedAge);
      const byYear: Record<string, number | null> = {};
      filtered.forEach(r => { if (r.Year) byYear[r.Year] = getRate(r); });

      return [{
        name: gLabel,
        color,
        width: 2,
        values: allYears.map(y => byYear[y] ?? null),
      }];
    }
  }, [data, allYears, selectedAge, selectedGender, locale]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
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
      grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allYears,
        axisLabel: { fontSize: 11 },
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
        symbol: 'circle',
        symbolSize: 6,
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
  }, [allYears, seriesData]);

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        {locale === 'bg'
          ? 'Годишен коефициент на заетост (%)'
          : 'Annual employment rate (%)'}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '420px' }} />
    </div>
  );
}

// Tab 2: Bar chart — 10-year age buckets for latest year, Male vs Female
function DemographicChart({ data, allYears, locale }: {
  data: any[];
  allYears: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    if (allYears.length > 0 && !selectedYear) {
      setSelectedYear(allYears[allYears.length - 1]);
    }
  }, [allYears, selectedYear]);

  const barData = useMemo(() => {
    const year = selectedYear || allYears[allYears.length - 1];

    return AGE_BAND_ORDER.map(age => {
      const findRate = (gCode: string) => {
        const row = data.find(d => d.Year === year && d.Gender_Code === gCode && d.Age10_LFS_Code === age);
        return row ? (getRate(row) ?? 0) : 0;
      };
      return {
        age,
        male: findRate('1'),
        female: findRate('2'),
      };
    });
  }, [data, allYears, selectedYear]);

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
        data: barData.map(d => d.age),
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
            itemStyle: { color: '#ec4899', borderRadius: [4, 4, 0, 0] },
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="emp-ann-year" className="text-sm font-medium">
            {locale === 'bg' ? 'Година' : 'Year'}
          </label>
          <Select id="emp-ann-year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-[120px]">
            {allYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Мъже (синьо) vs Жени (розово) по 10-годишни възрастови групи'
            : 'Male (blue) vs Female (pink) by 10-year age bands'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
    </div>
  );
}
