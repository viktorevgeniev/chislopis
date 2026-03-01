'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Indicator codes ───────────────────────────────────────────────────────────
const IND = {
  TOTAL:        '3.5.1.2',
  HOLIDAY:      '3.5.1.2.1',
  PROFESSIONAL: '3.5.1.2.2',
  OTHER:        '3.5.1.2.3',
} as const;

// Aggregate country codes excluded from individual-country ranking chart
const AGGREGATE_CODES = new Set(['total', 'EU', 'OTH', 'OTH_EU', 'OTH_EUR', 'RoW']);

// ── Utility helpers ───────────────────────────────────────────────────────────
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

// ── Data types ────────────────────────────────────────────────────────────────
// countryCode → indicatorCode → year → value
type DataIndex = Map<string, Map<string, Map<string, number>>>;

interface CountryEntry { code: string; name: string }

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════

export function VisitorsInBulgariaDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  // ── Build three-level index ──
  const index = useMemo<DataIndex>(() => {
    const map: DataIndex = new Map();
    for (const row of data) {
      const countryCode = String(row.Countries_TOUR_Code ?? row.Countries_TOUR ?? '');
      const indCode     = String(row.Indicators_Code ?? '');
      const year        = String(row.Year ?? '');
      const val         = getVal(row, 'Visitors');
      if (!countryCode || !indCode || !year || val == null) continue;
      if (!map.has(countryCode)) map.set(countryCode, new Map());
      const byCountry = map.get(countryCode)!;
      if (!byCountry.has(indCode)) byCountry.set(indCode, new Map());
      byCountry.get(indCode)!.set(year, val);
    }
    return map;
  }, [data]);

  // ── Derived dimension lists ──
  const allYears = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) { if (row.Year) s.add(String(row.Year)); }
    return [...s].sort();
  }, [data]);

  const latestYear = allYears[allYears.length - 1] ?? '';
  const firstYear  = allYears[0] ?? '';

  // All individual countries (exclude aggregates)
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

  // ── Filters ──
  const [yearFilter,    setYearFilter]    = useState<string>(latestYear);
  const [countryFilter, setCountryFilter] = useState<string>('total');

  // Country display options for filters
  const countryOptions = useMemo(() => {
    const agg: CountryEntry[] = [
      { code: 'total',   name: isBg ? 'Общо (всички страни)' : 'Total (all countries)' },
      { code: 'EU',      name: isBg ? 'Европейски съюз' : 'European Union' },
      { code: 'OTH_EUR', name: isBg ? 'Други европейски страни' : 'Other European countries' },
      { code: 'RoW',     name: isBg ? 'Останалия свят' : 'Rest of the world' },
    ].filter(c => index.has(c.code));
    return [...agg, ...individualCountries];
  }, [index, individualCountries, isBg]);

  const countryDisplayName = (code: string) =>
    countryOptions.find(c => c.code === code)?.name ?? code;

  // ── KPI: latest year totals for "total" country ──
  const kpi = useMemo(() => {
    const byCountry = index.get('total');
    const total     = byCountry?.get(IND.TOTAL)?.get(latestYear) ?? null;
    const holiday   = byCountry?.get(IND.HOLIDAY)?.get(latestYear) ?? null;
    const professional = byCountry?.get(IND.PROFESSIONAL)?.get(latestYear) ?? null;

    // YoY change
    const prevYear  = allYears[allYears.length - 2] ?? '';
    const prevTotal = byCountry?.get(IND.TOTAL)?.get(prevYear) ?? null;
    const yoy = (total != null && prevTotal != null && prevTotal > 0)
      ? ((total - prevTotal) / prevTotal) * 100
      : null;

    // Top individual country in latest year
    let topCountry = '', topVal = 0;
    for (const entry of individualCountries) {
      const v = index.get(entry.code)?.get(IND.TOTAL)?.get(latestYear) ?? 0;
      if (v > topVal) { topVal = v; topCountry = entry.name; }
    }

    const holidayShare = (total != null && holiday != null && total > 0)
      ? (holiday / total * 100).toFixed(1)
      : null;

    return { total, holiday, professional, yoy, topCountry, topVal, holidayShare };
  }, [index, latestYear, allYears, individualCountries]);

  if (!data || data.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No data available</div>;
  }

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg ? 'Посещения на чужденци в България' : 'Arrivals of Visitors from Abroad to Bulgaria'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | По страна на произход и цел на посещението`
            : `Annual data (${firstYear}–${latestYear}) | By country of origin and visit purpose`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-4 items-center bg-white shadow-sm rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">
              {isBg ? 'Страна:' : 'Country:'}
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
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="text-xs h-8 w-24"
            >
              {[...allYears].reverse().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Общо посетители' : 'Total Visitors'}
            </p>
            <p className="text-2xl font-bold mt-1 text-indigo-600">
              {kpi.total != null ? fmtNum(kpi.total) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{latestYear}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Промяна (год./год.)' : 'YoY Change'}
            </p>
            <p className={`text-2xl font-bold mt-1 ${kpi.yoy == null ? 'text-slate-400' : kpi.yoy >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {kpi.yoy != null ? `${kpi.yoy >= 0 ? '+' : ''}${kpi.yoy.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? `vs ${allYears[allYears.length - 2] ?? ''}` : `vs ${allYears[allYears.length - 2] ?? ''}`}
            </p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Дял — Почивка и отдих' : 'Holiday & Recreation Share'}
            </p>
            <p className="text-2xl font-bold mt-1 text-amber-500">
              {kpi.holidayShare != null ? `${kpi.holidayShare}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{latestYear}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Водеща страна' : 'Top Country'}
            </p>
            <p className="text-lg font-bold mt-1 text-rose-500 leading-tight break-words">
              {kpi.topCountry || '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {kpi.topVal > 0 ? fmtNum(kpi.topVal) : ''} {latestYear}
            </p>
          </div>
        </div>

        {/* ── Chart A: Temporal trend by purpose ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Динамика на посещенията по цел' : 'A. Visitor Trend by Purpose'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {countryDisplayName(countryFilter)} |{' '}
            {isBg ? 'Многосерийна линейна диаграма (2008–2020)' : 'Multi-series line chart (2008–2020)'}
          </p>
          <TrendLineChart
            index={index}
            years={allYears}
            countryCode={countryFilter}
            isBg={isBg}
          />
        </div>

        {/* ── Chart B: Top countries horizontal bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Б. Класация по страни на произход' : 'B. Ranking by Country of Origin'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `Индивидуални страни, ${yearFilter} | Низходящо сортиране | Общо посещения`
              : `Individual countries, ${yearFilter} | Sorted descending | Total arrivals`}
          </p>
          <CountryBarChart
            index={index}
            year={yearFilter}
            countries={individualCountries}
            highlightCode={AGGREGATE_CODES.has(countryFilter) ? '' : countryFilter}
            isBg={isBg}
          />
        </div>

        {/* ── Chart C: Purpose composition per year ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'В. Цел на посещението по години (натрупано)' : 'C. Visit Purpose Composition by Year (Stacked)'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {countryDisplayName(countryFilter)} |{' '}
            {isBg
              ? 'Натрупани стълбове — Почивка, Делово, Други'
              : 'Stacked bars — Holiday, Professional, Other'}
          </p>
          <PurposeStackedChart
            index={index}
            years={allYears}
            countryCode={countryFilter}
            isBg={isBg}
          />
        </div>

        {/* ── Chart D: EU vs Non-EU trend ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Г. ЕС срещу Останалия свят — Тенденция' : 'D. EU vs. Rest of the World — Trend'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Сравнение на блокови агрегати по години | Общо посещения'
              : 'Block-level aggregate comparison over years | Total arrivals'}
          </p>
          <EuVsWorldChart
            index={index}
            years={allYears}
            isBg={isBg}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-series line: Temporal trend by visit purpose
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ index, years, countryCode, isBg }: {
  index: DataIndex;
  years: string[];
  countryCode: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    const byCountry = index.get(countryCode);
    return {
      total:        years.map(y => byCountry?.get(IND.TOTAL)?.get(y) ?? null),
      holiday:      years.map(y => byCountry?.get(IND.HOLIDAY)?.get(y) ?? null),
      professional: years.map(y => byCountry?.get(IND.PROFESSIONAL)?.get(y) ?? null),
      other:        years.map(y => byCountry?.get(IND.OTHER)?.get(y) ?? null),
    };
  }, [index, years, countryCode]);

  const labels = {
    total:        isBg ? 'Общо' : 'Total',
    holiday:      isBg ? 'Почивка и отдих' : 'Holiday & Recreation',
    professional: isBg ? 'Делово' : 'Professional',
    other:        isBg ? 'Други' : 'Other',
  };

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const makeSeries = (name: string, vals: (number | null)[], color: string, dashed = false) => ({
      name,
      type: 'line' as const,
      data: vals,
      itemStyle: { color },
      lineStyle: { width: dashed ? 2 : 2.5, color, type: dashed ? ('dashed' as const) : ('solid' as const) },
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      connectNulls: true,
      ...(dashed ? {} : {
        areaStyle: {
          color: {
            type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${color}22` },
              { offset: 1, color: `${color}00` },
            ],
          },
        },
      }),
    });

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
      grid: { left: '1%', right: '2%', bottom: '16%', top: '6%', containLabel: true },
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
        makeSeries(labels.total,        seriesData.total,        '#6366f1'),
        makeSeries(labels.holiday,      seriesData.holiday,      '#22c55e'),
        makeSeries(labels.professional, seriesData.professional, '#f97316', true),
        makeSeries(labels.other,        seriesData.other,        '#94a3b8', true),
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [seriesData, years, labels, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Horizontal bar: Top individual countries for selected year
// ══════════════════════════════════════════════════════════════════════════════

function CountryBarChart({ index, year, countries, highlightCode, isBg }: {
  index: DataIndex;
  year: string;
  countries: CountryEntry[];
  highlightCode: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    return countries
      .map(c => ({
        code: c.code,
        name: c.name,
        value: index.get(c.code)?.get(IND.TOTAL)?.get(year) ?? 0,
      }))
      .filter(r => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 25);
  }, [index, year, countries]);

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          const p = params[0];
          const d = chartData[p.dataIndex];
          if (!d) return '';
          return `<div style="font-weight:600">${d.name}</div>
            <div style="color:#64748b;font-size:11px">${d.code}</div>
            <div style="margin-top:4px">${isBg ? 'Посетители' : 'Visitors'}: <b>${fmtNum(d.value)}</b></div>`;
        },
      },
      grid: { left: '1%', right: '14%', bottom: '4%', top: '4%', containLabel: true },
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
        data: chartData.map(d => d.name),
        axisLabel: { fontSize: 11, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        inverse: false,
      },
      series: [
        {
          type: 'bar',
          data: chartData.map(d => ({
            value: d.value,
            itemStyle: {
              color: d.code === highlightCode ? '#f97316' : '#6366f1',
              borderRadius: [0, 4, 4, 0],
              opacity: d.code === highlightCode ? 1 : 0.75,
            },
          })),
          barMaxWidth: 26,
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
  }, [chartData, highlightCode, isBg]);

  const chartHeight = Math.max(320, chartData.length * 28 + 60);
  return <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Stacked bar: Visit purpose composition per year
// ══════════════════════════════════════════════════════════════════════════════

function PurposeStackedChart({ index, years, countryCode, isBg }: {
  index: DataIndex;
  years: string[];
  countryCode: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    const byCountry = index.get(countryCode);
    return {
      holiday:      years.map(y => byCountry?.get(IND.HOLIDAY)?.get(y) ?? null),
      professional: years.map(y => byCountry?.get(IND.PROFESSIONAL)?.get(y) ?? null),
      other:        years.map(y => byCountry?.get(IND.OTHER)?.get(y) ?? null),
    };
  }, [index, years, countryCode]);

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const makeBar = (name: string, vals: (number | null)[], color: string) => ({
      name,
      type: 'bar' as const,
      stack: 'purpose',
      data: vals,
      itemStyle: { color },
      barMaxWidth: 42,
      emphasis: { focus: 'series' as const },
    });

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          const year = params[0].axisValue;
          const total = params.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${year}</div>`;
          for (const p of params) {
            if (p.value == null || p.value === 0) continue;
            const pct = total > 0 ? ` (${(p.value / total * 100).toFixed(1)}%)` : '';
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:2px;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtNum(p.value)}${pct}</span>
            </div>`;
          }
          if (total > 0) {
            tip += `<div style="margin-top:6px;padding-top:4px;border-top:1px solid #e2e8f0;font-weight:600">
              ${isBg ? 'Общо' : 'Total'}: ${fmtNum(total)}
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        bottom: '3%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 12, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '16%', top: '6%', containLabel: true },
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
        makeBar(isBg ? 'Почивка и отдих' : 'Holiday & Recreation', seriesData.holiday,      '#22c55e'),
        makeBar(isBg ? 'Делово'          : 'Professional',          seriesData.professional, '#f97316'),
        makeBar(isBg ? 'Други'           : 'Other',                 seriesData.other,        '#94a3b8'),
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
// Chart D — EU vs. Rest of World line comparison
// ══════════════════════════════════════════════════════════════════════════════

function EuVsWorldChart({ index, years, isBg }: {
  index: DataIndex;
  years: string[];
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => ({
    total:  years.map(y => index.get('total')?.get(IND.TOTAL)?.get(y) ?? null),
    eu:     years.map(y => index.get('EU')?.get(IND.TOTAL)?.get(y) ?? null),
    othEur: years.map(y => index.get('OTH_EUR')?.get(IND.TOTAL)?.get(y) ?? null),
    row:    years.map(y => index.get('RoW')?.get(IND.TOTAL)?.get(y) ?? null),
  }), [index, years]);

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const makeLine = (name: string, vals: (number | null)[], color: string, dashed = false) => ({
      name,
      type: 'line' as const,
      data: vals,
      itemStyle: { color },
      lineStyle: { width: 2.5, color, type: dashed ? ('dashed' as const) : ('solid' as const) },
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      connectNulls: true,
    });

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
      grid: { left: '1%', right: '2%', bottom: '16%', top: '6%', containLabel: true },
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
        makeLine(isBg ? 'Общо'                        : 'Total',                      seriesData.total,  '#6366f1'),
        makeLine(isBg ? 'Европейски съюз'              : 'European Union',             seriesData.eu,     '#3b82f6'),
        makeLine(isBg ? 'Др. европейски страни'        : 'Other European countries',   seriesData.othEur, '#f97316', true),
        makeLine(isBg ? 'Останалия свят'               : 'Rest of the world',          seriesData.row,    '#22c55e', true),
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [seriesData, years, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}
