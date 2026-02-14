'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ICD-10 chapter labels for cause-of-death codes 0-20
const ICD10_LABELS: Record<string, { bg: string; en: string }> = {
  '0': { bg: 'Всички причини', en: 'All causes' },
  '1': { bg: 'Инфекциозни болести', en: 'Infectious diseases' },
  '2': { bg: 'Новообразувания', en: 'Neoplasms' },
  '3': { bg: 'Болести на кръвта', en: 'Blood diseases' },
  '4': { bg: 'Ендокринни болести', en: 'Endocrine diseases' },
  '5': { bg: 'Психични разстройства', en: 'Mental disorders' },
  '6': { bg: 'Нервна система', en: 'Nervous system' },
  '7': { bg: 'Болести на окото', en: 'Eye diseases' },
  '8': { bg: 'Болести на ухото', en: 'Ear diseases' },
  '9': { bg: 'Кръвоносна система', en: 'Circulatory system' },
  '10': { bg: 'Дихателна система', en: 'Respiratory system' },
  '11': { bg: 'Храносмилателна система', en: 'Digestive system' },
  '12': { bg: 'Болести на кожата', en: 'Skin diseases' },
  '13': { bg: 'Опорно-двигателна система', en: 'Musculoskeletal' },
  '14': { bg: 'Пикочо-полова система', en: 'Genitourinary system' },
  '15': { bg: 'Бременност и раждане', en: 'Pregnancy & childbirth' },
  '16': { bg: 'Перинатални състояния', en: 'Perinatal conditions' },
  '17': { bg: 'Вродени аномалии', en: 'Congenital malformations' },
  '18': { bg: 'Неточно определени', en: 'Ill-defined conditions' },
  '19': { bg: 'Травми и отравяния', en: 'Injury & poisoning' },
  '20': { bg: 'Външни причини', en: 'External causes' },
};

// Distinct colors for top-5 cause lines
const CAUSE_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

function getCauseLabel(code: string, locale: 'bg' | 'en'): string {
  return ICD10_LABELS[code]?.[locale] || `ICD-10 Ch. ${code}`;
}

function getCauseCode(row: any): string {
  return row.COD_ICD10ch_Code || row.COD_ICD10ch || '';
}

interface MortalityDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function MortalityDashboard({ data, dataset, locale = 'en' }: MortalityDashboardProps) {
  const availableYears = useMemo(() => {
    return [...new Set(data.map(d => d.Year))].filter(Boolean).sort();
  }, [data]);

  // Base filter: total age + total causes for KPIs
  const baseData = useMemo(() => {
    return data.filter(d =>
      d.Ages_COD_Code === '0' &&
      getCauseCode(d) === '0'
    );
  }, [data]);

  const kpiData = useMemo(() => {
    const national = baseData
      .filter(d => d.NUTS_Code === 'BG' && d.Gender_Code === '0')
      .sort((a, b) => parseInt(a.Year) - parseInt(b.Year));

    if (national.length === 0) return null;

    const first = national[0];
    const latest = national[national.length - 1];
    const peak = national.reduce((max, curr) =>
      (parseFloat(curr.Deaths) || 0) > (parseFloat(max.Deaths) || 0) ? curr : max
    , national[0]);

    const percentChange = parseFloat(first.Deaths) > 0
      ? ((parseFloat(latest.Deaths) - parseFloat(first.Deaths)) / parseFloat(first.Deaths) * 100)
      : 0;

    // Leading cause of death (latest year)
    const causesLatest = data.filter(d =>
      d.Year === latest.Year &&
      d.NUTS_Code === 'BG' &&
      d.Gender_Code === '0' &&
      d.Ages_COD_Code === '0' &&
      getCauseCode(d) !== '0'
    );
    const topCause = causesLatest.reduce((max, curr) =>
      (parseFloat(curr.Deaths) || 0) > (parseFloat(max.Deaths) || 0) ? curr : max
    , causesLatest[0]);

    return {
      latestTotal: parseFloat(latest.Deaths) || 0,
      latestYear: latest.Year,
      percentChange,
      firstYear: first.Year,
      peakYear: peak.Year,
      peakValue: parseFloat(peak.Deaths) || 0,
      topCauseCode: topCause ? getCauseCode(topCause) : '',
      topCauseValue: topCause ? parseFloat(topCause.Deaths) || 0 : 0
    };
  }, [baseData, data]);

  if (!data || data.length === 0 || !kpiData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    );
  }

  const topCausePercent = kpiData.latestTotal > 0
    ? ((kpiData.topCauseValue / kpiData.latestTotal) * 100).toFixed(1)
    : '0';

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
                {locale === 'bg' ? `Умирания (${kpiData.latestYear})` : `Total Deaths (${kpiData.latestYear})`}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.latestTotal.toLocaleString()}</p>
              <p className={`text-sm mt-2 ${kpiData.percentChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {kpiData.percentChange >= 0 ? '\u2191' : '\u2193'} {Math.abs(kpiData.percentChange).toFixed(1)}%
                <span className="text-muted-foreground ml-1">
                  {locale === 'bg' ? `от ${kpiData.firstYear}` : `since ${kpiData.firstYear}`}
                </span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Пикова година' : 'Peak Year'}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.peakYear}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {kpiData.peakValue.toLocaleString()} {locale === 'bg' ? 'умирания' : 'deaths'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Водеща причина' : 'Leading Cause'}
              </p>
              <p className="text-2xl font-bold mt-1">{getCauseLabel(kpiData.topCauseCode, locale)}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {topCausePercent}% {locale === 'bg' ? 'от всички' : 'of all deaths'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">
              {locale === 'bg' ? 'Тенденции' : 'Trends'}
            </TabsTrigger>
            <TabsTrigger value="age-gender">
              {locale === 'bg' ? 'Възраст и пол' : 'Age & Gender'}
            </TabsTrigger>
            <TabsTrigger value="regional">
              {locale === 'bg' ? 'По области' : 'Regional'}
            </TabsTrigger>
            <TabsTrigger value="causes">
              {locale === 'bg' ? 'Причини' : 'Causes'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <CauseTrendsChart data={data} locale={locale} />
          </TabsContent>
          <TabsContent value="age-gender">
            <AgeGenderChart data={data} availableYears={availableYears} locale={locale} />
          </TabsContent>
          <TabsContent value="regional">
            <RegionalChart data={baseData} availableYears={availableYears} locale={locale} />
          </TabsContent>
          <TabsContent value="causes">
            <CausesOverviewChart data={data} availableYears={availableYears} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: Top 5 causes trend over years (line chart)
function CauseTrendsChart({ data, locale }: { data: any[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const { years, top5Codes, seriesData } = useMemo(() => {
    // National, total gender, total age, individual causes
    const filtered = data.filter(d =>
      d.NUTS_Code === 'BG' &&
      d.Gender_Code === '0' &&
      d.Ages_COD_Code === '0' &&
      getCauseCode(d) !== '0'
    );

    // Sum deaths per cause across all years to find top 5
    const totalByCause: Record<string, number> = {};
    filtered.forEach(row => {
      const code = getCauseCode(row);
      totalByCause[code] = (totalByCause[code] || 0) + (parseFloat(row.Deaths) || 0);
    });

    const top5 = Object.entries(totalByCause)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code]) => code);

    // Group by year and cause
    const byYearCause: Record<string, Record<string, number>> = {};
    filtered.forEach(row => {
      const code = getCauseCode(row);
      if (!top5.includes(code)) return;
      const year = row.Year;
      if (!year) return;
      if (!byYearCause[year]) byYearCause[year] = {};
      byYearCause[year][code] = parseFloat(row.Deaths) || 0;
    });

    const sortedYears = Object.keys(byYearCause).sort();

    const series = top5.map(code => ({
      code,
      data: sortedYears.map(y => byYearCause[y]?.[code] || 0)
    }));

    return { years: sortedYears, top5Codes: top5, seriesData: series };
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => Number(value).toLocaleString()
      },
      legend: {
        data: top5Codes.map(c => getCauseLabel(c, locale)),
        type: 'scroll',
        bottom: 0
      },
      grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: years
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => value >= 1000 ? (value / 1000).toFixed(0) + 'K' : String(value)
        }
      },
      series: seriesData.map((s, i) => ({
        name: getCauseLabel(s.code, locale),
        type: 'line' as const,
        data: s.data,
        itemStyle: { color: CAUSE_COLORS[i] },
        lineStyle: { width: 2 },
        smooth: true
      }))
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [years, top5Codes, seriesData, locale]);

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        {locale === 'bg' ? 'Топ 5 причини за смъртност по години' : 'Top 5 causes of death over time'}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '420px' }} />
    </div>
  );
}

// Tab 2: Age & Gender demographic stacked bar with cause filter
function AgeGenderChart({ data, availableYears, locale }: { data: any[]; availableYears: string[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedCause, setSelectedCause] = useState<string>('0');

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  // Available causes for the dropdown
  const causeCodes = useMemo(() => {
    const codes = new Set<string>();
    data.forEach(row => {
      const code = getCauseCode(row);
      if (code) codes.add(code);
    });
    return [...codes].sort((a, b) => parseInt(a) - parseInt(b));
  }, [data]);

  const ageData = useMemo(() => {
    const yearToUse = selectedYear || availableYears[availableYears.length - 1];

    const filtered = data.filter(d =>
      d.Year === yearToUse &&
      d.NUTS_Code === 'BG' &&
      getCauseCode(d) === selectedCause &&
      d.Ages_COD_Code !== '0' && // exclude total
      (d.Gender_Code === '1' || d.Gender_Code === '2')
    );

    // Group by age code
    const byAge: Record<string, { label: string; code: number; male: number; female: number }> = {};
    filtered.forEach(row => {
      const ageCode = row.Ages_COD_Code || '';
      const ageNum = parseInt(ageCode);
      if (isNaN(ageNum)) return;
      if (!byAge[ageCode]) {
        byAge[ageCode] = {
          label: row.Ages_COD || ageCode,
          code: ageNum,
          male: 0,
          female: 0
        };
      }
      const value = parseFloat(row.Deaths) || 0;
      if (row.Gender_Code === '1') byAge[ageCode].male = value;
      else byAge[ageCode].female = value;
    });

    return Object.values(byAge).sort((a, b) => a.code - b.code);
  }, [data, selectedYear, selectedCause, availableYears]);

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
          <label htmlFor="mortality-age-year" className="text-sm font-medium">
            {locale === 'bg' ? 'Година' : 'Year'}
          </label>
          <Select
            id="mortality-age-year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-[120px]"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mortality-age-cause" className="text-sm font-medium">
            {locale === 'bg' ? 'Причина' : 'Cause'}
          </label>
          <Select
            id="mortality-age-cause"
            value={selectedCause}
            onChange={(e) => setSelectedCause(e.target.value)}
            className="w-[220px]"
          >
            {causeCodes.map(code => (
              <option key={code} value={code}>{getCauseLabel(code, locale)}</option>
            ))}
          </Select>
        </div>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '420px' }} />
    </div>
  );
}

// Tab 3: Regional comparison - horizontal bar chart of districts
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

    // District-level NUTS codes are 5 chars (e.g., BG311)
    const filtered = data.filter(d =>
      d.Year === yearToUse &&
      d.NUTS_Code &&
      d.NUTS_Code.length === 5 &&
      d.Gender_Code === '0'
    );

    return filtered
      .map(row => ({
        name: row.NUTS || row.NUTS_Code,
        value: parseFloat(row.Deaths) || 0
      }))
      .sort((a, b) => a.value - b.value); // ascending for horizontal bar (bottom to top)
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
        data: regionalData.map(d => d.value),
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
          <label htmlFor="mortality-regional-year" className="text-sm font-medium">
            {locale === 'bg' ? 'Година' : 'Year'}
          </label>
          <Select
            id="mortality-regional-year"
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

// Tab 4: Causes overview - horizontal bar + gender gap for top causes
function CausesOverviewChart({ data, availableYears, locale }: { data: any[]; availableYears: string[]; locale: 'bg' | 'en' }) {
  const barRef = useRef<HTMLDivElement>(null);
  const genderRef = useRef<HTMLDivElement>(null);

  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  const { causesData, genderGapData } = useMemo(() => {
    const yearToUse = selectedYear || availableYears[availableYears.length - 1];

    // All causes, national, total age, total gender
    const totalFiltered = data.filter(d =>
      d.Year === yearToUse &&
      d.NUTS_Code === 'BG' &&
      d.Gender_Code === '0' &&
      d.Ages_COD_Code === '0' &&
      getCauseCode(d) !== '0'
    );

    const causes = totalFiltered
      .map(row => {
        const code = getCauseCode(row);
        return {
          code,
          name: getCauseLabel(code, locale),
          value: parseFloat(row.Deaths) || 0
        };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => a.value - b.value);

    // Gender gap for top 5 causes
    const top5Codes = [...causes].sort((a, b) => b.value - a.value).slice(0, 5).map(c => c.code);

    const genderFiltered = data.filter(d =>
      d.Year === yearToUse &&
      d.NUTS_Code === 'BG' &&
      d.Ages_COD_Code === '0' &&
      (d.Gender_Code === '1' || d.Gender_Code === '2') &&
      top5Codes.includes(getCauseCode(d))
    );

    const genderMap: Record<string, { male: number; female: number }> = {};
    genderFiltered.forEach(row => {
      const code = getCauseCode(row);
      if (!genderMap[code]) genderMap[code] = { male: 0, female: 0 };
      const value = parseFloat(row.Deaths) || 0;
      if (row.Gender_Code === '1') genderMap[code].male = value;
      else genderMap[code].female = value;
    });

    const gapData = top5Codes
      .map(code => ({
        name: getCauseLabel(code, locale),
        male: genderMap[code]?.male || 0,
        female: genderMap[code]?.female || 0
      }))
      .sort((a, b) => (b.male + b.female) - (a.male + a.female));

    return { causesData: causes, genderGapData: gapData };
  }, [data, selectedYear, availableYears, locale]);

  // Causes horizontal bar
  useEffect(() => {
    if (!barRef.current || causesData.length === 0) return;
    const chart = echarts.init(barRef.current);

    const maxVal = Math.max(...causesData.map(d => d.value));

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
        data: causesData.map(d => d.name),
        axisLabel: { fontSize: 10 }
      },
      series: [{
        name: locale === 'bg' ? 'Умирания' : 'Deaths',
        type: 'bar',
        data: causesData.map(d => ({
          value: d.value,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#fca5a5' },
              { offset: Math.min(d.value / maxVal, 1), color: '#dc2626' }
            ]),
            borderRadius: [0, 4, 4, 0]
          }
        })),
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
  }, [causesData, locale]);

  // Gender gap grouped bar
  useEffect(() => {
    if (!genderRef.current || genderGapData.length === 0) return;
    const chart = echarts.init(genderRef.current);

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
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: genderGapData.map(d => d.name),
        axisLabel: { rotate: 15, fontSize: 10, interval: 0 }
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
          data: genderGapData.map(d => d.male),
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: locale === 'bg' ? 'Жени' : 'Female',
          type: 'bar',
          data: genderGapData.map(d => d.female),
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
  }, [genderGapData, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mortality-causes-year" className="text-sm font-medium">
            {locale === 'bg' ? 'Година' : 'Year'}
          </label>
          <Select
            id="mortality-causes-year"
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
      <div ref={barRef} style={{ width: '100%', height: '550px' }} />
      <div>
        <p className="text-sm font-medium text-center mb-2">
          {locale === 'bg' ? 'Полово разпределение - Топ 5 причини' : 'Gender Gap - Top 5 Causes'}
        </p>
        <div ref={genderRef} style={{ width: '100%', height: '300px' }} />
      </div>
    </div>
  );
}
