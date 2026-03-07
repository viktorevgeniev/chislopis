'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Short occupation labels ─────────────────────────────────────────────────

const OCC_SHORT: Record<string, string> = {
  '1': 'Managers',
  '2': 'Professionals',
  '3': 'Technicians',
  '4': 'Clerical Support',
  '5': 'Service & Sales',
  '6': 'Agricultural Workers',
  '7': 'Craft & Trade',
  '8': 'Machine Operators',
  '9': 'Elementary Occupations',
};

const OCC_SHORT_BG: Record<string, string> = {
  '1': 'Ръководители',
  '2': 'Специалисти',
  '3': 'Техници',
  '4': 'Служители',
  '5': 'Услуги и търговия',
  '6': 'Селско стопанство',
  '7': 'Занаятчии',
  '8': 'Машинни оператори',
  '9': 'Нискоквалифицирани',
};

const OCC_COLORS: Record<string, string> = {
  '1': '#2563eb', '2': '#16a34a', '3': '#8b5cf6', '4': '#ea580c',
  '5': '#e11d48', '6': '#78716c', '7': '#0d9488', '8': '#eab308', '9': '#06b6d4',
};

const OCC_CODES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseQuarter(q: string): number {
  const m = q.match(/^(\d{4})Q(\d)$/);
  if (!m) return 0;
  return parseInt(m[1]) * 10 + parseInt(m[2]);
}
function sortQuarters(a: string, b: string) { return parseQuarter(a) - parseQuarter(b); }

function fmtQ(q: string, isBg: boolean): string {
  const m = q.match(/^(\d{4})Q(\d)$/);
  if (!m) return q;
  return isBg ? `${m[1]} Q${m[2]}` : `${m[1]} Q${m[2]}`;
}

function getVal(v: any): number {
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[()]/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ── Types ───────────────────────────────────────────────────────────────────

interface Row {
  [key: string]: any;
  Year: string;
  Gender: string;
  Gender_Code: string;
  Persons: number;
}

/** Detect which occupation-code column is present and the "total" sentinel */
function detectOccColumn(data: Row[]): { col: string; totalCode: string } {
  if (data.length === 0) return { col: 'Labour_SES_nkpd1996_Code', totalCode: '0' };
  const first = data[0];
  if ('NKPD2011_CLS_Code' in first) return { col: 'NKPD2011_CLS_Code', totalCode: 'total' };
  if ('NKPD2005_CLS_Code' in first) return { col: 'NKPD2005_CLS_Code', totalCode: 'total' };
  return { col: 'Labour_SES_nkpd1996_Code', totalCode: '0' };
}

interface Props { data: Row[]; dataset: Dataset; locale: 'bg' | 'en'; }

// ── Chart wrapper ───────────────────────────────────────────────────────────

function Chart({ option, height = 420 }: { option: EChartsOption; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    chart.setOption(option, true);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [option]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

export function EmployedByOccupationDashboard({ data, dataset, locale }: Props) {
  const isBg = locale === 'bg';
  const labels = isBg ? OCC_SHORT_BG : OCC_SHORT;
  const { col: occCol, totalCode } = useMemo(() => detectOccColumn(data), [data]);

  // ── All quarters sorted
  const quarters = useMemo(
    () => [...new Set(data.map(r => r.Year))].sort(sortQuarters),
    [data]
  );

  // ── Year options for filter
  const years = useMemo(() => [...new Set(quarters.map(q => q.slice(0, 4)))].sort(), [quarters]);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Filter quarters by selected year
  const filteredQuarters = useMemo(
    () => selectedYear === 'all' ? quarters : quarters.filter(q => q.startsWith(selectedYear)),
    [quarters, selectedYear]
  );

  // ── Quick-access maps
  const lookup = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data) {
      m.set(`${r[occCol]}|${r.Year}|${r.Gender_Code}`, getVal(r.Persons));
    }
    return m;
  }, [data, occCol]);

  // ── KPI cards
  const kpis = useMemo(() => {
    const g = (occ: string, q: string, gn: string) => lookup.get(`${occ}|${q}|${gn}`) ?? 0;
    const lastQ = quarters[quarters.length - 1];
    const prevQ = quarters.length >= 5 ? quarters[quarters.length - 5] : quarters[0];
    const total = g(totalCode, lastQ, '0');
    const totalPrev = g(totalCode, prevQ, '0');
    const yoyPct = totalPrev > 0 ? ((total - totalPrev) / totalPrev) * 100 : 0;

    // Find largest occupation in latest quarter
    let largestCode = '1';
    let largestVal = 0;
    for (const c of OCC_CODES) {
      const v = g(c, lastQ, '0');
      if (v > largestVal) { largestVal = v; largestCode = c; }
    }

    // Gender gap
    const male = g(totalCode, lastQ, '1');
    const female = g(totalCode, lastQ, '2');
    const gapPct = total > 0 ? ((male - female) / total) * 100 : 0;

    return { lastQ, total, yoyPct, largestCode, largestVal, gapPct };
  }, [quarters, lookup, totalCode]);

  // ── Chart A: Macro Trend (stacked area by occupation)
  const trendOption = useMemo((): EChartsOption => {
    const g = (occ: string, q: string, gn: string) => lookup.get(`${occ}|${q}|${gn}`) ?? 0;
    const xData = filteredQuarters.map(q => fmtQ(q, isBg));
    return {
      tooltip: { trigger: 'axis', confine: true, valueFormatter: (v: any) => `${Number(v).toFixed(1)} ${isBg ? 'хил.' : 'K'}` },
      legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11 } },
      grid: { top: 20, left: 60, right: 20, bottom: 60 },
      xAxis: { type: 'category', data: xData, axisLabel: { rotate: 45, fontSize: 11 } },
      yAxis: { type: 'value', name: isBg ? 'хил. лица' : 'Thousands', axisLabel: { fontSize: 11 } },
      series: OCC_CODES.map(code => ({
        name: labels[code],
        type: 'line' as const,
        stack: 'total',
        areaStyle: { opacity: 0.6 },
        emphasis: { focus: 'series' as const },
        symbol: 'none',
        itemStyle: { color: OCC_COLORS[code] },
        data: filteredQuarters.map(q => g(code, q, '0')),
      })),
    };
  }, [filteredQuarters, isBg, labels, lookup]);

  // ── Chart B: Occupational Structure (stacked bar, latest 4 quarters)
  const structureOption = useMemo((): EChartsOption => {
    const g = (occ: string, q: string, gn: string) => lookup.get(`${occ}|${q}|${gn}`) ?? 0;
    const qs = filteredQuarters.slice(-4);
    const xData = qs.map(q => fmtQ(q, isBg));
    return {
      tooltip: { trigger: 'axis', confine: true, valueFormatter: (v: any) => `${Number(v).toFixed(1)} ${isBg ? 'хил.' : 'K'}` },
      legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11 } },
      grid: { top: 20, left: 60, right: 20, bottom: 60 },
      xAxis: { type: 'category', data: xData, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', name: isBg ? 'хил. лица' : 'Thousands', axisLabel: { fontSize: 11 } },
      series: OCC_CODES.map(code => ({
        name: labels[code],
        type: 'bar' as const,
        stack: 'total',
        emphasis: { focus: 'series' as const },
        itemStyle: { color: OCC_COLORS[code] },
        data: qs.map(q => g(code, q, '0')),
      })),
    };
  }, [filteredQuarters, isBg, labels, lookup]);

  // ── Chart C: Gender Disparity (grouped bar for each occupation, latest quarter of filtered)
  const genderOption = useMemo((): EChartsOption => {
    const g = (occ: string, q: string, gn: string) => lookup.get(`${occ}|${q}|${gn}`) ?? 0;
    const lastQ = filteredQuarters[filteredQuarters.length - 1];
    if (!lastQ) return {};
    const yData = OCC_CODES.map(c => labels[c]);
    return {
      tooltip: { trigger: 'axis', confine: true, valueFormatter: (v: any) => `${Number(v).toFixed(1)} ${isBg ? 'хил.' : 'K'}` },
      legend: { data: [isBg ? 'Мъже' : 'Male', isBg ? 'Жени' : 'Female'], bottom: 0 },
      grid: { top: 10, left: 160, right: 30, bottom: 40 },
      xAxis: { type: 'value', name: isBg ? 'хил. лица' : 'Thousands', axisLabel: { fontSize: 11 } },
      yAxis: { type: 'category', data: yData, axisLabel: { fontSize: 11, width: 140, overflow: 'truncate' } },
      series: [
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'bar' as const,
          itemStyle: { color: '#3b82f6' },
          data: OCC_CODES.map(c => g(c, lastQ, '1')),
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'bar' as const,
          itemStyle: { color: '#ec4899' },
          data: OCC_CODES.map(c => g(c, lastQ, '2')),
        },
      ],
    };
  }, [filteredQuarters, isBg, labels, lookup]);

  if (quarters.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">No data available</div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 p-4 rounded-xl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {isBg ? 'Заети лица по професионални класове и пол' : 'Employed Persons by Occupation & Sex'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isBg ? dataset.description.bg : dataset.description.en}
          </p>
        </div>
        <Select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="w-40"
        >
          <option value="all">{isBg ? 'Всички години' : 'All Years'}</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{isBg ? 'Общо заети' : 'Total Employed'}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{kpis.total.toFixed(1)} {isBg ? 'хил.' : 'K'}</p>
            <p className={`text-xs mt-1 ${kpis.yoyPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {kpis.yoyPct >= 0 ? '▲' : '▼'} {Math.abs(kpis.yoyPct).toFixed(1)}% {isBg ? 'г/г' : 'YoY'}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{isBg ? 'Най-голям клас' : 'Largest Occupation'}</p>
            <p className="text-lg font-bold text-slate-800 mt-1">{labels[kpis.largestCode]}</p>
            <p className="text-xs text-slate-500 mt-1">{kpis.largestVal.toFixed(1)} {isBg ? 'хил.' : 'K'}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{isBg ? 'Полов дисбаланс' : 'Gender Gap'}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{kpis.gapPct > 0 ? '+' : ''}{kpis.gapPct.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">{isBg ? 'Разлика мъже–жени' : 'Male–Female diff'}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Chart A: Macro Trend ── */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isBg ? 'Тенденция по професии (стъпкова площ)' : 'Employment Trend by Occupation (Stacked Area)'}</CardTitle>
          <CardDescription className="text-xs">{isBg ? 'Хиляди лица, по тримесечия' : 'Thousands of persons, quarterly'}</CardDescription>
        </CardHeader>
        <CardContent><Chart option={trendOption} height={400} /></CardContent>
      </Card>

      {/* ── Charts B & C side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{isBg ? 'Професионална структура' : 'Occupational Structure'}</CardTitle>
            <CardDescription className="text-xs">{isBg ? 'Последни 4 тримесечия' : 'Last 4 quarters'}</CardDescription>
          </CardHeader>
          <CardContent><Chart option={structureOption} height={380} /></CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{isBg ? 'Полово разпределение по професии' : 'Gender Distribution by Occupation'}</CardTitle>
            <CardDescription className="text-xs">
              {filteredQuarters.length > 0 ? fmtQ(filteredQuarters[filteredQuarters.length - 1], isBg) : ''}
            </CardDescription>
          </CardHeader>
          <CardContent><Chart option={genderOption} height={380} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
