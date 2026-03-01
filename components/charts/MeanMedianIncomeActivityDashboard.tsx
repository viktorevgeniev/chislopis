'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Label maps ─────────────────────────────────────────────────────────────────

const ACTIVITY_EN: Record<string, string> = {
  '1': 'Employment',
  '2': 'Non employment',
  '3': 'Unemployment',
  '4': 'Retired',
  '5': 'Inactive - Other',
};

const ACTIVITY_BG: Record<string, string> = {
  '1': 'Заетост',
  '2': 'Незаетост',
  '3': 'Безработица',
  '4': 'Пенсионери',
  '5': 'Неактивни - Друго',
};

const ACTIVITY_COLORS: Record<string, string> = {
  '1': '#3b82f6',
  '2': '#f97316',
  '3': '#ef4444',
  '4': '#22c55e',
  '5': '#a855f7',
};

const AGE_EN: Record<string, string> = { '2': '18–64', '3': '65+' };
const AGE_BG: Record<string, string> = { '2': '18–64 год.', '3': '65+ год.' };

const MEDIAN_EN: Record<string, string> = { '5': 'Mean income', '6': 'Median income' };
const MEDIAN_BG: Record<string, string> = { '5': 'Среден доход', '6': 'Медианен доход' };

const ACTIVITY_CODES = ['1', '2', '3', '4', '5'] as const;
const AGE_CODES = ['2', '3'] as const;
const MEDIAN_CODES = ['5', '6'] as const;

const LINE_COLORS: Record<string, string> = { '5': '#6366f1', '6': '#f59e0b' };
const LINE_TYPES: Record<string, string> = { '5': 'solid', '6': 'dashed' };

// ── Index type: act → age → median → year → value ────────────────────────────
type DataIndex = Map<string, Map<string, Map<string, Map<string, number>>>>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

function numFmt(v: number): string {
  return v.toLocaleString('bg-BG');
}

function kFmt(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);
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

export function MeanMedianIncomeActivityDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  // ── State ───────────────────────────────────────────────────────────────────
  const [unit, setUnit] = useState<'BGN_fig' | 'euro'>('BGN_fig');
  const [trendActivity, setTrendActivity] = useState('1');
  const [trendAge, setTrendAge] = useState('2');
  const [barMetric, setBarMetric] = useState('5');

  const unitSymbol = unit === 'BGN_fig' ? 'лв.' : '€';
  const unitFull = unit === 'BGN_fig' ? (isBg ? 'лв. (BGN)' : 'BGN') : (isBg ? 'евро (€)' : 'Euro (€)');

  // ── Years ───────────────────────────────────────────────────────────────────
  const { allYears, latestYear, firstYear } = useMemo(() => {
    const yrs = new Set<string>();
    data.forEach(d => { if (d.Year) yrs.add(String(d.Year)); });
    const sorted = [...yrs].sort((a, b) => parseInt(a) - parseInt(b));
    return {
      allYears: sorted,
      latestYear: sorted[sorted.length - 1] ?? '',
      firstYear: sorted[0] ?? '',
    };
  }, [data]);

  // ── Index: act → age → median → year → value ────────────────────────────────
  const index = useMemo<DataIndex>(() => {
    const m: DataIndex = new Map();
    for (const row of data) {
      if (String(row.Units_Code ?? '') !== unit) continue;
      const act = String(row.SILC_Activity_Code ?? '');
      const age = String(row.SILC_Age_Code ?? '');
      const med = String(row.SILC_Median_Code ?? '');
      const yr = String(row.Year ?? '');
      const raw = row.Amount;
      if (!act || !age || !med || !yr || raw == null) continue;
      const val = typeof raw === 'number' ? raw : parseFloat(String(raw));
      if (isNaN(val)) continue;
      if (!m.has(act)) m.set(act, new Map());
      if (!m.get(act)!.has(age)) m.get(act)!.set(age, new Map());
      if (!m.get(act)!.get(age)!.has(med)) m.get(act)!.get(age)!.set(med, new Map());
      m.get(act)!.get(age)!.get(med)!.set(yr, val);
    }
    return m;
  }, [data, unit]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const empMean18 = index.get('1')?.get('2')?.get('5')?.get(latestYear) ?? null;
    const empMean18Prev = prevYear ? (index.get('1')?.get('2')?.get('5')?.get(prevYear) ?? null) : null;
    const empMedian18 = index.get('1')?.get('2')?.get('6')?.get(latestYear) ?? null;
    const unempMean18 = index.get('3')?.get('2')?.get('5')?.get(latestYear) ?? null;
    const retMean65 = index.get('4')?.get('3')?.get('5')?.get(latestYear) ?? null;

    const empYoY = empMean18 != null && empMean18Prev != null
      ? ((empMean18 - empMean18Prev) / empMean18Prev) * 100 : null;
    const gap = empMean18 != null && unempMean18 != null
      ? empMean18 - unempMean18 : null;
    const skew = empMean18 != null && empMedian18 != null && empMedian18 > 0
      ? empMean18 / empMedian18 : null;

    return { empMean18, unempMean18, retMean65, empYoY, gap, skew };
  }, [index, latestYear, allYears]);

  // ── Trend data: 2 lines (Mean vs Median) for selected activity + age ────────
  const trendData = useMemo(() => (
    MEDIAN_CODES.map(med => ({
      medCode: med,
      label: isBg ? MEDIAN_BG[med] : MEDIAN_EN[med],
      values: allYears.map(yr =>
        index.get(trendActivity)?.get(trendAge)?.get(med)?.get(yr) ?? null
      ),
    }))
  ), [index, allYears, trendActivity, trendAge, isBg]);

  // ── Bar data: all activities × 2 age groups, latest year ────────────────────
  const barData = useMemo(() => (
    ACTIVITY_CODES.map(act => ({
      actCode: act,
      label: isBg ? ACTIVITY_BG[act] : ACTIVITY_EN[act],
      color: ACTIVITY_COLORS[act],
      age18: index.get(act)?.get('2')?.get(barMetric)?.get(latestYear) ?? null,
      age65: index.get(act)?.get('3')?.get(barMetric)?.get(latestYear) ?? null,
    }))
  ), [index, latestYear, barMetric, isBg]);

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
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900">
              {isBg
                ? 'Среден и медианен доход по икономическа активност'
                : 'Mean and Median Income by Activity Status'}
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              {isBg
                ? `Годишни данни (${firstYear}–${latestYear}) | Монетарна бедност — праг на дохода по статус на заетост`
                : `Annual data (${firstYear}–${latestYear}) | Monetary poverty — income threshold by employment status`}
            </CardDescription>
          </div>

          {/* Currency toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs text-slate-500 whitespace-nowrap">
              {isBg ? 'Валута:' : 'Currency:'}
            </label>
            <Select
              value={unit}
              onChange={e => setUnit(e.target.value as 'BGN_fig' | 'euro')}
              className="text-xs py-1 px-2 h-8 w-32"
            >
              <option value="BGN_fig">лв. (BGN)</option>
              <option value="euro">€ (Euro)</option>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-tight">
              {isBg ? 'Заети (18–64) — среден' : 'Employed (18–64) — mean'}
            </p>
            <p className="text-2xl font-bold mt-2 text-blue-600">
              {kpi.empMean18 != null ? numFmt(kpi.empMean18) : '—'}
              <span className="text-sm font-medium ml-1 text-blue-400">{unitSymbol}</span>
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{latestYear}</span>
              {kpi.empYoY != null && (
                <span className={`text-[10px] font-semibold ${kpi.empYoY >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.empYoY >= 0 ? '▲' : '▼'} {Math.abs(kpi.empYoY).toFixed(1)}% YoY
                </span>
              )}
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-tight">
              {isBg ? 'Безработни (18–64) — среден' : 'Unemployed (18–64) — mean'}
            </p>
            <p className="text-2xl font-bold mt-2 text-red-500">
              {kpi.unempMean18 != null ? numFmt(kpi.unempMean18) : '—'}
              <span className="text-sm font-medium ml-1 text-red-400">{unitSymbol}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {kpi.gap != null
                ? (isBg
                  ? `Разлика: ${numFmt(kpi.gap)} ${unitSymbol} под заетите`
                  : `Gap: ${numFmt(kpi.gap)} ${unitSymbol} below employed`)
                : latestYear}
            </p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-tight">
              {isBg ? 'Пенсионери (65+) — среден' : 'Retired (65+) — mean'}
            </p>
            <p className="text-2xl font-bold mt-2 text-emerald-600">
              {kpi.retMean65 != null ? numFmt(kpi.retMean65) : '—'}
              <span className="text-sm font-medium ml-1 text-emerald-400">{unitSymbol}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-tight">
              {isBg ? 'Асиметрия (Среден / Медианен)' : 'Skewness (Mean / Median)'}
            </p>
            <p className={`text-2xl font-bold mt-2 ${(kpi.skew ?? 1) > 1.05 ? 'text-amber-600' : 'text-slate-700'}`}>
              {kpi.skew != null ? kpi.skew.toFixed(3) : '—'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {isBg ? 'Заети, 18–64 год.' : 'Employed, 18–64'} · {latestYear}
            </p>
          </div>

        </div>

        {/* ── Chart A: Time-Series Trend ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {isBg
                  ? 'А. Динамика на дохода — Среден срещу Медианен'
                  : 'A. Income Trend — Mean vs. Median'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBg
                  ? `${firstYear}–${latestYear} | ${unitFull} на еквивалентен член на домакинство`
                  : `${firstYear}–${latestYear} | ${unitFull} per equivalent household member`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select
                value={trendActivity}
                onChange={e => setTrendActivity(e.target.value)}
                className="text-xs py-1 px-2 h-8"
              >
                {ACTIVITY_CODES.map(c => (
                  <option key={c} value={c}>{isBg ? ACTIVITY_BG[c] : ACTIVITY_EN[c]}</option>
                ))}
              </Select>
              <Select
                value={trendAge}
                onChange={e => setTrendAge(e.target.value)}
                className="text-xs py-1 px-2 h-8 w-28"
              >
                {AGE_CODES.map(c => (
                  <option key={c} value={c}>{isBg ? AGE_BG[c] : AGE_EN[c]}</option>
                ))}
              </Select>
            </div>
          </div>
          <TrendLineChart
            allYears={allYears}
            trendData={trendData}
            unitSymbol={unitSymbol}
          />
        </div>

        {/* ── Chart B: Grouped Bar (Latest Year) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {isBg
                  ? `Б. Праг на дохода по статус на заетост — ${latestYear}`
                  : `B. Income Threshold by Activity Status — ${latestYear}`}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBg
                  ? `18–64 год. срещу 65+ год. | ${unitFull}`
                  : `18–64 years vs 65+ years | ${unitFull}`}
              </p>
            </div>
            <Select
              value={barMetric}
              onChange={e => setBarMetric(e.target.value)}
              className="text-xs py-1 px-2 h-8 w-36"
            >
              {MEDIAN_CODES.map(c => (
                <option key={c} value={c}>{isBg ? MEDIAN_BG[c] : MEDIAN_EN[c]}</option>
              ))}
            </Select>
          </div>
          <GroupedBarChart
            barData={barData}
            unitSymbol={unitSymbol}
            isBg={isBg}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-series Line Chart (Mean vs Median for selected activity + age)
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ allYears, trendData, unitSymbol }: {
  allYears: string[];
  trendData: { medCode: string; label: string; values: (number | null)[] }[];
  unitSymbol: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

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
            .filter(p => p.value != null)
            .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
            .forEach(p => {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toLocaleString('bg-BG')} ${unitSymbol}</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: trendData.map(s => s.label),
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 20,
        itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '16%', top: '6%', containLabel: true },
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
        name: unitSymbol,
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => kFmt(v),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: trendData.map(s => ({
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: LINE_COLORS[s.medCode] },
        lineStyle: {
          width: 2.5,
          color: LINE_COLORS[s.medCode],
          type: LINE_TYPES[s.medCode] as 'solid' | 'dashed',
        },
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, trendData, unitSymbol]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Grouped Bar Chart (Latest Year: Activities × Age Groups)
// ══════════════════════════════════════════════════════════════════════════════

function GroupedBarChart({ barData, unitSymbol, isBg }: {
  barData: { actCode: string; label: string; color: string; age18: number | null; age65: number | null }[];
  unitSymbol: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const label18 = isBg ? '18–64 год.' : '18–64 years';
    const label65 = isBg ? '65+ год.' : '65+ years';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${params[0].name}</div>`;
          params
            .filter((p: any) => p.value != null)
            .forEach((p: any) => {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toLocaleString('bg-BG')} ${unitSymbol}</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: [label18, label65],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14,
        itemHeight: 10,
      },
      grid: { left: '2%', right: '3%', bottom: '16%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: barData.map(d => d.label),
        axisLabel: {
          fontSize: 11,
          color: '#475569',
          interval: 0,
          overflow: 'break' as const,
          width: 90,
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: unitSymbol,
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => kFmt(v),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: [
        {
          name: label18,
          type: 'bar' as const,
          data: barData.map(d => ({
            value: d.age18,
            itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] as [number, number, number, number], opacity: 0.9 },
          })),
          barMaxWidth: 50,
          label: {
            show: true,
            position: 'top' as const,
            fontSize: 10,
            color: '#4f46e5',
            fontWeight: 'bold' as const,
            formatter: (p: any) => p.value != null ? `${Math.round(p.value / 1000)}k` : '',
          },
          emphasis: { itemStyle: { opacity: 1 } },
        },
        {
          name: label65,
          type: 'bar' as const,
          data: barData.map(d => ({
            value: d.age65,
            itemStyle: { color: '#22c55e', borderRadius: [4, 4, 0, 0] as [number, number, number, number], opacity: 0.85 },
          })),
          barMaxWidth: 50,
          label: {
            show: true,
            position: 'top' as const,
            fontSize: 10,
            color: '#16a34a',
            fontWeight: 'bold' as const,
            formatter: (p: any) => p.value != null ? `${Math.round(p.value / 1000)}k` : '',
          },
          emphasis: { itemStyle: { opacity: 1 } },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [barData, unitSymbol, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}