'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// Specific age bands for distribution charts (exclude aggregates)
const SPECIFIC_BANDS = ['15 - 24', '25 - 34', '35 - 44', '45 - 54', '55 - 64', '65+'];
// Broad aggregates for trend line selection
const AGGREGATE_CODES = ['0', '15 - 64', '20 - 64', '15 - 29'];

const GENDER_COLORS: Record<string, string> = {
  '0': '#6366f1', // Total - indigo
  '1': '#3b82f6', // Male - blue
  '2': '#ec4899', // Female - pink
};

function getGenderLabel(code: string, locale: 'bg' | 'en'): string {
  if (code === '0') return locale === 'bg' ? 'Общо' : 'Total';
  if (code === '1') return locale === 'bg' ? 'Мъже' : 'Male';
  if (code === '2') return locale === 'bg' ? 'Жени' : 'Female';
  return code;
}

function getRate(row: any): number {
  const v = parseFloat(row.Rate);
  return isNaN(v) ? 0 : v;
}

function getAgeCode(row: any): string {
  return row.Age10_LFS_Code || row.Age10_LFS || '';
}

function getAgeLabel(row: any): string {
  return row.Age10_LFS || getAgeCode(row);
}

// Parse "2003Q1" → sortable string; also extract year
function parseQuarter(q: string): { year: number; quarter: number; label: string } {
  const match = q.match(/^(\d{4})Q(\d)$/);
  if (!match) return { year: 0, quarter: 0, label: q };
  return { year: parseInt(match[1]), quarter: parseInt(match[2]), label: q };
}

function sortQuarters(a: string, b: string): number {
  const pa = parseQuarter(a);
  const pb = parseQuarter(b);
  return pa.year !== pb.year ? pa.year - pb.year : pa.quarter - pb.quarter;
}

// Sort age bands logically by the starting number
function sortAgeBands(a: string, b: string): number {
  const numA = parseInt(a) || 999;
  const numB = parseInt(b) || 999;
  return numA - numB;
}

interface ActivityRatesDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function ActivityRatesDashboard({ data, dataset, locale = 'en' }: ActivityRatesDashboardProps) {
  // Derived data
  const { allQuarters, ageGroups, specificBands } = useMemo(() => {
    const quarters = new Set<string>();
    const ages = new Set<string>();

    data.forEach(d => {
      if (d.Year) quarters.add(d.Year);
      const code = getAgeCode(d);
      if (code) ages.add(code);
    });

    const sortedQuarters = [...quarters].sort(sortQuarters);
    const specific = [...ages].filter(a => SPECIFIC_BANDS.includes(a)).sort(sortAgeBands);
    const allAges = [...ages].sort(sortAgeBands);

    return {
      allQuarters: sortedQuarters,
      ageGroups: allAges,
      specificBands: specific,
    };
  }, [data]);

  const latestQuarter = allQuarters[allQuarters.length - 1] || '';

  // KPI metrics from latest quarter
  const kpiData = useMemo(() => {
    if (!latestQuarter) return null;

    const latestTotal = data.find(d =>
      d.Year === latestQuarter &&
      d.Gender_Code === '0' &&
      getAgeCode(d) === '15 - 64'
    );

    const latestMale = data.find(d =>
      d.Year === latestQuarter &&
      d.Gender_Code === '1' &&
      getAgeCode(d) === '15 - 64'
    );

    const latestFemale = data.find(d =>
      d.Year === latestQuarter &&
      d.Gender_Code === '2' &&
      getAgeCode(d) === '15 - 64'
    );

    // Youth activity rate (15-24)
    const youthTotal = data.find(d =>
      d.Year === latestQuarter &&
      d.Gender_Code === '0' &&
      getAgeCode(d) === '15 - 24'
    );

    const totalRate = latestTotal ? getRate(latestTotal) : 0;
    const maleRate = latestMale ? getRate(latestMale) : 0;
    const femaleRate = latestFemale ? getRate(latestFemale) : 0;
    const youthRate = youthTotal ? getRate(youthTotal) : 0;
    const genderGap = maleRate - femaleRate;

    return { totalRate, maleRate, femaleRate, youthRate, genderGap, latestQuarter };
  }, [data, latestQuarter]);

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
                {locale === 'bg' ? `Активност 15-64 (${kpiData.latestQuarter})` : `Activity Rate 15-64 (${kpiData.latestQuarter})`}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.totalRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Полова разлика' : 'Gender Gap'}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.genderGap.toFixed(1)}<span className="text-lg text-muted-foreground"> pp</span></p>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'bg' ? 'Мъже vs Жени' : 'Male vs Female'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Младежка активност (15-24)' : 'Youth Activity (15-24)'}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.youthRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Мъже / Жени' : 'Male / Female'}
              </p>
              <p className="text-2xl font-bold mt-1">
                <span className="text-blue-500">{kpiData.maleRate.toFixed(1)}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-pink-500">{kpiData.femaleRate.toFixed(1)}</span>
                <span className="text-lg text-muted-foreground">%</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trends">
              {locale === 'bg' ? 'Тенденции' : 'Trends'}
            </TabsTrigger>
            <TabsTrigger value="demographics">
              {locale === 'bg' ? 'Демография' : 'Demographics'}
            </TabsTrigger>
            <TabsTrigger value="heatmap">
              {locale === 'bg' ? 'Топлинна карта' : 'Heatmap'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsChart
              data={data}
              allQuarters={allQuarters}
              ageGroups={ageGroups}
              locale={locale}
            />
          </TabsContent>
          <TabsContent value="demographics">
            <DemographicsChart
              data={data}
              specificBands={specificBands}
              allQuarters={allQuarters}
              locale={locale}
            />
          </TabsContent>
          <TabsContent value="heatmap">
            <HeatmapChart
              data={data}
              specificBands={specificBands}
              allQuarters={allQuarters}
              locale={locale}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: Multi-line trend chart by gender for a selected age group
function TrendsChart({ data, allQuarters, ageGroups, locale }: {
  data: any[];
  allQuarters: string[];
  ageGroups: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedAge, setSelectedAge] = useState<string>('15 - 64');

  const seriesData = useMemo(() => {
    const genders = ['0', '1', '2'];

    return genders.map(gCode => {
      const filtered = data.filter(d =>
        d.Gender_Code === gCode &&
        getAgeCode(d) === selectedAge
      );

      const byQuarter: Record<string, number> = {};
      filtered.forEach(row => {
        if (row.Year) byQuarter[row.Year] = getRate(row);
      });

      return {
        genderCode: gCode,
        values: allQuarters.map(q => byQuarter[q] ?? null),
      };
    });
  }, [data, allQuarters, selectedAge]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => value != null ? Number(value).toFixed(1) + '%' : 'N/A',
      },
      legend: {
        data: ['0', '1', '2'].map(c => getGenderLabel(c, locale)),
        bottom: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
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
            // Show only year labels for Q1 to reduce clutter
            const p = parseQuarter(value);
            return p.quarter === 1 ? String(p.year) : value;
          },
        },
      },
      yAxis: {
        type: 'value',
        name: '%',
        min: (value: { min: number }) => Math.floor(value.min - 2),
        max: (value: { max: number }) => Math.ceil(value.max + 2),
      },
      series: seriesData.map(s => ({
        name: getGenderLabel(s.genderCode, locale),
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: GENDER_COLORS[s.genderCode] },
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
  }, [allQuarters, seriesData, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="trend-age" className="text-sm font-medium">
            {locale === 'bg' ? 'Възрастова група' : 'Age Group'}
          </label>
          <Select
            id="trend-age"
            value={selectedAge}
            onChange={(e) => setSelectedAge(e.target.value)}
            className="w-[160px]"
          >
            {ageGroups.map(age => (
              <option key={age} value={age}>
                {age === '0' ? (locale === 'bg' ? 'Общо (15+)' : 'Total (15+)') : age}
              </option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Коефициент на икономическа активност по пол (%)'
            : 'Activity rate by sex (%)'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '420px' }} />
    </div>
  );
}

// Tab 2: Grouped bar chart - specific age bands by gender for a selected quarter
function DemographicsChart({ data, specificBands, allQuarters, locale }: {
  data: any[];
  specificBands: string[];
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

    // Only Male and Female (exclude Total to avoid double-counting)
    const filtered = data.filter(d =>
      d.Year === quarter &&
      (d.Gender_Code === '1' || d.Gender_Code === '2') &&
      specificBands.includes(getAgeCode(d))
    );

    const byAgeSex: Record<string, { male: number; female: number }> = {};
    specificBands.forEach(age => { byAgeSex[age] = { male: 0, female: 0 }; });

    filtered.forEach(row => {
      const code = getAgeCode(row);
      if (!byAgeSex[code]) return;
      if (row.Gender_Code === '1') byAgeSex[code].male = getRate(row);
      else byAgeSex[code].female = getRate(row);
    });

    return specificBands.map(age => ({
      age,
      label: age === '65+' ? (locale === 'bg' ? '65+' : '65+') : age,
      male: byAgeSex[age]?.male || 0,
      female: byAgeSex[age]?.female || 0,
    }));
  }, [data, specificBands, selectedQuarter, allQuarters, locale]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toFixed(1) + '%',
      },
      legend: {
        data: [
          locale === 'bg' ? 'Мъже' : 'Male',
          locale === 'bg' ? 'Жени' : 'Female',
        ],
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: barData.map(d => d.label),
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '%',
        max: 100,
      },
      series: [
        {
          name: locale === 'bg' ? 'Мъже' : 'Male',
          type: 'bar',
          data: barData.map(d => d.male),
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
          barGap: '10%',
        },
        {
          name: locale === 'bg' ? 'Жени' : 'Female',
          type: 'bar',
          data: barData.map(d => d.female),
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
  }, [barData, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="demo-quarter" className="text-sm font-medium">
            {locale === 'bg' ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select
            id="demo-quarter"
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="w-[140px]"
          >
            {allQuarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Мъже vs Жени по възрастови групи (без агрегати)'
            : 'Male vs Female by age band (excludes aggregates)'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '420px' }} />
    </div>
  );
}

// Tab 3: Heatmap – Age group × Time, color = activity rate (Total gender)
function HeatmapChart({ data, specificBands, allQuarters, locale }: {
  data: any[];
  specificBands: string[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const heatmapData = useMemo(() => {
    // Total gender, specific bands only
    const filtered = data.filter(d =>
      d.Gender_Code === '0' &&
      specificBands.includes(getAgeCode(d))
    );

    const points: [number, number, number][] = [];
    let minVal = 100;
    let maxVal = 0;

    filtered.forEach(row => {
      const qIdx = allQuarters.indexOf(row.Year);
      const aIdx = specificBands.indexOf(getAgeCode(row));
      if (qIdx < 0 || aIdx < 0) return;
      const val = getRate(row);
      points.push([qIdx, aIdx, val]);
      if (val > 0) {
        minVal = Math.min(minVal, val);
        maxVal = Math.max(maxVal, val);
      }
    });

    return { points, minVal, maxVal };
  }, [data, specificBands, allQuarters]);

  useEffect(() => {
    if (!chartRef.current || heatmapData.points.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const [qIdx, aIdx, val] = params.data;
          return `${allQuarters[qIdx]}<br/>${specificBands[aIdx]}: <b>${val.toFixed(1)}%</b>`;
        },
      },
      grid: { left: '8%', right: '12%', bottom: '15%', top: '5%' },
      xAxis: {
        type: 'category',
        data: allQuarters,
        splitArea: { show: true },
        axisLabel: {
          rotate: 45,
          fontSize: 9,
          interval: 3, // show every 4th quarter (yearly)
          formatter: (value: string) => {
            const p = parseQuarter(value);
            return p.quarter === 1 ? String(p.year) : '';
          },
        },
      },
      yAxis: {
        type: 'category',
        data: specificBands,
        splitArea: { show: true },
      },
      visualMap: {
        min: Math.floor(heatmapData.minVal),
        max: Math.ceil(heatmapData.maxVal),
        calculable: true,
        orient: 'vertical',
        right: '2%',
        top: 'center',
        inRange: {
          color: ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'],
        },
        text: ['High %', 'Low %'],
      },
      series: [{
        type: 'heatmap',
        data: heatmapData.points,
        label: { show: false },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' },
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
  }, [heatmapData, allQuarters, specificBands, locale]);

  if (heatmapData.points.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{locale === 'bg' ? 'Няма данни' : 'No data available'}</div>;
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        {locale === 'bg'
          ? 'Активност по възрастови групи и тримесечия (Общо, %)'
          : 'Activity rate by age group and quarter (Total, %)'}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
    </div>
  );
}
