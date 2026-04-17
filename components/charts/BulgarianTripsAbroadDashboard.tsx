'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Indicator codes ────────────────────────────────────────────────────────────
const IND = {
  TOTAL:        '3.5.1.1',
  HOLIDAY:      '3.5.1.1.1',
  PROFESSIONAL: '3.5.1.1.2',
  OTHER:        '3.5.1.1.3',
} as const;

// Aggregate region codes — excluded from individual-country rankings
const AGGREGATE_CODES = new Set(['total', 'EU', 'OTH', 'OTH_EU', 'OTH_EUR', 'RoW']);

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
// countryCode → indicatorCode → year → value
type DataIndex = Map<string, Map<string, Map<string, number>>>;
interface CountryEntry { code: string; name: string }
interface Props { data: any[]; dataset?: Dataset; locale?: 'bg' | 'en' }

// ── Small KPI card ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white shadow-sm rounded-xl p-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════

export function BulgarianTripsAbroadDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  // ── Build three-level index: countryCode → indicatorCode → year → value ──
  const index = useMemo<DataIndex>(() => {
    const map: DataIndex = new Map();
    for (const row of data) {
      const countryCode = String(row.Countries_TOUR_Code ?? row.Countries_TOUR ?? '');
      const indCode     = String(row.Indicators_Code ?? '');
      const year        = String(row.Year ?? '');
      const val         = getVal(row, 'Trips');
      if (!countryCode || !indCode || !year || val == null) continue;
      if (!map.has(countryCode)) map.set(countryCode, new Map());
      const byCountry = map.get(countryCode)!;
      if (!byCountry.has(indCode)) byCountry.set(indCode, new Map());
      byCountry.get(indCode)!.set(year, val);
    }
    return map;
  }, [data]);

  // ── All years, sorted ascending ──
  const allYears = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) { if (row.Year) s.add(String(row.Year)); }
    return [...s].sort();
  }, [data]);

  const latestYear = allYears[allYears.length - 1] ?? '';
  const firstYear  = allYears[0] ?? '';

  // Annual-only years (exclude monthly periods like "2020XII")
  const annualYears = useMemo(() => allYears.filter(y => /^\d{4}$/.test(y)), [allYears]);
  const latestAnnualYear = annualYears[annualYears.length - 1] ?? latestYear;
  const firstAnnualYear  = annualYears[0] ?? firstYear;
  const prevAnnualYear   = annualYears[annualYears.length - 2] ?? latestAnnualYear;

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

  // ── KPI values ──
  const kpi = useMemo(() => {
    const byTotal = index.get('total');
    const total   = byTotal?.get(IND.TOTAL)?.get(latestAnnualYear) ?? null;
    const prev    = byTotal?.get(IND.TOTAL)?.get(prevAnnualYear) ?? null;
    const yoy     = total != null && prev != null && prev > 0
      ? ((total - prev) / prev) * 100 : null;

    let topCountry = '', topVal = 0;
    for (const c of individualCountries) {
      const v = index.get(c.code)?.get(IND.TOTAL)?.get(latestAnnualYear) ?? 0;
      if (v > topVal) { topVal = v; topCountry = c.name; }
    }

    const holiday    = byTotal?.get(IND.HOLIDAY)?.get(latestAnnualYear) ?? null;
    const holidayPct = total != null && holiday != null && total > 0
      ? (holiday / total * 100).toFixed(1) : null;

    return { total, yoy, topCountry, topVal, holiday, holidayPct, prevAnnualYear };
  }, [index, latestAnnualYear, prevAnnualYear, individualCountries]);

  const [rankYear, setRankYear] = useState<string>(latestAnnualYear);

  if (!data || data.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No data available</div>;
  }

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Пътувания на български граждани в чужбина'
            : 'Trips of Bulgarian Residents Abroad'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Данни по дестинация и цел на пътуване (${firstAnnualYear}–${latestAnnualYear})`
            : `Data by destination and purpose of travel (${firstAnnualYear}–${latestAnnualYear})`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <KpiCard
            label={isBg ? 'Общо пътувания' : 'Total Trips'}
            value={kpi.total != null ? fmtNum(kpi.total) : '—'}
            sub={latestAnnualYear}
            color="text-indigo-600"
          />
          <KpiCard
            label={isBg ? 'Промяна (год./год.)' : 'YoY Change'}
            value={kpi.yoy != null ? `${kpi.yoy >= 0 ? '+' : ''}${kpi.yoy.toFixed(1)}%` : '—'}
            sub={`${kpi.prevAnnualYear} → ${latestAnnualYear}`}
            color={kpi.yoy == null ? 'text-slate-400' : kpi.yoy >= 0 ? 'text-emerald-600' : 'text-red-500'}
          />
          <KpiCard
            label={isBg ? 'Топ дестинация' : 'Top Destination'}
            value={kpi.topCountry || '—'}
            sub={kpi.topVal > 0 ? fmtNum(kpi.topVal) : ''}
            color="text-teal-600"
          />
          <KpiCard
            label={isBg ? 'Дял за отдих' : 'Holiday Share'}
            value={kpi.holidayPct ? `${kpi.holidayPct}%` : '—'}
            sub={latestAnnualYear}
            color="text-amber-500"
          />
        </div>

        {/* ── Chart A: Line — Total Trips & Purpose Mix Over Time ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Обща динамика на пътуванията' : 'A. Total Trips — Temporal Trend'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Общо пътувания и разбивка по цел — всички страни'
              : 'Total trips and breakdown by purpose — all destinations'}
          </p>
          <TrendLineChart index={index} years={allYears} isBg={isBg} />
        </div>

        {/* ── Chart B: Stacked Bar — Purpose Breakdown Per Year ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Б. Разпределение по цел на пътуване' : 'B. Trips by Purpose of Travel'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Натрупан стълбограм — отдих, бизнес и друго по години'
              : 'Stacked bars — holiday, professional, and other purposes by year'}
          </p>
          <PurposeStackedBar index={index} years={allYears} isBg={isBg} />
        </div>

        {/* ── Rank Year Filter ── */}
        <div className="flex flex-wrap gap-4 items-center bg-white shadow-sm rounded-xl px-4 py-3">
          <label className="text-xs text-slate-500 whitespace-nowrap">
            {isBg ? 'Година (класация):' : 'Year (ranking):'}
          </label>
          <Select
            value={rankYear}
            onChange={e => setRankYear(e.target.value)}
            className="text-xs h-8 w-24"
          >
            {[...allYears].reverse().map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>

        {/* ── Chart C: Horizontal Bar — Top 10 Destination Countries ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'В. Топ 10 дестинации по брой пътувания' : 'C. Top 10 Destinations by Trip Volume'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${rankYear} | Индивидуални страни | Класиране по общ брой пътувания`
              : `${rankYear} | Individual countries | Ranked by total trip count`}
          </p>
          <TopCountriesBar
            index={index}
            year={rankYear}
            countries={individualCountries}
            isBg={isBg}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-Line: Total + Sub-purpose Trips Over Time
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ index, years, isBg }: {
  index: DataIndex;
  years: string[];
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    const byTotal = index.get('total');
    return {
      total:   years.map(y => byTotal?.get(IND.TOTAL)?.get(y) ?? null),
      holiday: years.map(y => byTotal?.get(IND.HOLIDAY)?.get(y) ?? null),
      prof:    years.map(y => byTotal?.get(IND.PROFESSIONAL)?.get(y) ?? null),
      other:   years.map(y => byTotal?.get(IND.OTHER)?.get(y) ?? null),
    };
  }, [index, years]);

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const labels = {
      total:   isBg ? 'Общо'    : 'Total',
      holiday: isBg ? 'Отдих'   : 'Holiday & Recreation',
      prof:    isBg ? 'Бизнес'  : 'Professional',
      other:   isBg ? 'Друго'   : 'Other Purposes',
    };

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
      grid: { left: '1%', right: '4%', bottom: '16%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: years,
        axisLabel: { fontSize: 11, color: '#94a3b8' },
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
      series: [
        {
          name: labels.total,
          type: 'line',
          data: seriesData.total,
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 3, color: '#6366f1' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          connectNulls: true,
          areaStyle: {
            color: {
              type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#6366f128' },
                { offset: 1, color: '#6366f100' },
              ],
            },
          },
        },
        {
          name: labels.holiday,
          type: 'line',
          data: seriesData.holiday,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2, color: '#10b981' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          connectNulls: true,
        },
        {
          name: labels.prof,
          type: 'line',
          data: seriesData.prof,
          itemStyle: { color: '#0ea5e9' },
          lineStyle: { width: 2, color: '#0ea5e9' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          connectNulls: true,
        },
        {
          name: labels.other,
          type: 'line',
          data: seriesData.other,
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 2, color: '#f59e0b', type: 'dashed' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          connectNulls: true,
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [seriesData, years, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Stacked Bar: Holiday / Professional / Other per Year
// ══════════════════════════════════════════════════════════════════════════════

function PurposeStackedBar({ index, years, isBg }: {
  index: DataIndex;
  years: string[];
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    const byTotal = index.get('total');
    return {
      holiday: years.map(y => byTotal?.get(IND.HOLIDAY)?.get(y) ?? null),
      prof:    years.map(y => byTotal?.get(IND.PROFESSIONAL)?.get(y) ?? null),
      other:   years.map(y => byTotal?.get(IND.OTHER)?.get(y) ?? null),
    };
  }, [index, years]);

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const labels = {
      holiday: isBg ? 'Отдих и развлечение' : 'Holiday & Recreation',
      prof:    isBg ? 'Бизнес пътувания'    : 'Professional',
      other:   isBg ? 'Друго'               : 'Other Purposes',
    };

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          let total = 0;
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          for (const p of params) {
            if (p.value == null || p.value === 0) continue;
            total += p.value;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:2px;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtNum(p.value)}</span>
            </div>`;
          }
          if (total > 0) {
            tip += `<div style="border-top:1px solid #e2e8f0;margin-top:4px;padding-top:4px;font-weight:600">
              ${isBg ? 'Общо' : 'Total'}: ${fmtNum(total)}
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
      grid: { left: '1%', right: '4%', bottom: '16%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { fontSize: 11, color: '#94a3b8' },
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
      series: [
        {
          name: labels.holiday,
          type: 'bar',
          stack: 'purpose',
          data: seriesData.holiday,
          itemStyle: { color: '#10b981' },
          emphasis: { itemStyle: { opacity: 1 } },
        },
        {
          name: labels.prof,
          type: 'bar',
          stack: 'purpose',
          data: seriesData.prof,
          itemStyle: { color: '#6366f1' },
          emphasis: { itemStyle: { opacity: 1 } },
        },
        {
          name: labels.other,
          type: 'bar',
          stack: 'purpose',
          data: seriesData.other,
          itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
          emphasis: { itemStyle: { opacity: 1 } },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [seriesData, years, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Horizontal Bar: Top 10 Destinations by Total Trips
// ══════════════════════════════════════════════════════════════════════════════

function TopCountriesBar({ index, year, countries, isBg }: {
  index: DataIndex;
  year: string;
  countries: CountryEntry[];
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() =>
    countries
      .map(c => ({
        name:    c.name,
        code:    c.code,
        total:   index.get(c.code)?.get(IND.TOTAL)?.get(year) ?? 0,
        holiday: index.get(c.code)?.get(IND.HOLIDAY)?.get(year) ?? 0,
        prof:    index.get(c.code)?.get(IND.PROFESSIONAL)?.get(year) ?? 0,
        other:   index.get(c.code)?.get(IND.OTHER)?.get(year) ?? 0,
      }))
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
  [index, year, countries]);

  // Reversed so top country appears at the top
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
          const holidayPct = d.total > 0 ? (d.holiday / d.total * 100).toFixed(1) : '—';
          const profPct    = d.total > 0 ? (d.prof    / d.total * 100).toFixed(1) : '—';
          return `<div style="font-weight:600">${d.name}</div>
            <div style="margin-top:4px">
              ${isBg ? 'Общо' : 'Total'}: <b>${fmtNum(d.total)}</b>
            </div>
            <div>${isBg ? 'Отдих' : 'Holiday'}: <b>${fmtNum(d.holiday)}</b> (${holidayPct}%)</div>
            <div>${isBg ? 'Бизнес' : 'Professional'}: <b>${fmtNum(d.prof)}</b> (${profPct}%)</div>
            <div>${isBg ? 'Друго' : 'Other'}: <b>${fmtNum(d.other)}</b></div>`;
        },
      },
      grid: { left: '1%', right: '14%', bottom: '6%', top: '4%', containLabel: true },
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
          name: isBg ? 'Общо пътувания' : 'Total Trips',
          type: 'bar',
          data: reversed.map(d => ({
            value: d.total,
            itemStyle: { color: '#6366f1', borderRadius: [0, 4, 4, 0], opacity: 0.85 },
          })),
          barMaxWidth: 24,
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

  const chartHeight = Math.max(280, chartData.length * 52 + 60);
  return <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />;
}
