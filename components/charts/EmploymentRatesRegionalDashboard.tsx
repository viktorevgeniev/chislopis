'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

const REGION_COLORS: Record<string, string> = {
  BG: '#1e293b',
  BG31: '#ef4444',
  BG32: '#f59e0b',
  BG33: '#10b981',
  BG34: '#3b82f6',
  BG41: '#8b5cf6',
  BG42: '#ec4899',
};

function getRate(row: any): number {
  const v = parseFloat(row.Rate);
  return isNaN(v) ? 0 : v;
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

function nutsLevel(code: string): number {
  if (code === 'BG') return 0;
  if (code.length === 4) return 2; // BG31-BG42
  if (code.length === 5) return 3; // BG311-BG425
  return -1;
}

interface EmploymentRatesRegionalDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function EmploymentRatesRegionalDashboard({ data, dataset, locale = 'en' }: EmploymentRatesRegionalDashboardProps) {
  const { allQuarters, nuts2Regions, nuts3Districts } = useMemo(() => {
    const quarters = new Set<string>();
    const n2Map = new Map<string, string>();
    const n3Map = new Map<string, string>();

    data.forEach(d => {
      if (d.Year) quarters.add(d.Year);
      const code = d.NUTS_Code || '';
      const label = d.NUTS || code;
      if (nutsLevel(code) === 2 && !n2Map.has(code)) n2Map.set(code, label);
      if (nutsLevel(code) === 3 && !n3Map.has(code)) n3Map.set(code, label);
    });

    return {
      allQuarters: [...quarters].sort(sortQuarters),
      nuts2Regions: [...n2Map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
      nuts3Districts: [...n3Map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
    };
  }, [data]);

  const latestQuarter = allQuarters[allQuarters.length - 1] || '';
  const prevYearQuarter = useMemo(() => {
    if (!latestQuarter) return '';
    const p = parseQuarter(latestQuarter);
    const target = `${p.year - 1}Q${p.quarter}`;
    return allQuarters.includes(target) ? target : '';
  }, [latestQuarter, allQuarters]);

  // KPI data
  const kpiData = useMemo(() => {
    if (!latestQuarter) return null;

    const find = (quarter: string, gender: string) => data.find(d =>
      d.Year === quarter && d.NUTS_Code === 'BG' && d.Gender_Code === gender
    );

    const latest = find(latestQuarter, '0');
    const prevYear = prevYearQuarter ? find(prevYearQuarter, '0') : null;

    const latestRate = latest ? getRate(latest) : 0;
    const prevRate = prevYear ? getRate(prevYear) : 0;
    const yoyChange = prevRate > 0 ? latestRate - prevRate : 0;

    const latestMale = find(latestQuarter, '1');
    const latestFemale = find(latestQuarter, '2');
    const maleRate = latestMale ? getRate(latestMale) : 0;
    const femaleRate = latestFemale ? getRate(latestFemale) : 0;

    return { latestRate, yoyChange, maleRate, femaleRate, latestQuarter };
  }, [data, latestQuarter, prevYearQuarter]);

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
                {locale === 'bg' ? `Заетост 15-64 (${kpiData.latestQuarter})` : `Employment Rate 15-64 (${kpiData.latestQuarter})`}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.latestRate.toFixed(1)}%</p>
              {kpiData.yoyChange !== 0 && (
                <p className={`text-sm mt-2 ${kpiData.yoyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpiData.yoyChange >= 0 ? '\u2191' : '\u2193'} {Math.abs(kpiData.yoyChange).toFixed(1)} pp
                  <span className="text-muted-foreground ml-1">
                    {locale === 'bg' ? 'г/г' : 'YoY'}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Полова разлика (15-64)' : 'Gender Gap (15-64)'}
              </p>
              <p className="text-3xl font-bold mt-1">{(kpiData.maleRate - kpiData.femaleRate).toFixed(1)}<span className="text-lg text-muted-foreground"> pp</span></p>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'bg' ? 'Мъже vs Жени' : 'Male vs Female'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Мъже / Жени (15-64)' : 'Male / Female (15-64)'}
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

        {/* Charts */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trends">
              {locale === 'bg' ? 'Тенденции' : 'Trends'}
            </TabsTrigger>
            <TabsTrigger value="regional">
              {locale === 'bg' ? 'По региони' : 'Regional'}
            </TabsTrigger>
            <TabsTrigger value="scatter">
              {locale === 'bg' ? 'М vs Ж' : 'M vs F Scatter'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsChart data={data} allQuarters={allQuarters} nuts2Regions={nuts2Regions} locale={locale} />
          </TabsContent>
          <TabsContent value="regional">
            <RegionalBarChart data={data} allQuarters={allQuarters} nuts2Regions={nuts2Regions} locale={locale} />
          </TabsContent>
          <TabsContent value="scatter">
            <GenderScatterChart data={data} allQuarters={allQuarters} nuts3Districts={nuts3Districts} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: National + selected region trend with Male/Female lines
function TrendsChart({ data, allQuarters, nuts2Regions, locale }: {
  data: any[];
  allQuarters: string[];
  nuts2Regions: { code: string; label: string }[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  const seriesData = useMemo(() => {
    const codes = ['BG'];
    if (selectedRegion && selectedRegion !== 'BG') codes.push(selectedRegion);

    const regionLabel = (code: string) => {
      if (code === 'BG') return locale === 'bg' ? 'България' : 'Bulgaria';
      return nuts2Regions.find(r => r.code === code)?.label || code;
    };

    const result: { name: string; color: string; dashStyle?: number[]; values: (number | null)[] }[] = [];

    for (const nutsCode of codes) {
      for (const gCode of ['1', '2']) {
        const gLabel = gCode === '1' ? (locale === 'bg' ? 'Мъже' : 'Male') : (locale === 'bg' ? 'Жени' : 'Female');
        const label = `${regionLabel(nutsCode)} – ${gLabel}`;

        const filtered = data.filter(d =>
          d.NUTS_Code === nutsCode && d.Gender_Code === gCode
        );
        const byQuarter: Record<string, number> = {};
        filtered.forEach(row => { if (row.Year) byQuarter[row.Year] = getRate(row); });

        result.push({
          name: label,
          color: nutsCode === 'BG'
            ? (gCode === '1' ? '#3b82f6' : '#ec4899')
            : (gCode === '1' ? '#60a5fa' : '#f472b6'),
          dashStyle: nutsCode !== 'BG' ? [5, 3] : undefined,
          values: allQuarters.map(q => byQuarter[q] ?? null),
        });
      }
    }

    return result;
  }, [data, allQuarters, nuts2Regions, selectedRegion, locale]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => value != null ? Number(value).toFixed(1) + '%' : 'N/A',
      },
      legend: {
        data: seriesData.map(s => s.name),
        type: 'scroll',
        bottom: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: 60, end: 100 },
        { type: 'slider', start: 60, end: 100, height: 20, bottom: 30 },
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
        min: (value: { min: number }) => Math.floor(value.min - 2),
        max: (value: { max: number }) => Math.ceil(value.max + 2),
      },
      series: seriesData.map(s => ({
        name: s.name,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: 2, type: s.dashStyle ? ('dashed' as const) : ('solid' as const) },
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
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="emp-trend-region" className="text-sm font-medium">
            {locale === 'bg' ? 'Сравни с регион' : 'Compare with Region'}
          </label>
          <Select id="emp-trend-region" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="w-[220px]">
            <option value="">{locale === 'bg' ? 'Само национално' : 'National only'}</option>
            {nuts2Regions.map(r => (
              <option key={r.code} value={r.code}>{r.label}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg' ? 'Заетост по пол – национално vs регион (%)' : 'Employment by gender – national vs region (%)'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '450px' }} />
    </div>
  );
}

// Tab 2: Grouped bar chart – NUTS2 regions, Male/Female, sorted descending by Total
function RegionalBarChart({ data, allQuarters, nuts2Regions, locale }: {
  data: any[];
  allQuarters: string[];
  nuts2Regions: { code: string; label: string }[];
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

    return nuts2Regions.map(region => {
      const findRate = (gCode: string) => {
        const row = data.find(d =>
          d.Year === quarter && d.NUTS_Code === region.code && d.Gender_Code === gCode
        );
        return row ? getRate(row) : 0;
      };

      return {
        code: region.code,
        label: region.label,
        total: findRate('0'),
        male: findRate('1'),
        female: findRate('2'),
      };
    }).sort((a, b) => b.total - a.total);
  }, [data, allQuarters, nuts2Regions, selectedQuarter]);

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
      grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', name: '%' },
      yAxis: {
        type: 'category',
        data: [...barData].reverse().map(d => d.label),
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          name: maleLabel,
          type: 'bar',
          data: [...barData].reverse().map(d => ({
            value: d.male,
            itemStyle: { color: '#3b82f6', borderRadius: [0, 4, 4, 0] },
          })),
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => Number(params.value).toFixed(1) + '%',
            fontSize: 10,
          },
        },
        {
          name: femaleLabel,
          type: 'bar',
          data: [...barData].reverse().map(d => ({
            value: d.female,
            itemStyle: { color: '#ec4899', borderRadius: [0, 4, 4, 0] },
          })),
          label: {
            show: true,
            position: 'right',
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
          <label htmlFor="emp-bar-quarter" className="text-sm font-medium">
            {locale === 'bg' ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="emp-bar-quarter" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
            {allQuarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'NUTS2 региони – мъже vs жени, сортирано по общо (низх.)'
            : 'NUTS2 regions – male vs female, sorted by total (desc.)'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '350px' }} />
    </div>
  );
}

// Tab 3: Scatter plot – Male vs Female employment rates for NUTS3 districts
function GenderScatterChart({ data, allQuarters, nuts3Districts, locale }: {
  data: any[];
  allQuarters: string[];
  nuts3Districts: { code: string; label: string }[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');

  useEffect(() => {
    if (allQuarters.length > 0 && !selectedQuarter) {
      setSelectedQuarter(allQuarters[allQuarters.length - 1]);
    }
  }, [allQuarters, selectedQuarter]);

  const scatterData = useMemo(() => {
    const quarter = selectedQuarter || allQuarters[allQuarters.length - 1];

    return nuts3Districts.map(district => {
      const maleRow = data.find(d =>
        d.Year === quarter && d.NUTS_Code === district.code && d.Gender_Code === '1'
      );
      const femaleRow = data.find(d =>
        d.Year === quarter && d.NUTS_Code === district.code && d.Gender_Code === '2'
      );

      const maleRate = maleRow ? getRate(maleRow) : 0;
      const femaleRate = femaleRow ? getRate(femaleRow) : 0;

      // Find parent NUTS2 for coloring
      const parent = district.code.substring(0, 4);

      return {
        code: district.code,
        label: district.label,
        male: maleRate,
        female: femaleRate,
        parent,
      };
    }).filter(d => d.male > 0 || d.female > 0);
  }, [data, allQuarters, nuts3Districts, selectedQuarter]);

  useEffect(() => {
    if (!chartRef.current || scatterData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const allRates = scatterData.flatMap(d => [d.male, d.female]).filter(v => v > 0);
    const minRate = Math.floor(Math.min(...allRates) - 5);
    const maxRate = Math.ceil(Math.max(...allRates) + 5);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const d = params.data;
          return `<strong>${d[2]}</strong><br/>${locale === 'bg' ? 'Мъже' : 'Male'}: ${d[0].toFixed(1)}%<br/>${locale === 'bg' ? 'Жени' : 'Female'}: ${d[1].toFixed(1)}%`;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
      xAxis: {
        type: 'value',
        name: locale === 'bg' ? 'Мъже (%)' : 'Male (%)',
        min: minRate,
        max: maxRate,
      },
      yAxis: {
        type: 'value',
        name: locale === 'bg' ? 'Жени (%)' : 'Female (%)',
        min: minRate,
        max: maxRate,
      },
      series: [
        {
          name: locale === 'bg' ? 'Области' : 'Districts',
          type: 'scatter',
          data: scatterData.map(d => [d.male, d.female, d.label, d.parent]),
          symbolSize: 14,
          itemStyle: {
            color: (params: any) => REGION_COLORS[params.data[3]] || '#64748b',
            borderColor: '#fff',
            borderWidth: 1,
          },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => {
              const label: string = params.data[2];
              return label.length > 12 ? label.substring(0, 12) + '...' : label;
            },
            fontSize: 9,
            color: '#374151',
          },
        },
        {
          name: locale === 'bg' ? 'Равенство' : 'Equality line',
          type: 'line',
          data: [[minRate, minRate], [maxRate, maxRate]],
          lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
          symbol: 'none',
          silent: true,
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
  }, [scatterData, locale]);

  if (scatterData.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{locale === 'bg' ? 'Няма данни' : 'No data available'}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="emp-scatter-quarter" className="text-sm font-medium">
            {locale === 'bg' ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="emp-scatter-quarter" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
            {allQuarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Мъжка vs женска заетост по области (NUTS3). Точки над диагонала = по-висока женска заетост.'
            : 'Male vs female employment by district (NUTS3). Points above diagonal = higher female rate.'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '500px' }} />
    </div>
  );
}
