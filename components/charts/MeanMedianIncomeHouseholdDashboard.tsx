'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Label maps ──────────────────────────────────────────────────────────────────

const HH_LABEL_EN: Record<string, string> = {
  '1':  'Single person',
  '3':  'No dependent children',
  '8':  'Two adults under 65',
  '10': 'Three or more adults',
  '11': 'With dependent children',
  '12': 'Single parent + children',
  '13': 'Two adults + 1 child',
  '14': 'Two adults + 2 children',
  '15': 'Two adults + 3+ children',
  '17': '2+ adults + children',
  '18': '2+ adults, no children',
  '20': 'Two adults',
};

const HH_LABEL_BG: Record<string, string> = {
  '1':  'Едно лице',
  '3':  'Без зависими деца',
  '8':  'Двама до 65 год.',
  '10': 'Трима или повече',
  '11': 'Със зависими деца',
  '12': 'Самотен родител + деца',
  '13': 'Двама + 1 дете',
  '14': 'Двама + 2 деца',
  '15': 'Двама + 3 или повече деца',
  '17': '2+ възрастни + деца',
  '18': '2+ възрастни, без деца',
  '20': 'Двама възрастни',
};

// Ordered list of household codes for chart display
const HH_CODES = ['1', '20', '8', '3', '18', '10', '11', '12', '13', '14', '15', '17'] as const;

const HH_COLORS: Record<string, string> = {
  '1':  '#6366f1',
  '3':  '#8b5cf6',
  '8':  '#3b82f6',
  '10': '#06b6d4',
  '11': '#10b981',
  '12': '#f59e0b',
  '13': '#f97316',
  '14': '#ef4444',
  '15': '#dc2626',
  '17': '#84cc16',
  '18': '#14b8a6',
  '20': '#a78bfa',
};

// ── Types ───────────────────────────────────────────────────────────────────────

// hhCode → incomeTypeCode ('5'|'6') → year → value
type HHIndex = Map<string, Map<string, Map<string, number>>>;

// ── Helpers ─────────────────────────────────────────────────────────────────────

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

function getVal(row: any): number | null {
  const v = row?.Amount;
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) ? null : n;
}

// ── Props ────────────────────────────────────────────────────────────────────────

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════

export function MeanMedianIncomeHouseholdDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  const [currency, setCurrency] = useState<'euro' | 'BGN_fig'>('euro');
  // 5 = Mean income, 6 = Median income
  const [incomeType, setIncomeType] = useState<'5' | '6'>('6');

  const allYears = useMemo(() => {
    const yrs = new Set<string>();
    for (const row of data) { if (row.Year) yrs.add(String(row.Year)); }
    return [...yrs].sort((a, b) => parseInt(a) - parseInt(b));
  }, [data]);

  const latestYear = allYears[allYears.length - 1] ?? '';
  const firstYear  = allYears[0] ?? '';

  // Build index: hhCode → incomeTypeCode → year → value (filtered by currency)
  const index = useMemo<HHIndex>(() => {
    const m: HHIndex = new Map();
    for (const row of data) {
      if (String(row.Units_Code ?? '') !== currency) continue;
      const hh  = String(row.SILC_HHType_Code ?? '');
      const t   = String(row.SILC_Median_Code ?? '');
      const yr  = String(row.Year ?? '');
      const val = getVal(row);
      if (!hh || !t || !yr || val == null) continue;
      if (!m.has(hh)) m.set(hh, new Map());
      if (!m.get(hh)!.has(t)) m.get(hh)!.set(t, new Map());
      m.get(hh)!.get(t)!.set(yr, val);
    }
    return m;
  }, [data, currency]);

  // KPI derived values
  const kpi = useMemo(() => {
    const singleMedian = index.get('1')?.get('6')?.get(latestYear) ?? null;
    const singleMean   = index.get('1')?.get('5')?.get(latestYear) ?? null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    const prevSingleMedian = prevYear ? (index.get('1')?.get('6')?.get(prevYear) ?? null) : null;
    const medYoY = singleMedian != null && prevSingleMedian != null
      ? ((singleMedian - prevSingleMedian) / prevSingleMedian) * 100 : null;

    // Highest / lowest threshold across household types for the selected income measure
    let highestVal = -Infinity; let highestHH = '';
    let lowestVal  =  Infinity; let lowestHH  = '';
    for (const code of HH_CODES) {
      const v = index.get(code)?.get(incomeType)?.get(latestYear) ?? null;
      if (v == null) continue;
      if (v > highestVal) { highestVal = v; highestHH = code; }
      if (v < lowestVal)  { lowestVal  = v; lowestHH  = code; }
    }
    return {
      singleMedian, singleMean, medYoY,
      highestVal: highestVal === -Infinity ? null : highestVal, highestHH,
      lowestVal:  lowestVal  ===  Infinity ? null : lowestVal,  lowestHH,
    };
  }, [index, latestYear, allYears, incomeType]);

  const currLabel = currency === 'euro' ? '€' : 'лв.';
  const currFull  = currency === 'euro' ? 'Euro' : 'BGN';

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
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900">
              {isBg
                ? 'Праг на бедност по тип домакинство'
                : 'Monetary Poverty Thresholds by Household Type'}
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              {isBg
                ? `Годишни данни (${firstYear}–${latestYear}) | Среден и медианен доход по тип домакинство`
                : `Annual data (${firstYear}–${latestYear}) | Mean and median income by household structure`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">
                {isBg ? 'Мярка:' : 'Measure:'}
              </label>
              <Select
                value={incomeType}
                onChange={e => setIncomeType(e.target.value as '5' | '6')}
                className="text-xs py-1 px-2 h-8 w-36"
              >
                <option value="6">{isBg ? 'Медианен доход' : 'Median income'}</option>
                <option value="5">{isBg ? 'Среден доход' : 'Mean income'}</option>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">
                {isBg ? 'Валута:' : 'Currency:'}
              </label>
              <Select
                value={currency}
                onChange={e => setCurrency(e.target.value as 'euro' | 'BGN_fig')}
                className="text-xs py-1 px-2 h-8 w-28"
              >
                <option value="euro">€ Euro</option>
                <option value="BGN_fig">лв. BGN</option>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg
                ? `Медианен праг — Едно лице (${currFull})`
                : `Median Threshold — Single Person (${currFull})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-indigo-600">
              {kpi.singleMedian != null ? kpi.singleMedian.toLocaleString('bg-BG') : '—'}
              <span className="text-base font-semibold ml-1 text-indigo-400">{currLabel}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">{latestYear}</p>
            {kpi.medYoY != null && (
              <span className={`text-[10px] font-semibold ${kpi.medYoY >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.medYoY >= 0 ? '▲' : '▼'} {Math.abs(kpi.medYoY).toFixed(1)}% YoY
              </span>
            )}
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Най-висок праг (${currFull})` : `Highest Threshold (${currFull})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-emerald-600">
              {kpi.highestVal != null ? kpi.highestVal.toLocaleString('bg-BG') : '—'}
              <span className="text-base font-semibold ml-1 text-emerald-400">{currLabel}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {kpi.highestHH ? (isBg ? HH_LABEL_BG[kpi.highestHH] : HH_LABEL_EN[kpi.highestHH]) : ''}
            </p>
            <p className="text-[10px] text-slate-400">{latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Най-нисък праг (${currFull})` : `Lowest Threshold (${currFull})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-amber-500">
              {kpi.lowestVal != null ? kpi.lowestVal.toLocaleString('bg-BG') : '—'}
              <span className="text-base font-semibold ml-1 text-amber-400">{currLabel}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {kpi.lowestHH ? (isBg ? HH_LABEL_BG[kpi.lowestHH] : HH_LABEL_EN[kpi.lowestHH]) : ''}
            </p>
            <p className="text-[10px] text-slate-400">{latestYear}</p>
          </div>
        </div>

        {/* ── Chart A: Multi-line trend ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `А. Динамика на прага на бедност по тип домакинство (${currFull})`
              : `A. Poverty Threshold Trend by Household Type (${currFull})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | ${incomeType === '6' ? 'Медианен' : 'Среден'} доход`
              : `${firstYear}–${latestYear} | ${incomeType === '6' ? 'Median' : 'Mean'} income`}
          </p>
          <HouseholdTrendChart
            index={index}
            allYears={allYears}
            incomeType={incomeType}
            isBg={isBg}
            currLabel={currLabel}
          />
        </div>

        {/* ── Chart B: Horizontal bar – latest year comparison ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Праг на бедност по тип домакинство — ${latestYear} (${currFull})`
              : `B. Poverty Threshold by Household Type — ${latestYear} (${currFull})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `Сравнение на ${incomeType === '6' ? 'медианния' : 'средния'} праг по структура на домакинството, сортирано по стойност`
              : `${incomeType === '6' ? 'Median' : 'Mean'} threshold comparison across household structures, sorted by value`}
          </p>
          <HouseholdBarChart
            index={index}
            year={latestYear}
            incomeType={incomeType}
            isBg={isBg}
            currLabel={currLabel}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-line: threshold trend for all household types
// ══════════════════════════════════════════════════════════════════════════════

function HouseholdTrendChart({ index, allYears, incomeType, isBg, currLabel }: {
  index: HHIndex;
  allYears: string[];
  incomeType: '5' | '6';
  isBg: boolean;
  currLabel: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => (
    HH_CODES.map(code => ({
      code,
      label: isBg ? HH_LABEL_BG[code] : HH_LABEL_EN[code],
      color: HH_COLORS[code],
      values: allYears.map(yr => index.get(code)?.get(incomeType)?.get(yr) ?? null),
    }))
  ), [index, allYears, incomeType, isBg]);

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
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toLocaleString('bg-BG')} ${currLabel}</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: series.map(s => s.label),
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 16, itemHeight: 8,
        pageButtonItemGap: 5,
      },
      grid: { left: '1%', right: '3%', bottom: '26%', top: '5%', containLabel: true },
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
        name: currLabel,
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
      series: series.map(s => ({
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: 2, color: s.color },
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        connectNulls: true,
        emphasis: { lineStyle: { width: 3.5 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, series, currLabel]);

  return <div ref={chartRef} style={{ width: '100%', height: '440px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Horizontal bar: all household types ranked for the latest year
// ══════════════════════════════════════════════════════════════════════════════

function HouseholdBarChart({ index, year, incomeType, isBg, currLabel }: {
  index: HHIndex;
  year: string;
  incomeType: '5' | '6';
  isBg: boolean;
  currLabel: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    return HH_CODES
      .map(code => ({
        code,
        label: isBg ? HH_LABEL_BG[code] : HH_LABEL_EN[code],
        value: index.get(code)?.get(incomeType)?.get(year) ?? null,
        color: HH_COLORS[code],
      }))
      .filter(e => e.value != null)
      .sort((a, b) => (a.value ?? 0) - (b.value ?? 0)); // ascending → highest at top in horizontal bar
  }, [index, year, incomeType, isBg]);

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          if (p.value == null) return '';
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.axisValue}</div>
            <div style="font-size:14px;font-weight:700;color:${p.color}">
              ${Number(p.value).toLocaleString('bg-BG')} ${currLabel}
            </div>`;
        },
      },
      grid: { left: '1%', right: '18%', bottom: '3%', top: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10, color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      yAxis: {
        type: 'category',
        data: chartData.map(e => e.label),
        axisLabel: { fontSize: 11, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar' as const,
        data: chartData.map(e => ({
          value: e.value,
          itemStyle: { color: e.color, borderRadius: [0, 4, 4, 0] },
        })),
        barMaxWidth: 36,
        label: {
          show: true,
          position: 'right' as const,
          fontSize: 11,
          color: '#334155',
          formatter: (p: any) =>
            p.value != null ? `${Number(p.value).toLocaleString('bg-BG')} ${currLabel}` : '',
        },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, currLabel]);

  const chartHeight = Math.max(320, chartData.length * 52);
  return <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />;
}
