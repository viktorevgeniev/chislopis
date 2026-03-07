'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Activity status labels ────────────────────────────────────────────────────

const ACTIVITY_LABELS_EN: Record<string, string> = {
  '1': 'Employment',
  '2': 'Non-employment',
  '3': 'Unemployment',
  '4': 'Retired',
  '5': 'Inactive - Other',
};

const ACTIVITY_LABELS_BG: Record<string, string> = {
  '1': 'Заети',
  '2': 'Незаети',
  '3': 'Безработни',
  '4': 'Пенсионери',
  '5': 'Неактивни - Друго',
};

// ── Age group labels ──────────────────────────────────────────────────────────

const AGE_LABELS_EN: Record<string, string> = {
  '2': '18–64 years',
  '3': '65 years and over',
  '9': '18 years and over',
};

const AGE_LABELS_BG: Record<string, string> = {
  '2': '18–64 години',
  '3': '65 и повече години',
  '9': '18 и повече години',
};

// ── Colors ────────────────────────────────────────────────────────────────────

const ACTIVITY_COLORS: Record<string, string> = {
  '1': '#10b981', // emerald  — Employment
  '2': '#f59e0b', // amber    — Non-employment
  '3': '#ef4444', // red      — Unemployment
  '4': '#3b82f6', // blue     — Retired
  '5': '#8b5cf6', // purple   — Inactive Other
};

const AGE_COLORS: Record<string, string> = {
  '9': '#64748b', // slate  — 18+ overall
  '2': '#3b82f6', // blue   — 18–64
  '3': '#f97316', // orange — 65+
};

const ACTIVITY_ORDER = ['1', '2', '3', '4', '5'];
const AGE_ORDER = ['9', '2', '3']; // 18+ overall, 18–64, 65+

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVal(row: any, col: string): number | null {
  const v = row?.[col];
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

function actLabel(code: string, isBg: boolean): string {
  return isBg ? (ACTIVITY_LABELS_BG[code] ?? code) : (ACTIVITY_LABELS_EN[code] ?? code);
}

function ageLabel(code: string, isBg: boolean): string {
  return isBg ? (AGE_LABELS_BG[code] ?? code) : (AGE_LABELS_EN[code] ?? code);
}

function tooltipBase() {
  return {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

export function MaterialDeprivationByActivityDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const [selectedAge, setSelectedAge] = useState<string>('9');

  const { allYears, latestYear, firstYear } = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => { if (d.Year) years.add(String(d.Year)); });
    const sorted = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    return {
      allYears: sorted,
      latestYear: sorted[sorted.length - 1] ?? '',
      firstYear: sorted[0] ?? '',
    };
  }, [data]);

  // KPIs based on age code 9 (18 years and over) in the latest year
  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const getRate = (actCode: string, ageCode: string, year: string) => {
      const row = data.find(d =>
        String(d.SILC_Activity_Code) === actCode &&
        String(d.SILC_Age_Code) === ageCode &&
        String(d.Year) === year
      );
      return getVal(row, 'Rate');
    };

    let highestCode = '';
    let highestRate: number | null = null;
    let lowestCode = '';
    let lowestRate: number | null = null;

    ACTIVITY_ORDER.forEach(code => {
      const rate = getRate(code, '9', latestYear);
      if (rate == null) return;
      if (highestRate == null || rate > highestRate) { highestRate = rate; highestCode = code; }
      if (lowestRate == null || rate < lowestRate) { lowestRate = rate; lowestCode = code; }
    });

    const unemployLatest = getRate('3', '9', latestYear);
    const unemployPrev = prevYear ? getRate('3', '9', prevYear) : null;
    const unemployChange = unemployLatest != null && unemployPrev != null
      ? unemployLatest - unemployPrev : null;

    return {
      latestYear,
      highestCode, highestRate: highestRate as number | null,
      lowestCode, lowestRate: lowestRate as number | null,
      unemployLatest, unemployChange,
    };
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
            ? 'Тежки материални лишения по икономическа активност'
            : 'Material Deprivation by Economic Activity Status'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | % от лицата с тежки материални лишения`
            : `Annual data (${firstYear}–${latestYear}) | % of persons with severe material deprivation`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-засегната група' : 'Highest-risk activity group'}
            </p>
            <p className="text-3xl font-bold mt-2 text-red-600">
              {kpi.highestRate != null ? `${kpi.highestRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              {actLabel(kpi.highestCode, isBg)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-малко засегната група' : 'Lowest-risk activity group'}
            </p>
            <p className="text-3xl font-bold mt-2 text-emerald-600">
              {kpi.lowestRate != null ? `${kpi.lowestRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              {actLabel(kpi.lowestCode, isBg)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Безработни (18+ г.)' : 'Unemployment group (18+)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-orange-600">
              {kpi.unemployLatest != null ? `${kpi.unemployLatest.toFixed(1)}%` : '—'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-500">
                {isBg ? 'Много висок риск' : 'Very high-risk group'}
              </p>
              {kpi.unemployChange != null && (
                <span className={`text-[10px] font-semibold ${kpi.unemployChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.unemployChange <= 0 ? '▼' : '▲'} {Math.abs(kpi.unemployChange).toFixed(1)}pp
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>
        </div>

        {/* ── Chart A: Multi-line trend by activity status ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Динамика на тежките материални лишения по икономическа активност'
              : 'A. Material Deprivation Trend by Economic Activity Status'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | % от съответната група население`
              : `${firstYear}–${latestYear} | % of respective population group`}
          </p>

          {/* Age group filter */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-xs text-slate-500 font-medium">
              {isBg ? 'Възрастова група:' : 'Age group:'}
            </span>
            {AGE_ORDER.map(ageCode => (
              <button
                key={ageCode}
                onClick={() => setSelectedAge(ageCode)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  selectedAge === ageCode
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {ageLabel(ageCode, isBg)}
              </button>
            ))}
          </div>

          <TrendLineChart
            data={data}
            allYears={allYears}
            selectedAge={selectedAge}
            locale={locale}
          />
        </div>

        {/* ── Chart B: Grouped bar — latest year snapshot ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Материални лишения по активност и възраст — ${latestYear}`
              : `B. Material Deprivation by Activity Status and Age — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Групирани стойности по икономическа активност и възрастова група'
              : 'Grouped values by economic activity status and age group'}
          </p>
          <GroupedBarChart data={data} latestYear={latestYear} locale={locale} />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-Line Trend by Activity Status (filtered by age group)
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ data, allYears, selectedAge, locale }: {
  data: any[];
  allYears: string[];
  selectedAge: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return ACTIVITY_ORDER.map(code => {
      const label = actLabel(code, isBg);
      const color = ACTIVITY_COLORS[code] ?? '#94a3b8';
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (String(d.SILC_Activity_Code) !== code) return;
        if (String(d.SILC_Age_Code) !== selectedAge) return;
        if (!d.Year) return;
        byYear[String(d.Year)] = getVal(d, 'Rate');
      });
      return { label, color, values: allYears.map(y => byYear[y] ?? null) };
    });
  }, [data, allYears, selectedAge, isBg]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipBase(),
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
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '15%', top: '4%', containLabel: true },
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
        lineStyle: { width: 2.5, color: s.color },
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Grouped Bar: latest year, activity on x-axis, age groups as series
// ══════════════════════════════════════════════════════════════════════════════

function GroupedBarChart({ data, latestYear, locale }: {
  data: any[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { categories, series } = useMemo(() => {
    const categories = ACTIVITY_ORDER.map(code => actLabel(code, isBg));
    const series = AGE_ORDER.map(ageCode => {
      const ageLbl = ageLabel(ageCode, isBg);
      const color = AGE_COLORS[ageCode] ?? '#94a3b8';
      const values = ACTIVITY_ORDER.map(actCode => {
        const row = data.find(d =>
          String(d.SILC_Activity_Code) === actCode &&
          String(d.SILC_Age_Code) === ageCode &&
          String(d.Year) === latestYear
        );
        return getVal(row, 'Rate');
      });
      return { name: ageLbl, color, values };
    });
    return { categories, series };
  }, [data, latestYear, isBg]);

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
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          [...params]
            .filter((p: any) => p.value != null)
            .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
            .forEach((p: any) => {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)}%</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: series.map(s => s.name),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '15%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          fontSize: 11,
          color: '#475569',
          interval: 0,
          overflow: 'break',
          width: 100,
        },
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
      series: series.map(s => ({
        name: s.name,
        type: 'bar' as const,
        data: s.values.map(v => ({
          value: v,
          itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0], opacity: 0.85 },
        })),
        barMaxWidth: 36,
        label: {
          show: true,
          position: 'top' as const,
          fontSize: 11,
          fontWeight: 'bold' as const,
          color: '#334155',
          formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [categories, series]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
