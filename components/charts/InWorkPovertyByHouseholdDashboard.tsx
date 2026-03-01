'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Household type codes ────────────────────────────────────────────────────────
// Code 1  = Single person
// Code 3  = Households without dependent children
// Code 11 = Households with dependent children
// Code 12 = Single parent with dependent children  (highest risk)
// Code 17 = Two or more adults with dependent children
// Code 18 = Two or more adults without dependent children (lowest risk)

const HH_COLORS: Record<string, string> = {
  '1':  '#6366f1', // Single person — indigo
  '3':  '#3b82f6', // Without dep children — blue
  '11': '#f59e0b', // With dep children (all types) — amber
  '12': '#ef4444', // Single parent + dep children — red
  '17': '#f97316', // 2+ adults + dep children — orange
  '18': '#10b981', // 2+ adults without dep children — emerald
};

const HH_LABELS_EN: Record<string, string> = {
  '1':  'Single person',
  '3':  'Households without dependent children',
  '11': 'Households with dependent children',
  '12': 'Single parent with dependent children',
  '17': 'Two or more adults with dependent children',
  '18': 'Two or more adults without dependent children',
};

const HH_LABELS_BG: Record<string, string> = {
  '1':  'Едно лице',
  '3':  'Домакинства без деца',
  '11': 'Домакинства с деца',
  '12': 'Едно лице с деца',
  '17': 'Двама и повече без деца',
  '18': 'Двама и повече с деца',
};

function getRate(row: any): number | null {
  if (row == null) return null;
  const v = row.Rate;
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const raw = typeof v === 'string' ? v.replace(/[()]/g, '') : v;
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
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

// ── Main Dashboard ──────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

export function InWorkPovertyByHouseholdDashboard({ data, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const { allYears, hhTypes } = useMemo(() => {
    const years = new Set<string>();
    const types = new Set<string>();

    data.forEach(d => {
      if (d.Year) years.add(String(d.Year));
      const code = d.SILC_HHType_Code != null ? String(d.SILC_HHType_Code) : null;
      if (code) types.add(code);
    });

    const sortedYears = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    const sortedTypes = [...types].sort((a, b) => parseInt(a) - parseInt(b));

    return { allYears: sortedYears, hhTypes: sortedTypes };
  }, [data]);

  const latestYear = allYears[allYears.length - 1] ?? '';
  const firstYear = allYears[0] ?? '';

  // KPI: highlight the highest-risk type (single parent, code 12) vs lowest-risk (2+ adults no children, code 18)
  const kpi = useMemo(() => {
    if (!latestYear || data.length === 0) return null;

    const singleParent = data.find(d => String(d.Year) === latestYear && String(d.SILC_HHType_Code) === '12');
    const twoAdultsNoDep = data.find(d => String(d.Year) === latestYear && String(d.SILC_HHType_Code) === '18');
    const singlePerson = data.find(d => String(d.Year) === latestYear && String(d.SILC_HHType_Code) === '1');

    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    const singleParentPrev = prevYear
      ? data.find(d => String(d.Year) === prevYear && String(d.SILC_HHType_Code) === '12')
      : null;
    const twoAdultsNoDepPrev = prevYear
      ? data.find(d => String(d.Year) === prevYear && String(d.SILC_HHType_Code) === '18')
      : null;

    const spRate = getRate(singleParent);
    const taRate = getRate(twoAdultsNoDep);
    const spPrev = getRate(singleParentPrev);
    const taPrev = getRate(twoAdultsNoDepPrev);
    const soloRate = getRate(singlePerson);

    const gap = spRate != null && taRate != null ? spRate - taRate : null;
    const spYoY = spRate != null && spPrev != null ? spRate - spPrev : null;
    const taYoY = taRate != null && taPrev != null ? taRate - taPrev : null;

    return { spRate, taRate, soloRate, gap, spYoY, taYoY, latestYear };
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
            ? 'Работещи бедни по тип домакинство'
            : 'In-Work At-Risk-of-Poverty Rate by Household Type'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear} – ${latestYear}) | Единица: % от населението`
            : `Annual data (${firstYear} – ${latestYear}) | Unit: % of population`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Single parent (highest risk) */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Едно лице с деца' : 'Single parent w/ children'}
            </p>
            <p className="text-3xl font-bold mt-2 text-red-500">
              {kpi.spRate != null ? `${kpi.spRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Най-висок риск от бедност' : 'Highest poverty risk'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.spYoY != null && (
                <span className={`text-[10px] font-semibold ${kpi.spYoY <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.spYoY <= 0 ? '▼' : '▲'} {Math.abs(kpi.spYoY).toFixed(1)}pp YoY
                </span>
              )}
            </div>
          </div>

          {/* Two+ adults without dep children (lowest risk) */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Двама+ без деца' : 'Two+ adults, no children'}
            </p>
            <p className="text-3xl font-bold mt-2 text-emerald-600">
              {kpi.taRate != null ? `${kpi.taRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Най-нисък риск от бедност' : 'Lowest poverty risk'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.taYoY != null && (
                <span className={`text-[10px] font-semibold ${kpi.taYoY <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.taYoY <= 0 ? '▼' : '▲'} {Math.abs(kpi.taYoY).toFixed(1)}pp YoY
                </span>
              )}
            </div>
          </div>

          {/* Gap */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Разлика (ед. родител − двама+)' : 'Gap (single parent − two+ adults)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-rose-600">
              {kpi.gap != null ? `${kpi.gap.toFixed(1)}pp` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Процентни пункта' : 'Percentage points'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>
        </div>

        {/* ── Chart A: Trend line chart ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Динамика на риска от бедност по тип домакинство'
              : 'A. Poverty Rate Trend by Household Type'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `Годишна тенденция ${firstYear}–${latestYear} | Щракнете върху легендата за включване/изключване`
              : `Annual trend ${firstYear}–${latestYear} | Click legend items to toggle`}
          </p>
          <TrendLineChart
            data={data}
            allYears={allYears}
            hhTypes={hhTypes}
            locale={locale}
          />
        </div>

        {/* ── Chart B: Bar comparison for latest year ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Сравнение по тип домакинство — ${latestYear}`
              : `B. Poverty Rate by Household Type — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Дял на работещите бедни по тип домакинство за последната налична година'
              : 'In-work poverty rate across household types for the latest available year'}
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

// ═══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-Series Line Chart (Trend Over Time)
// ═══════════════════════════════════════════════════════════════════════════════

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
      const label = isBg ? (HH_LABELS_BG[code] || code) : (HH_LABELS_EN[code] || code);
      const color = HH_COLORS[code] || '#64748b';
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
      grid: { left: '1%', right: '3%', bottom: '18%', top: '4%', containLabel: true },
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
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: 2.5, color: s.color },
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
        label: { show: false },
        markPoint: {
          data: [{ type: 'max', name: isBg ? 'Макс' : 'Max' }],
          symbolSize: 36,
          label: { fontSize: 9, color: '#fff', formatter: (p: any) => Number(p.value).toFixed(1) + '%' },
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart B — Horizontal Bar Chart (Latest Year Snapshot)
// ═══════════════════════════════════════════════════════════════════════════════

function SnapshotBarChart({ data, hhTypes, latestYear, locale }: {
  data: any[];
  hhTypes: string[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { categories, values, colors } = useMemo(() => {
    // Sort by rate descending for clear visual ranking
    const items = hhTypes.map(code => {
      const label = isBg ? (HH_LABELS_BG[code] || code) : (HH_LABELS_EN[code] || code);
      const row = data.find(d => String(d.Year) === latestYear && String(d.SILC_HHType_Code) === code);
      return { label, value: getRate(row), color: HH_COLORS[code] || '#64748b' };
    }).sort((a, b) => (a.value ?? -1) - (b.value ?? -1)); // ascending for horizontal bar (bottom = lowest)

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
            <div>${isBg ? 'Риск от бедност' : 'Poverty rate'}: <b>${p.value != null ? Number(p.value).toFixed(1) + '%' : '—'}</b></div>`;
        },
      },
      grid: { left: '2%', right: '8%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? '% от заетите' : '% of employed',
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
          width: 200,
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
              borderRadius: [0, 6, 6, 0],
              opacity: 0.9,
            },
          })),
          barMaxWidth: 52,
          label: {
            show: true,
            position: 'right' as const,
            fontSize: 13,
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

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}
