'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';

interface PopulationByDistrictsDashboardProps {
  data: any[];
  locale?: 'bg' | 'en';
}

export function PopulationByDistrictsDashboard({ data, locale = 'en' }: PopulationByDistrictsDashboardProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <Tabs defaultValue="trends" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="trends">
          {locale === 'bg' ? 'Тенденции' : 'Population Trends'}
        </TabsTrigger>
        <TabsTrigger value="districts">
          {locale === 'bg' ? 'По области' : 'By District'}
        </TabsTrigger>
        <TabsTrigger value="gender">
          {locale === 'bg' ? 'По пол' : 'Gender Split'}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="trends">
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === 'bg' ? 'Тенденции на населението' : 'Population Trends'}
            </CardTitle>
            <CardDescription>
              {locale === 'bg'
                ? 'Общо население по години с разбивка градско/селско'
                : 'Total population over time with urban/rural breakdown'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PopulationTrends data={data} locale={locale} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="districts">
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === 'bg' ? 'Население по области' : 'Population by District'}
            </CardTitle>
            <CardDescription>
              {locale === 'bg'
                ? 'Население по области, разделено на градско и селско'
                : 'Population by district, divided by urban and rural residence'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DistrictBreakdown data={data} locale={locale} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="gender">
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === 'bg' ? 'Разпределение по пол' : 'Gender Distribution'}
            </CardTitle>
            <CardDescription>
              {locale === 'bg'
                ? 'Мъже и жени по области за последната налична година'
                : 'Male vs Female population by district for the latest available year'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GenderDistribution data={data} locale={locale} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// Tab 1: Population Trends (line chart - national total, urban, rural over time)
function PopulationTrends({ data, locale }: { data: any[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const trendsData = useMemo(() => {
    // Filter: national total (EKATTE_Code = 'BG'), Total gender
    const filtered = data.filter(
      d =>
        d.EKATTE_Code === 'BG' &&
        (d.Gender_Code === '0' || d.Gender === 'Total')
    );

    // Group by year and residence
    const grouped: Record<string, { total: number; urban: number; rural: number }> = {};

    filtered.forEach(row => {
      const year = row.Year;
      const residenceCode = row.Residence_Code;
      const population = parseFloat(row.Population) || 0;

      if (!year) return;
      if (!grouped[year]) {
        grouped[year] = { total: 0, urban: 0, rural: 0 };
      }

      if (residenceCode === '0') grouped[year].total = population;
      else if (residenceCode === '1') grouped[year].urban = population;
      else if (residenceCode === '2') grouped[year].rural = population;
    });

    return Object.entries(grouped)
      .map(([year, vals]) => ({ year, ...vals }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || trendsData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => Number(value).toLocaleString()
      },
      legend: {
        data: [
          locale === 'bg' ? 'Общо' : 'Total',
          locale === 'bg' ? 'Градско' : 'Urban',
          locale === 'bg' ? 'Селско' : 'Rural'
        ]
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trendsData.map(d => d.year)
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => (value / 1000000).toFixed(1) + 'M'
        }
      },
      series: [
        {
          name: locale === 'bg' ? 'Общо' : 'Total',
          type: 'line',
          data: trendsData.map(d => d.total),
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 3 }
        },
        {
          name: locale === 'bg' ? 'Градско' : 'Urban',
          type: 'line',
          data: trendsData.map(d => d.urban),
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: locale === 'bg' ? 'Селско' : 'Rural',
          type: 'line',
          data: trendsData.map(d => d.rural),
          itemStyle: { color: '#10b981' }
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
  }, [trendsData, locale]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// Tab 2: District Breakdown (stacked bar - urban/rural by district)
function DistrictBreakdown({ data, locale }: { data: any[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => {
    return [...new Set(data.map(d => d.Year))].filter(Boolean).sort();
  }, [data]);

  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  const districtData = useMemo(() => {
    const yearToUse = selectedYear || availableYears[availableYears.length - 1];

    // Filter: selected year, district-level EKATTE (3-letter codes like BGS, BLG, etc.),
    // Total gender, Urban or Rural residence
    const filtered = data.filter(
      d =>
        d.Year === yearToUse &&
        d.EKATTE_Code &&
        d.EKATTE_Code !== 'BG' &&
        d.EKATTE_Code.length === 3 && // District-level codes are 3 chars
        (d.Gender_Code === '0' || d.Gender === 'Total') &&
        (d.Residence_Code === '1' || d.Residence_Code === '2')
    );

    const grouped: Record<string, { name: string; urban: number; rural: number }> = {};

    filtered.forEach(row => {
      const code = row.EKATTE_Code;
      const name = row.EKATTE || code;
      const population = parseFloat(row.Population) || 0;

      if (!grouped[code]) {
        grouped[code] = { name, urban: 0, rural: 0 };
      }

      if (row.Residence_Code === '1') grouped[code].urban += population;
      else if (row.Residence_Code === '2') grouped[code].rural += population;
    });

    return Object.entries(grouped)
      .map(([code, vals]) => ({ code, ...vals }))
      .sort((a, b) => (b.urban + b.rural) - (a.urban + a.rural));
  }, [data, selectedYear, availableYears]);

  useEffect(() => {
    if (!chartRef.current || districtData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => Number(value).toLocaleString()
      },
      legend: {
        data: [
          locale === 'bg' ? 'Градско' : 'Urban',
          locale === 'bg' ? 'Селско' : 'Rural'
        ]
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: districtData.map(d => d.name),
        axisLabel: { rotate: 45, interval: 0, fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => (value / 1000).toFixed(0) + 'K'
        }
      },
      series: [
        {
          name: locale === 'bg' ? 'Градско' : 'Urban',
          type: 'bar',
          stack: 'total',
          data: districtData.map(d => d.urban),
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: locale === 'bg' ? 'Селско' : 'Rural',
          type: 'bar',
          stack: 'total',
          data: districtData.map(d => d.rural),
          itemStyle: { color: '#10b981' }
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
  }, [districtData, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="district-year-filter" className="text-sm font-medium">
            {locale === 'bg' ? 'Година' : 'Year'}
          </label>
          <Select
            id="district-year-filter"
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
      <div ref={chartRef} style={{ width: '100%', height: '500px' }} />
    </div>
  );
}

// Tab 3: Gender Distribution (grouped bar - male/female by district)
function GenderDistribution({ data, locale }: { data: any[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => {
    return [...new Set(data.map(d => d.Year))].filter(Boolean).sort();
  }, [data]);

  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  const genderData = useMemo(() => {
    const yearToUse = selectedYear || availableYears[availableYears.length - 1];

    // Filter: selected year, district-level EKATTE (3 chars), Total residence, Male or Female
    const filtered = data.filter(
      d =>
        d.Year === yearToUse &&
        d.EKATTE_Code &&
        d.EKATTE_Code !== 'BG' &&
        d.EKATTE_Code.length === 3 &&
        (d.Residence_Code === '0' || d.Residence === 'Total') &&
        (d.Gender_Code === '1' || d.Gender_Code === '2')
    );

    const grouped: Record<string, { name: string; male: number; female: number }> = {};

    filtered.forEach(row => {
      const code = row.EKATTE_Code;
      const name = row.EKATTE || code;
      const population = parseFloat(row.Population) || 0;

      if (!grouped[code]) {
        grouped[code] = { name, male: 0, female: 0 };
      }

      if (row.Gender_Code === '1') grouped[code].male += population;
      else if (row.Gender_Code === '2') grouped[code].female += population;
    });

    return Object.entries(grouped)
      .map(([code, vals]) => ({ code, ...vals }))
      .sort((a, b) => (b.male + b.female) - (a.male + a.female));
  }, [data, selectedYear, availableYears]);

  useEffect(() => {
    if (!chartRef.current || genderData.length === 0) return;

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
        data: genderData.map(d => d.name),
        axisLabel: { rotate: 45, interval: 0, fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => (value / 1000).toFixed(0) + 'K'
        }
      },
      series: [
        {
          name: locale === 'bg' ? 'Мъже' : 'Male',
          type: 'bar',
          data: genderData.map(d => d.male),
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: locale === 'bg' ? 'Жени' : 'Female',
          type: 'bar',
          data: genderData.map(d => d.female),
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
  }, [genderData, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gender-year-filter" className="text-sm font-medium">
            {locale === 'bg' ? 'Година' : 'Year'}
          </label>
          <Select
            id="gender-year-filter"
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
      <div ref={chartRef} style={{ width: '100%', height: '500px' }} />
    </div>
  );
}
