'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Label maps ─────────────────────────────────────────────────────────────────

const AGE_LABEL_EN: Record<string, string> = {
  '0': 'Total',
  '1': 'Under 18',
  '2': '18–64',
  '3': '65+',
};

const AGE_LABEL_BG: Record<string, string> = {
  '0': 'Общо',
  '1': 'До 18 год.',
  '2': '18–64 год.',
  '3': '65 и над',
};

const AGE_COLORS: Record<string, string> = {
  '1': '#f97316',
  '2': '#3b82f6',
  '3': '#22c55e',
};

const GENDER_EN: Record<string, string> = { '0': 'Total', '1': 'Male', '2': 'Female' };
const GENDER_BG: Record<string, string> = { '0': 'Общо', '1': 'Мъже', '2': 'Жени' };
const GENDER_COLORS: Record<string, string> = { '1': '#3b82f6', '2': '#ec4899' };

const AGE_CODES = ['1', '2', '3'] as const;
const GENDER_CODES = ['1', '2'] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

type Index = Map<string, Map<string, Map<string, Map<string, number>>>>;

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

function numFmt(v: number): string {
  return v.toLocaleString('bg-BG');
}

function currSuffix(currency: string, isBg: boolean): string {
  if (currency === 'euro') return isBg ? '€' : '€';
  return isBg ? ' лв.' : ' BGN';
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

export function MeanMedianIncomeAgeSexDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  const [currency, setCurrency] = useState<'euro' | 'BGN_fig'>('euro');
  // 5 = Mean, 6 = Median
  const [barIncomeType, setBarIncomeType] = useState<'5' | '6'>('6');

  const allYears = useMemo(() => {
    const yrs = new Set<string>();
    for (const row of data) { if (row.Year) yrs.add(String(row.Year)); }
    return [...yrs].sort((a, b) => parseInt(a) - parseInt(b));
  }, [data]);

  const latestYear = allYears[allYears.length - 1] ?? '';
  const firstYear = allYears[0] ?? '';

  // Build index: genderCode → ageCode → incomeCode → year → value
  // Rebuilt whenever currency changes
  const index = useMemo<Index>(() => {
    const m: Index = new Map();
    for (const row of data) {
      if (String(row.Units_Code ?? '') !== currency) continue;
      const g = String(row.Gender_Code ?? '');
      const a = String(row.SILC_Age_Code ?? '');
      const t = String(row.SILC_Median_Code ?? '');
      const yr = String(row.Year ?? '');
      const val = getVal(row);
      if (!g || !a || !t || !yr || val == null) continue;
      if (!m.has(g)) m.set(g, new Map());
      if (!m.get(g)!.has(a)) m.get(g)!.set(a, new Map());
      if (!m.get(g)!.get(a)!.has(t)) m.get(g)!.get(a)!.set(t, new Map());
      m.get(g)!.get(a)!.get(t)!.set(yr, val);
    }
    return m;
  }, [data, currency]);

  // KPI: Total gender (0), Total age (0), latest year
  const kpi = useMemo(() => {
    const meanVal = index.get('0')?.get('0')?.get('5')?.get(latestYear) ?? null;
    const medianVal = index.get('0')?.get('0')?.get('6')?.get(latestYear) ?? null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    const prevMean = prevYear ? (index.get('0')?.get('0')?.get('5')?.get(prevYear) ?? null) : null;
    const prevMedian = prevYear ? (index.get('0')?.get('0')?.get('6')?.get(prevYear) ?? null) : null;
    const meanYoY = meanVal != null && prevMean != null
      ? ((meanVal - prevMean) / prevMean) * 100 : null;
    const medianYoY = medianVal != null && prevMedian != null
      ? ((medianVal - prevMedian) / prevMedian) * 100 : null;
    const ratio = meanVal != null && medianVal != null && medianVal > 0
      ? meanVal / medianVal : null;
    return { meanVal, medianVal, meanYoY, medianYoY, ratio };
  }, [index, latestYear, allYears]);

  const currLabel = currency === 'euro' ? '€' : 'лв.';
  const currFull = currency === 'euro' ? 'Euro' : 'BGN';

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
                ? 'Среден и медианен доход по възраст и пол'
                : 'Mean and Median Income by Age and Sex'}
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              {isBg
                ? `Годишни данни (${firstYear}–${latestYear}) | Монетарни доходи по възрастови групи и пол`
                : `Annual data (${firstYear}–${latestYear}) | Monetary incomes by age group and sex`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Среден доход (${currFull})` : `Mean income (${currFull})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-indigo-600">
              {kpi.meanVal != null ? numFmt(kpi.meanVal) : '—'}
              <span className="text-base font-semibold ml-1 text-indigo-400">{currLabel}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Общо, всички възрасти' : 'Total, all ages'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{latestYear}</span>
              {kpi.meanYoY != null && (
                <span className={`text-[10px] font-semibold ${kpi.meanYoY >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.meanYoY >= 0 ? '▲' : '▼'} {Math.abs(kpi.meanYoY).toFixed(1)}% YoY
                </span>
              )}
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Медианен доход (${currFull})` : `Median income (${currFull})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-violet-600">
              {kpi.medianVal != null ? numFmt(kpi.medianVal) : '—'}
              <span className="text-base font-semibold ml-1 text-violet-400">{currLabel}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Общо, всички възрасти' : 'Total, all ages'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{latestYear}</span>
              {kpi.medianYoY != null && (
                <span className={`text-[10px] font-semibold ${kpi.medianYoY >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.medianYoY >= 0 ? '▲' : '▼'} {Math.abs(kpi.medianYoY).toFixed(1)}% YoY
                </span>
              )}
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Коефициент средно/медиана' : 'Mean / Median ratio'}
            </p>
            <p className="text-3xl font-bold mt-2 text-amber-500">
              {kpi.ratio != null ? kpi.ratio.toFixed(3) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {kpi.ratio != null
                ? (kpi.ratio > 1.15
                  ? (isBg ? 'Значително горно разслоение' : 'Significant upper-tail skew')
                  : kpi.ratio > 1.05
                  ? (isBg ? 'Умерено разслоение' : 'Moderate skewness')
                  : (isBg ? 'Близки стойности' : 'Near-symmetric'))
                : ''}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {isBg ? '> 1 → средното надвишава медианата' : '> 1 → mean exceeds median'}
            </p>
          </div>
        </div>

        {/* ── Chart A: Mean vs Median trend line ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `А. Динамика на среден и медианен доход (${currFull})`
              : `A. Mean vs. Median Income Trend (${currFull})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | Общо население (всички възрасти и полове)`
              : `${firstYear}–${latestYear} | Total population (all ages and sexes combined)`}
          </p>
          <MeanMedianTrendChart
            index={index}
            allYears={allYears}
            isBg={isBg}
            currLabel={currLabel}
          />
        </div>

        {/* ── Chart B: Gender × Age grouped bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-slate-700">
              {isBg
                ? `Б. Доход по пол и възрастова група — ${latestYear}`
                : `B. Income by Sex and Age Group — ${latestYear}`}
            </h3>
            <Select
              value={barIncomeType}
              onChange={e => setBarIncomeType(e.target.value as '5' | '6')}
              className="text-xs py-1 px-2 h-8 w-36"
            >
              <option value="6">{isBg ? 'Медианен доход' : 'Median income'}</option>
              <option value="5">{isBg ? 'Среден доход' : 'Mean income'}</option>
            </Select>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${latestYear} | Мъже срещу Жени по възрастови групи (${currFull})`
              : `${latestYear} | Male vs Female across age brackets (${currFull})`}
          </p>
          <GenderAgeBarChart
            index={index}
            year={latestYear}
            incomeType={barIncomeType}
            isBg={isBg}
            currLabel={currLabel}
          />
        </div>

        {/* ── Chart C: Median by age group over time ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `В. Медианен доход по възрастови групи (${currFull})`
              : `C. Median Income by Age Group Over Time (${currFull})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | Общо (мъже и жени), без обобщителния агрегат`
              : `${firstYear}–${latestYear} | Total (male and female), excluding "Total" aggregate`}
          </p>
          <AgeGroupTrendChart
            index={index}
            allYears={allYears}
            isBg={isBg}
            currLabel={currLabel}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Two-line: Mean income vs Median income over time (Total × Total)
// ══════════════════════════════════════════════════════════════════════════════

function MeanMedianTrendChart({ index, allYears, isBg, currLabel }: {
  index: Index;
  allYears: string[];
  isBg: boolean;
  currLabel: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => [
    {
      code: '5',
      label: isBg ? 'Среден доход' : 'Mean income',
      color: '#6366f1',
      dash: false,
      values: allYears.map(yr => index.get('0')?.get('0')?.get('5')?.get(yr) ?? null),
    },
    {
      code: '6',
      label: isBg ? 'Медианен доход' : 'Median income',
      color: '#a855f7',
      dash: true,
      values: allYears.map(yr => index.get('0')?.get('0')?.get('6')?.get(yr) ?? null),
    },
  ], [index, allYears, isBg]);

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
        itemWidth: 20, itemHeight: 8,
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
        lineStyle: { width: 2.5, color: s.color, type: s.dash ? ('dashed' as const) : ('solid' as const) },
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        connectNulls: true,
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: s.color + '22' },
              { offset: 1, color: s.color + '00' },
            ],
          },
        },
        emphasis: { lineStyle: { width: 4 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, series, currLabel]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Grouped bar: Male vs Female × Age bracket (latest year)
// ══════════════════════════════════════════════════════════════════════════════

function GenderAgeBarChart({ index, year, incomeType, isBg, currLabel }: {
  index: Index;
  year: string;
  incomeType: '5' | '6';
  isBg: boolean;
  currLabel: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    const ageLabels = AGE_CODES.map(a => isBg ? AGE_LABEL_BG[a] : AGE_LABEL_EN[a]);
    const maleSeries = AGE_CODES.map(a =>
      index.get('1')?.get(a)?.get(incomeType)?.get(year) ?? null
    );
    const femaleSeries = AGE_CODES.map(a =>
      index.get('2')?.get(a)?.get(incomeType)?.get(year) ?? null
    );
    return { ageLabels, maleSeries, femaleSeries };
  }, [index, year, incomeType, isBg]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

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
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${Number(p.value).toLocaleString('bg-BG')} ${currLabel}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Мъже' : 'Male', isBg ? 'Жени' : 'Female'],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '4%', bottom: '16%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: chartData.ageLabels,
        axisLabel: { fontSize: 12, color: '#475569' },
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
      series: [
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'bar' as const,
          itemStyle: { color: GENDER_COLORS['1'], borderRadius: [4, 4, 0, 0] },
          data: chartData.maleSeries,
          barMaxWidth: 60,
          label: {
            show: true,
            position: 'top' as const,
            fontSize: 10,
            color: '#334155',
            formatter: (p: any) => p.value != null
              ? `${(p.value / 1000).toFixed(1)}k` : '',
          },
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'bar' as const,
          itemStyle: { color: GENDER_COLORS['2'], borderRadius: [4, 4, 0, 0] },
          data: chartData.femaleSeries,
          barMaxWidth: 60,
          label: {
            show: true,
            position: 'top' as const,
            fontSize: 10,
            color: '#334155',
            formatter: (p: any) => p.value != null
              ? `${(p.value / 1000).toFixed(1)}k` : '',
          },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, currLabel, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '340px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Multi-line: Median income by age group over time (Total gender)
// ══════════════════════════════════════════════════════════════════════════════

function AgeGroupTrendChart({ index, allYears, isBg, currLabel }: {
  index: Index;
  allYears: string[];
  isBg: boolean;
  currLabel: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => (
    AGE_CODES.map(a => ({
      code: a,
      label: isBg ? AGE_LABEL_BG[a] : AGE_LABEL_EN[a],
      color: AGE_COLORS[a],
      // gender='0' (total), incomeType='6' (median)
      values: allYears.map(yr => index.get('0')?.get(a)?.get('6')?.get(yr) ?? null),
    }))
  ), [index, allYears, isBg]);

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
        lineStyle: { width: 2.5, color: s.color },
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
  }, [allYears, series, currLabel]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
