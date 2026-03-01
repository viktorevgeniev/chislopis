'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Household type codes (SILC_HHType) ──────────────────────────────────────────
// "1"  → Single person
// "3"  → Households without dependent children
// "8"  → Two adults younger than 65 years
// "9"  → Two adults, at least one aged 65 years and over
// "10" → Three or more adults
// "11" → Households with dependent children
// "12" → Single parent with dependent children
// "13" → Two adults with one dependent child
// "14" → Two adults with two dependent children
// "15" → Two adults with three or more dependent children
// "16" → Three or more adults with dependent children
// "17" → Two or more adults with dependent children
// "18" → Two or more adults without dependent children
// "20" → Two adults

const HH_COLORS: Record<string, string> = {
  '1':  '#6366f1', // Single person — indigo
  '3':  '#3b82f6', // HH without dep children — blue
  '8':  '#06b6d4', // Two adults <65 — cyan
  '9':  '#64748b', // Two adults, 1+ aged 65+ — slate
  '10': '#8b5cf6', // Three+ adults — violet
  '11': '#f59e0b', // HH with dep children — amber
  '12': '#ef4444', // Single parent + dep children — red (highest risk)
  '13': '#f97316', // Two adults + 1 child — orange
  '14': '#fb923c', // Two adults + 2 children — orange-light
  '15': '#dc2626', // Two adults + 3+ children — red-dark
  '16': '#e11d48', // Three+ adults + dep children — rose
  '17': '#d97706', // Two+ adults + dep children — amber-dark
  '18': '#10b981', // Two+ adults without dep children — emerald (lowest risk)
  '20': '#14b8a6', // Two adults — teal
};

const HH_LABELS_EN: Record<string, string> = {
  '1':  'Single person',
  '3':  'HH without dependent children',
  '8':  'Two adults younger than 65',
  '9':  'Two adults, at least one 65+',
  '10': 'Three or more adults',
  '11': 'HH with dependent children',
  '12': 'Single parent w/ dep children',
  '13': 'Two adults, one dep child',
  '14': 'Two adults, two dep children',
  '15': 'Two adults, 3+ dep children',
  '16': 'Three+ adults w/ dep children',
  '17': 'Two+ adults w/ dep children',
  '18': 'Two+ adults w/o dep children',
  '20': 'Two adults',
};

const HH_LABELS_BG: Record<string, string> = {
  '1':  'Едно лице',
  '3':  'Домакинства без деца',
  '8':  'Двама до 65 г.',
  '9':  'Двама, поне единият 65+',
  '10': 'Трима и повече',
  '11': 'Домакинства с деца',
  '12': 'Едно лице с деца',
  '13': 'Двама + 1 дете',
  '14': 'Двама + 2 деца',
  '15': 'Двама + 3 и повече деца',
  '16': 'Трима+ с деца',
  '17': 'Двама+ с деца',
  '18': 'Двама+ без деца',
  '20': 'Двама',
};

// Display order for trend chart — broad household categories first, then specific types
const TREND_ORDER = ['12', '15', '9', '1', '11', '13', '14', '16', '17', '10', '3', '18', '8', '20'];

function getRate(row: any): number | null {
  if (row == null) return null;
  const v = row.Rate ?? row.ValueColumn ?? row.value;
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const raw = typeof v === 'string' ? v.replace(/[()]/g, '') : v;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return isNaN(n) ? null : n;
}

function tooltipBase() {
  return {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export function LowWorkIntensityHouseholdDashboard({ data, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const { allYears, hhTypes, latestYear, firstYear } = useMemo(() => {
    const years = new Set<string>();
    const types = new Set<string>();

    data.forEach(d => {
      if (d.Year) years.add(String(d.Year));
      const code = d.SILC_HHType_Code != null ? String(d.SILC_HHType_Code) : null;
      if (code) types.add(code);
    });

    const sortedYears = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    // Sort types by TREND_ORDER, then append any unknown codes
    const knownOrder = TREND_ORDER.filter(c => types.has(c));
    const remaining = [...types].filter(c => !TREND_ORDER.includes(c)).sort();
    const sortedTypes = [...knownOrder, ...remaining];

    return {
      allYears: sortedYears,
      hhTypes: sortedTypes,
      latestYear: sortedYears[sortedYears.length - 1] ?? '',
      firstYear: sortedYears[0] ?? '',
    };
  }, [data]);

  // KPI: single parent (code 12) vs two+ adults without dep children (code 18) vs two adults 65+ (code 9)
  const kpi = useMemo(() => {
    if (!latestYear || data.length === 0) return null;

    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    function find(code: string, year: string) {
      return data.find(d => String(d.Year) === year && String(d.SILC_HHType_Code) === code) ?? null;
    }

    const spRate   = getRate(find('12', latestYear));
    const loRate   = getRate(find('18', latestYear));
    const elderRate = getRate(find('9', latestYear));

    const spPrev   = prevYear ? getRate(find('12', prevYear)) : null;
    const loPrev   = prevYear ? getRate(find('18', prevYear)) : null;

    const spYoY  = spRate != null && spPrev != null ? spRate - spPrev : null;
    const loYoY  = loRate != null && loPrev != null ? loRate - loPrev : null;
    const gap    = spRate != null && loRate != null ? spRate - loRate : null;

    return { spRate, loRate, elderRate, spYoY, loYoY, gap, latestYear, prevYear };
  }, [data, allYears, latestYear]);

  if (!data || data.length === 0 || !kpi) {
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
            ? 'Лица в домакинства с нисък интензитет на работа по тип домакинство'
            : 'People in Households with Low Work Intensity — by Household Type'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | % от съответната група население`
            : `Annual data (${firstYear}–${latestYear}) | % of corresponding population group`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Single parent — highest risk */}
          <div className="bg-white shadow-sm rounded-xl p-5" style={{ borderLeft: '4px solid #ef4444' }}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-4">
              {isBg ? 'Едно лице с деца' : 'Single parent w/ dep children'}
            </p>
            <p className="text-3xl font-bold mt-2 text-red-500">
              {kpi.spRate != null ? `${kpi.spRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Най-засегнат тип домакинство' : 'Highest vulnerability type'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.spYoY != null && (
                <span className={`text-[10px] font-semibold ${kpi.spYoY <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.spYoY <= 0 ? '▼' : '▲'} {Math.abs(kpi.spYoY).toFixed(1)}pp
                </span>
              )}
            </div>
          </div>

          {/* Two+ adults without dep children — lowest risk */}
          <div className="bg-white shadow-sm rounded-xl p-5" style={{ borderLeft: '4px solid #10b981' }}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-4">
              {isBg ? 'Двама+ без деца' : 'Two+ adults w/o dep children'}
            </p>
            <p className="text-3xl font-bold mt-2 text-emerald-600">
              {kpi.loRate != null ? `${kpi.loRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Най-нисък интензитет на работа' : 'Lowest work intensity gap'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.loYoY != null && (
                <span className={`text-[10px] font-semibold ${kpi.loYoY <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.loYoY <= 0 ? '▼' : '▲'} {Math.abs(kpi.loYoY).toFixed(1)}pp
                </span>
              )}
            </div>
          </div>

          {/* Household gap */}
          <div className="bg-white shadow-sm rounded-xl p-5" style={{ borderLeft: '4px solid #f97316' }}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-4">
              {isBg ? 'Разлика (ед. родител − двама+)' : 'Gap (single parent − two+ adults)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-orange-500">
              {kpi.gap != null ? `${kpi.gap.toFixed(1)}pp` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Процентни пункта, ' : 'Percentage points, '}
              {kpi.latestYear}
            </p>
            {kpi.elderRate != null && (
              <p className="text-[10px] text-slate-400 mt-1">
                {isBg
                  ? `Двама, поне единият 65+: ${kpi.elderRate.toFixed(1)}%`
                  : `Two adults, at least one 65+: ${kpi.elderRate.toFixed(1)}%`}
              </p>
            )}
          </div>
        </div>

        {/* Insight callout */}
        {kpi.gap != null && kpi.gap > 10 && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-amber-700">
              {isBg ? 'Структурна уязвимост:' : 'Structural vulnerability:'}
            </span>{' '}
            {isBg
              ? `В ${latestYear} едноличните родители са с ${kpi.gap.toFixed(1)} пр. пункта по-засегнати от двучленните домакинства без деца — данките от работа не ги защитават достатъчно.`
              : `In ${latestYear}, single-parent households face a rate ${kpi.gap.toFixed(1)} percentage points higher than two-adult households without children — work income alone provides insufficient protection.`}
          </div>
        )}

        {/* ── Chart A: Multi-line trend ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Динамика по тип домакинство'
              : 'A. Trend by Household Type Over Time'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | % от групата | Щракнете върху легендата за включване/изключване`
              : `${firstYear}–${latestYear} | % of group | Click legend items to toggle`}
          </p>
          <TrendLineChart
            data={data}
            allYears={allYears}
            hhTypes={hhTypes}
            locale={locale}
          />
        </div>

        {/* ── Chart B: Horizontal bar for latest year ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Сравнение по тип домакинство — ${latestYear}`
              : `B. Household Type Comparison — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Дял на лицата с нисък интензитет на работа за последната налична година'
              : 'Share of people with low work intensity for the latest available year'}
          </p>
          <SnapshotBarChart
            data={data}
            hhTypes={hhTypes}
            latestYear={latestYear}
            locale={locale}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-Series Line Chart (Trend Over Time)
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ data, allYears, hhTypes, locale }: {
  data: any[];
  allYears: string[];
  hhTypes: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return hhTypes.map(code => {
      const label = isBg ? (HH_LABELS_BG[code] ?? code) : (HH_LABELS_EN[code] ?? code);
      const color = HH_COLORS[code] ?? '#94a3b8';
      const byYear: Record<string, number | null> = {};

      data.forEach(d => {
        if (String(d.SILC_HHType_Code) !== code || !d.Year) return;
        byYear[String(d.Year)] = getRate(d);
      });

      return {
        code,
        label,
        color,
        values: allYears.map(y => byYear[y] ?? null),
      };
    });
  }, [data, allYears, hhTypes, isBg]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0 || seriesData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          const sorted = [...params]
            .filter((p: any) => p.value != null)
            .sort((a: any, b: any) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
          sorted.forEach((p: any) => {
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)}%</span>
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
        itemWidth: 14,
        itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '22%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allYears,
        axisLabel: { fontSize: 11, color: '#94a3b8' },
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
        min: 0,
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: 2, color: s.color },
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        connectNulls: true,
        emphasis: { lineStyle: { width: 3.5 } },
        label: { show: false },
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
// Chart B — Horizontal Bar Chart (Latest Year Snapshot)
// ══════════════════════════════════════════════════════════════════════════════

function SnapshotBarChart({ data, hhTypes, latestYear, locale }: {
  data: any[];
  hhTypes: string[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { categories, values, colors } = useMemo(() => {
    const items = hhTypes.map(code => {
      const label = isBg ? (HH_LABELS_BG[code] ?? code) : (HH_LABELS_EN[code] ?? code);
      const row = data.find(d => String(d.Year) === latestYear && String(d.SILC_HHType_Code) === code);
      return { label, value: getRate(row), color: HH_COLORS[code] ?? '#94a3b8' };
    }).sort((a, b) => (a.value ?? -1) - (b.value ?? -1)); // ascending for horizontal bar

    return {
      categories: items.map(i => i.label),
      values: items.map(i => i.value),
      colors: items.map(i => i.color),
    };
  }, [data, hhTypes, latestYear, isBg]);

  useEffect(() => {
    if (!chartRef.current || categories.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.axisValue}</div>
            <div>${isBg ? 'Нисък интензитет на работа' : 'Low work intensity'}: <b>${p.value != null ? Number(p.value).toFixed(1) + '%' : '—'}</b></div>`;
        },
      },
      grid: { left: '2%', right: '10%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? '% от групата' : '% of group',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        max: (value: { max: number }) => Math.ceil(value.max * 1.2),
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          fontSize: 11,
          color: '#475569',
          width: 210,
          overflow: 'truncate' as const,
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: values.map((v, i) => ({
            value: v,
            itemStyle: {
              color: colors[i],
              borderRadius: [0, 6, 6, 0] as [number, number, number, number],
              opacity: 0.9,
            },
          })),
          barMaxWidth: 48,
          label: {
            show: true,
            position: 'right' as const,
            fontSize: 12,
            fontWeight: 'bold' as const,
            color: '#334155',
            formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
          },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [categories, values, colors, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '480px' }} />;
}
