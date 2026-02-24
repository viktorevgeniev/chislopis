'use client';

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Constants ──────────────────────────────────────────────────────────────────

const REGION_COLORS: Record<string, string> = {
  BG: '#1e293b',
  BG31: '#ef4444', BG32: '#f59e0b', BG33: '#10b981',
  BG34: '#3b82f6', BG41: '#8b5cf6', BG42: '#ec4899',
};

const DISTRICT_COLORS: string[] = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#fb7185', '#fda4af', '#fdba74',
  '#fde047', '#bef264', '#86efac', '#67e8f9', '#a5b4fc',
  '#c4b5fd', '#f0abfc', '#fbb6ce',
];

const REGION_NAMES_BG: Record<string, string> = {
  BG: 'България',
  BG31: 'Северозападен', BG32: 'Северен централен', BG33: 'Североизточен',
  BG34: 'Югоизточен', BG41: 'Югозападен', BG42: 'Южен централен',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPersons(row: any): number | null {
  if (row.Persons == null || row.Persons === '' || row.Persons === '..' || row.Persons === 'null') return null;
  const v = parseFloat(row.Persons);
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

function parentRegion(code: string): string {
  return code.length === 5 ? code.substring(0, 4) : code;
}

function quarterToIndex(q: string): number {
  const p = parseQuarter(q);
  return p.year * 4 + (p.quarter - 1);
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

interface NutsUnit {
  code: string;
  label: string;
  labelBg: string;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EmployedPersonsRegionalDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const [selectedGender, setSelectedGender] = useState<string>('0');
  const [selectedLevel, setSelectedLevel] = useState<'region' | 'district'>('region');
  const [highlightedRegion, setHighlightedRegion] = useState<string>('');
  const [drillRegion, setDrillRegion] = useState<string>(''); // for drill-down from treemap
  const [rangeStart, setRangeStart] = useState<number>(0);
  const [rangeEnd, setRangeEnd] = useState<number>(100);

  // Extract structural data
  const { allQuarters, regions, districts, regionToDistricts } = useMemo(() => {
    const quarters = new Set<string>();
    const regMap = new Map<string, { label: string; labelBg: string }>();
    const distMap = new Map<string, { label: string; labelBg: string }>();
    const regToDist = new Map<string, string[]>();

    data.forEach(d => {
      if (d.Year) quarters.add(d.Year);
      const code = d.NUTS_Code || '';
      const label = d.NUTS || code;
      const labelBg = REGION_NAMES_BG[code] || label;
      const level = nutsLevel(code);
      if (level === 'region' && !regMap.has(code)) regMap.set(code, { label, labelBg });
      if (level === 'district' && !distMap.has(code)) {
        distMap.set(code, { label, labelBg });
        const parent = parentRegion(code);
        if (!regToDist.has(parent)) regToDist.set(parent, []);
        regToDist.get(parent)!.push(code);
      }
    });

    return {
      allQuarters: [...quarters].sort(sortQuarters),
      regions: [...regMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        .map(([code, v]) => ({ code, label: v.label, labelBg: v.labelBg })),
      districts: [...distMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        .map(([code, v]) => ({ code, label: v.label, labelBg: v.labelBg })),
      regionToDistricts: regToDist,
    };
  }, [data]);

  // Filtered quarters based on range slider
  const filteredQuarters = useMemo(() => {
    const startIdx = Math.floor(rangeStart / 100 * (allQuarters.length - 1));
    const endIdx = Math.floor(rangeEnd / 100 * (allQuarters.length - 1));
    return allQuarters.slice(startIdx, endIdx + 1);
  }, [allQuarters, rangeStart, rangeEnd]);

  const latestQuarter = filteredQuarters[filteredQuarters.length - 1] || '';
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

    const latestTotal = find(latestQuarter, '0');
    const prevTotal = prevYearQuarter ? find(prevYearQuarter, '0') : null;
    const latestMale = find(latestQuarter, '1');
    const latestFemale = find(latestQuarter, '2');

    const currentEmployed = latestTotal ? getPersons(latestTotal) : null;
    const prevEmployed = prevTotal ? getPersons(prevTotal) : null;
    const yoyChange = currentEmployed != null && prevEmployed != null
      ? ((currentEmployed - prevEmployed) / prevEmployed * 100)
      : null;

    const maleVal = latestMale ? getPersons(latestMale) : null;
    const femaleVal = latestFemale ? getPersons(latestFemale) : null;
    const genderBalance = maleVal != null && femaleVal != null && femaleVal > 0
      ? maleVal / femaleVal
      : null;

    return { currentEmployed, yoyChange, genderBalance, latestQuarter, maleVal, femaleVal };
  }, [data, latestQuarter, prevYearQuarter]);

  // Determine active units based on level and drill-down
  const activeUnits = useMemo(() => {
    if (drillRegion) {
      const distCodes = regionToDistricts.get(drillRegion) || [];
      return districts.filter(d => distCodes.includes(d.code));
    }
    return selectedLevel === 'region' ? regions : districts;
  }, [selectedLevel, drillRegion, regions, districts, regionToDistricts]);

  const handleDrillDown = useCallback((regionCode: string) => {
    if (nutsLevel(regionCode) === 'region') {
      setDrillRegion(regionCode);
      setSelectedLevel('district');
    }
  }, []);

  const handleClearDrill = useCallback(() => {
    setDrillRegion('');
    setHighlightedRegion('');
  }, []);

  if (!data || data.length === 0 || !kpiData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {locale === 'bg' ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const isBg = locale === 'bg';
  const getLabel = (u: NutsUnit) => isBg ? u.labelBg : u.label;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dataset.title[locale]}</CardTitle>
        <CardDescription>{dataset.description[locale]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Global Filters ── */}
        <div className="flex flex-wrap gap-4 items-end p-4 bg-muted/30 rounded-lg">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ep-level" className="text-sm font-medium">
              {isBg ? 'NUTS ниво' : 'NUTS Level'}
            </label>
            <Select id="ep-level" value={drillRegion ? 'district' : selectedLevel}
              onChange={(e) => { setSelectedLevel(e.target.value as 'region' | 'district'); setDrillRegion(''); setHighlightedRegion(''); }}
              className="w-[180px]">
              <option value="region">{isBg ? 'Региони (NUTS2)' : 'Regions (NUTS2)'}</option>
              <option value="district">{isBg ? 'Области (NUTS3)' : 'Districts (NUTS3)'}</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ep-gender" className="text-sm font-medium">
              {isBg ? 'Пол' : 'Gender'}
            </label>
            <Select id="ep-gender" value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className="w-[140px]">
              <option value="0">{isBg ? 'Общо' : 'Total'}</option>
              <option value="1">{isBg ? 'Мъже' : 'Male'}</option>
              <option value="2">{isBg ? 'Жени' : 'Female'}</option>
            </Select>
          </div>
          {drillRegion && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium text-primary">
                {isBg ? 'Филтър:' : 'Drill:'} {isBg ? (REGION_NAMES_BG[drillRegion] || drillRegion) : regions.find(r => r.code === drillRegion)?.label || drillRegion}
              </span>
              <button onClick={handleClearDrill} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/70 transition-colors">
                {isBg ? 'Изчисти' : 'Clear'}
              </button>
            </div>
          )}
        </div>

        {/* ── KPI Scorecard ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {isBg ? `Заети лица (${kpiData.latestQuarter})` : `Employed Persons (${kpiData.latestQuarter})`}
              </p>
              <p className="text-3xl font-bold mt-1">
                {kpiData.currentEmployed != null ? kpiData.currentEmployed.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{isBg ? 'хил. души' : 'thousand persons'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {isBg ? 'Промяна г/г' : 'YoY Change'}
              </p>
              <p className={`text-3xl font-bold mt-1 ${kpiData.yoyChange != null ? (kpiData.yoyChange >= 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
                {kpiData.yoyChange != null
                  ? `${kpiData.yoyChange >= 0 ? '+' : ''}${kpiData.yoyChange.toFixed(1)}%`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isBg ? 'спрямо същото тримесечие' : 'vs same quarter prev. year'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">
                {isBg ? 'Баланс М/Ж' : 'Gender Balance (M/F)'}
              </p>
              <p className="text-3xl font-bold mt-1">
                {kpiData.genderBalance != null ? kpiData.genderBalance.toFixed(2) : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {kpiData.maleVal != null && kpiData.femaleVal != null
                  ? `${kpiData.maleVal.toFixed(0)}K ${isBg ? 'м' : 'M'} / ${kpiData.femaleVal.toFixed(0)}K ${isBg ? 'ж' : 'F'}`
                  : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Charts ── */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">{isBg ? 'Тенденции' : 'Trends'}</TabsTrigger>
            <TabsTrigger value="heatmap">{isBg ? 'Карта' : 'Heatmap'}</TabsTrigger>
            <TabsTrigger value="gender">{isBg ? 'Пол' : 'Gender Gap'}</TabsTrigger>
            <TabsTrigger value="composition">{isBg ? 'Структура' : 'Composition'}</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsChart
              data={data} allQuarters={filteredQuarters} units={activeUnits}
              selectedGender={selectedGender} highlightedRegion={highlightedRegion}
              locale={locale} getLabel={getLabel}
            />
          </TabsContent>
          <TabsContent value="heatmap">
            <RegionalHeatmap
              data={data} allQuarters={filteredQuarters}
              regions={regions} districts={districts}
              regionToDistricts={regionToDistricts}
              selectedGender={selectedGender} locale={locale}
              getLabel={getLabel}
              onRegionClick={handleDrillDown}
            />
          </TabsContent>
          <TabsContent value="gender">
            <GenderBarChart
              data={data} allQuarters={filteredQuarters} units={activeUnits}
              locale={locale} getLabel={getLabel}
            />
          </TabsContent>
          <TabsContent value="composition">
            <CompositionTreemap
              data={data} allQuarters={filteredQuarters}
              regions={regions} districts={districts}
              regionToDistricts={regionToDistricts}
              selectedGender={selectedGender} locale={locale}
              getLabel={getLabel}
              onRegionClick={handleDrillDown}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ── Tab 1: Employment Trend (Line Chart) ───────────────────────────────────────

function TrendsChart({ data, allQuarters, units, selectedGender, highlightedRegion, locale, getLabel }: {
  data: any[];
  allQuarters: string[];
  units: NutsUnit[];
  selectedGender: string;
  highlightedRegion: string;
  locale: 'bg' | 'en';
  getLabel: (u: NutsUnit) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [compareMode, setCompareMode] = useState<'regions' | 'gender'>('regions');
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const result: { name: string; color: string; width: number; values: (number | null)[]; dash: boolean }[] = [];

    if (compareMode === 'gender') {
      // Compare Male vs Female nationally
      const genders = [
        { code: '0', label: isBg ? 'Общо' : 'Total', color: '#1e293b' },
        { code: '1', label: isBg ? 'Мъже' : 'Male', color: '#3b82f6' },
        { code: '2', label: isBg ? 'Жени' : 'Female', color: '#ec4899' },
      ];
      genders.forEach(g => {
        const filtered = data.filter(d => d.NUTS_Code === 'BG' && d.Gender_Code === g.code);
        const byQ: Record<string, number | null> = {};
        filtered.forEach(r => { if (r.Year) byQ[r.Year] = getPersons(r); });
        result.push({
          name: g.label,
          color: g.color,
          width: g.code === '0' ? 3 : 2,
          values: allQuarters.map(q => byQ[q] ?? null),
          dash: false,
        });
      });
    } else {
      // National line
      const bgFiltered = data.filter(d => d.NUTS_Code === 'BG' && d.Gender_Code === selectedGender);
      const bgByQ: Record<string, number | null> = {};
      bgFiltered.forEach(r => { if (r.Year) bgByQ[r.Year] = getPersons(r); });
      result.push({
        name: isBg ? 'България' : 'Bulgaria',
        color: '#1e293b',
        width: 3,
        values: allQuarters.map(q => bgByQ[q] ?? null),
        dash: false,
      });

      // Top 5 units or highlighted
      const latestQ = allQuarters[allQuarters.length - 1];
      const unitRanked = units.map(u => {
        const row = data.find(d => d.Year === latestQ && d.NUTS_Code === u.code && d.Gender_Code === selectedGender);
        return { ...u, val: row ? (getPersons(row) ?? 0) : 0 };
      }).sort((a, b) => b.val - a.val);

      const showUnits = highlightedRegion
        ? units.filter(u => u.code === highlightedRegion)
        : unitRanked.slice(0, 5);

      const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
      showUnits.forEach((u, i) => {
        const filtered = data.filter(d => d.NUTS_Code === u.code && d.Gender_Code === selectedGender);
        const byQ: Record<string, number | null> = {};
        filtered.forEach(r => { if (r.Year) byQ[r.Year] = getPersons(r); });

        const hasGaps = allQuarters.some(q => byQ[q] === null || byQ[q] === undefined);
        result.push({
          name: getLabel(u),
          color: REGION_COLORS[u.code] || colors[i % colors.length],
          width: highlightedRegion === u.code ? 3 : 1.5,
          values: allQuarters.map(q => byQ[q] ?? null),
          dash: hasGaps,
        });
      });
    }

    return result;
  }, [data, allQuarters, units, selectedGender, highlightedRegion, compareMode, getLabel, isBg]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => value != null ? Number(value).toFixed(1) + 'K' : 'N/A',
      },
      legend: {
        data: seriesData.map(s => s.name),
        type: 'scroll',
        bottom: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: 50, end: 100 },
        { type: 'slider', start: 50, end: 100, height: 20, bottom: 30 },
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
        name: isBg ? 'хил. души' : 'Thousands',
        axisLabel: { formatter: (v: number) => v.toFixed(0) },
      },
      series: seriesData.map(s => ({
        name: s.name,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: {
          width: s.width,
          type: s.dash ? ('dashed' as const) : ('solid' as const),
        },
        smooth: true,
        symbol: 'none',
        connectNulls: false,
        emphasis: { lineStyle: { width: 3 } },
      })),
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, seriesData, isBg]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ep-compare" className="text-sm font-medium">
            {isBg ? 'Сравнение' : 'Compare'}
          </label>
          <Select id="ep-compare" value={compareMode} onChange={(e) => setCompareMode(e.target.value as 'regions' | 'gender')} className="w-[180px]">
            <option value="regions">{isBg ? 'По региони' : 'By Regions'}</option>
            <option value="gender">{isBg ? 'Мъже vs Жени' : 'Male vs Female'}</option>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {compareMode === 'regions'
            ? (highlightedRegion
              ? (isBg ? 'Избран регион vs национално (хил. души)' : 'Selected region vs national (thousands)')
              : (isBg ? 'Топ 5 + национално ниво (хил. души)' : 'Top 5 + national level (thousands)'))
            : (isBg ? 'Сравнение по пол на национално ниво' : 'Gender comparison at national level')
          }
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '450px' }} />
    </div>
  );
}

// ── Tab 2: Regional Heatmap (Choropleth-style ranking) ─────────────────────────

function RegionalHeatmap({ data, allQuarters, regions, districts, regionToDistricts, selectedGender, locale, getLabel, onRegionClick }: {
  data: any[];
  allQuarters: string[];
  regions: NutsUnit[];
  districts: NutsUnit[];
  regionToDistricts: Map<string, string[]>;
  selectedGender: string;
  locale: 'bg' | 'en';
  getLabel: (u: NutsUnit) => string;
  onRegionClick: (code: string) => void;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const isBg = locale === 'bg';

  useEffect(() => {
    if (allQuarters.length > 0 && !selectedQuarter) {
      setSelectedQuarter(allQuarters[allQuarters.length - 1]);
    }
  }, [allQuarters, selectedQuarter]);

  const heatData = useMemo(() => {
    const quarter = selectedQuarter || allQuarters[allQuarters.length - 1];

    // Get all district values for the selected quarter
    const districtData = districts.map(d => {
      const row = data.find(r => r.Year === quarter && r.NUTS_Code === d.code && r.Gender_Code === selectedGender);
      const val = row ? getPersons(row) : null;
      return { code: d.code, label: getLabel(d), value: val ?? 0, parent: parentRegion(d.code) };
    }).sort((a, b) => b.value - a.value);

    return districtData;
  }, [data, allQuarters, districts, selectedGender, selectedQuarter, getLabel]);

  useEffect(() => {
    if (!chartRef.current || heatData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const values = heatData.map(d => d.value).filter(v => v > 0);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const d = Array.isArray(params) ? params[0] : params;
          return `<strong>${d.name}</strong><br/>${d.value.toFixed(1)} ${isBg ? 'хил.' : 'K'}`;
        },
      },
      visualMap: {
        min: minVal,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: {
          color: ['#fef3c7', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e'],
        },
        text: [isBg ? 'Висока' : 'High', isBg ? 'Ниска' : 'Low'],
        textStyle: { fontSize: 10 },
      },
      grid: { left: '3%', right: '10%', bottom: '15%', top: '3%', containLabel: true },
      xAxis: { type: 'value', name: isBg ? 'хил. души' : 'Thousands' },
      yAxis: {
        type: 'category',
        data: [...heatData].reverse().map(d => d.label),
        axisLabel: { fontSize: heatData.length > 15 ? 9 : 11 },
      },
      series: [{
        name: isBg ? 'Заети лица' : 'Employed persons',
        type: 'bar',
        data: [...heatData].reverse().map(d => ({
          value: d.value,
          itemStyle: { borderRadius: [0, 4, 4, 0] },
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (p: any) => Number(p.value).toFixed(1),
          fontSize: heatData.length > 15 ? 8 : 10,
        },
      }],
    };

    chart.setOption(option);

    chart.on('click', (params: any) => {
      const idx = params.dataIndex;
      const reversed = [...heatData].reverse();
      if (reversed[idx]) {
        const parentCode = reversed[idx].parent;
        onRegionClick(parentCode);
      }
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [heatData, isBg, onRegionClick]);

  const chartHeight = Math.max(400, heatData.length * 22 + 80);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ep-heat-q" className="text-sm font-medium">
            {isBg ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="ep-heat-q" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
            {allQuarters.map(q => <option key={q} value={q}>{q}</option>)}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {isBg
            ? 'Щракнете върху лента за филтриране по регион'
            : 'Click a bar to drill down into its parent region'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: chartHeight + 'px' }} />
    </div>
  );
}

// ── Tab 3: Gender Distribution (Grouped Bar Chart) ─────────────────────────────

function GenderBarChart({ data, allQuarters, units, locale, getLabel }: {
  data: any[];
  allQuarters: string[];
  units: NutsUnit[];
  locale: 'bg' | 'en';
  getLabel: (u: NutsUnit) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const isBg = locale === 'bg';

  useEffect(() => {
    if (allQuarters.length > 0 && !selectedQuarter) {
      setSelectedQuarter(allQuarters[allQuarters.length - 1]);
    }
  }, [allQuarters, selectedQuarter]);

  const barData = useMemo(() => {
    const quarter = selectedQuarter || allQuarters[allQuarters.length - 1];

    return units.map(u => {
      const maleRow = data.find(d => d.Year === quarter && d.NUTS_Code === u.code && d.Gender_Code === '1');
      const femaleRow = data.find(d => d.Year === quarter && d.NUTS_Code === u.code && d.Gender_Code === '2');
      return {
        label: getLabel(u),
        male: maleRow ? (getPersons(maleRow) ?? 0) : 0,
        female: femaleRow ? (getPersons(femaleRow) ?? 0) : 0,
      };
    }).sort((a, b) => (b.male + b.female) - (a.male + a.female));
  }, [data, allQuarters, units, selectedQuarter, getLabel]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<strong>${params[0].name}</strong>`;
          params.forEach((p: any) => {
            tip += `<br/>${p.marker} ${p.seriesName}: ${Number(p.value).toFixed(1)} ${isBg ? 'хил.' : 'K'}`;
          });
          const total = params.reduce((s: number, p: any) => s + Number(p.value), 0);
          tip += `<br/><strong>${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)}</strong>`;
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Мъже' : 'Male', isBg ? 'Жени' : 'Female'],
        bottom: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '12%', top: '3%', containLabel: true },
      yAxis: {
        type: 'category',
        data: [...barData].reverse().map(d => d.label),
        axisLabel: { fontSize: barData.length > 10 ? 9 : 11 },
      },
      xAxis: {
        type: 'value',
        name: isBg ? 'хил. души' : 'Thousands',
      },
      series: [
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'bar',
          stack: 'total',
          data: [...barData].reverse().map(d => d.male),
          itemStyle: { color: '#3b82f6', borderRadius: [0, 0, 0, 0] },
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'bar',
          stack: 'total',
          data: [...barData].reverse().map(d => d.female),
          itemStyle: { color: '#ec4899', borderRadius: [0, 4, 4, 0] },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg]);

  const chartHeight = Math.max(350, barData.length * 28 + 80);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ep-gender-q" className="text-sm font-medium">
            {isBg ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="ep-gender-q" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
            {allQuarters.map(q => <option key={q} value={q}>{q}</option>)}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {isBg
            ? 'Сравнение по пол за всеки регион/район'
            : 'Gender comparison across regions/districts'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: chartHeight + 'px' }} />
    </div>
  );
}

// ── Tab 4: Market Composition (Treemap) ────────────────────────────────────────

function CompositionTreemap({ data, allQuarters, regions, districts, regionToDistricts, selectedGender, locale, getLabel, onRegionClick }: {
  data: any[];
  allQuarters: string[];
  regions: NutsUnit[];
  districts: NutsUnit[];
  regionToDistricts: Map<string, string[]>;
  selectedGender: string;
  locale: 'bg' | 'en';
  getLabel: (u: NutsUnit) => string;
  onRegionClick: (code: string) => void;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const isBg = locale === 'bg';

  useEffect(() => {
    if (allQuarters.length > 0 && !selectedQuarter) {
      setSelectedQuarter(allQuarters[allQuarters.length - 1]);
    }
  }, [allQuarters, selectedQuarter]);

  const treemapData = useMemo(() => {
    const quarter = selectedQuarter || allQuarters[allQuarters.length - 1];

    return regions.map((reg, ri) => {
      const distCodes = regionToDistricts.get(reg.code) || [];
      const children = distCodes.map(dc => {
        const dist = districts.find(d => d.code === dc);
        const row = data.find(d => d.Year === quarter && d.NUTS_Code === dc && d.Gender_Code === selectedGender);
        const val = row ? (getPersons(row) ?? 0) : 0;
        return {
          name: dist ? getLabel(dist) : dc,
          value: val,
          code: dc,
        };
      }).filter(c => c.value > 0);

      return {
        name: getLabel(reg),
        code: reg.code,
        children,
        itemStyle: { color: REGION_COLORS[reg.code] || DISTRICT_COLORS[ri % DISTRICT_COLORS.length] },
      };
    }).filter(r => r.children.length > 0);
  }, [data, allQuarters, regions, districts, regionToDistricts, selectedGender, selectedQuarter, getLabel]);

  useEffect(() => {
    if (!chartRef.current || treemapData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        formatter: (params: any) => {
          const d = params.data;
          if (!d) return '';
          const val = d.value;
          return `<strong>${params.name}</strong><br/>${typeof val === 'number' ? val.toFixed(1) : val} ${isBg ? 'хил.' : 'K'}`;
        },
      },
      series: [{
        type: 'treemap',
        data: treemapData,
        width: '95%',
        height: '90%',
        roam: false,
        nodeClick: 'link',
        breadcrumb: {
          show: true,
          bottom: 5,
        },
        label: {
          show: true,
          formatter: (params: any) => {
            const name = params.name || '';
            const val = params.value;
            return `${name}\n${typeof val === 'number' ? val.toFixed(1) : val}`;
          },
          fontSize: 11,
          color: '#fff',
        },
        upperLabel: {
          show: true,
          height: 24,
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold',
        },
        levels: [
          {
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 3,
              gapWidth: 3,
            },
            upperLabel: { show: true },
          },
          {
            itemStyle: {
              borderColor: 'rgba(255,255,255,0.5)',
              borderWidth: 1,
              gapWidth: 1,
            },
            colorSaturation: [0.4, 0.8],
          },
        ],
      }],
    };

    chart.setOption(option);

    chart.on('click', (params: any) => {
      const d = params.data;
      if (d && d.code && nutsLevel(d.code) === 'region') {
        onRegionClick(d.code);
      }
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [treemapData, isBg, onRegionClick]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ep-tree-q" className="text-sm font-medium">
            {isBg ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="ep-tree-q" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
            {allQuarters.map(q => <option key={q} value={q}>{q}</option>)}
          </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-1">
          {isBg
            ? 'Регионална структура на заетостта. Щракнете регион за филтриране.'
            : 'Employment concentration by region. Click a region to drill down.'}
        </p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '500px' }} />
    </div>
  );
}
