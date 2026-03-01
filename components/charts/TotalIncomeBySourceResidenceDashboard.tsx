'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Dimension constants ────────────────────────────────────────────────────────

const RESIDENCE_CODES = ['0', '1', '2'] as const;
const RESIDENCE_EN: Record<string, string> = { '0': 'Total', '1': 'Urban', '2': 'Rural' };
const RESIDENCE_BG: Record<string, string> = { '0': 'Общо', '1': 'Градско', '2': 'Селско' };
const RESIDENCE_COLORS: Record<string, string> = { '0': '#6366f1', '1': '#3b82f6', '2': '#10b981' };

// Income structure components shown in stacked bar (Measure 3 / Structure %)
// Codes that are direct children of the gross income block
const STACK_COMPONENTS: Array<{ code: string; en: string; bg: string; color: string }> = [
  { code: '1111', en: 'Wages & Salaries', bg: 'Заплати и надници', color: '#6366f1' },
  { code: '1113', en: 'Self-employment', bg: 'Самонаети', color: '#10b981' },
  { code: '1115', en: 'Pensions', bg: 'Пенсии', color: '#f59e0b' },
  { code: '1116', en: 'Unemployment benefits', bg: 'Помощи безработица', color: '#ef4444' },
  { code: '1117', en: 'Family allowances', bg: 'Семейни помощи', color: '#8b5cf6' },
  { code: '1114', en: 'Property income', bg: 'Доходи от собственост', color: '#06b6d4' },
  { code: '1112', en: 'Other earnings', bg: 'Други трудови доходи', color: '#f97316' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function residenceName(code: string, isBg: boolean): string {
  return (isBg ? RESIDENCE_BG[code] : RESIDENCE_EN[code]) ?? code;
}

function getVal(row: any): number | null {
  const v = row?.Amount ?? row?.ValueColumn;
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// Build a 3-level index: measureCode → odCode → residenceCode → year → value
function buildIndex(data: any[]): Map<string, Map<string, Map<string, Map<string, number>>>> {
  const root = new Map<string, Map<string, Map<string, Map<string, number>>>>();
  for (const row of data) {
    const m: string = row.HBS_Meassure_Code ?? '';
    const od: string = row.HBS_OD_Code ?? '';
    const res: string = row.Residence_Code ?? '';
    const yr: string = String(row.Year ?? '');
    const val = getVal(row);
    if (!m || !od || !res || !yr || val == null) continue;
    if (!root.has(m)) root.set(m, new Map());
    const mMap = root.get(m)!;
    if (!mMap.has(od)) mMap.set(od, new Map());
    const odMap = mMap.get(od)!;
    if (!odMap.has(res)) odMap.set(res, new Map());
    odMap.get(res)!.set(yr, val);
  }
  return root;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════

export function TotalIncomeBySourceResidenceDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  const { allYears, latestYear, firstYear, idx } = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => { if (d.Year) years.add(String(d.Year)); });
    const sorted = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    return {
      allYears: sorted,
      latestYear: sorted[sorted.length - 1] ?? '',
      firstYear: sorted[0] ?? '',
      idx: buildIndex(data),
    };
  }, [data]);

  // Helper: get value from index
  const get = (m: string, od: string, res: string, yr: string): number | null =>
    idx.get(m)?.get(od)?.get(res)?.get(yr) ?? null;

  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const totalHH = get('1', '11', '0', latestYear);   // Total income, per household, Total
    const urbanHH = get('1', '11', '1', latestYear);   // Urban
    const ruralHH = get('1', '11', '2', latestYear);   // Rural
    const prevTotal = prevYear ? get('1', '11', '0', prevYear) : null;
    const yoy = totalHH != null && prevTotal != null ? totalHH - prevTotal : null;
    const yoyPct = totalHH != null && prevTotal != null && prevTotal > 0
      ? ((totalHH - prevTotal) / prevTotal) * 100 : null;
    const urbanRuralGap = urbanHH != null && ruralHH != null ? urbanHH - ruralHH : null;
    const totalPerCapita = get('2', '11', '0', latestYear);

    return { totalHH, urbanHH, ruralHH, totalPerCapita, yoy, yoyPct, urbanRuralGap };
  }, [idx, latestYear, allYears]);

  if (!data || data.length === 0 || !kpi) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const fmt = (v: number | null) =>
    v != null ? v.toLocaleString('bg-BG', { maximumFractionDigits: 0 }) : '—';

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Общ доход по източници и местоживеене'
            : 'Total Income by Source and Place of Residence'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Средни стойности на домакинство и на лице (лв.) и структура (%)`
            : `Annual data (${firstYear}–${latestYear}) | Average per household and per capita (BGN) and structural breakdown (%)`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Общ доход / домакинство' : 'Total income / household'}
            </p>
            <p className="text-3xl font-bold mt-2 text-indigo-600">
              {fmt(kpi.totalHH)} <span className="text-lg font-normal text-slate-400">лв.</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">{isBg ? 'Национално, средно' : 'National, average'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{latestYear}</span>
              {kpi.yoyPct != null && (
                <span className={`text-[10px] font-semibold ${kpi.yoyPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.yoyPct >= 0 ? '▲' : '▼'} {Math.abs(kpi.yoyPct).toFixed(1)}% YoY
                </span>
              )}
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Градско / Селско' : 'Urban / Rural'}
            </p>
            <div className="flex items-end gap-3 mt-2">
              <div>
                <p className="text-2xl font-bold text-blue-500">{fmt(kpi.urbanHH)}</p>
                <p className="text-[11px] text-slate-400">{isBg ? 'Градско' : 'Urban'}</p>
              </div>
              <span className="text-slate-300 text-xl mb-1">/</span>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{fmt(kpi.ruralHH)}</p>
                <p className="text-[11px] text-slate-400">{isBg ? 'Селско' : 'Rural'}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{isBg ? 'лв./домакинство' : 'BGN/household'} · {latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Градско-Селска разлика' : 'Urban–Rural gap'}
            </p>
            <p className="text-3xl font-bold mt-2 text-amber-500">
              {kpi.urbanRuralGap != null ? `${fmt(kpi.urbanRuralGap)} лв.` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Доход на домакинство' : 'Income per household'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Доход на лице' : 'Income per capita'}
            </p>
            <p className="text-3xl font-bold mt-2 text-violet-600">
              {fmt(kpi.totalPerCapita)} <span className="text-lg font-normal text-slate-400">лв.</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">{isBg ? 'Национално, средно' : 'National, average'}</p>
            <p className="text-[10px] text-slate-400 mt-1">{latestYear}</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="trend">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="trend">
              {isBg ? 'Динамика на дохода' : 'Income Trend'}
            </TabsTrigger>
            <TabsTrigger value="structure">
              {isBg ? 'Структура на дохода' : 'Income Structure'}
            </TabsTrigger>
            <TabsTrigger value="comparison">
              {isBg ? 'Домакинство / Лице' : 'Household vs Per Capita'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trend">
            <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                {isBg
                  ? 'А. Динамика на общия брутен доход по местоживеене'
                  : 'A. Total Gross Income Trend by Place of Residence'}
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                {isBg
                  ? `${firstYear}–${latestYear} | Среден доход на домакинство (лв.) | Брутен доход (HBS_OD 111)`
                  : `${firstYear}–${latestYear} | Average income per household (BGN) | Gross income (HBS_OD 111)`}
              </p>
              <IncomeTrendChart idx={idx} allYears={allYears} isBg={isBg} />
            </div>
          </TabsContent>

          <TabsContent value="structure">
            <IncomeStructureSection
              idx={idx}
              allYears={allYears}
              latestYear={latestYear}
              isBg={isBg}
            />
          </TabsContent>

          <TabsContent value="comparison">
            <HhVsCapitaSection
              idx={idx}
              allYears={allYears}
              latestYear={latestYear}
              isBg={isBg}
            />
          </TabsContent>
        </Tabs>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Time-series line: Total Gross Income by Residence
// ══════════════════════════════════════════════════════════════════════════════

function IncomeTrendChart({
  idx,
  allYears,
  isBg,
}: {
  idx: ReturnType<typeof buildIndex>;
  allYears: string[];
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => (
    RESIDENCE_CODES.map(res => ({
      res,
      label: isBg ? RESIDENCE_BG[res] : RESIDENCE_EN[res],
      color: RESIDENCE_COLORS[res],
      // HBS_Meassure=1 (per household), HBS_OD=111 (Total gross income)
      values: allYears.map(yr => idx.get('1')?.get('111')?.get(res)?.get(yr) ?? null),
    }))
  ), [idx, allYears, isBg]);

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
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toLocaleString()} лв.</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: seriesData.map(s => s.label),
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
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
        name: isBg ? 'лв./домакинство' : 'BGN/household',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10, color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
        },
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
        lineStyle: { width: s.res === '0' ? 3 : 2, color: s.color },
        smooth: true,
        symbol: 'circle',
        symbolSize: s.res === '0' ? 7 : 5,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
        areaStyle: s.res === '0' ? {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99,102,241,0.12)' },
              { offset: 1, color: 'rgba(99,102,241,0)' },
            ],
          },
        } : undefined,
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — 100% Stacked Bar: Income structure (Measure 3) by Residence
// ══════════════════════════════════════════════════════════════════════════════

function IncomeStructureSection({
  idx,
  allYears,
  latestYear,
  isBg,
}: {
  idx: ReturnType<typeof buildIndex>;
  allYears: string[];
  latestYear: string;
  isBg: boolean;
}) {
  const [residenceFilter, setResidenceFilter] = useState<string>('0');

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg
            ? 'Б. Структура на дохода по източници (%) по години'
            : 'B. Income Source Structure (%) Over Years'}
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">{isBg ? 'Местоживеене:' : 'Residence:'}</label>
          <Select
            value={residenceFilter}
            onChange={e => setResidenceFilter(e.target.value)}
            className="text-xs py-1 px-2 h-8 w-28"
          >
            {RESIDENCE_CODES.map(c => (
              <option key={c} value={c}>{isBg ? RESIDENCE_BG[c] : RESIDENCE_EN[c]}</option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isBg
          ? 'Дял на основните компоненти в общия доход (%) | Мярка: структура'
          : 'Share of main income components in total income (%) | Measure: structure'}
      </p>
      <IncomeStructureChart idx={idx} allYears={allYears} residenceCode={residenceFilter} isBg={isBg} />
    </div>
  );
}

function IncomeStructureChart({
  idx,
  allYears,
  residenceCode,
  isBg,
}: {
  idx: ReturnType<typeof buildIndex>;
  allYears: string[];
  residenceCode: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Use Measure 3 (Structure %) for the stacked components
  const seriesData = useMemo(() => {
    const components = STACK_COMPONENTS.map(comp => ({
      ...comp,
      label: isBg ? comp.bg : comp.en,
      values: allYears.map(yr => idx.get('3')?.get(comp.code)?.get(residenceCode)?.get(yr) ?? null),
    }));

    // Compute "Other" = 100 - sum of known components (to fill up the 100%)
    const otherValues = allYears.map((yr, i) => {
      const sum = components.reduce((s, c) => s + (c.values[i] ?? 0), 0);
      const remaining = Math.max(0, 100 - sum);
      return remaining > 0.5 ? remaining : null;
    });

    return [...components, {
      code: 'other',
      en: 'Other',
      bg: 'Други',
      color: '#94a3b8',
      label: isBg ? 'Други' : 'Other',
      values: otherValues,
    }];
  }, [idx, allYears, residenceCode, isBg]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          [...params]
            .filter((p: any) => p.value != null && p.value > 0.1)
            .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
            .forEach((p: any) => {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
                <span style="flex:1;font-size:11px">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px;font-size:11px">${Number(p.value).toFixed(1)}%</span>
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
      grid: { left: '1%', right: '3%', bottom: '22%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        data: allYears,
        axisLabel: { fontSize: 11, color: '#94a3b8', rotate: 30 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        max: 100,
        min: 0,
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'bar' as const,
        stack: 'income',
        data: s.values,
        itemStyle: { color: s.color },
        barMaxWidth: 60,
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '440px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Grouped bar: Per Household vs Per Capita by Residence
// ══════════════════════════════════════════════════════════════════════════════

function HhVsCapitaSection({
  idx,
  allYears,
  latestYear,
  isBg,
}: {
  idx: ReturnType<typeof buildIndex>;
  allYears: string[];
  latestYear: string;
  isBg: boolean;
}) {
  const [selectedYear, setSelectedYear] = useState(latestYear);

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg
            ? 'В. Сравнение: доход на домакинство и на лице по местоживеене'
            : 'C. Comparison: Income per Household vs Per Capita by Residence'}
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">{isBg ? 'Година:' : 'Year:'}</label>
          <Select
            value={selectedYear || latestYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="text-xs py-1 px-2 h-8 w-24"
          >
            {[...allYears].reverse().map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isBg
          ? 'Общ доход (HBS_OD 11): Средно на домакинство (лв.) и средно на лице (лв.) | Разликата отразява размера на домакинствата'
          : 'Total income (HBS_OD 11): Average per household (BGN) and per capita (BGN) | The gap reflects household size variation'}
      </p>
      <HhVsCapitaChart idx={idx} year={selectedYear || latestYear} isBg={isBg} />
    </div>
  );
}

function HhVsCapitaChart({
  idx,
  year,
  isBg,
}: {
  idx: ReturnType<typeof buildIndex>;
  year: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => (
    RESIDENCE_CODES.map(res => ({
      res,
      label: residenceName(res, isBg),
      perHH: idx.get('1')?.get('11')?.get(res)?.get(year) ?? null,
      perCapita: idx.get('2')?.get('11')?.get(res)?.get(year) ?? null,
    }))
  ), [idx, year, isBg]);

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const hhLabel = isBg ? 'На домакинство (лв.)' : 'Per household (BGN)';
    const capLabel = isBg ? 'На лице (лв.)' : 'Per capita (BGN)';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            if (p.value == null) return;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${Number(p.value).toLocaleString()} лв.</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [hhLabel, capLabel],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '2%', right: '4%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: chartData.map(d => d.label),
        axisLabel: { fontSize: 12, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'лв.' : 'BGN',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10, color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: [
        {
          name: hhLabel,
          type: 'bar' as const,
          data: chartData.map(d => ({
            value: d.perHH,
            itemStyle: { color: '#6366f1', borderRadius: [6, 6, 0, 0], opacity: 0.88 },
          })),
          barMaxWidth: 64,
          label: {
            show: true,
            position: 'top' as const,
            fontSize: 12,
            fontWeight: 'bold' as const,
            color: '#334155',
            formatter: (p: any) => p.value != null
              ? Number(p.value).toLocaleString('bg-BG', { maximumFractionDigits: 0 })
              : '',
          },
          emphasis: { itemStyle: { opacity: 1 } },
        },
        {
          name: capLabel,
          type: 'bar' as const,
          data: chartData.map(d => ({
            value: d.perCapita,
            itemStyle: { color: '#10b981', borderRadius: [6, 6, 0, 0], opacity: 0.88 },
          })),
          barMaxWidth: 64,
          label: {
            show: true,
            position: 'top' as const,
            fontSize: 12,
            fontWeight: 'bold' as const,
            color: '#334155',
            formatter: (p: any) => p.value != null
              ? Number(p.value).toLocaleString('bg-BG', { maximumFractionDigits: 0 })
              : '',
          },
          emphasis: { itemStyle: { opacity: 1 } },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
