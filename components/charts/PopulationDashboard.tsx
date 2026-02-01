'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as echarts from 'echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';

interface PopulationDashboardProps {
  data: any[];
  locale?: 'bg' | 'en';
}

export function PopulationDashboard({ data, locale = 'en' }: PopulationDashboardProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <Tabs defaultValue="pyramid" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="pyramid">
          {locale === 'bg' ? 'Възрастова пирамида' : 'Population Pyramid'}
        </TabsTrigger>
        <TabsTrigger value="trends">
          {locale === 'bg' ? 'Демографски тенденции' : 'Demographic Trends'}
        </TabsTrigger>
        <TabsTrigger value="regional">
          {locale === 'bg' ? 'Регионално разпределение' : 'Regional Distribution'}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pyramid">
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === 'bg' ? 'Възрастова пирамида' : 'Population Pyramid'}
            </CardTitle>
            <CardDescription>
              {locale === 'bg'
                ? 'Сравнение на мъже и жени по възрастови групи за последната налична година'
                : 'Comparison of Male vs Female population by age groups for the latest available year'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PopulationPyramid data={data} locale={locale} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trends">
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === 'bg' ? 'Демографски тенденции' : 'Demographic Trends'}
            </CardTitle>
            <CardDescription>
              {locale === 'bg'
                ? 'Еволюция на широките възрастови групи (0-14, 15-64, 65+) от 2010 г. до днес'
                : 'Evolution of broad age groups (0-14, 15-64, 65+) from 2010 to present'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DemographicTrends data={data} locale={locale} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="regional">
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === 'bg' ? 'Регионално разпределение' : 'Regional Distribution'}
            </CardTitle>
            <CardDescription>
              {locale === 'bg'
                ? 'Население по статистически райони (NUTS 2), разделено на градско и селско'
                : 'Population by NUTS 2 regions, divided by Urban and Rural residence'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegionalUrbanRural data={data} locale={locale} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// Population Pyramid Component
function PopulationPyramid({ data, locale }: { data: any[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Get available years and regions for filters
  const availableYears = useMemo(() => {
    return [...new Set(data.map(d => d.Year))].filter(Boolean).sort();
  }, [data]);

  const availableRegions = useMemo(() => {
    // Get unique NUTS regions (both code and name)
    const regionsMap = new Map<string, string>();
    data.forEach(d => {
      if (d.NUTS_Code && d.NUTS) {
        regionsMap.set(d.NUTS_Code, d.NUTS);
      }
    });
    // Sort by code, but return as array of {code, name}
    return Array.from(regionsMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [data]);

  // State for filters
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('BG');

  // Initialize year to latest when data loads
  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  const pyramidData = useMemo(() => {
    const yearToUse = selectedYear || availableYears[availableYears.length - 1];
    const regionToUse = selectedRegion || 'BG';

    // Filter: selected year, selected region, Total residence (Residence_Code = 0), exclude Total age
    const filtered = data.filter(
      d =>
        d.Year === yearToUse &&
        d.NUTS_Code === regionToUse &&
        (d.Residence_Code === '0' || d.Residence === 'Total') &&
        d.Age !== 'Total' &&
        d.Age_Code !== 'Total'
    );

    // Group by age and gender
    const ageGroups: Record<string, { male: number; female: number }> = {};

    filtered.forEach(row => {
      const age = row.Age || row.Age_Code;
      const genderCode = row.Gender_Code;
      const population = parseFloat(row.Population) || 0;

      if (!age || age === 'Total') return;

      if (!ageGroups[age]) {
        ageGroups[age] = { male: 0, female: 0 };
      }

      // Gender_Code: 1 = Male, 2 = Female
      if (genderCode === '1' || row.Gender === 'Male') {
        ageGroups[age].male += population;
      } else if (genderCode === '2' || row.Gender === 'Female') {
        ageGroups[age].female += population;
      }
    });

    // Sort age groups
    const sortedAges = Object.keys(ageGroups).sort((a, b) => {
      const numA = parseInt(a.split('-')[0]) || parseInt(a) || 0;
      const numB = parseInt(b.split('-')[0]) || parseInt(b) || 0;
      return numA - numB;
    });

    return sortedAges.map(age => ({
      age,
      male: -ageGroups[age].male, // Negative for left side
      female: ageGroups[age].female
    }));
  }, [data, selectedYear, selectedRegion, availableYears]);

  useEffect(() => {
    if (!chartRef.current || pyramidData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const ageGroup = params[0].name;
          const male = Math.abs(params[0].value);
          const female = params[1].value;
          return `${ageGroup}<br/>Male: ${male.toLocaleString()}<br/>Female: ${female.toLocaleString()}`;
        }
      },
      legend: {
        data: ['Male', 'Female']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => Math.abs(value).toLocaleString()
        }
      },
      yAxis: {
        type: 'category',
        data: pyramidData.map(d => d.age),
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [
        {
          name: 'Male',
          type: 'bar',
          stack: 'Total',
          itemStyle: { color: '#3b82f6' },
          data: pyramidData.map(d => d.male)
        },
        {
          name: 'Female',
          type: 'bar',
          stack: 'Total',
          itemStyle: { color: '#ec4899' },
          data: pyramidData.map(d => d.female)
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
  }, [pyramidData]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="year-filter" className="text-sm font-medium">
            {locale === 'bg' ? 'Година' : 'Year'}
          </label>
          <Select
            id="year-filter"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-[120px]"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="region-filter" className="text-sm font-medium">
            {locale === 'bg' ? 'Регион' : 'Region'}
          </label>
          <Select
            id="region-filter"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="w-[280px]"
          >
            {availableRegions.map(region => (
              <option key={region.code} value={region.code}>
                {region.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} style={{ width: '100%', height: '600px' }} />
    </div>
  );
}

// Demographic Trends Component
function DemographicTrends({ data, locale }: { data: any[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const trendsData = useMemo(() => {
    // Filter: Total for country (BG), Total residence (0), Total gender (0), from 2010 onwards
    const filtered = data.filter(
      d =>
        (d.NUTS_Code === 'BG' || d.NUTS === 'Total for the country') &&
        (d.Residence_Code === '0' || d.Residence === 'Total') &&
        (d.Gender_Code === '0' || d.Gender === 'Total') &&
        d.Age !== 'Total' &&
        d.Age_Code !== 'Total' &&
        parseInt(d.Year) >= 2010
    );

    // Categorize ages into groups
    const categorizeAge = (age: string): string | null => {
      if (!age || age === 'Total') return null;

      // Handle patterns like "0", "1-4", "5-9", "15-19", "85+"
      const match = age.match(/(\d+)/);
      if (!match) return null;

      const ageNum = parseInt(match[1]);
      if (ageNum < 15) return '0-14';
      if (ageNum < 65) return '15-64';
      return '65+';
    };

    // Group by year and age category
    const grouped: Record<string, Record<string, number>> = {};

    filtered.forEach(row => {
      const year = row.Year;
      const age = row.Age || row.Age_Code;
      const ageCategory = categorizeAge(age);
      const population = parseFloat(row.Population) || 0;

      if (!ageCategory || !year) return;

      if (!grouped[year]) {
        grouped[year] = { '0-14': 0, '15-64': 0, '65+': 0 };
      }

      grouped[year][ageCategory] += population;
    });

    // Convert to array and sort by year
    return Object.entries(grouped)
      .map(([year, counts]) => ({
        year,
        ...counts
      }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || trendsData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['0-14', '15-64', '65+']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
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
          name: '0-14',
          type: 'line',
          stack: 'Total',
          areaStyle: {},
          emphasis: { focus: 'series' },
          data: trendsData.map(d => d['0-14']),
          itemStyle: { color: '#60a5fa' }
        },
        {
          name: '15-64',
          type: 'line',
          stack: 'Total',
          areaStyle: {},
          emphasis: { focus: 'series' },
          data: trendsData.map(d => d['15-64']),
          itemStyle: { color: '#34d399' }
        },
        {
          name: '65+',
          type: 'line',
          stack: 'Total',
          areaStyle: {},
          emphasis: { focus: 'series' },
          data: trendsData.map(d => d['65+']),
          itemStyle: { color: '#f87171' }
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
  }, [trendsData]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// Regional Urban/Rural Component
function RegionalUrbanRural({ data, locale }: { data: any[]; locale: 'bg' | 'en' }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const regionalData = useMemo(() => {
    // Get latest year
    const years = [...new Set(data.map(d => d.Year))].filter(Boolean).sort();
    const latestYear = years[years.length - 1];

    // Filter: latest year, NUTS 2 regions (not country total BG), Total gender (0), Total age, Urban (1) or Rural (2)
    const filtered = data.filter(
      d =>
        d.Year === latestYear &&
        d.NUTS_Code &&
        d.NUTS_Code !== 'BG' && // Exclude country total
        d.NUTS_Code.length === 4 && // NUTS 2 level codes are like BG31, BG32, etc.
        (d.Gender_Code === '0' || d.Gender === 'Total') &&
        (d.Age === 'Total' || d.Age_Code === 'Total') &&
        (d.Residence_Code === '1' || d.Residence_Code === '2')
    );

    // Group by NUTS region
    const grouped: Record<string, { name: string; urban: number; rural: number }> = {};

    filtered.forEach(row => {
      const regionCode = row.NUTS_Code;
      const regionName = row.NUTS || regionCode;
      const residenceCode = row.Residence_Code;
      const population = parseFloat(row.Population) || 0;

      if (!grouped[regionCode]) {
        grouped[regionCode] = { name: regionName, urban: 0, rural: 0 };
      }

      // Residence_Code: 1 = Urban, 2 = Rural
      if (residenceCode === '1') {
        grouped[regionCode].urban += population;
      } else if (residenceCode === '2') {
        grouped[regionCode].rural += population;
      }
    });

    return Object.entries(grouped).map(([code, data]) => ({
      region: data.name,
      ...data
    }));
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || regionalData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['Urban', 'Rural']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: regionalData.map(d => d.region),
        axisLabel: {
          rotate: 45,
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => (value / 1000).toFixed(0) + 'K'
        }
      },
      series: [
        {
          name: 'Urban',
          type: 'bar',
          stack: 'total',
          data: regionalData.map(d => d.urban),
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: 'Rural',
          type: 'bar',
          stack: 'total',
          data: regionalData.map(d => d.rural),
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
  }, [regionalData]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}
