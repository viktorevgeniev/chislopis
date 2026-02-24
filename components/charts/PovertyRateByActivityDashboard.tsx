'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Color palette per activity code ──────────────────────────────────────────
const ACTIVITY_COLORS: Record<string, string> = {
  '1': '#10b981', // Employment → emerald
  '2': '#3b82f6', // Non-employment → blue
  '3': '#ef4444', // Unemployment → red
  '4': '#f59e0b', // Retired → amber
  '5': '#8b5cf6', // Inactive (Other) → violet
};

const ACTIVITY_LABELS_EN: Record<string, string> = {
  '1': 'Employment',
  '2': 'Non-employment',
  '3': 'Unemployment',
  '4': 'Retired',
  '5': 'Inactive (Other)',
};

const ACTIVITY_LABELS_BG: Record<string, string> = {
  '1': 'Заетост',
  '2': 'Незаетост',
  '3': 'Безработица',
  '4': 'Пенсионери',
  '5': 'Неактивни (Друго)',
};

// ── Gender labels & colors ────────────────────────────────────────────────────
const GENDER_LABELS_EN: Record<string, string> = {
  '0': 'Total',
  '1': 'Male',
  '2': 'Female',
};

const GENDER_LABELS_BG: Record<string, string> = {
  '0': 'Общо',
  '1': 'Мъже',
  '2': 'Жени',
};

const GENDER_COLORS: Record<string, string> = {
  '0': '#64748b', // slate
  '1': '#3b82f6', // blue
  '2': '#e11d48', // rose
};

// ── Regional labels ───────────────────────────────────────────────────────────
const REGION_LABELS_EN: Record<string, string> = {
  'BG':   'Bulgaria (Total)',
  'BG31': 'Severozapaden',
  'BG32': 'Severen tsentralen',
  'BG33': 'Severoiztochen',
  'BG34': 'Yugoiztochen',
  'BG41': 'Yugozapaden',
  'BG42': 'Yuzhen tsentralen',
};

const REGION_LABELS_BG: Record<string, string> = {
  'BG':   'България (общо)',
  'BG31': 'Северозападен',
  'BG32': 'Северен централен',
  'BG33': 'Североизточен',
  'BG34': 'Югоизточен',
  'BG41': 'Югозападен',
  'BG42': 'Южен централен',
};

function tooltipBase(): Partial<EChartsOption['tooltip']> {
  return {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

export function PovertyRateByActivityDashboard({ data, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  // ── Derive catalog ───────────────────────────────────────────────────────────
  const { allYears, activities, genders, regions } = useMemo(() => {
    const years = new Set<string>();
    const acts = new Set<string>();
    const gens = new Set<string>();
    const regs = new Set<string>();

    data.forEach(d => {
      if (d.Year) years.add(String(d.Year));
      const ac = d.SILC_Activity_Code;
      if (ac) acts.add(String(ac));
      const gc = d.Gender_Code;
      if (gc) gens.add(String(gc));
      const nc = d.NUTS_Code;
      if (nc) regs.add(String(nc));
    });

    const sortedYears = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    const sortedActs  = [...acts].sort((a, b) => parseInt(a) - parseInt(b));
    const sortedGens  = [...gens].sort((a, b) => parseInt(a) - parseInt(b));
    const sortedRegs  = [...regs].sort((a, b) => {
      if (a === 'BG') return -1;
      if (b === 'BG') return 1;
      return a.localeCompare(b);
    });

    return { allYears: sortedYears, activities: sortedActs, genders: sortedGens, regions: sortedRegs };
  }, [data]);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const latestYear = allYears[allYears.length - 1] || '';
  const [selectedYear,     setSelectedYear]     = useState('');
  const [selectedGender,   setSelectedGender]   = useState('0'); // Total
  const [selectedActivity, setSelectedActivity] = useState('3'); // Unemployment

  useEffect(() => {
    if (latestYear && !selectedYear) setSelectedYear(latestYear);
  }, [latestYear, selectedYear]);

  const activeYear = selectedYear || latestYear;

  // ── KPI computations ─────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    if (!latestYear || data.length === 0) return null;

    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    const toNum = (r: any) => r?.Rate != null ? parseFloat(String(r.Rate)) : null;

    const natTotal = (actCode: string, genderCode = '0') =>
      data.find(d =>
        String(d.Year) === latestYear &&
        String(d.NUTS_Code) === 'BG' &&
        String(d.Gender_Code) === genderCode &&
        String(d.SILC_Activity_Code) === actCode
      );

    const employed   = toNum(natTotal('1'));
    const unemployed = toNum(natTotal('3'));
    const retired    = toNum(natTotal('4'));
    const maleUnemp  = toNum(natTotal('3', '1'));
    const femUnemp   = toNum(natTotal('3', '2'));
    const genderGap  = maleUnemp != null && femUnemp != null
      ? Math.abs(femUnemp - maleUnemp) : null;

    // YoY for unemployed
    let yoyUnemp: number | null = null;
    if (prevYear && unemployed != null) {
      const prev = data.find(d =>
        String(d.Year) === prevYear &&
        String(d.NUTS_Code) === 'BG' &&
        String(d.Gender_Code) === '0' &&
        String(d.SILC_Activity_Code) === '3'
      );
      const prevVal = toNum(prev);
      if (prevVal != null) yoyUnemp = unemployed - prevVal;
    }

    return { employed, unemployed, retired, genderGap, yoyUnemp, latestYear };
  }, [data, allYears, latestYear]);

  if (!data || data.length === 0 || !kpi) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const actLabel = (code: string) => isBg ? (ACTIVITY_LABELS_BG[code] || code) : (ACTIVITY_LABELS_EN[code] || code);
  const genLabel = (code: string) => isBg ? (GENDER_LABELS_BG[code] || code) : (GENDER_LABELS_EN[code] || code);

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Относителен дял на бедните по икономическа активност'
            : 'At-Risk-of-Poverty Rate by Activity Status'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${allYears[0]} – ${latestYear}) | Единица: % от населението`
            : `Annual data (${allYears[0]} – ${latestYear}) | Unit: % of population`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Unemployed */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Безработни' : 'Unemployed'}
            </p>
            <p className="text-3xl font-bold mt-2 text-red-600">
              {kpi.unemployed != null ? `${kpi.unemployed.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Риск от бедност' : 'At-risk-of-poverty'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.yoyUnemp != null && (
                <span className={`text-[10px] font-semibold ${kpi.yoyUnemp <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.yoyUnemp <= 0 ? '▼' : '▲'} {Math.abs(kpi.yoyUnemp).toFixed(1)}pp YoY
                </span>
              )}
            </div>
          </div>

          {/* Employed */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Заети' : 'Employed'}
            </p>
            <p className="text-3xl font-bold mt-2 text-emerald-600">
              {kpi.employed != null ? `${kpi.employed.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Риск от бедност' : 'At-risk-of-poverty'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          {/* Retired */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Пенсионери' : 'Retired'}
            </p>
            <p className="text-3xl font-bold mt-2 text-amber-600">
              {kpi.retired != null ? `${kpi.retired.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Риск от бедност' : 'At-risk-of-poverty'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          {/* Gender Gap (Unemployed) */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Полова разлика' : 'Gender Gap'}
            </p>
            <p className="text-3xl font-bold mt-2 text-violet-600">
              {kpi.genderGap != null ? `${kpi.genderGap.toFixed(1)}pp` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'М / Ж (безработни)' : 'M / F (unemployed)'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3 bg-white shadow-sm rounded-xl px-4 py-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {isBg ? 'Филтри' : 'Filters'}
          </span>
          <Select
            value={activeYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
          >
            {[...allYears].reverse().map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          <Select
            value={selectedGender}
            onChange={e => setSelectedGender(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
          >
            {genders.map(g => (
              <option key={g} value={g}>{genLabel(g)}</option>
            ))}
          </Select>
          <Select
            value={selectedActivity}
            onChange={e => setSelectedActivity(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
          >
            {activities.map(a => (
              <option key={a} value={a}>{actLabel(a)}</option>
            ))}
          </Select>
        </div>

        {/* ── Chart A: Trend Over Time ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Времева динамика по вид икономическа активност'
              : 'A. Poverty Rate Trend by Activity Status'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `Национално ниво (BG) | Пол: ${genLabel(selectedGender)} | Щракнете върху легендата за включване/изключване`
              : `National level (BG) | Gender: ${genLabel(selectedGender)} | Click legend items to toggle`}
          </p>
          <TrendLineChart
            data={data}
            allYears={allYears}
            activities={activities}
            selectedGender={selectedGender}
            locale={locale}
          />
        </div>

        {/* ── Chart B: Activity × Gender cross-section ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Активност и пол — ${activeYear} (национално ниво)`
              : `B. Activity Status & Gender — ${activeYear} (National Level)`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Сравнение на риска от бедност по вид икономическа активност и пол'
              : 'Poverty rate comparison by activity status and gender'}
          </p>
          <ActivityGenderBarChart
            data={data}
            activities={activities}
            activeYear={activeYear}
            locale={locale}
          />
        </div>

        {/* ── Chart C: Regional comparison ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `В. Регионални различия — ${activeYear} | ${actLabel(selectedActivity)}`
              : `C. Regional Disparities — ${activeYear} | ${actLabel(selectedActivity)}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Дял на бедните по статистически райони NUTS 2 (общо, и двата пола)'
              : 'At-risk-of-poverty rate by NUTS 2 region (total, both sexes)'}
          </p>
          <RegionalBarChart
            data={data}
            regions={regions}
            activeYear={activeYear}
            selectedActivity={selectedActivity}
            locale={locale}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-Series Line Chart (Trend by Activity Status)
// ═══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ data, allYears, activities, selectedGender, locale }: {
  data: any[];
  allYears: string[];
  activities: string[];
  selectedGender: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return activities.map(ac => {
      const label = isBg ? (ACTIVITY_LABELS_BG[ac] || ac) : (ACTIVITY_LABELS_EN[ac] || ac);
      const color = ACTIVITY_COLORS[ac] || '#64748b';
      const byYear: Record<string, number | null> = {};

      data.forEach(d => {
        if (
          String(d.SILC_Activity_Code) !== ac ||
          String(d.NUTS_Code) !== 'BG' ||
          String(d.Gender_Code) !== selectedGender ||
          !d.Year
        ) return;
        const v = parseFloat(String(d.Rate ?? ''));
        byYear[String(d.Year)] = isNaN(v) ? null : v;
      });

      return {
        code: ac,
        label,
        color,
        values: allYears.map(y => byYear[y] ?? null),
      };
    });
  }, [data, allYears, activities, selectedGender, isBg]);

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
        textStyle: { fontSize: 10, color: '#64748b' },
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
        symbolSize: 5,
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

// ═══════════════════════════════════════════════════════════════════════════════
// Chart B — Grouped Bar Chart (Activity × Gender, national level)
// ═══════════════════════════════════════════════════════════════════════════════

function ActivityGenderBarChart({ data, activities, activeYear, locale }: {
  data: any[];
  activities: string[];
  activeYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { categories, series } = useMemo(() => {
    const genderCodes = ['1', '2', '0']; // Male, Female, Total
    const cats = activities.map(ac =>
      isBg ? (ACTIVITY_LABELS_BG[ac] || ac) : (ACTIVITY_LABELS_EN[ac] || ac)
    );

    const sers = genderCodes.map(gc => {
      const label = isBg ? (GENDER_LABELS_BG[gc] || gc) : (GENDER_LABELS_EN[gc] || gc);
      const color = GENDER_COLORS[gc] || '#64748b';
      const values = activities.map(ac => {
        const row = data.find(d =>
          String(d.Year) === activeYear &&
          String(d.NUTS_Code) === 'BG' &&
          String(d.Gender_Code) === gc &&
          String(d.SILC_Activity_Code) === ac
        );
        const v = row?.Rate != null ? parseFloat(String(row.Rate)) : null;
        return v != null && !isNaN(v) ? v : null;
      });
      return { label, color, values };
    });

    return { categories: cats, series: sers };
  }, [data, activities, activeYear, isBg]);

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
          params.forEach((p: any) => {
            if (p.value == null) return;
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
        data: series.map(s => s.label),
        bottom: 0,
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 14,
        itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '12%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { fontSize: 10, color: '#94a3b8', interval: 0 },
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
      series: series.map(s => ({
        name: s.label,
        type: 'bar' as const,
        data: s.values.map(v => ({
          value: v,
          itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0] },
        })),
        barMaxWidth: 40,
        label: {
          show: true,
          position: 'top' as const,
          fontSize: 9,
          color: '#64748b',
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

// ═══════════════════════════════════════════════════════════════════════════════
// Chart C — Horizontal Bar Chart (Regional Disparities)
// ═══════════════════════════════════════════════════════════════════════════════

function RegionalBarChart({ data, regions, activeYear, selectedActivity, locale }: {
  data: any[];
  regions: string[];
  activeYear: string;
  selectedActivity: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const sorted = useMemo(() => {
    const nuts2 = regions.filter(r => r !== 'BG');
    const items = nuts2.map(r => {
      const row = data.find(d =>
        String(d.Year) === activeYear &&
        String(d.NUTS_Code) === r &&
        String(d.Gender_Code) === '0' &&
        String(d.SILC_Activity_Code) === selectedActivity
      );
      const v = row?.Rate != null ? parseFloat(String(row.Rate)) : null;
      return {
        code: r,
        label: isBg ? (REGION_LABELS_BG[r] || r) : (REGION_LABELS_EN[r] || r),
        rate: v != null && !isNaN(v) ? v : null,
      };
    }).filter(r => r.rate != null) as Array<{ code: string; label: string; rate: number }>;

    // Sort ascending (ECharts renders bottom→top so lowest ends up at bottom)
    items.sort((a, b) => a.rate - b.rate);
    return items;
  }, [data, regions, activeYear, selectedActivity, isBg]);

  useEffect(() => {
    if (!chartRef.current || sorted.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const actColor = ACTIVITY_COLORS[selectedActivity] || '#64748b';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.name}</div>
            <div>${isBg ? 'Риск от бедност' : 'At-risk-of-poverty'}: <b>${p.value != null ? Number(p.value).toFixed(1) + '%' : '—'}</b></div>`;
        },
      },
      grid: { left: '1%', right: '10%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: sorted.map(d => d.label),
        axisLabel: { fontSize: 11, color: '#64748b' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map(d => ({
            value: d.rate,
            itemStyle: {
              color: actColor,
              borderRadius: [0, 4, 4, 0],
              opacity: 0.85,
            },
          })),
          barWidth: 28,
          label: {
            show: true,
            position: 'right' as const,
            fontSize: 11,
            color: '#64748b',
            formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
          },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [sorted, selectedActivity, isBg]);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-slate-400">
        {isBg
          ? 'Няма регионални данни за избраните критерии'
          : 'No regional data for selected criteria'}
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: `${Math.max(280, sorted.length * 52 + 80)}px` }} />;
}
