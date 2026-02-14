'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

interface WeeklyMortalityDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// Year-specific palette: latest year is bold red, older years are muted grays/blues
const YEAR_COLORS: Record<number, string> = {};
const MUTED_PALETTE = [
  '#94a3b8', '#a1a1aa', '#9ca3af', '#a3a3a3', '#b0b0b0',
  '#8b95a2', '#7c8594', '#8e9bab', '#a0aab8', '#b4bcc8',
  '#6b7280', '#78909c'
];

function getYearColor(year: string, allYears: string[]): string {
  const idx = allYears.indexOf(year);
  const latest = allYears.length - 1;
  if (idx === latest) return '#ef4444'; // Latest year: bold red
  if (idx === latest - 1) return '#f97316'; // Previous year: orange
  return MUTED_PALETTE[idx % MUTED_PALETTE.length];
}

function getYearLineWidth(year: string, allYears: string[]): number {
  const idx = allYears.indexOf(year);
  const latest = allYears.length - 1;
  if (idx === latest) return 3;
  if (idx === latest - 1) return 2;
  return 1;
}

export function WeeklyMortalityDashboard({ data, dataset, locale = 'en' }: WeeklyMortalityDashboardProps) {
  const availableYears = useMemo(() => {
    return [...new Set(data.map(d => d.Year))].filter(Boolean).sort();
  }, [data]);

  // National totals (BG, total gender, total age) for KPIs and trends
  const nationalData = useMemo(() => {
    return data.filter(d =>
      (d.District_Projection_Code || d.District_Projection) === 'BG' &&
      d.Gender_Code === '0' &&
      d.Ages_Code === '0'
    );
  }, [data]);

  const kpiData = useMemo(() => {
    if (nationalData.length === 0) return null;

    const latestYear = availableYears[availableYears.length - 1];
    const prevYear = availableYears.length >= 2 ? availableYears[availableYears.length - 2] : null;

    // Find latest available week in latest year
    const latestYearData = nationalData
      .filter(d => d.Year === latestYear)
      .sort((a, b) => parseInt(a.weeks_Code || a.weeks) - parseInt(b.weeks_Code || b.weeks));

    if (latestYearData.length === 0) return null;

    const latestWeekRow = latestYearData[latestYearData.length - 1];
    const latestWeek = parseInt(latestWeekRow.weeks_Code || latestWeekRow.weeks);
    const latestDeaths = parseFloat(latestWeekRow.Deaths) || 0;

    // Week-over-week
    const prevWeekRow = latestYearData.find(d =>
      parseInt(d.weeks_Code || d.weeks) === latestWeek - 1
    );
    const prevWeekDeaths = prevWeekRow ? parseFloat(prevWeekRow.Deaths) || 0 : 0;
    const wowChange = prevWeekDeaths > 0
      ? ((latestDeaths - prevWeekDeaths) / prevWeekDeaths * 100)
      : 0;

    // Year-over-year (same week, previous year)
    let yoyChange = 0;
    if (prevYear) {
      const sameWeekPrevYear = nationalData.find(d =>
        d.Year === prevYear &&
        parseInt(d.weeks_Code || d.weeks) === latestWeek
      );
      const prevYearDeaths = sameWeekPrevYear ? parseFloat(sameWeekPrevYear.Deaths) || 0 : 0;
      yoyChange = prevYearDeaths > 0
        ? ((latestDeaths - prevYearDeaths) / prevYearDeaths * 100)
        : 0;
    }

    return {
      latestDeaths,
      latestWeek,
      latestYear,
      wowChange,
      yoyChange,
      prevYear
    };
  }, [nationalData, availableYears]);

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
                {locale === 'bg'
                  ? `Умирания (Седм. ${kpiData.latestWeek}, ${kpiData.latestYear})`
                  : `Deaths (Week ${kpiData.latestWeek}, ${kpiData.latestYear})`}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.latestDeaths.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Седмична промяна' : 'Week-over-Week'}
              </p>
              <p className={`text-3xl font-bold mt-1 ${kpiData.wowChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {kpiData.wowChange >= 0 ? '+' : ''}{kpiData.wowChange.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {locale === 'bg'
                  ? `Седм. ${kpiData.latestWeek - 1} → ${kpiData.latestWeek}`
                  : `Week ${kpiData.latestWeek - 1} → ${kpiData.latestWeek}`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Годишна промяна' : 'Year-over-Year'}
              </p>
              <p className={`text-3xl font-bold mt-1 ${kpiData.yoyChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {kpiData.yoyChange >= 0 ? '+' : ''}{kpiData.yoyChange.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {locale === 'bg'
                  ? `Седм. ${kpiData.latestWeek}: ${kpiData.prevYear} → ${kpiData.latestYear}`
                  : `Week ${kpiData.latestWeek}: ${kpiData.prevYear} → ${kpiData.latestYear}`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="seasonal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="seasonal">
              {locale === 'bg' ? 'Сезонност' : 'Seasonal'}
            </TabsTrigger>
            <TabsTrigger value="demographics">
              {locale === 'bg' ? 'Демография' : 'Demographics'}
            </TabsTrigger>
            <TabsTrigger value="regional">
              {locale === 'bg' ? 'По области' : 'Regional'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seasonal">
            <SeasonalTrendsChart data={nationalData} availableYears={availableYears} locale={locale} />
          </TabsContent>
          <TabsContent value="demographics">
            <DemographicChart data={data} availableYears={availableYears} locale={locale} />
          </TabsContent>
          <TabsContent value="regional">
            <RegionalChart data={data} availableYears={availableYears} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: Seasonal mortality trends - multi-line (one per year, weeks on X)
function SeasonalTrendsChart({ data, availableYears, locale }: { data: any[]; availableYears: string[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    // Group by year → week → deaths
    const byYear: Record<string, Record<number, number>> = {};

    data.forEach(row => {
      const year = row.Year;
      if (!year) return;
      const week = parseInt(row.weeks_Code || row.weeks);
      if (isNaN(week)) return;
      if (!byYear[year]) byYear[year] = {};
      byYear[year][week] = parseFloat(row.Deaths) || 0;
    });

    // Weeks 1-53
    const weeks = Array.from({ length: 53 }, (_, i) => i + 1);

    return {
      weeks,
      series: availableYears.map(year => ({
        year,
        data: weeks.map(w => byYear[year]?.[w] ?? null)
      }))
    };
  }, [data, availableYears]);

  useEffect(() => {
    if (!chartRef.current || seriesData.series.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => value != null ? Number(value).toLocaleString() : '-'
      },
      legend: {
        data: availableYears,
        type: 'scroll',
        bottom: 0
      },
      grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: seriesData.weeks.map(w => String(w)),
        name: locale === 'bg' ? 'Седмица' : 'Week',
        nameLocation: 'middle',
        nameGap: 30
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => value >= 1000 ? (value / 1000).toFixed(0) + 'K' : String(value)
        }
      },
      series: seriesData.series.map(s => ({
        name: s.year,
        type: 'line' as const,
        data: s.data,
        smooth: true,
        connectNulls: true,
        showSymbol: false,
        itemStyle: { color: getYearColor(s.year, availableYears) },
        lineStyle: {
          width: getYearLineWidth(s.year, availableYears),
          opacity: availableYears.indexOf(s.year) >= availableYears.length - 2 ? 1 : 0.5
        }
      }))
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [seriesData, availableYears, locale]);

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        {locale === 'bg'
          ? 'Седмични умирания по години (национално ниво)'
          : 'Weekly deaths by year (national level)'}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '450px' }} />
    </div>
  );
}

// Tab 2: Demographic distribution - age/gender stacked bar
function DemographicChart({ data, availableYears, locale }: { data: any[]; availableYears: string[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  const ageData = useMemo(() => {
    const yearToUse = selectedYear || availableYears[availableYears.length - 1];

    // National, individual genders (not total), individual age groups (not total)
    // Sum across all weeks for the year
    const filtered = data.filter(d =>
      d.Year === yearToUse &&
      (d.District_Projection_Code || d.District_Projection) === 'BG' &&
      (d.Gender_Code === '1' || d.Gender_Code === '2') &&
      d.Ages_Code !== '0'
    );

    const byAge: Record<string, { label: string; code: number; male: number; female: number }> = {};
    filtered.forEach(row => {
      const ageCode = row.Ages_Code || '';
      const ageNum = parseInt(ageCode);
      if (isNaN(ageNum)) return;
      if (!byAge[ageCode]) {
        byAge[ageCode] = { label: row.Ages || ageCode, code: ageNum, male: 0, female: 0 };
      }
      const value = parseFloat(row.Deaths) || 0;
      if (row.Gender_Code === '1') byAge[ageCode].male += value;
      else byAge[ageCode].female += value;
    });

    return Object.values(byAge).sort((a, b) => a.code - b.code);
  }, [data, selectedYear, availableYears]);

  useEffect(() => {
    if (!chartRef.current || ageData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toLocaleString()
      },
      legend: {
        data: [
          locale === 'bg' ? 'Мъже' : 'Male',
          locale === 'bg' ? 'Жени' : 'Female'
        ]
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ageData.map(d => d.label),
        axisLabel: { rotate: 45, fontSize: 10, interval: 0 }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => value >= 1000 ? (value / 1000).toFixed(0) + 'K' : String(value)
        }
      },
      series: [
        {
          name: locale === 'bg' ? 'Мъже' : 'Male',
          type: 'bar',
          stack: 'total',
          data: ageData.map(d => d.male),
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: locale === 'bg' ? 'Жени' : 'Female',
          type: 'bar',
          stack: 'total',
          data: ageData.map(d => d.female),
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
  }, [ageData, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="weekly-demo-year" className="text-sm font-medium">
            {locale === 'bg' ? 'Година' : 'Year'}
          </label>
          <Select
            id="weekly-demo-year"
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
      <p className="text-sm text-muted-foreground">
        {locale === 'bg'
          ? 'Общ брой умирания по възрастови групи и пол (сума за всички седмици)'
          : 'Total deaths by age group and sex (summed across all weeks)'}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '420px' }} />
    </div>
  );
}

// Tab 3: Regional breakdown - horizontal bar chart
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

    // Exclude national total (BG), total gender, total age, sum across weeks
    const filtered = data.filter(d =>
      d.Year === yearToUse &&
      d.District_Projection_Code &&
      d.District_Projection_Code !== 'BG' &&
      d.Gender_Code === '0' &&
      d.Ages_Code === '0'
    );

    // Sum deaths across all weeks per district
    const byDistrict: Record<string, { name: string; total: number }> = {};
    filtered.forEach(row => {
      const code = row.District_Projection_Code;
      const name = row.District_Projection || code;
      if (!byDistrict[code]) byDistrict[code] = { name, total: 0 };
      byDistrict[code].total += parseFloat(row.Deaths) || 0;
    });

    return Object.values(byDistrict)
      .sort((a, b) => a.total - b.total); // ascending for horizontal bar
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
        name: locale === 'bg' ? 'Умирания' : 'Deaths',
        type: 'bar',
        data: regionalData.map(d => d.total),
        itemStyle: {
          color: '#ef4444',
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
          <label htmlFor="weekly-regional-year" className="text-sm font-medium">
            {locale === 'bg' ? 'Година' : 'Year'}
          </label>
          <Select
            id="weekly-regional-year"
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
