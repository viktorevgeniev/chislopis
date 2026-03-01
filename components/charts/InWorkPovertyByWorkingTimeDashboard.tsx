'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Colour palette ─────────────────────────────────────────────────────────────
const WORK_COLORS: Record<string, string> = {
  '6': '#f59e0b', // Part-time — amber (higher poverty risk)
  '7': '#3b82f6', // Full-time — blue  (lower poverty risk)
};

const WORK_LABELS_EN: Record<string, string> = {
  '6': 'Part-time work',
  '7': 'Full-time work',
};

const WORK_LABELS_BG: Record<string, string> = {
  '6': 'Непълно работно време',
  '7': 'Пълно работно време',
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

// ── Main Dashboard ─────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

export function InWorkPovertyByWorkingTimeDashboard({ data, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  // ── Derive catalogs ──────────────────────────────────────────────────────────
  const { allYears, workTypes } = useMemo(() => {
    const years = new Set<string>();
    const types = new Set<string>();

    data.forEach(d => {
      if (d.Year) years.add(String(d.Year));
      const code = d.SILC_Activity_Code != null ? String(d.SILC_Activity_Code) : null;
      if (code) types.add(code);
    });

    const sortedYears = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    const sortedTypes = [...types].sort((a, b) => parseInt(a) - parseInt(b));

    return { allYears: sortedYears, workTypes: sortedTypes };
  }, [data]);

  const latestYear = allYears[allYears.length - 1] ?? '';
  const firstYear = allYears[0] ?? '';

  // ── KPI values for latest year ───────────────────────────────────────────────
  const kpi = useMemo(() => {
    if (!latestYear || data.length === 0) return null;

    const partTime = data.find(d => String(d.Year) === latestYear && String(d.SILC_Activity_Code) === '6');
    const fullTime = data.find(d => String(d.Year) === latestYear && String(d.SILC_Activity_Code) === '7');

    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    const partTimePrev = prevYear
      ? data.find(d => String(d.Year) === prevYear && String(d.SILC_Activity_Code) === '6')
      : null;
    const fullTimePrev = prevYear
      ? data.find(d => String(d.Year) === prevYear && String(d.SILC_Activity_Code) === '7')
      : null;

    const ptRate = getRate(partTime);
    const ftRate = getRate(fullTime);
    const ptPrev = getRate(partTimePrev);
    const ftPrev = getRate(fullTimePrev);

    const gap = ptRate != null && ftRate != null ? ptRate - ftRate : null;
    const ptYoY = ptRate != null && ptPrev != null ? ptRate - ptPrev : null;
    const ftYoY = ftRate != null && ftPrev != null ? ftRate - ftPrev : null;

    return { ptRate, ftRate, gap, ptYoY, ftYoY, latestYear };
  }, [data, allYears, latestYear]);

  if (!data || data.length === 0 || !kpi) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const workLabel = (code: string) =>
    isBg ? (WORK_LABELS_BG[code] || code) : (WORK_LABELS_EN[code] || code);

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Работещи бедни по пълно/непълно работно време'
            : 'In-Work At-Risk-of-Poverty Rate by Working Time'}
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

          {/* Part-time */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Непълно работно време' : 'Part-time work'}
            </p>
            <p className="text-3xl font-bold mt-2 text-amber-600">
              {kpi.ptRate != null ? `${kpi.ptRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Риск от бедност' : 'At-risk-of-poverty'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.ptYoY != null && (
                <span className={`text-[10px] font-semibold ${kpi.ptYoY <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.ptYoY <= 0 ? '▼' : '▲'} {Math.abs(kpi.ptYoY).toFixed(1)}pp YoY
                </span>
              )}
            </div>
          </div>

          {/* Full-time */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Пълно работно време' : 'Full-time work'}
            </p>
            <p className="text-3xl font-bold mt-2 text-blue-600">
              {kpi.ftRate != null ? `${kpi.ftRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Риск от бедност' : 'At-risk-of-poverty'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.ftYoY != null && (
                <span className={`text-[10px] font-semibold ${kpi.ftYoY <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.ftYoY <= 0 ? '▼' : '▲'} {Math.abs(kpi.ftYoY).toFixed(1)}pp YoY
                </span>
              )}
            </div>
          </div>

          {/* Gap */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Разлика (непълно − пълно)' : 'Gap (part-time − full-time)'}
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
              ? 'А. Динамика на риска от бедност по вид работно време'
              : 'A. Poverty Rate Trend by Working Time'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `Годишна тенденция ${firstYear}–${latestYear} | Щракнете върху легендата за включване/изключване`
              : `Annual trend ${firstYear}–${latestYear} | Click legend items to toggle`}
          </p>
          <TrendLineChart
            data={data}
            allYears={allYears}
            workTypes={workTypes}
            locale={locale}
          />
        </div>

        {/* ── Chart B: Bar comparison for latest year ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Сравнение на риска от бедност — ${latestYear}`
              : `B. Poverty Rate Comparison — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Абсолютна разлика в процентни пункта между непълно и пълно работно време'
              : 'Absolute difference in percentage points between part-time and full-time work'}
          </p>
          <SnapshotBarChart
            data={data}
            workTypes={workTypes}
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

function TrendLineChart({ data, allYears, workTypes, locale }: {
  data: any[];
  allYears: string[];
  workTypes: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return workTypes.map(code => {
      const label = isBg ? (WORK_LABELS_BG[code] || code) : (WORK_LABELS_EN[code] || code);
      const color = WORK_COLORS[code] || '#64748b';
      const byYear: Record<string, number | null> = {};

      data.forEach(d => {
        if (String(d.SILC_Activity_Code) !== code || !d.Year) return;
        const v = getRate(d);
        byYear[String(d.Year)] = v;
      });

      return {
        code,
        label,
        color,
        values: allYears.map(y => byYear[y] ?? null),
      };
    });
  }, [data, allYears, workTypes, isBg]);

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
      grid: { left: '1%', right: '3%', bottom: '12%', top: '4%', containLabel: true },
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
        label: {
          show: false,
        },
        markPoint: {
          data: [
            { type: 'max', name: isBg ? 'Макс' : 'Max' },
          ],
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

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart B — Grouped Bar Chart (Latest Year Snapshot)
// ═══════════════════════════════════════════════════════════════════════════════

function SnapshotBarChart({ data, workTypes, latestYear, locale }: {
  data: any[];
  workTypes: string[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { categories, values, colors } = useMemo(() => {
    const cats: string[] = [];
    const vals: (number | null)[] = [];
    const cols: string[] = [];

    workTypes.forEach(code => {
      const label = isBg ? (WORK_LABELS_BG[code] || code) : (WORK_LABELS_EN[code] || code);
      const row = data.find(d => String(d.Year) === latestYear && String(d.SILC_Activity_Code) === code);
      cats.push(label);
      vals.push(getRate(row));
      cols.push(WORK_COLORS[code] || '#64748b');
    });

    return { categories: cats, values: vals, colors: cols };
  }, [data, workTypes, latestYear, isBg]);

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
      grid: { left: '1%', right: '3%', bottom: '8%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { fontSize: 12, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? '% от заетите' : '% of employed',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        max: (value: { max: number }) => Math.ceil(value.max * 1.2),
      },
      series: [
        {
          type: 'bar',
          data: values.map((v, i) => ({
            value: v,
            itemStyle: {
              color: colors[i],
              borderRadius: [6, 6, 0, 0],
              opacity: 0.9,
            },
          })),
          barMaxWidth: 80,
          label: {
            show: true,
            position: 'top' as const,
            fontSize: 14,
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

  return <div ref={chartRef} style={{ width: '100%', height: '340px' }} />;
}
