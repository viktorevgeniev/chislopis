'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import type { Dataset } from '@/types/dataset';

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseValue(v: any): number | null {
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[(),]/g, ''));
  return isNaN(n) ? null : n;
}

function fmtNum(v: number | null, decimals = 0): string {
  return v != null ? v.toLocaleString('bg-BG', { maximumFractionDigits: decimals }) : '—';
}

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ── Code classification ────────────────────────────────────────────────────────

type EkatteLevel = 'national' | 'macro' | 'nuts2' | 'district' | 'municipality';

function classifyCode(code: string): EkatteLevel {
  if (code === 'BG') return 'national';
  if (/^BG\d$/.test(code)) return 'macro';
  if (/^BG\d{2}$/.test(code)) return 'nuts2';
  if (code.length === 3) return 'district';
  return 'municipality';
}

// ── Static NUTS2 colors ────────────────────────────────────────────────────────

const NUTS2_COLORS: Record<string, string> = {
  BG31: '#3b82f6',  // Severozapaden - blue
  BG32: '#10b981',  // Severen tsentralen - emerald
  BG33: '#f59e0b',  // Severoiztochen - amber
  BG34: '#8b5cf6',  // Yugoiztochen - violet
  BG41: '#ef4444',  // Yugozapaden - red
  BG42: '#06b6d4',  // Yuzhen tsentralen - cyan
};

const REGION_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

// ── Types ──────────────────────────────────────────────────────────────────────

interface Row {
  code: string;
  label: string;
  year: string;
  value: number;
  level: EkatteLevel;
}

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export function ChildrenInKindergartensDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  // Parse and classify all rows
  const { rows, allYears, latestYear, firstYear } = useMemo(() => {
    const parsed: Row[] = [];
    for (const d of data) {
      const code  = String(d.EKATTE_Code ?? d.EKATTE ?? '');
      const label = String(d.EKATTE ?? code);
      const year  = String(d.Year ?? '');
      const value = parseValue(d.Count ?? d.ValueColumn);
      if (!code || !year || value == null) continue;
      parsed.push({ code, label, year, value, level: classifyCode(code) });
    }
    const years = [...new Set(parsed.map(r => r.year))].sort();
    return {
      rows: parsed,
      allYears: years,
      latestYear: years[years.length - 1] ?? '',
      firstYear: years[0] ?? '',
    };
  }, [data]);

  // Quick lookup: code → year → value
  const lookup = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const r of rows) {
      if (!m.has(r.code)) m.set(r.code, new Map());
      m.get(r.code)!.set(r.year, r.value);
    }
    return m;
  }, [rows]);

  const get = (code: string, year: string): number | null =>
    lookup.get(code)?.get(year) ?? null;

  // KPI calculations
  const kpi = useMemo(() => {
    const total     = get('BG', latestYear);
    const totalFirst = get('BG', firstYear);
    const prevYear  = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    const totalPrev = prevYear ? get('BG', prevYear) : null;
    const yoy = total != null && totalPrev != null && totalPrev > 0
      ? ((total - totalPrev) / totalPrev) * 100 : null;
    const totalChange = total != null && totalFirst != null && totalFirst > 0
      ? ((total - totalFirst) / totalFirst) * 100 : null;

    // Best and worst NUTS2 in latest year
    const nuts2 = Object.keys(NUTS2_COLORS)
      .map(c => ({ code: c, value: get(c, latestYear) }))
      .filter(x => x.value != null) as { code: string; value: number }[];
    nuts2.sort((a, b) => b.value - a.value);

    return { total, yoy, totalChange, largest: nuts2[0], smallest: nuts2[nuts2.length - 1] };
  }, [lookup, latestYear, firstYear, allYears]); // eslint-disable-line react-hooks/exhaustive-deps

  // Label helper (fall back to code if label equals code)
  const labelFor = (code: string): string => {
    const row = rows.find(r => r.code === code);
    return row ? row.label : code;
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Деца в детски градини по общини'
            : 'Children in Kindergartens by Municipalities'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Учебни години ${firstYear}–${latestYear} | По ЕКАТТЕ код (национално, региони, области, общини)`
            : `Academic years ${firstYear}–${latestYear} | By EKATTE code (national, regions, districts, municipalities)`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* KPI Cards */}
        {kpi.total != null && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label={isBg ? 'Деца в детски градини (общо)' : 'Children in Kindergartens (total)'}
              value={fmtNum(kpi.total)}
              sub={kpi.yoy != null
                ? `${kpi.yoy >= 0 ? '▲' : '▼'} ${Math.abs(kpi.yoy).toFixed(1)}% ${isBg ? 'спрямо пред. г.' : 'vs prev year'}`
                : undefined}
              subColor={kpi.yoy != null ? (kpi.yoy >= 0 ? 'text-emerald-600' : 'text-red-500') : undefined}
              year={latestYear}
              accent="sky"
            />
            <KpiCard
              label={isBg ? `Промяна от ${firstYear}` : `Change since ${firstYear}`}
              value={kpi.totalChange != null ? `${kpi.totalChange >= 0 ? '+' : ''}${kpi.totalChange.toFixed(1)}%` : '—'}
              sub={kpi.totalChange != null
                ? (isBg ? (kpi.totalChange >= 0 ? 'Нарастване' : 'Намаляване') : (kpi.totalChange >= 0 ? 'Increase' : 'Decline'))
                : undefined}
              subColor={kpi.totalChange != null ? (kpi.totalChange >= 0 ? 'text-emerald-600' : 'text-red-500') : undefined}
              year={`${firstYear} → ${latestYear}`}
              accent="amber"
            />
            <KpiCard
              label={isBg ? 'Най-голям регион' : 'Largest Region'}
              value={kpi.largest ? fmtNum(kpi.largest.value) : '—'}
              sub={kpi.largest ? labelFor(kpi.largest.code) : undefined}
              subColor="text-slate-500"
              year={latestYear}
              accent="blue"
            />
            <KpiCard
              label={isBg ? 'Най-малък регион' : 'Smallest Region'}
              value={kpi.smallest ? fmtNum(kpi.smallest.value) : '—'}
              sub={kpi.smallest ? labelFor(kpi.smallest.code) : undefined}
              subColor="text-slate-400"
              year={latestYear}
              accent="green"
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="trends">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="trends">{isBg ? 'Тенденции' : 'Trends'}</TabsTrigger>
            <TabsTrigger value="regions">{isBg ? 'Региони' : 'Regions'}</TabsTrigger>
            <TabsTrigger value="table">{isBg ? 'Области / Общини' : 'Districts / Municipalities'}</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsSection
              rows={rows} allYears={allYears} firstYear={firstYear}
              latestYear={latestYear} lookup={lookup} isBg={isBg}
            />
          </TabsContent>

          <TabsContent value="regions">
            <RegionsSection
              rows={rows} allYears={allYears} latestYear={latestYear}
              lookup={lookup} labelFor={labelFor} isBg={isBg}
            />
          </TabsContent>

          <TabsContent value="table">
            <TableSection
              rows={rows} allYears={allYears} latestYear={latestYear}
              lookup={lookup} isBg={isBg}
            />
          </TabsContent>
        </Tabs>

      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

type Accent = 'sky' | 'blue' | 'green' | 'amber';

const ACCENT: Record<Accent, { bg: string; text: string }> = {
  sky:   { bg: 'bg-sky-50',     text: 'text-sky-700' },
  blue:  { bg: 'bg-blue-50',    text: 'text-blue-700' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  amber: { bg: 'bg-amber-50',   text: 'text-amber-700' },
};

function KpiCard({
  label, value, sub, subColor, year, accent,
}: {
  label: string; value: string; sub?: string; subColor?: string;
  year: string; accent: Accent;
}) {
  const cls = ACCENT[accent];
  return (
    <div className={`${cls.bg} rounded-xl p-4`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${cls.text}`}>{value}</p>
      {sub && <p className={`text-[11px] font-semibold mt-1 ${subColor ?? 'text-slate-400'}`}>{sub}</p>}
      <p className="text-[10px] text-slate-400 mt-1">{year}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab A — National & Macro-region Trends
// ══════════════════════════════════════════════════════════════════════════════

function TrendsSection({
  rows, allYears, firstYear, latestYear, lookup, isBg,
}: {
  rows: Row[]; allYears: string[]; firstYear: string; latestYear: string;
  lookup: Map<string, Map<string, number>>; isBg: boolean;
}) {
  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">
          {isBg ? 'А. Национална тенденция' : 'A. National Trend'}
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          {isBg
            ? `Общ брой деца в детски градини в България (${firstYear}–${latestYear})`
            : `Total children in kindergartens in Bulgaria (${firstYear}–${latestYear})`}
        </p>
        <NationalTrendChart allYears={allYears} lookup={lookup} isBg={isBg} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">
          {isBg ? 'Б. По статистически райони (NUTS2)' : 'B. By Statistical Regions (NUTS2)'}
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          {isBg
            ? `Сравнение на 6-те статистически района по учебни години`
            : `Comparison of 6 statistical regions over academic years`}
        </p>
        <Nuts2TrendChart allYears={allYears} lookup={lookup} rows={rows} isBg={isBg} />
      </div>
    </div>
  );
}

function NationalTrendChart({
  allYears, lookup, isBg,
}: {
  allYears: string[]; lookup: Map<string, Map<string, number>>; isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const values = useMemo(
    () => allYears.map(yr => lookup.get('BG')?.get(yr) ?? null),
    [allYears, lookup]
  );

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.axisValue}</div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span>${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtNum(p.value)}</span>
            </div>`;
        },
      },
      grid: { left: '1%', right: '3%', bottom: '12%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allYears,
        axisLabel: { fontSize: 11, color: '#94a3b8', rotate: 30 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtNum(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: [{
        name: isBg ? 'Деца в детски градини' : 'Children in Kindergartens',
        type: 'line' as const,
        data: values,
        itemStyle: { color: '#0ea5e9' },
        lineStyle: { width: 3, color: '#0ea5e9' },
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        connectNulls: true,
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#0ea5e924' },
              { offset: 1, color: '#0ea5e904' },
            ],
          },
        },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, values, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '300px' }} />;
}

function Nuts2TrendChart({
  allYears, lookup, rows, isBg,
}: {
  allYears: string[]; lookup: Map<string, Map<string, number>>; rows: Row[]; isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const nuts2Codes = Object.keys(NUTS2_COLORS);

  const seriesData = useMemo(() => (
    nuts2Codes.map((code, i) => {
      const row = rows.find(r => r.code === code);
      return {
        code,
        label: row ? row.label : code,
        color: REGION_COLORS[i],
        values: allYears.map(yr => lookup.get(code)?.get(yr) ?? null),
      };
    })
  ), [allYears, lookup, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          [...params]
            .filter((p: any) => p.value != null)
            .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
            .forEach((p: any) => {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${fmtNum(p.value)}</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: seriesData.map(s => s.label),
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 12, itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allYears,
        axisLabel: { fontSize: 11, color: '#94a3b8', rotate: 30 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtNum(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: 2.5, color: s.color },
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '340px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab B — Regional Distribution for a Selected Year
// ══════════════════════════════════════════════════════════════════════════════

function RegionsSection({
  rows, allYears, latestYear, lookup, labelFor, isBg,
}: {
  rows: Row[]; allYears: string[]; latestYear: string;
  lookup: Map<string, Map<string, number>>;
  labelFor: (code: string) => string;
  isBg: boolean;
}) {
  const [selectedYear, setSelectedYear] = useState(latestYear);

  const nuts2Codes = Object.keys(NUTS2_COLORS);

  const barData = useMemo(() => (
    nuts2Codes
      .map((code, i) => ({
        code,
        label: labelFor(code),
        value: lookup.get(code)?.get(selectedYear) ?? null,
        color: REGION_COLORS[i],
      }))
      .filter(d => d.value != null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)) as { code: string; label: string; value: number; color: string }[]
  ), [lookup, selectedYear, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // Districts for the year, sorted descending
  const districtData = useMemo(() => (
    rows
      .filter(r => r.level === 'district' && r.year === selectedYear)
      .sort((a, b) => b.value - a.value)
  ), [rows, selectedYear]);

  const nationalTotal = lookup.get('BG')?.get(selectedYear) ?? null;

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg ? 'А. Разпределение по статистически региони (NUTS2)' : 'A. Distribution by Statistical Regions (NUTS2)'}
        </h3>
        <div className="flex items-center gap-1">
          <label className="text-xs text-slate-500">{isBg ? 'Учебна година:' : 'Academic year:'}</label>
          <Select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="text-xs py-1 px-2 h-8 w-28"
          >
            {[...allYears].reverse().map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isBg
          ? `Брой деца по региони за ${selectedYear}${nationalTotal != null ? ` | Общо: ${fmtNum(nationalTotal)}` : ''}`
          : `Children by region for ${selectedYear}${nationalTotal != null ? ` | Total: ${fmtNum(nationalTotal)}` : ''}`}
      </p>

      <RegionsBarChart barData={barData} nationalTotal={nationalTotal} isBg={isBg} />

      {/* Districts horizontal ranking */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          {isBg ? 'Б. Класация по области' : 'B. District Ranking'}
        </h3>
        <DistrictRankingChart districtData={districtData} nationalTotal={nationalTotal} isBg={isBg} />
      </div>
    </div>
  );
}

function RegionsBarChart({
  barData, nationalTotal, isBg,
}: {
  barData: { code: string; label: string; value: number; color: string }[];
  nationalTotal: number | null;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const pct = nationalTotal && nationalTotal > 0
            ? ((p.value / nationalTotal) * 100).toFixed(1) : null;
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.name}</div>
            <div>${isBg ? 'Деца' : 'Children'}: <b>${fmtNum(p.value)}</b>${pct ? ` (${pct}% ${isBg ? 'от общото' : 'of total'})` : ''}</div>`;
        },
      },
      grid: { left: '2%', right: '6%', bottom: '8%', top: '6%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtNum(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      yAxis: {
        type: 'category',
        data: [...barData].reverse().map(d => d.label),
        axisLabel: { fontSize: 11, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar' as const,
        data: [...barData].reverse().map(d => ({
          value: d.value,
          itemStyle: { color: d.color, borderRadius: [0, 4, 4, 0] as any },
        })),
        barMaxWidth: 36,
        label: {
          show: true,
          position: 'right' as const,
          formatter: (params: any) => fmtNum(params.value),
          fontSize: 11,
          color: '#475569',
        },
        emphasis: { focus: 'self' as const },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [barData, nationalTotal, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '260px' }} />;
}

function DistrictRankingChart({
  districtData, nationalTotal, isBg,
}: {
  districtData: Row[]; nationalTotal: number | null; isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || districtData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    // Show top 20 districts (sorted descending, chart flipped to show highest at top)
    const top = districtData.slice(0, 28);
    const reversed = [...top].reverse();

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const pct = nationalTotal && nationalTotal > 0
            ? ((p.value / nationalTotal) * 100).toFixed(1) : null;
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.name}</div>
            <div>${isBg ? 'Деца' : 'Children'}: <b>${fmtNum(p.value)}</b>${pct ? ` (${pct}%)` : ''}</div>`;
        },
      },
      grid: { left: '2%', right: '6%', bottom: '6%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtNum(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      yAxis: {
        type: 'category',
        data: reversed.map(d => d.label),
        axisLabel: { fontSize: 10, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar' as const,
        data: reversed.map((d, i) => ({
          value: d.value,
          itemStyle: {
            color: `hsl(${210 - i * 5},70%,${55 + i}%)`,
            borderRadius: [0, 3, 3, 0] as any,
          },
        })),
        barMaxWidth: 20,
        label: {
          show: true,
          position: 'right' as const,
          formatter: (params: any) => fmtNum(params.value),
          fontSize: 10,
          color: '#475569',
        },
        emphasis: { focus: 'self' as const },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [districtData, nationalTotal, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: `${Math.min(districtData.length, 28) * 24 + 40}px`, minHeight: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab C — Interactive Data Table (Districts & Municipalities)
// ══════════════════════════════════════════════════════════════════════════════

type SortKey = 'label' | 'value' | 'pct';
type SortDir = 'asc' | 'desc';

function TableSection({
  rows, allYears, latestYear, lookup, isBg,
}: {
  rows: Row[]; allYears: string[]; latestYear: string;
  lookup: Map<string, Map<string, number>>; isBg: boolean;
}) {
  const [selectedYear, setSelectedYear] = useState(latestYear);
  const [levelFilter, setLevelFilter]   = useState<'all' | 'district' | 'municipality'>('all');
  const [search, setSearch]             = useState('');
  const [sortKey, setSortKey]           = useState<SortKey>('value');
  const [sortDir, setSortDir]           = useState<SortDir>('desc');
  const [page, setPage]                 = useState(0);
  const PAGE_SIZE = 20;

  const nationalTotal = lookup.get('BG')?.get(selectedYear) ?? null;

  const tableRows = useMemo(() => {
    let filtered = rows.filter(r =>
      (r.level === 'district' || r.level === 'municipality') &&
      r.year === selectedYear
    );

    if (levelFilter !== 'all') {
      filtered = filtered.filter(r => r.level === levelFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(r =>
        r.label.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
      );
    }

    filtered = filtered.map(r => ({
      ...r,
      pct: nationalTotal && nationalTotal > 0 ? (r.value / nationalTotal) * 100 : null,
    })) as any[];

    filtered.sort((a: any, b: any) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (sortKey === 'label') {
        av = String(av ?? '');
        bv = String(bv ?? '');
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      av = av ?? -Infinity;
      bv = bv ?? -Infinity;
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    return filtered;
  }, [rows, selectedYear, levelFilter, search, sortKey, sortDir, nationalTotal]);

  const totalPages = Math.ceil(tableRows.length / PAGE_SIZE);
  const pageRows = tableRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (k !== sortKey) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-sky-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div className="flex items-center gap-1">
          <label className="text-xs text-slate-500">{isBg ? 'Учебна година:' : 'Academic year:'}</label>
          <Select
            value={selectedYear}
            onChange={e => { setSelectedYear(e.target.value); setPage(0); }}
            className="text-xs py-1 px-2 h-8 w-28"
          >
            {[...allYears].reverse().map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <label className="text-xs text-slate-500">{isBg ? 'Ниво:' : 'Level:'}</label>
          <Select
            value={levelFilter}
            onChange={e => { setLevelFilter(e.target.value as any); setPage(0); }}
            className="text-xs py-1 px-2 h-8 w-36"
          >
            <option value="all">{isBg ? 'Всички' : 'All levels'}</option>
            <option value="district">{isBg ? 'Само области' : 'Districts only'}</option>
            <option value="municipality">{isBg ? 'Само общини' : 'Municipalities only'}</option>
          </Select>
        </div>
        <div className="flex items-center gap-1 flex-1 min-w-40">
          <label className="text-xs text-slate-500">{isBg ? 'Търсене:' : 'Search:'}</label>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder={isBg ? 'Наименование или код...' : 'Name or code...'}
            className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 h-8 focus:outline-none focus:ring-1 focus:ring-sky-300"
          />
        </div>
        <span className="text-xs text-slate-400">
          {isBg ? `${tableRows.length} записа` : `${tableRows.length} records`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-slate-600 border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-100 text-[11px] text-slate-400 uppercase">
              <th className="text-left py-2 pr-3 font-medium w-4">#</th>
              <th
                className="text-left py-2 pr-3 font-medium cursor-pointer hover:text-slate-600"
                onClick={() => toggleSort('label')}
              >
                {isBg ? 'Наименование' : 'Name'} <SortIcon k="label" />
              </th>
              <th className="text-left py-2 pr-3 font-medium text-[10px]">
                {isBg ? 'Тип' : 'Level'}
              </th>
              <th
                className="text-right py-2 pr-3 font-medium cursor-pointer hover:text-slate-600"
                onClick={() => toggleSort('value')}
              >
                {isBg ? 'Деца' : 'Children'} <SortIcon k="value" />
              </th>
              <th
                className="text-right py-2 font-medium cursor-pointer hover:text-slate-600"
                onClick={() => toggleSort('pct')}
              >
                % {isBg ? 'от общото' : 'of total'} <SortIcon k="pct" />
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400">
                  {isBg ? 'Няма намерени записи' : 'No records found'}
                </td>
              </tr>
            ) : (
              pageRows.map((r: any, i) => {
                const rank = page * PAGE_SIZE + i + 1;
                const isDistrict = r.level === 'district';
                return (
                  <tr key={`${r.code}-${r.year}`} className={`border-b border-slate-50 hover:bg-slate-50 ${isDistrict ? 'font-medium' : ''}`}>
                    <td className="py-1.5 pr-3 text-slate-400">{rank}</td>
                    <td className="py-1.5 pr-3">
                      <span className={isDistrict ? 'text-slate-800' : 'text-slate-600 pl-2'}>{r.label}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({r.code})</span>
                    </td>
                    <td className="py-1.5 pr-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDistrict ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        {isDistrict
                          ? (isBg ? 'Обл.' : 'District')
                          : (isBg ? 'Общ.' : 'Mun.')}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-right font-medium text-sky-600">
                      {fmtNum(r.value)}
                    </td>
                    <td className="py-1.5 text-right text-slate-500">
                      {r.pct != null ? `${r.pct.toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-xs px-3 py-1 rounded border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
          >
            {isBg ? '← Предишна' : '← Prev'}
          </button>
          <span className="text-xs text-slate-400">
            {isBg
              ? `Страница ${page + 1} от ${totalPages}`
              : `Page ${page + 1} of ${totalPages}`}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-xs px-3 py-1 rounded border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
          >
            {isBg ? 'Следваща →' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
}
