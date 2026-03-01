'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Dimension labels ──────────────────────────────────────────────────────────

const ACTIVITY_LABELS_EN: Record<string, string> = {
  '1': 'Employment',
  '2': 'Non employment',
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
const ACTIVITY_ORDER = ['1', '2', '3', '4', '5'];

const ACTIVITY_COLORS: Record<string, string> = {
  '1': '#10b981', // emerald  — employed (lowest risk)
  '2': '#f59e0b', // amber    — non-employed
  '3': '#ef4444', // red      — unemployed (highest risk)
  '4': '#6366f1', // indigo   — retired
  '5': '#8b5cf6', // violet   — other inactive
};

const GENDER_LABELS_EN: Record<string, string> = { '0': 'Total', '1': 'Male', '2': 'Female' };
const GENDER_LABELS_BG: Record<string, string> = { '0': 'Общо', '1': 'Мъже', '2': 'Жени' };
const GENDER_ORDER = ['0', '1', '2'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRate(row: any): number | null {
  if (!row) return null;
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

// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function LowWorkIntensityActivityDashboard({ data, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const [selectedGenderForArea, setSelectedGenderForArea] = useState('0');

  const { allYears, activityCodes, latestYear, firstYear } = useMemo(() => {
    const years = new Set<string>();
    const activities = new Set<string>();

    data.forEach(d => {
      if (d.Year) years.add(String(d.Year));
      const code = d.SILC_Activity_Code != null ? String(d.SILC_Activity_Code) : null;
      if (code) activities.add(code);
    });

    const sortedYears = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    const sortedActivities = ACTIVITY_ORDER.filter(c => activities.has(c));

    return {
      allYears: sortedYears,
      activityCodes: sortedActivities,
      latestYear: sortedYears[sortedYears.length - 1] ?? '',
      firstYear: sortedYears[0] ?? '',
    };
  }, [data]);

  // KPI: Unemployment (3) vs Employment (1) vs Retired (4), Total gender (0), latest year
  const kpi = useMemo(() => {
    if (!latestYear || data.length === 0) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    function find(actCode: string, genderCode: string, year: string) {
      return data.find(d =>
        String(d.Year) === year &&
        String(d.SILC_Activity_Code) === actCode &&
        String(d.Gender_Code) === genderCode
      ) ?? null;
    }

    const unemployedRate = getRate(find('3', '0', latestYear));
    const employedRate   = getRate(find('1', '0', latestYear));
    const retiredRate    = getRate(find('4', '0', latestYear));

    const unemployedPrev = prevYear ? getRate(find('3', '0', prevYear)) : null;
    const employedPrev   = prevYear ? getRate(find('1', '0', prevYear)) : null;

    const unemployedYoY = unemployedRate != null && unemployedPrev != null ? unemployedRate - unemployedPrev : null;
    const employedYoY   = employedRate   != null && employedPrev   != null ? employedRate   - employedPrev   : null;
    const gap           = unemployedRate != null && employedRate   != null ? unemployedRate - employedRate   : null;

    return { unemployedRate, employedRate, retiredRate, unemployedYoY, employedYoY, gap, latestYear, prevYear };
  }, [data, allYears, latestYear]);

  if (!data || data.length === 0 || !kpi) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const genderOptions = GENDER_ORDER.map(code => ({
    code,
    label: isBg ? GENDER_LABELS_BG[code] : GENDER_LABELS_EN[code],
  }));

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Лица в домакинства с нисък интензитет на работа по икономическа активност'
            : 'People in Households with Low Work Intensity — by Activity Status'}
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

          {/* Unemployed — highest risk */}
          <div className="bg-white shadow-sm rounded-xl p-5" style={{ borderLeft: '4px solid #ef4444' }}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-4">
              {isBg ? 'Безработни' : 'Unemployment group'}
            </p>
            <p className="text-3xl font-bold mt-2 text-red-500">
              {kpi.unemployedRate != null ? `${kpi.unemployedRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Най-засегната група' : 'Highest vulnerability group'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.unemployedYoY != null && (
                <span className={`text-[10px] font-semibold ${kpi.unemployedYoY <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.unemployedYoY <= 0 ? '▼' : '▲'} {Math.abs(kpi.unemployedYoY).toFixed(1)}pp
                </span>
              )}
            </div>
          </div>

          {/* Employed — lowest risk */}
          <div className="bg-white shadow-sm rounded-xl p-5" style={{ borderLeft: '4px solid #10b981' }}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-4">
              {isBg ? 'Заети' : 'Employment group'}
            </p>
            <p className="text-3xl font-bold mt-2 text-emerald-600">
              {kpi.employedRate != null ? `${kpi.employedRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Най-ниска засегнатост' : 'Lowest affected group'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.employedYoY != null && (
                <span className={`text-[10px] font-semibold ${kpi.employedYoY <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.employedYoY <= 0 ? '▼' : '▲'} {Math.abs(kpi.employedYoY).toFixed(1)}pp
                </span>
              )}
            </div>
          </div>

          {/* Gap */}
          <div className="bg-white shadow-sm rounded-xl p-5" style={{ borderLeft: '4px solid #f97316' }}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-4">
              {isBg ? 'Разлика (безраб. − заети)' : 'Gap (unemployed − employed)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-orange-500">
              {kpi.gap != null ? `${kpi.gap.toFixed(1)}pp` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Процентни пункта, ' : 'Percentage points, '}
              {kpi.latestYear}
            </p>
            {kpi.retiredRate != null && (
              <p className="text-[10px] text-slate-400 mt-1">
                {isBg
                  ? `Пенсионери: ${kpi.retiredRate.toFixed(1)}%`
                  : `Retired: ${kpi.retiredRate.toFixed(1)}%`}
              </p>
            )}
          </div>
        </div>

        {/* Insight callout */}
        {kpi.gap != null && kpi.gap > 10 && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-amber-700">
              {isBg ? 'Аналитична бележка:' : 'Analytical note:'}
            </span>{' '}
            {isBg
              ? `В ${latestYear} безработните са с ${kpi.gap.toFixed(1)} пр. пункта по-засегнати от заетите — безработицата е основен предиктор на ниския интензитет на работа в домакинството.`
              : `In ${latestYear}, unemployed persons face a rate ${kpi.gap.toFixed(1)} percentage points higher than employed — unemployment is the primary predictor of household low work intensity.`}
          </div>
        )}

        {/* ── Chart A: Trend by Activity Status ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Динамика по икономическа активност'
              : 'A. Trend by Activity Status Over Time'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | % от групата | Общо по пол | Щракнете върху легендата за включване/изключване`
              : `${firstYear}–${latestYear} | % of group | All genders combined | Click legend to toggle series`}
          </p>
          <TrendLineChart
            data={data}
            allYears={allYears}
            activityCodes={activityCodes}
            genderCode="0"
            locale={locale}
          />
        </div>

        {/* ── Chart B: Grouped Bar by Gender ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Сравнение по активност и пол — ${latestYear}`
              : `B. Activity Status Comparison by Gender — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Групирани стълбове: мъже и жени по вид икономическа активност'
              : 'Grouped bars: male vs female by economic activity status'}
          </p>
          <GroupedBarChart
            data={data}
            activityCodes={activityCodes}
            latestYear={latestYear}
            locale={locale}
          />
        </div>

        {/* ── Chart C: Stacked Area by Activity Status ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-700">
              {isBg
                ? 'В. Разпределение по активност — стекова ареална диаграма'
                : 'C. Activity Status Composition — Stacked Area Chart'}
            </h3>
            <select
              value={selectedGenderForArea}
              onChange={e => setSelectedGenderForArea(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700"
            >
              {genderOptions.map(o => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | % от групата | Показва как се изменя дялът на всяка активност с времето`
              : `${firstYear}–${latestYear} | % of group | Shows how each activity's share shifts year over year`}
          </p>
          <StackedAreaChart
            data={data}
            allYears={allYears}
            activityCodes={activityCodes}
            genderCode={selectedGenderForArea}
            locale={locale}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-Series Line Chart (Trend Over Time by Activity Status)
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ data, allYears, activityCodes, genderCode, locale }: {
  data: any[];
  allYears: string[];
  activityCodes: string[];
  genderCode: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return activityCodes.map(code => {
      const label = isBg ? (ACTIVITY_LABELS_BG[code] ?? code) : (ACTIVITY_LABELS_EN[code] ?? code);
      const color = ACTIVITY_COLORS[code] ?? '#94a3b8';
      const byYear: Record<string, number | null> = {};

      data.forEach(d => {
        if (String(d.SILC_Activity_Code) !== code) return;
        if (String(d.Gender_Code) !== genderCode) return;
        if (!d.Year) return;
        byYear[String(d.Year)] = getRate(d);
      });

      return {
        code,
        label,
        color,
        values: allYears.map(y => byYear[y] ?? null),
      };
    });
  }, [data, allYears, activityCodes, genderCode, isBg]);

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
      grid: { left: '1%', right: '3%', bottom: '14%', top: '4%', containLabel: true },
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
// Chart B — Grouped Bar Chart (Latest Year by Activity and Gender)
// ══════════════════════════════════════════════════════════════════════════════

function GroupedBarChart({ data, activityCodes, latestYear, locale }: {
  data: any[];
  activityCodes: string[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { categories, maleSeries, femaleSeries } = useMemo(() => {
    const cats = activityCodes.map(code =>
      isBg ? (ACTIVITY_LABELS_BG[code] ?? code) : (ACTIVITY_LABELS_EN[code] ?? code)
    );

    function getValue(actCode: string, genderCode: string) {
      const row = data.find(d =>
        String(d.Year) === latestYear &&
        String(d.SILC_Activity_Code) === actCode &&
        String(d.Gender_Code) === genderCode
      );
      return getRate(row);
    }

    const male   = activityCodes.map(code => getValue(code, '1'));
    const female = activityCodes.map(code => getValue(code, '2'));

    return { categories: cats, maleSeries: male, femaleSeries: female };
  }, [data, activityCodes, latestYear, isBg]);

  useEffect(() => {
    if (!chartRef.current || categories.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const maleLabel   = isBg ? 'Мъже' : 'Male';
    const femaleLabel = isBg ? 'Жени' : 'Female';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            if (p.value != null) {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)}%</span>
              </div>`;
            }
          });
          return tip;
        },
      },
      legend: {
        data: [maleLabel, femaleLabel],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '2%', right: '3%', bottom: '14%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          fontSize: 10,
          color: '#475569',
          rotate: 15,
          overflow: 'truncate' as const,
          width: 130,
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
      series: [
        {
          name: maleLabel,
          type: 'bar',
          data: maleSeries,
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] as [number, number, number, number] },
          barGap: '10%',
          label: {
            show: true,
            position: 'top' as const,
            fontSize: 10,
            color: '#334155',
            formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
          },
        },
        {
          name: femaleLabel,
          type: 'bar',
          data: femaleSeries,
          itemStyle: { color: '#ec4899', borderRadius: [4, 4, 0, 0] as [number, number, number, number] },
          label: {
            show: true,
            position: 'top' as const,
            fontSize: 10,
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
  }, [categories, maleSeries, femaleSeries, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Stacked Area Chart (Activity Status Composition Over Time)
// ══════════════════════════════════════════════════════════════════════════════

function StackedAreaChart({ data, allYears, activityCodes, genderCode, locale }: {
  data: any[];
  allYears: string[];
  activityCodes: string[];
  genderCode: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return activityCodes.map(code => {
      const label = isBg ? (ACTIVITY_LABELS_BG[code] ?? code) : (ACTIVITY_LABELS_EN[code] ?? code);
      const color = ACTIVITY_COLORS[code] ?? '#94a3b8';
      const byYear: Record<string, number | null> = {};

      data.forEach(d => {
        if (String(d.SILC_Activity_Code) !== code) return;
        if (String(d.Gender_Code) !== genderCode) return;
        if (!d.Year) return;
        byYear[String(d.Year)] = getRate(d);
      });

      return {
        code,
        label,
        color,
        values: allYears.map(y => byYear[y] ?? null),
      };
    });
  }, [data, allYears, activityCodes, genderCode, isBg]);

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
              <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p.color}"></span>
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
      grid: { left: '1%', right: '3%', bottom: '14%', top: '4%', containLabel: true },
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
        stack: 'total',
        areaStyle: { opacity: 0.55 },
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: 1.5, color: s.color },
        smooth: false,
        symbol: 'circle',
        symbolSize: 4,
        connectNulls: true,
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}