'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Indicator codes ────────────────────────────────────────────────────────────
const IND = {
  ARRIVALS: '3.5.2.1.2', // Arrivals in accommodation establishments – foreigners
  NIGHTS:   '3.5.2.2.2', // Nights spent in accommodation establishments by foreigners
} as const;

// Aggregate codes excluded from individual-country charts
const AGGREGATE_CODES = new Set(['total', 'EU', 'OTH', 'OTH_EU', 'OTH_EUR', 'RoW']);

// ── Period helpers ─────────────────────────────────────────────────────────────
const ROMAN_TO_NUM: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6,
  'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12,
};
const MONTH_SHORT    = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_SHORT_BG = ['', 'яну', 'фев', 'мар', 'апр', 'май', 'юни', 'юли', 'авг', 'сеп', 'окт', 'ное', 'дек'];

function parsePeriod(period: string): { year: number; month: number; display: string; displayBg: string } {
  const year    = parseInt(period.slice(0, 4), 10);
  const monthStr = period.slice(4);
  const month   = ROMAN_TO_NUM[monthStr] ?? 0;
  return {
    year,
    month,
    display:   month > 0 ? `${MONTH_SHORT[month]} ${year}`    : period,
    displayBg: month > 0 ? `${MONTH_SHORT_BG[month]} ${year}` : period,
  };
}

function isAnnual(period: string): boolean { return period.length === 4; }

function sortPeriods(periods: string[]): string[] {
  return [...periods].sort((a, b) => {
    const pa = parsePeriod(a);
    const pb = parsePeriod(b);
    return pa.year !== pb.year ? pa.year - pb.year : pa.month - pb.month;
  });
}

// ── Utility helpers ────────────────────────────────────────────────────────────
function getVal(row: any, col: string): number | null {
  const v = row?.[col];
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) || n === 0 ? null : n;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ── Types ──────────────────────────────────────────────────────────────────────
// countryCode → indicatorCode → period → value
type DataIndex = Map<string, Map<string, Map<string, number>>>;
interface CountryEntry { code: string; name: string }
interface Props { data: any[]; dataset?: Dataset; locale?: 'bg' | 'en' }

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════

export function NightsByForeignersDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  // ── Build three-level index: countryCode → indicatorCode → period → value ──
  const index = useMemo<DataIndex>(() => {
    const map: DataIndex = new Map();
    for (const row of data) {
      const countryCode = String(row.Countries_TOUR_Code ?? row.Countries_TOUR ?? '');
      const indCode     = String(row.Indicators_Code ?? '');
      const period      = String(row.Year ?? '');
      const val         = getVal(row, 'Nights');
      if (!countryCode || !indCode || !period || val == null) continue;
      if (!map.has(countryCode)) map.set(countryCode, new Map());
      const byCountry = map.get(countryCode)!;
      if (!byCountry.has(indCode)) byCountry.set(indCode, new Map());
      byCountry.get(indCode)!.set(period, val);
    }
    return map;
  }, [data]);

  // ── Derived period lists ──
  const allPeriods = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) { if (row.Year) s.add(String(row.Year)); }
    return sortPeriods([...s]);
  }, [data]);

  const annualPeriods  = useMemo(() => allPeriods.filter(isAnnual), [allPeriods]);
  const monthlyPeriods = useMemo(() => allPeriods.filter(p => !isAnnual(p)), [allPeriods]);

  const allYears = useMemo(() => {
    const s = new Set<number>();
    for (const p of allPeriods) s.add(parsePeriod(p).year);
    return [...s].sort((a, b) => a - b);
  }, [allPeriods]);

  const latestAnnual = annualPeriods[annualPeriods.length - 1] ?? '';
  const firstAnnual  = annualPeriods[0] ?? '';

  // ── Individual countries (non-aggregate) ──
  const individualCountries = useMemo<CountryEntry[]>(() => {
    const seen = new Map<string, string>();
    for (const row of data) {
      const code = String(row.Countries_TOUR_Code ?? '');
      if (!AGGREGATE_CODES.has(code) && !seen.has(code)) {
        seen.set(code, String(row.Countries_TOUR ?? code));
      }
    }
    return [...seen.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // ── Country filter options ──
  const countryOptions = useMemo(() => {
    const agg: CountryEntry[] = [
      { code: 'total',   name: isBg ? 'Общо (всички страни)'          : 'Total (all countries)' },
      { code: 'EU',      name: isBg ? 'Европейски съюз'               : 'European Union' },
      { code: 'OTH_EUR', name: isBg ? 'Други европейски страни'       : 'Other European countries' },
      { code: 'RoW',     name: isBg ? 'Останалия свят'                : 'Rest of the world' },
    ].filter(c => index.has(c.code));
    return [...agg, ...individualCountries];
  }, [index, individualCountries, isBg]);

  const countryDisplayName = (code: string) =>
    countryOptions.find(c => c.code === code)?.name ?? code;

  // ── Filters ──
  const [granularity,    setGranularity]    = useState<'annual' | 'monthly'>('annual');
  const [selectedYear,   setSelectedYear]   = useState<number>(allYears[allYears.length - 1] ?? 0);
  const [countryFilter,  setCountryFilter]  = useState<string>('total');
  const [rankYear,       setRankYear]       = useState<string>(latestAnnual);

  // Periods shown in trend chart
  const trendPeriods = useMemo(() => {
    if (granularity === 'annual') return annualPeriods;
    return monthlyPeriods.filter(p => parsePeriod(p).year === selectedYear);
  }, [granularity, annualPeriods, monthlyPeriods, selectedYear]);

  // ── KPI: latest annual totals ──
  const kpi = useMemo(() => {
    const byTotal  = index.get('total');
    const nights   = byTotal?.get(IND.NIGHTS)?.get(latestAnnual) ?? null;
    const arrivals = byTotal?.get(IND.ARRIVALS)?.get(latestAnnual) ?? null;
    const avgStay  = nights != null && arrivals != null && arrivals > 0
      ? (nights / arrivals).toFixed(1) : null;

    const prevAnnual  = annualPeriods[annualPeriods.length - 2] ?? '';
    const prevNights  = byTotal?.get(IND.NIGHTS)?.get(prevAnnual) ?? null;
    const yoy = nights != null && prevNights != null && prevNights > 0
      ? ((nights - prevNights) / prevNights) * 100 : null;

    let topCountry = '', topVal = 0;
    for (const c of individualCountries) {
      const v = index.get(c.code)?.get(IND.NIGHTS)?.get(latestAnnual) ?? 0;
      if (v > topVal) { topVal = v; topCountry = c.name; }
    }
    return { nights, arrivals, avgStay, yoy, topCountry, topVal, prevAnnual };
  }, [index, latestAnnual, annualPeriods, individualCountries]);

  if (!data || data.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No data available</div>;
  }

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Нощувки на чужденци в места за настаняване'
            : 'Nights Spent by Foreigners in Accommodation Establishments'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни и месечни данни (${firstAnnual}–${latestAnnual}) | По страна на произход`
            : `Annual and monthly data (${firstAnnual}–${latestAnnual}) | By country of origin`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Общо нощувки' : 'Total Nights Spent'}
            </p>
            <p className="text-2xl font-bold mt-1 text-indigo-600">
              {kpi.nights != null ? fmtNum(kpi.nights) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{latestAnnual}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Пристигания' : 'Arrivals'}
            </p>
            <p className="text-2xl font-bold mt-1 text-teal-600">
              {kpi.arrivals != null ? fmtNum(kpi.arrivals) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{latestAnnual}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Среден престой' : 'Avg. Length of Stay'}
            </p>
            <p className="text-2xl font-bold mt-1 text-amber-500">
              {kpi.avgStay ? `${kpi.avgStay} ${isBg ? 'нощи' : 'nights'}` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{latestAnnual}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Промяна (год./год.)' : 'YoY Change (Nights)'}
            </p>
            <p className={`text-2xl font-bold mt-1 ${kpi.yoy == null ? 'text-slate-400' : kpi.yoy >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {kpi.yoy != null ? `${kpi.yoy >= 0 ? '+' : ''}${kpi.yoy.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {kpi.prevAnnual} → {latestAnnual}
            </p>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-4 items-center bg-white shadow-sm rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">
              {isBg ? 'Период:' : 'Granularity:'}
            </label>
            <Select
              value={granularity}
              onChange={e => setGranularity(e.target.value as 'annual' | 'monthly')}
              className="text-xs h-8 w-28"
            >
              <option value="annual">{isBg ? 'Годишно' : 'Annual'}</option>
              <option value="monthly">{isBg ? 'Месечно' : 'Monthly'}</option>
            </Select>
          </div>
          {granularity === 'monthly' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">
                {isBg ? 'Година:' : 'Year (trend):'}
              </label>
              <Select
                value={String(selectedYear)}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="text-xs h-8 w-24"
              >
                {[...allYears].reverse().map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">
              {isBg ? 'Страна (тренд):' : 'Country (trend):'}
            </label>
            <Select
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value)}
              className="text-xs h-8 w-56"
            >
              {countryOptions.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">
              {isBg ? 'Година (класация):' : 'Year (ranking):'}
            </label>
            <Select
              value={rankYear}
              onChange={e => setRankYear(e.target.value)}
              className="text-xs h-8 w-24"
            >
              {[...annualPeriods].reverse().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* ── Chart A: Dual-Axis Line — Arrivals vs Nights Spent ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Пристигания и нощувки — Динамика' : 'A. Arrivals & Nights Spent — Temporal Trend'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {countryDisplayName(countryFilter)} |{' '}
            {isBg
              ? 'Двойна ос — Пристигания (ляво, лилаво) и Нощувки (дясно, синьо)'
              : 'Dual axis — Arrivals (left, purple) and Nights (right, blue)'}
          </p>
          <DualAxisChart
            index={index}
            periods={trendPeriods}
            countryCode={countryFilter}
            isBg={isBg}
            isMonthly={granularity === 'monthly'}
          />
        </div>

        {/* ── Chart B: Scatter — Arrivals vs Nights by Country ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Б. Пристигания срещу Нощувки по страни' : 'B. Arrivals vs. Nights Spent by Country'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${rankYear} | Индивидуални страни | Размер = обем пристигания | Пунктир = ср. престой`
              : `${rankYear} | Individual countries | Size = arrivals volume | Dashed = avg. stay`}
          </p>
          <ScatterPlot
            index={index}
            period={rankYear}
            countries={individualCountries}
            isBg={isBg}
          />
        </div>

        {/* ── Chart C: Ranked Bar — Top 10 countries by Nights ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'В. Топ 10 страни по нощувки' : 'C. Top 10 Countries by Nights Spent'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${rankYear} | Индивидуални страни | Класиране по нощувки — сравнение с пристигания`
              : `${rankYear} | Individual countries | Ranked by nights — compared with arrivals`}
          </p>
          <RankedBarChart
            index={index}
            period={rankYear}
            countries={individualCountries}
            isBg={isBg}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Dual-Axis Line: Arrivals (left) vs. Nights Spent (right)
// ══════════════════════════════════════════════════════════════════════════════

function DualAxisChart({ index, periods, countryCode, isBg, isMonthly }: {
  index: DataIndex;
  periods: string[];
  countryCode: string;
  isBg: boolean;
  isMonthly: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    const byCountry = index.get(countryCode);
    return {
      arrivals: periods.map(p => byCountry?.get(IND.ARRIVALS)?.get(p) ?? null),
      nights:   periods.map(p => byCountry?.get(IND.NIGHTS)?.get(p) ?? null),
    };
  }, [index, periods, countryCode]);

  const xLabels = useMemo(() =>
    periods.map(p => {
      if (!isMonthly) return p;
      const { display, displayBg } = parsePeriod(p);
      return isBg ? displayBg : display;
    }),
  [periods, isMonthly, isBg]);

  useEffect(() => {
    if (!chartRef.current || periods.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const labelArrivals = isBg ? 'Пристигания' : 'Arrivals';
    const labelNights   = isBg ? 'Нощувки' : 'Nights Spent';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          for (const p of params) {
            if (p.value == null) continue;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtNum(p.value)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        bottom: '3%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '8%', bottom: '16%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xLabels,
        axisLabel: { fontSize: isMonthly ? 9 : 11, color: '#94a3b8', rotate: isMonthly ? 45 : 0 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: isBg ? 'Пристигания' : 'Arrivals',
          nameTextStyle: { fontSize: 10, color: '#6366f1' },
          axisLabel: { fontSize: 10, color: '#6366f1', formatter: (v: number) => fmtNum(v) },
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
          axisLine: { show: false },
          axisTick: { show: false },
          min: 0,
        },
        {
          type: 'value',
          name: isBg ? 'Нощувки' : 'Nights',
          nameTextStyle: { fontSize: 10, color: '#0ea5e9' },
          axisLabel: { fontSize: 10, color: '#0ea5e9', formatter: (v: number) => fmtNum(v) },
          splitLine: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          min: 0,
        },
      ],
      series: [
        {
          name: labelArrivals,
          type: 'line',
          yAxisIndex: 0,
          data: seriesData.arrivals,
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 2.5, color: '#6366f1' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          connectNulls: true,
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#6366f130' },
                { offset: 1, color: '#6366f100' },
              ],
            },
          },
        },
        {
          name: labelNights,
          type: 'line',
          yAxisIndex: 1,
          data: seriesData.nights,
          itemStyle: { color: '#0ea5e9' },
          lineStyle: { width: 2.5, color: '#0ea5e9', type: 'dashed' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          connectNulls: true,
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [seriesData, xLabels, periods, isBg, isMonthly]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Scatter: Arrivals (X) vs. Nights (Y) per individual country
// ══════════════════════════════════════════════════════════════════════════════

function ScatterPlot({ index, period, countries, isBg }: {
  index: DataIndex;
  period: string;
  countries: CountryEntry[];
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    return countries
      .map(c => ({
        name:     c.name,
        code:     c.code,
        arrivals: index.get(c.code)?.get(IND.ARRIVALS)?.get(period) ?? null,
        nights:   index.get(c.code)?.get(IND.NIGHTS)?.get(period) ?? null,
      }))
      .filter((d): d is { name: string; code: string; arrivals: number; nights: number } =>
        d.arrivals != null && d.nights != null && d.arrivals > 0
      );
  }, [index, period, countries]);

  // Average LOS ratio for the reference line
  const avgLos = useMemo(() => {
    if (!chartData.length) return null;
    const totalNights   = chartData.reduce((s, d) => s + d.nights, 0);
    const totalArrivals = chartData.reduce((s, d) => s + d.arrivals, 0);
    return totalArrivals > 0 ? totalNights / totalArrivals : null;
  }, [chartData]);

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const maxArrivals = Math.max(...chartData.map(d => d.arrivals));
    const losLabel = avgLos != null
      ? (isBg
          ? `Ср. престой (${avgLos.toFixed(1)} нощи/пристигане)`
          : `Avg. stay (${avgLos.toFixed(1)} nights/arrival)`)
      : '';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (params.seriesType !== 'scatter') return '';
          const d = params.data as [number, number, string, string];
          const los = d[0] > 0 ? (d[1] / d[0]).toFixed(1) : '—';
          return `<div style="font-weight:600">${d[2]}</div>
            <div style="color:#64748b;font-size:11px">${d[3]}</div>
            <div style="margin-top:4px">
              ${isBg ? 'Пристигания' : 'Arrivals'}: <b>${fmtNum(d[0])}</b>
            </div>
            <div>${isBg ? 'Нощувки' : 'Nights'}: <b>${fmtNum(d[1])}</b></div>
            <div>${isBg ? 'Ср. престой' : 'Avg. stay'}: <b>${los} ${isBg ? 'нощи' : 'nights'}</b></div>`;
        },
      },
      legend: avgLos != null ? {
        data: [losLabel],
        bottom: '2%',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      } : undefined,
      grid: { left: '1%', right: '8%', bottom: '12%', top: '6%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? 'Пристигания' : 'Arrivals',
        nameLocation: 'middle',
        nameGap: 28,
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtNum(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'Нощувки' : 'Nights Spent',
        nameLocation: 'middle',
        nameGap: 58,
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtNum(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: [
        {
          name: isBg ? 'Страна' : 'Country',
          type: 'scatter',
          data: chartData.map(d => [d.arrivals, d.nights, d.name, d.code] as any),
          symbolSize: (val: any) => {
            const v = (val as number[])[0];
            return Math.max(7, Math.min(38, (v / maxArrivals) * 64));
          },
          itemStyle: { color: '#6366f1', opacity: 0.72 },
          emphasis: { itemStyle: { opacity: 1 } },
          label: {
            show: true,
            formatter: (p: any) => (p.data as any)[3],
            fontSize: 9,
            color: '#475569',
            position: 'right',
          },
        },
        // Reference line: average length-of-stay slope
        ...(avgLos != null ? [{
          name: losLabel,
          type: 'line' as const,
          data: [[0, 0], [maxArrivals * 1.1, maxArrivals * 1.1 * avgLos]] as any,
          lineStyle: { color: '#f97316', type: 'dashed' as const, width: 1.5 },
          itemStyle: { color: '#f97316' },
          symbol: 'none',
          smooth: false,
        }] : []),
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, avgLos, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Horizontal Grouped Bar: Top 10 countries — Nights vs. Arrivals
// ══════════════════════════════════════════════════════════════════════════════

function RankedBarChart({ index, period, countries, isBg }: {
  index: DataIndex;
  period: string;
  countries: CountryEntry[];
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() =>
    countries
      .map(c => ({
        name:     c.name,
        code:     c.code,
        nights:   index.get(c.code)?.get(IND.NIGHTS)?.get(period) ?? 0,
        arrivals: index.get(c.code)?.get(IND.ARRIVALS)?.get(period) ?? 0,
      }))
      .filter(d => d.nights > 0)
      .sort((a, b) => b.nights - a.nights)
      .slice(0, 10),
  [index, period, countries]);

  // Reversed so highest-ranked country is visually at the top
  const reversed = useMemo(() => [...chartData].reverse(), [chartData]);

  useEffect(() => {
    if (!chartRef.current || reversed.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          const d = reversed[params[0].dataIndex];
          if (!d) return '';
          const los = d.arrivals > 0 ? (d.nights / d.arrivals).toFixed(1) : '—';
          return `<div style="font-weight:600">${d.name}</div>
            <div style="margin-top:4px">
              ${isBg ? 'Нощувки' : 'Nights'}: <b>${fmtNum(d.nights)}</b>
            </div>
            <div>${isBg ? 'Пристигания' : 'Arrivals'}: <b>${fmtNum(d.arrivals)}</b></div>
            <div>${isBg ? 'Ср. престой' : 'Avg. stay'}: <b>${los} ${isBg ? 'нощи' : 'nights'}</b></div>`;
        },
      },
      legend: {
        bottom: '2%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 12, itemHeight: 8,
      },
      grid: { left: '1%', right: '14%', bottom: '10%', top: '4%', containLabel: true },
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
        data: reversed.map(d => d.name),
        axisLabel: { fontSize: 11, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? 'Нощувки' : 'Nights Spent',
          type: 'bar',
          data: reversed.map(d => ({
            value: d.nights,
            itemStyle: { color: '#6366f1', borderRadius: [0, 4, 4, 0], opacity: 0.85 },
          })),
          barMaxWidth: 22,
          label: {
            show: true,
            position: 'right',
            fontSize: 10,
            fontWeight: 'bold',
            color: '#334155',
            formatter: (p: any) => fmtNum(p.value),
          },
          emphasis: { itemStyle: { opacity: 1 } },
        },
        {
          name: isBg ? 'Пристигания' : 'Arrivals',
          type: 'bar',
          data: reversed.map(d => ({
            value: d.arrivals,
            itemStyle: { color: '#0ea5e9', borderRadius: [0, 4, 4, 0], opacity: 0.78 },
          })),
          barMaxWidth: 22,
          label: {
            show: true,
            position: 'right',
            fontSize: 10,
            fontWeight: 'bold',
            color: '#334155',
            formatter: (p: any) => fmtNum(p.value),
          },
          emphasis: { itemStyle: { opacity: 1 } },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [reversed, isBg]);

  const chartHeight = Math.max(280, chartData.length * 52 + 80);
  return <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />;
}
