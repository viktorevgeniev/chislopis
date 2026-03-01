'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Label & colour maps ────────────────────────────────────────────────────────

const GENDER_CODES = ['0', '1', '2'] as const;

const GENDER_EN: Record<string, string> = { '0': 'Total', '1': 'Male', '2': 'Female' };
const GENDER_BG: Record<string, string> = { '0': 'Общо', '1': 'Мъже', '2': 'Жени' };
const GENDER_COLORS: Record<string, string> = {
  '0': '#6366f1',
  '1': '#3b82f6',
  '2': '#ec4899',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

function getVal(row: any, col: string): number | null {
  if (!row) return null;
  const v = row[col];
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

function findRow(data: any[], year: string, genderCode: string): any {
  return data.find(d =>
    String(d.Year) === year &&
    (String(d.Gender_Code ?? d.GenderID) === genderCode)
  );
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

export function MonetaryPovertyRateDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

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

  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const totalLatest = findRow(data, latestYear, '0');
    const totalPrev = prevYear ? findRow(data, prevYear, '0') : null;
    const maleLatest = findRow(data, latestYear, '1');
    const femaleLatest = findRow(data, latestYear, '2');

    const totalRate = getVal(totalLatest, 'Rate');
    const prevRate = getVal(totalPrev, 'Rate');
    const maleRate = getVal(maleLatest, 'Rate');
    const femaleRate = getVal(femaleLatest, 'Rate');
    const yoy = totalRate != null && prevRate != null ? totalRate - prevRate : null;
    const genderGap = maleRate != null && femaleRate != null ? femaleRate - maleRate : null;

    return { totalRate, yoy, maleRate, femaleRate, genderGap, latestYear };
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
            ? 'Парична бедност по пол'
            : 'Monetary Poverty Rate by Sex'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Дял на лицата под прага на бедност (% от населението)`
            : `Annual data (${firstYear}–${latestYear}) | Share of persons below the poverty threshold (% of population)`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Национален дял (%)' : 'National rate (%)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-indigo-600">
              {kpi.totalRate != null ? `${kpi.totalRate.toFixed(2)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Общо (двата пола)' : 'Total (both sexes)'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.yoy != null && (
                <span className={`text-[10px] font-semibold ${kpi.yoy <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.yoy <= 0 ? '▼' : '▲'} {Math.abs(kpi.yoy).toFixed(2)}pp YoY
                </span>
              )}
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'По пол' : 'By sex'}
            </p>
            <div className="flex items-end gap-3 mt-2">
              <div>
                <p className="text-2xl font-bold text-blue-500">
                  {kpi.maleRate != null ? `${kpi.maleRate.toFixed(2)}%` : '—'}
                </p>
                <p className="text-[11px] text-slate-400">{isBg ? 'Мъже' : 'Male'}</p>
              </div>
              <span className="text-slate-300 text-xl mb-1">/</span>
              <div>
                <p className="text-2xl font-bold text-pink-500">
                  {kpi.femaleRate != null ? `${kpi.femaleRate.toFixed(2)}%` : '—'}
                </p>
                <p className="text-[11px] text-slate-400">{isBg ? 'Жени' : 'Female'}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Полова разлика (жени − мъже)' : 'Gender gap (female − male)'}
            </p>
            <p className={`text-3xl font-bold mt-2 ${(kpi.genderGap ?? 0) >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
              {kpi.genderGap != null
                ? `${kpi.genderGap >= 0 ? '+' : ''}${kpi.genderGap.toFixed(2)}pp`
                : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {kpi.genderGap != null
                ? (kpi.genderGap > 0
                  ? (isBg ? 'Жените са по-засегнати' : 'Women more affected')
                  : kpi.genderGap < 0
                  ? (isBg ? 'Мъжете са по-засегнати' : 'Men more affected')
                  : (isBg ? 'Равни дялове' : 'Equal rates'))
                : ''}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>
        </div>

        {/* ── Chart A: Trend lines by sex ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Динамика на паричната бедност по пол'
              : 'A. Monetary Poverty Rate Trend by Sex'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | % от съответното население`
              : `${firstYear}–${latestYear} | % of respective population`}
          </p>
          <TrendLineChart data={data} allYears={allYears} locale={locale} />
        </div>

        {/* ── Chart B: Latest-year grouped bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Текущо състояние: парична бедност по пол — ${latestYear}`
              : `B. Current Snapshot: Monetary Poverty Rate by Sex — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Сравнение на дяловете по пол за последната налична година'
              : 'Comparison of poverty rates by sex for the latest available year'}
          </p>
          <LatestYearBarChart data={data} latestYear={latestYear} locale={locale} />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-series trend line (Total / Male / Female)
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ data, allYears, locale }: {
  data: any[];
  allYears: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => (
    GENDER_CODES.map(code => ({
      label: isBg ? GENDER_BG[code] : GENDER_EN[code],
      color: GENDER_COLORS[code],
      values: allYears.map(yr => getVal(findRow(data, yr, code), 'Rate')),
    }))
  ), [data, allYears, isBg]);

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
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(2)}%</span>
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
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
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
        symbolSize: 6,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
        label: {
          show: false,
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Grouped bar for latest year (Male / Female / Total)
// ══════════════════════════════════════════════════════════════════════════════

function LatestYearBarChart({ data, latestYear, locale }: {
  data: any[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const chartData = useMemo(() => (
    GENDER_CODES.map(code => ({
      label: isBg ? GENDER_BG[code] : GENDER_EN[code],
      color: GENDER_COLORS[code],
      value: getVal(findRow(data, latestYear, code), 'Rate'),
    }))
  ), [data, latestYear, isBg]);

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
          const p = params[0];
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.name}</div>
            <div>${isBg ? 'Дял в парична бедност' : 'Monetary poverty rate'}: <b>${p.value != null ? Number(p.value).toFixed(2) + '%' : '—'}</b></div>`;
        },
      },
      grid: { left: '2%', right: '8%', bottom: '6%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: chartData.map(d => d.label),
        axisLabel: { fontSize: 13, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? '% от населението' : '% of population',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
        max: (v: { max: number }) => Math.ceil(v.max * 1.2),
      },
      series: [{
        type: 'bar' as const,
        data: chartData.map(d => ({
          value: d.value,
          itemStyle: { color: d.color, borderRadius: [6, 6, 0, 0], opacity: 0.9 },
          name: d.label,
        })),
        barMaxWidth: 100,
        label: {
          show: true,
          position: 'top' as const,
          fontSize: 14,
          fontWeight: 'bold' as const,
          color: '#334155',
          formatter: (p: any) => p.value != null ? Number(p.value).toFixed(2) + '%' : '',
        },
        emphasis: { itemStyle: { opacity: 1 } },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}
