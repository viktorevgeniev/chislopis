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

interface UnemploymentRatesRegionalQuarterlyDashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function UnemploymentRatesRegionalQuarterlyDashboard({ data, dataset, locale = 'en' }: UnemploymentRatesRegionalQuarterlyDashboardProps) {
  const { allQuarters, regions } = useMemo(() => {
    const quarters = new Set<string>();
    const regionMap = new Map<string, string>();

    data.forEach(d => {
      if (d.Year) quarters.add(d.Year);
      const code = d.NUTS_Code || '';
      if (code && !regionMap.has(code)) regionMap.set(code, d.NUTS || code);
    });

    return {
      allQuarters: [...quarters].sort(sortQuarters),
      regions: [...regionMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
    };
  }, [data]);

  const latestQuarter = allQuarters[allQuarters.length - 1] || '';
  const prevYearQuarter = useMemo(() => {
    if (!latestQuarter) return '';
    const p = parseQuarter(latestQuarter);
    const target = `${p.year - 1}Q${p.quarter}`;
    return allQuarters.includes(target) ? target : '';
  }, [latestQuarter, allQuarters]);

  const kpiData = useMemo(() => {
    if (!latestQuarter) return null;

    const find = (quarter: string, genderCode: string) => data.find(d =>
      d.Year === quarter && d.NUTS_Code === 'BG' && d.Gender_Code === genderCode
    );

    const latest = find(latestQuarter, '0');
    const prevYear = prevYearQuarter ? find(prevYearQuarter, '0') : null;

    const latestRate = latest ? getRate(latest) : 0;
    const prevRate = prevYear ? getRate(prevYear) : 0;
    const yoyChange = prevRate > 0 ? latestRate - prevRate : 0;

    const maleRate = find(latestQuarter, '1') ? getRate(find(latestQuarter, '1')!) : 0;
    const femaleRate = find(latestQuarter, '2') ? getRate(find(latestQuarter, '2')!) : 0;

    // Regional extremes (NUTS-2 only, Total gender)
    const regionalLatest = data.filter(d =>
      d.Year === latestQuarter && d.Gender_Code === '0' && d.NUTS_Code !== 'BG' && d.NUTS_Code
    );
    const sorted = regionalLatest.sort((a, b) => getRate(b) - getRate(a));
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];

    return {
      latestRate, yoyChange, maleRate, femaleRate, latestQuarter,
      highestRegion: highest ? { name: highest.NUTS || highest.NUTS_Code, rate: getRate(highest) } : null,
      lowestRegion: lowest ? { name: lowest.NUTS || lowest.NUTS_Code, rate: getRate(lowest) } : null,
    };
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
                {locale === 'bg' ? `Безработица (${kpiData.latestQuarter})` : `Unemployment Rate (${kpiData.latestQuarter})`}
              </p>
              <p className="text-3xl font-bold mt-1">{kpiData.latestRate.toFixed(1)}%</p>
              {kpiData.yoyChange !== 0 && (
                <p className={`text-sm mt-2 ${kpiData.yoyChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpiData.yoyChange > 0 ? '\u2191' : '\u2193'} {Math.abs(kpiData.yoyChange).toFixed(1)} pp
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
                {locale === 'bg' ? 'Мъже / Жени' : 'Male / Female'}
              </p>
              <p className="text-2xl font-bold mt-1">
                <span className="text-blue-500">{kpiData.maleRate.toFixed(1)}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-pink-500">{kpiData.femaleRate.toFixed(1)}</span>
                <span className="text-lg text-muted-foreground">%</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'bg' ? 'Полова разлика: ' : 'Gender gap: '}
                {(kpiData.maleRate - kpiData.femaleRate).toFixed(1)} pp
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {locale === 'bg' ? 'Регионални крайности' : 'Regional Extremes'}
              </p>
              {kpiData.highestRegion && kpiData.lowestRegion && (
                <>
                  <p className="text-sm mt-2">
                    <span className="text-red-500 font-semibold">{'\u2191'} {kpiData.highestRegion.rate.toFixed(1)}%</span>
                    <span className="text-muted-foreground ml-1">{kpiData.highestRegion.name}</span>
                  </p>
                  <p className="text-sm mt-1">
                    <span className="text-green-500 font-semibold">{'\u2193'} {kpiData.lowestRegion.rate.toFixed(1)}%</span>
                    <span className="text-muted-foreground ml-1">{kpiData.lowestRegion.name}</span>
                  </p>
                </>
              )}
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
            <TabsTrigger value="gender">
              {locale === 'bg' ? 'Полови различия' : 'Gender Gap'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <RegionalTrendsChart data={data} allQuarters={allQuarters} regions={regions} locale={locale} />
          </TabsContent>
          <TabsContent value="regional">
            <RegionalSnapshotChart data={data} allQuarters={allQuarters} regions={regions} locale={locale} />
          </TabsContent>
          <TabsContent value="gender">
            <GenderGapChart data={data} allQuarters={allQuarters} regions={regions} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Tab 1: Multi-line regional trends
function RegionalTrendsChart({ data, allQuarters, regions, locale }: {
  data: any[];
  allQuarters: string[];
  regions: { code: string; label: string }[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedGender, setSelectedGender] = useState<string>('0');

  const seriesData = useMemo(() => {
    return regions.map(region => {
      const filtered = data.filter(d =>
        d.NUTS_Code === region.code && d.Gender_Code === selectedGender
      );

      const byQuarter: Record<string, number> = {};
      filtered.forEach(row => {
        if (row.Year) byQuarter[row.Year] = getRate(row);
      });

      return {
        code: region.code,
        label: region.label,
        values: allQuarters.map(q => byQuarter[q] ?? null),
      };
    });
  }, [data, allQuarters, regions, selectedGender]);

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
        min: (value: { min: number }) => Math.floor(value.min - 2),
        max: (value: { max: number }) => Math.ceil(value.max + 2),
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: REGION_COLORS[s.code] || undefined },
        lineStyle: { width: s.code === 'BG' ? 3 : 1.5 },
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="trend-gender" className="text-sm font-medium">
            {locale === 'bg' ? 'Пол' : 'Gender'}
          </label>
          <Select id="trend-gender" value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className="w-[120px]">
            <option value="0">{locale === 'bg' ? 'Общо' : 'Total'}</option>
            <option value="1">{locale === 'bg' ? 'Мъже' : 'Male'}</option>
            <option value="2">{locale === 'bg' ? 'Жени' : 'Female'}</option>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg' ? 'Коефициент на безработица по региони (%)' : 'Unemployment rate by region (%)'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '450px' }} />
    </div>
  );
}

// Tab 2: Regional bar chart snapshot
function RegionalSnapshotChart({ data, allQuarters, regions, locale }: {
  data: any[];
  allQuarters: string[];
  regions: { code: string; label: string }[];
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

    const filtered = data.filter(d =>
      d.Year === quarter && d.Gender_Code === '0'
    );

    return filtered
      .map(row => ({
        code: row.NUTS_Code || '',
        name: row.NUTS || row.NUTS_Code || '',
        value: getRate(row),
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, selectedQuarter, allQuarters]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toFixed(1) + '%',
      },
      grid: { left: '3%', right: '12%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', name: '%' },
      yAxis: {
        type: 'category',
        data: [...barData].reverse().map(d => d.name),
        axisLabel: { fontSize: 11 },
      },
      series: [{
        name: locale === 'bg' ? 'Безработица' : 'Unemployment Rate',
        type: 'bar',
        data: [...barData].reverse().map(d => ({
          value: d.value,
          itemStyle: {
            color: d.code === 'BG' ? '#1e293b' : REGION_COLORS[d.code] || '#3b82f6',
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => Number(params.value).toFixed(1) + '%',
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
  }, [barData, locale]);

  if (barData.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{locale === 'bg' ? 'Няма данни' : 'No data available'}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="snapshot-quarter" className="text-sm font-medium">
            {locale === 'bg' ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="snapshot-quarter" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
            {allQuarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {locale === 'bg'
            ? 'Региони сортирани по коефициент на безработица (Общо)'
            : 'Regions sorted by unemployment rate (Total)'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '350px' }} />
    </div>
  );
}

// Tab 3: Gender gap — national time series + regional grouped bars
function GenderGapChart({ data, allQuarters, regions, locale }: {
  data: any[];
  allQuarters: string[];
  regions: { code: string; label: string }[];
  locale: 'bg' | 'en';
}) {
  const trendChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');

  useEffect(() => {
    if (allQuarters.length > 0 && !selectedQuarter) {
      setSelectedQuarter(allQuarters[allQuarters.length - 1]);
    }
  }, [allQuarters, selectedQuarter]);

  // National gender trend data
  const trendData = useMemo(() => {
    const genders = ['1', '2'];
    return genders.map(gCode => {
      const filtered = data.filter(d =>
        d.NUTS_Code === 'BG' && d.Gender_Code === gCode
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
  }, [data, allQuarters]);

  // Regional gender bar data
  const barData = useMemo(() => {
    const quarter = selectedQuarter || allQuarters[allQuarters.length - 1];
    const nonNational = regions.filter(r => r.code !== 'BG');

    return nonNational.map(region => {
      const male = data.find(d => d.Year === quarter && d.NUTS_Code === region.code && d.Gender_Code === '1');
      const female = data.find(d => d.Year === quarter && d.NUTS_Code === region.code && d.Gender_Code === '2');
      return {
        code: region.code,
        label: region.label,
        male: male ? getRate(male) : 0,
        female: female ? getRate(female) : 0,
      };
    }).sort((a, b) => (b.male + b.female) / 2 - (a.male + a.female) / 2);
  }, [data, regions, selectedQuarter, allQuarters]);

  // National gender trend chart
  useEffect(() => {
    if (!trendChartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(trendChartRef.current);

    const maleLabel = locale === 'bg' ? 'Мъже' : 'Male';
    const femaleLabel = locale === 'bg' ? 'Жени' : 'Female';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => value != null ? Number(value).toFixed(1) + '%' : 'N/A',
      },
      legend: { data: [maleLabel, femaleLabel] },
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
        min: (value: { min: number }) => Math.floor(value.min - 2),
        max: (value: { max: number }) => Math.ceil(value.max + 2),
      },
      series: [
        {
          name: maleLabel,
          type: 'line' as const,
          data: trendData[0].values,
          itemStyle: { color: '#3b82f6' },
          areaStyle: { color: 'rgba(59, 130, 246, 0.1)' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          connectNulls: true,
        },
        {
          name: femaleLabel,
          type: 'line' as const,
          data: trendData[1].values,
          itemStyle: { color: '#ec4899' },
          areaStyle: { color: 'rgba(236, 72, 153, 0.1)' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          connectNulls: true,
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
  }, [allQuarters, trendData, locale]);

  // Regional gender grouped bar chart
  useEffect(() => {
    if (!barChartRef.current || barData.length === 0) return;
    const chart = echarts.init(barChartRef.current);

    const maleLabel = locale === 'bg' ? 'Мъже' : 'Male';
    const femaleLabel = locale === 'bg' ? 'Жени' : 'Female';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toFixed(1) + '%',
      },
      legend: { data: [maleLabel, femaleLabel] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: barData.map(d => d.label),
        axisLabel: { rotate: 30, fontSize: 10 },
      },
      yAxis: { type: 'value', name: '%' },
      series: [
        {
          name: maleLabel,
          type: 'bar',
          data: barData.map(d => d.male),
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: femaleLabel,
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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-2">
          {locale === 'bg'
            ? 'Мъже vs Жени – национално ниво (%)'
            : 'Male vs Female – national level (%)'}
        </p>
        <div ref={trendChartRef} style={{ width: '100%', height: '380px' }} />
      </div>

      <div>
        <div className="flex flex-wrap gap-4 items-end mb-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="gender-bar-quarter" className="text-sm font-medium">
              {locale === 'bg' ? 'Тримесечие' : 'Quarter'}
            </label>
            <Select id="gender-bar-quarter" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
              {allQuarters.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </Select>
          </div>
          <p className="text-sm text-muted-foreground pb-1">
            {locale === 'bg'
              ? 'Безработица по пол и регион'
              : 'Unemployment by gender and region'}
          </p>
        </div>
        <div ref={barChartRef} style={{ width: '100%', height: '300px' }} />
      </div>
    </div>
  );
}
