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
  BG31: '#ef4444', BG32: '#f59e0b', BG33: '#10b981',
  BG34: '#3b82f6', BG41: '#8b5cf6', BG42: '#ec4899',
};

function getRate(row: any): number | null {
  if (row.Rate == null || row.Rate === '' || row.Rate === '..' || row.Rate === 'null') return null;
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

function nutsLevel(code: string): 'country' | 'region' | 'district' | 'unknown' {
  if (code === 'BG') return 'country';
  if (code.length === 4) return 'region';
  if (code.length === 5) return 'district';
  return 'unknown';
}

interface EmploymentRatesAllRegionsDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function EmploymentRatesAllRegionsDashboard({ data, dataset, locale = 'en' }: EmploymentRatesAllRegionsDashboardProps) {
  const [selectedGender, setSelectedGender] = useState<string>('0');
  const [selectedLevel, setSelectedLevel] = useState<'region' | 'district'>('district');
  const [highlightedRegion, setHighlightedRegion] = useState<string>('');

  const { allQuarters, regions, districts } = useMemo(() => {
    const quarters = new Set<string>();
    const regMap = new Map<string, string>();
    const distMap = new Map<string, string>();

    data.forEach(d => {
      if (d.Year) quarters.add(d.Year);
      const code = d.NUTS_Code || '';
      const label = d.NUTS || code;
      const level = nutsLevel(code);
      if (level === 'region' && !regMap.has(code)) regMap.set(code, label);
      if (level === 'district' && !distMap.has(code)) distMap.set(code, label);
    });

    return {
      allQuarters: [...quarters].sort(sortQuarters),
      regions: [...regMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
      districts: [...distMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
    };
  }, [data]);

  const latestQuarter = allQuarters[allQuarters.length - 1] || '';
  const prevYearQuarter = useMemo(() => {
    if (!latestQuarter) return '';
    const p = parseQuarter(latestQuarter);
    const target = `${p.year - 1}Q${p.quarter}`;
    return allQuarters.includes(target) ? target : '';
  }, [latestQuarter, allQuarters]);

  // KPI
  const kpiData = useMemo(() => {
    if (!latestQuarter) return null;

    const find = (quarter: string) => data.find(d =>
      d.Year === quarter && d.NUTS_Code === 'BG' && d.Gender_Code === '0'
    );

    const latest = find(latestQuarter);
    const prev = prevYearQuarter ? find(prevYearQuarter) : null;
    const latestRate = latest ? getRate(latest) : null;
    const prevRate = prev ? getRate(prev) : null;
    const yoyChange = latestRate != null && prevRate != null ? latestRate - prevRate : null;

    return { latestRate, yoyChange, latestQuarter };
  }, [data, latestQuarter, prevYearQuarter]);

  if (!data || data.length === 0 || !kpiData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {locale === 'bg' ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const activeUnits = selectedLevel === 'region' ? regions : districts;

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
            <label htmlFor="emp-all-level" className="text-sm font-medium">
              {locale === 'bg' ? 'NUTS ниво' : 'NUTS Level'}
            </label>
            <Select id="emp-all-level" value={selectedLevel} onChange={(e) => { setSelectedLevel(e.target.value as 'region' | 'district'); setHighlightedRegion(''); }} className="w-[160px]">
              <option value="region">{locale === 'bg' ? 'Региони (NUTS2)' : 'Regions (NUTS2)'}</option>
              <option value="district">{locale === 'bg' ? 'Области (NUTS3)' : 'Districts (NUTS3)'}</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="emp-all-gender" className="text-sm font-medium">
              {locale === 'bg' ? 'Пол' : 'Gender'}
            </label>
            <Select id="emp-all-gender" value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className="w-[140px]">
              <option value="0">{locale === 'bg' ? 'Общо' : 'Total'}</option>
              <option value="1">{locale === 'bg' ? 'Мъже' : 'Male'}</option>
              <option value="2">{locale === 'bg' ? 'Жени' : 'Female'}</option>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? `Национална заетост (${kpiData.latestQuarter})` : `National Rate (${kpiData.latestQuarter})`}
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
                {locale === 'bg' ? 'Показани единици' : 'Displayed Units'}
              </p>
              <p className="text-3xl font-bold mt-1">{activeUnits.length}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedLevel === 'region'
                  ? (locale === 'bg' ? 'NUTS2 региони' : 'NUTS2 regions')
                  : (locale === 'bg' ? 'NUTS3 области' : 'NUTS3 districts')}
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
            <TabsTrigger value="ranking">
              {locale === 'bg' ? 'Класация' : 'Ranking'}
            </TabsTrigger>
            <TabsTrigger value="scatter">
              {locale === 'bg' ? 'М vs Ж' : 'Gender Scatter'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsChart
              data={data} allQuarters={allQuarters} units={activeUnits}
              selectedGender={selectedGender} highlightedRegion={highlightedRegion} locale={locale}
            />
          </TabsContent>
          <TabsContent value="ranking">
            <RankingChart
              data={data} allQuarters={allQuarters} units={activeUnits}
              selectedGender={selectedGender} locale={locale}
              onBarClick={(code) => setHighlightedRegion(code)}
            />
          </TabsContent>
          <TabsContent value="scatter">
            <GenderScatterChart
              data={data} allQuarters={allQuarters} units={activeUnits} locale={locale}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: Top-5 + national trend lines (or highlighted region)
function TrendsChart({ data, allQuarters, units, selectedGender, highlightedRegion, locale }: {
  data: any[];
  allQuarters: string[];
  units: { code: string; label: string }[];
  selectedGender: string;
  highlightedRegion: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    const latestQ = allQuarters[allQuarters.length - 1];

    // Compute latest rate for each unit to find top 5
    const unitRates = units.map(u => {
      const row = data.find(d => d.Year === latestQ && d.NUTS_Code === u.code && d.Gender_Code === selectedGender);
      return { ...u, latestRate: row ? (getRate(row) ?? 0) : 0 };
    }).sort((a, b) => b.latestRate - a.latestRate);

    // Determine which units to show
    let showUnits: { code: string; label: string }[];
    if (highlightedRegion) {
      const highlighted = units.find(u => u.code === highlightedRegion);
      showUnits = highlighted ? [highlighted] : unitRates.slice(0, 5);
    } else {
      showUnits = unitRates.slice(0, 5);
    }

    const result: { code: string; label: string; color: string; width: number; dash: boolean; values: (number | null)[] }[] = [];

    // National line always shown
    const bgFiltered = data.filter(d => d.NUTS_Code === 'BG' && d.Gender_Code === selectedGender);
    const bgByQ: Record<string, number | null> = {};
    bgFiltered.forEach(r => { if (r.Year) bgByQ[r.Year] = getRate(r); });
    result.push({
      code: 'BG',
      label: locale === 'bg' ? 'България' : 'Bulgaria',
      color: '#1e293b',
      width: 3,
      dash: false,
      values: allQuarters.map(q => bgByQ[q] ?? null),
    });

    // Region lines
    showUnits.forEach((u, i) => {
      const filtered = data.filter(d => d.NUTS_Code === u.code && d.Gender_Code === selectedGender);
      const byQ: Record<string, number | null> = {};
      filtered.forEach(r => { if (r.Year) byQ[r.Year] = getRate(r); });

      const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
      result.push({
        code: u.code,
        label: u.label,
        color: REGION_COLORS[u.code] || colors[i % colors.length],
        width: highlightedRegion === u.code ? 3 : 1.5,
        dash: false,
        values: allQuarters.map(q => byQ[q] ?? null),
      });
    });

    return result;
  }, [data, allQuarters, units, selectedGender, highlightedRegion, locale]);

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
        min: (value: { min: number }) => Math.floor(value.min - 3),
        max: (value: { max: number }) => Math.ceil(value.max + 3),
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: s.width },
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        emphasis: { lineStyle: { width: 3 } },
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
        {highlightedRegion
          ? (locale === 'bg' ? 'Избран регион vs национално ниво (%)' : 'Selected region vs national level (%)')
          : (locale === 'bg' ? 'Топ 5 + национално ниво (%)' : 'Top 5 + national level (%)')
        }
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '450px' }} />
    </div>
  );
}

// Tab 2: Ranking bar chart – sorted descending, click to highlight in trends
function RankingChart({ data, allQuarters, units, selectedGender, locale, onBarClick }: {
  data: any[];
  allQuarters: string[];
  units: { code: string; label: string }[];
  selectedGender: string;
  locale: 'bg' | 'en';
  onBarClick: (code: string) => void;
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

    return units.map(u => {
      const row = data.find(d => d.Year === quarter && d.NUTS_Code === u.code && d.Gender_Code === selectedGender);
      return {
        code: u.code,
        label: u.label,
        value: row ? (getRate(row) ?? 0) : 0,
        parent: u.code.substring(0, 4),
      };
    }).sort((a, b) => b.value - a.value);
  }, [data, allQuarters, units, selectedGender, selectedQuarter]);

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
      xAxis: { type: 'value', name: '%' },
      yAxis: {
        type: 'category',
        data: [...barData].reverse().map(d => d.label),
        axisLabel: { fontSize: barData.length > 10 ? 9 : 11 },
      },
      series: [{
        name: locale === 'bg' ? 'Заетост' : 'Employment Rate',
        type: 'bar',
        data: [...barData].reverse().map(d => ({
          value: d.value,
          itemStyle: {
            color: REGION_COLORS[d.code] || REGION_COLORS[d.parent] || '#3b82f6',
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => Number(params.value).toFixed(1) + '%',
          fontSize: barData.length > 10 ? 9 : 11,
        },
      }],
    };

    chart.setOption(option);

    chart.on('click', (params: any) => {
      const idx = params.dataIndex;
      const reversed = [...barData].reverse();
      if (reversed[idx]) {
        onBarClick(reversed[idx].code);
      }
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [barData, locale, onBarClick]);

  if (barData.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{locale === 'bg' ? 'Няма данни' : 'No data available'}</div>;
  }

  const chartHeight = Math.max(350, barData.length * 24 + 60);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="emp-rank-quarter" className="text-sm font-medium">
            {locale === 'bg' ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="emp-rank-quarter" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
            {allQuarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Щракнете върху лента, за да я покажете в Тенденции'
            : 'Click a bar to highlight it in Trends'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: chartHeight + 'px' }} />
    </div>
  );
}

// Tab 3: Scatter – Male vs Female for each region/district
function GenderScatterChart({ data, allQuarters, units, locale }: {
  data: any[];
  allQuarters: string[];
  units: { code: string; label: string }[];
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

    return units.map(u => {
      const maleRow = data.find(d => d.Year === quarter && d.NUTS_Code === u.code && d.Gender_Code === '1');
      const femaleRow = data.find(d => d.Year === quarter && d.NUTS_Code === u.code && d.Gender_Code === '2');
      const male = maleRow ? (getRate(maleRow) ?? 0) : 0;
      const female = femaleRow ? (getRate(femaleRow) ?? 0) : 0;
      const parent = u.code.substring(0, 4);
      return { code: u.code, label: u.label, male, female, parent };
    }).filter(d => d.male > 0 || d.female > 0);
  }, [data, allQuarters, units, selectedQuarter]);

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
          name: locale === 'bg' ? 'Единици' : 'Units',
          type: 'scatter',
          data: scatterData.map(d => [d.male, d.female, d.label, d.parent]),
          symbolSize: 14,
          itemStyle: {
            color: (params: any) => REGION_COLORS[params.data[3]] || '#64748b',
            borderColor: '#fff',
            borderWidth: 1,
          },
          label: {
            show: scatterData.length <= 10,
            position: 'right',
            formatter: (params: any) => {
              const l: string = params.data[2];
              return l.length > 14 ? l.substring(0, 14) + '...' : l;
            },
            fontSize: 9,
            color: '#374151',
          },
        },
        {
          name: locale === 'bg' ? 'Паритет' : 'Parity line',
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
          <label htmlFor="emp-scatter-q" className="text-sm font-medium">
            {locale === 'bg' ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="emp-scatter-q" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
            {allQuarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Точки под диагонала = по-висока мъжка заетост'
            : 'Points below diagonal = higher male employment'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '500px' }} />
    </div>
  );
}
