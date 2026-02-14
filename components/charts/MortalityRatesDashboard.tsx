'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// European Shortlist of Causes of Death – top-level codes
const COD_LABELS: Record<string, { bg: string; en: string }> = {
  '0': { bg: 'Всички причини за смърт', en: 'All causes of death' },
  '1': { bg: 'Инфекциозни и паразитни болести', en: 'Infectious and parasitic diseases' },
  '2': { bg: 'Новообразувания', en: 'Neoplasms' },
  '3': { bg: 'Болести на кръвта', en: 'Diseases of blood' },
  '4': { bg: 'Ендокринни болести', en: 'Endocrine, nutritional and metabolic diseases' },
  '5': { bg: 'Психични разстройства', en: 'Mental and behavioural disorders' },
  '6': { bg: 'Болести на нервната система', en: 'Diseases of the nervous system' },
  '7': { bg: 'Болести на кръвоносната система', en: 'Diseases of the circulatory system' },
  '8': { bg: 'Болести на дихателната система', en: 'Diseases of the respiratory system' },
  '9': { bg: 'Болести на храносмилателната система', en: 'Diseases of the digestive system' },
  '10': { bg: 'Болести на кожата', en: 'Diseases of the skin' },
  '11': { bg: 'Болести на опорно-двигателната система', en: 'Diseases of the musculoskeletal system' },
  '12': { bg: 'Болести на пикочо-половата система', en: 'Diseases of the genitourinary system' },
  '13': { bg: 'Бременност и раждане', en: 'Pregnancy, childbirth and puerperium' },
  '14': { bg: 'Перинатални състояния', en: 'Certain conditions originating in perinatal period' },
  '15': { bg: 'Вродени аномалии', en: 'Congenital malformations' },
  '16': { bg: 'Неточно определени състояния', en: 'Symptoms and ill-defined conditions' },
  '17': { bg: 'Външни причини за смъртност', en: 'External causes of morbidity and mortality' },
};

// Distinct colors for chart series
const CAUSE_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function getCauseLabel(code: string, locale: 'bg' | 'en'): string {
  return COD_LABELS[code]?.[locale] || `Cause ${code}`;
}

function getCauseCode(row: any): string {
  return row.COD_Shortlist_Code || row.COD_Shortlist || '';
}

// Only top-level cause codes (no dots = no subcategories)
function isTopLevelCause(code: string): boolean {
  return code !== '' && !code.includes('.');
}

function getRate(row: any): number {
  const v = parseFloat(row.Deaths);
  return isNaN(v) ? 0 : v;
}

interface MortalityRatesDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function MortalityRatesDashboard({ data, dataset, locale = 'en' }: MortalityRatesDashboardProps) {
  // Global filter state
  const [selectedRegion, setSelectedRegion] = useState<string>('BG');
  const [selectedGender, setSelectedGender] = useState<string>('0');
  const [selectedCause, setSelectedCause] = useState<string>('0');

  // Available options
  const { availableYears, availableRegions, availableCauses } = useMemo(() => {
    const years = new Set<string>();
    const regions = new Map<string, string>(); // code -> label
    const causes = new Set<string>();

    data.forEach(d => {
      if (d.Year) years.add(d.Year);
      const nutsCode = d.NUTS_Code || '';
      if (nutsCode && !regions.has(nutsCode)) {
        regions.set(nutsCode, d.NUTS || nutsCode);
      }
      const cod = getCauseCode(d);
      if (isTopLevelCause(cod)) causes.add(cod);
    });

    return {
      availableYears: [...years].sort(),
      availableRegions: [...regions.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([code, label]) => ({ code, label })),
      availableCauses: [...causes].sort((a, b) => parseInt(a) - parseInt(b)),
    };
  }, [data]);

  const latestYear = availableYears[availableYears.length - 1] || '';

  // KPI metrics
  const kpiData = useMemo(() => {
    // National, total gender, all causes, latest year
    const nationalAllCauses = data.filter(d =>
      d.NUTS_Code === 'BG' &&
      d.Gender_Code === '0' &&
      getCauseCode(d) === '0'
    ).sort((a, b) => a.Year?.localeCompare(b.Year));

    if (nationalAllCauses.length === 0) return null;
    const latest = nationalAllCauses[nationalAllCauses.length - 1];
    const totalRate = getRate(latest);

    // Leading cause (exclude '0' = all causes)
    const causesLatestYear = data.filter(d =>
      d.Year === latestYear &&
      d.NUTS_Code === 'BG' &&
      d.Gender_Code === '0' &&
      isTopLevelCause(getCauseCode(d)) &&
      getCauseCode(d) !== '0'
    );
    const topCause = causesLatestYear.reduce((max, curr) =>
      getRate(curr) > getRate(max) ? curr : max
    , causesLatestYear[0]);

    // Highest risk region (NUTS level 2 = 4 chars, exclude BG)
    const regionsLatest = data.filter(d =>
      d.Year === latestYear &&
      d.Gender_Code === '0' &&
      getCauseCode(d) === '0' &&
      d.NUTS_Code?.length === 4
    );
    const topRegion = regionsLatest.reduce((max, curr) =>
      getRate(curr) > getRate(max) ? curr : max
    , regionsLatest[0]);

    return {
      totalRate,
      latestYear,
      topCauseCode: topCause ? getCauseCode(topCause) : '',
      topCauseRate: topCause ? getRate(topCause) : 0,
      topRegionName: topRegion?.NUTS || topRegion?.NUTS_Code || '',
      topRegionRate: topRegion ? getRate(topRegion) : 0,
    };
  }, [data, latestYear]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? `Обща смъртност (${kpiData.latestYear})` : `Total Mortality Rate (${kpiData.latestYear})`}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.totalRate.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {locale === 'bg' ? 'на 100 000 души' : 'per 100,000 persons'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Водеща причина' : 'Leading Cause of Death'}
              </p>
              <p className="text-xl font-bold mt-1">{getCauseLabel(kpiData.topCauseCode, locale)}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {kpiData.topCauseRate.toFixed(1)} {locale === 'bg' ? 'на 100 000' : 'per 100k'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Най-засегнат регион' : 'Highest Risk Region'}
              </p>
              <p className="text-xl font-bold mt-1">{kpiData.topRegionName}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {kpiData.topRegionRate.toFixed(1)} {locale === 'bg' ? 'на 100 000' : 'per 100k'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Global Filters */}
        <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rates-region" className="text-sm font-medium">
              {locale === 'bg' ? 'Регион' : 'Region'}
            </label>
            <Select
              id="rates-region"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-[220px]"
            >
              {availableRegions.map(r => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rates-gender" className="text-sm font-medium">
              {locale === 'bg' ? 'Пол' : 'Gender'}
            </label>
            <Select
              id="rates-gender"
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-[140px]"
            >
              <option value="0">{locale === 'bg' ? 'Общо' : 'Total'}</option>
              <option value="1">{locale === 'bg' ? 'Мъже' : 'Male'}</option>
              <option value="2">{locale === 'bg' ? 'Жени' : 'Female'}</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rates-cause" className="text-sm font-medium">
              {locale === 'bg' ? 'Причина' : 'Cause Category'}
            </label>
            <Select
              id="rates-cause"
              value={selectedCause}
              onChange={(e) => setSelectedCause(e.target.value)}
              className="w-[280px]"
            >
              {availableCauses.map(code => (
                <option key={code} value={code}>{getCauseLabel(code, locale)}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trends">
              {locale === 'bg' ? 'Тенденции' : 'Trends'}
            </TabsTrigger>
            <TabsTrigger value="regional">
              {locale === 'bg' ? 'По региони' : 'Regional'}
            </TabsTrigger>
            <TabsTrigger value="gender-gap">
              {locale === 'bg' ? 'Полови различия' : 'Gender Gap'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsChart
              data={data}
              selectedRegion={selectedRegion}
              selectedGender={selectedGender}
              locale={locale}
            />
          </TabsContent>
          <TabsContent value="regional">
            <RegionalChart
              data={data}
              selectedCause={selectedCause}
              selectedGender={selectedGender}
              availableYears={availableYears}
              locale={locale}
            />
          </TabsContent>
          <TabsContent value="gender-gap">
            <GenderGapChart
              data={data}
              latestYear={latestYear}
              locale={locale}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Chart 1: Mortality Trends Over Time – Top 5 causes as lines
function TrendsChart({ data, selectedRegion, selectedGender, locale }: {
  data: any[];
  selectedRegion: string;
  selectedGender: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const { years, top5Codes, seriesData } = useMemo(() => {
    const filtered = data.filter(d =>
      d.NUTS_Code === selectedRegion &&
      d.Gender_Code === selectedGender &&
      isTopLevelCause(getCauseCode(d)) &&
      getCauseCode(d) !== '0'
    );

    // Sum rates per cause to find top 5
    const totalByCause: Record<string, number> = {};
    filtered.forEach(row => {
      const code = getCauseCode(row);
      totalByCause[code] = (totalByCause[code] || 0) + getRate(row);
    });

    const top5 = Object.entries(totalByCause)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code]) => code);

    const byYearCause: Record<string, Record<string, number>> = {};
    filtered.forEach(row => {
      const code = getCauseCode(row);
      if (!top5.includes(code)) return;
      const year = row.Year;
      if (!year) return;
      if (!byYearCause[year]) byYearCause[year] = {};
      byYearCause[year][code] = getRate(row);
    });

    const sortedYears = Object.keys(byYearCause).sort();
    const series = top5.map(code => ({
      code,
      data: sortedYears.map(y => byYearCause[y]?.[code] || 0),
    }));

    return { years: sortedYears, top5Codes: top5, seriesData: series };
  }, [data, selectedRegion, selectedGender]);

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => Number(value).toFixed(1) + ' per 100k',
      },
      legend: {
        data: top5Codes.map(c => getCauseLabel(c, locale)),
        type: 'scroll',
        bottom: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: years },
      yAxis: {
        type: 'value',
        name: locale === 'bg' ? 'на 100 000' : 'per 100,000',
        axisLabel: {
          formatter: (value: number) => value >= 1000 ? (value / 1000).toFixed(0) + 'K' : String(Math.round(value)),
        },
      },
      series: seriesData.map((s, i) => ({
        name: getCauseLabel(s.code, locale),
        type: 'line' as const,
        data: s.data,
        itemStyle: { color: CAUSE_COLORS[i] },
        lineStyle: { width: 2 },
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
      })),
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [years, top5Codes, seriesData, locale]);

  if (years.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{locale === 'bg' ? 'Няма данни за тази комбинация' : 'No data available for this selection'}</div>;
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        {locale === 'bg' ? 'Топ 5 причини за смъртност по години (на 100 000 души)' : 'Top 5 causes of death over time (per 100,000 persons)'}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '420px' }} />
    </div>
  );
}

// Chart 2: Regional Health Disparities – Bar chart of NUTS level 2 regions
function RegionalChart({ data, selectedCause, selectedGender, availableYears, locale }: {
  data: any[];
  selectedCause: string;
  selectedGender: string;
  availableYears: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  const regionalData = useMemo(() => {
    const yearToUse = selectedYear || availableYears[availableYears.length - 1];

    // NUTS level 2 regions = 4-char codes (BG31, BG32, etc.), exclude 'BG' (country total)
    const filtered = data.filter(d =>
      d.Year === yearToUse &&
      d.NUTS_Code?.length === 4 &&
      d.Gender_Code === selectedGender &&
      getCauseCode(d) === selectedCause
    );

    return filtered
      .map(row => ({
        name: row.NUTS || row.NUTS_Code,
        value: getRate(row),
      }))
      .sort((a, b) => b.value - a.value); // descending
  }, [data, selectedYear, selectedCause, selectedGender, availableYears]);

  useEffect(() => {
    if (!chartRef.current || regionalData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const maxVal = Math.max(...regionalData.map(d => d.value));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toFixed(1) + ' per 100k',
      },
      grid: { left: '3%', right: '12%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        name: locale === 'bg' ? 'на 100 000' : 'per 100,000',
      },
      yAxis: {
        type: 'category',
        data: [...regionalData].reverse().map(d => d.name),
        axisLabel: { fontSize: 11 },
      },
      series: [{
        name: locale === 'bg' ? 'Смъртност' : 'Mortality Rate',
        type: 'bar',
        data: [...regionalData].reverse().map(d => ({
          value: d.value,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#93c5fd' },
              { offset: Math.min(d.value / maxVal, 1), color: '#1d4ed8' },
            ]),
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => Number(params.value).toFixed(1),
          fontSize: 11,
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
  }, [regionalData, locale]);

  if (regionalData.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{locale === 'bg' ? 'Няма данни за тази комбинация' : 'No data available for this selection'}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rates-regional-year" className="text-sm font-medium">
            {locale === 'bg' ? 'Година' : 'Year'}
          </label>
          <Select
            id="rates-regional-year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-[120px]"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg' ? 'Статистически райони (NUTS 2), сортирани по смъртност' : 'Statistical regions (NUTS 2), sorted by mortality rate'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
    </div>
  );
}

// Chart 3: The Gender Health Gap – Grouped bar chart
function GenderGapChart({ data, latestYear, locale }: {
  data: any[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const genderData = useMemo(() => {
    // National data, individual top-level causes, latest year
    const filtered = data.filter(d =>
      d.Year === latestYear &&
      d.NUTS_Code === 'BG' &&
      isTopLevelCause(getCauseCode(d)) &&
      getCauseCode(d) !== '0' &&
      (d.Gender_Code === '1' || d.Gender_Code === '2')
    );

    // Build map of cause -> { male, female }
    const byCode: Record<string, { male: number; female: number }> = {};
    filtered.forEach(row => {
      const code = getCauseCode(row);
      if (!byCode[code]) byCode[code] = { male: 0, female: 0 };
      const value = getRate(row);
      if (row.Gender_Code === '1') byCode[code].male = value;
      else byCode[code].female = value;
    });

    // Sort by total (male+female) descending, take top 5
    return Object.entries(byCode)
      .map(([code, vals]) => ({
        code,
        name: getCauseLabel(code, locale),
        male: vals.male,
        female: vals.female,
        total: vals.male + vals.female,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [data, latestYear, locale]);

  useEffect(() => {
    if (!chartRef.current || genderData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toFixed(1) + ' per 100k',
      },
      legend: {
        data: [
          locale === 'bg' ? 'Мъже' : 'Male',
          locale === 'bg' ? 'Жени' : 'Female',
        ],
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: genderData.map(d => d.name),
        axisLabel: { rotate: 20, fontSize: 10, interval: 0 },
      },
      yAxis: {
        type: 'value',
        name: locale === 'bg' ? 'на 100 000' : 'per 100,000',
        axisLabel: {
          formatter: (value: number) => value >= 1000 ? (value / 1000).toFixed(0) + 'K' : String(Math.round(value)),
        },
      },
      series: [
        {
          name: locale === 'bg' ? 'Мъже' : 'Male',
          type: 'bar',
          data: genderData.map(d => d.male),
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: locale === 'bg' ? 'Жени' : 'Female',
          type: 'bar',
          data: genderData.map(d => d.female),
          itemStyle: { color: '#ec4899', borderRadius: [4, 4, 0, 0] },
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
  }, [genderData, locale]);

  if (genderData.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{locale === 'bg' ? 'Няма данни за тази комбинация' : 'No data available for this selection'}</div>;
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        {locale === 'bg'
          ? `Полови различия – Топ 5 причини за смъртност (${latestYear}, на 100 000)`
          : `Gender Gap – Top 5 Causes of Death (${latestYear}, per 100,000)`}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '420px' }} />
    </div>
  );
}
