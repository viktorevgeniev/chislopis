'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Dimension labels ──────────────────────────────────────────────────────────

// SILC_Age codes: 1=0-17 yrs, 4=18-59 yrs, 5=Total (all ages)
const AGE_LABELS_EN: Record<string, string> = {
  '1': 'Children (0–17)',
  '4': 'Adults (18–59)',
  '5': 'All ages',
};
const AGE_LABELS_BG: Record<string, string> = {
  '1': 'Деца (0–17)',
  '4': 'Възрастни (18–59)',
  '5': 'Всички възрасти',
};
const AGE_ORDER = ['5', '1', '4'];

const GENDER_LABELS_EN: Record<string, string> = { '0': 'Total', '1': 'Male', '2': 'Female' };
const GENDER_LABELS_BG: Record<string, string> = { '0': 'Общо', '1': 'Мъже', '2': 'Жени' };
const GENDER_ORDER = ['0', '1', '2'];

// NUTS2 regions only (BG31–BG42)
const NUTS2_CODES = ['BG31', 'BG32', 'BG33', 'BG34', 'BG41', 'BG42'];
const NUTS2_LABELS_EN: Record<string, string> = {
  BG31: 'Severozapaden',
  BG32: 'Severen tsentralen',
  BG33: 'Severoiztochen',
  BG34: 'Yugoiztochen',
  BG41: 'Yugozapaden',
  BG42: 'Yuzhen tsentralen',
};
const NUTS2_LABELS_BG: Record<string, string> = {
  BG31: 'Северозападен',
  BG32: 'Северен централен',
  BG33: 'Североизточен',
  BG34: 'Югоизточен',
  BG41: 'Югозападен',
  BG42: 'Южен централен',
};

// Colors
const AGE_COLORS: Record<string, string> = {
  '5': '#6366f1', // indigo — All ages
  '1': '#f59e0b', // amber  — Children
  '4': '#10b981', // emerald — Adults
};
const GENDER_COLORS: Record<string, string> = {
  '0': '#64748b',
  '1': '#3b82f6',
  '2': '#ec4899',
};
const NUTS2_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVal(row: any, col: string): number | null {
  const v = row?.[col];
  if (v == null || v === '' || v === '.' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

function ageLabel(code: string, isBg: boolean): string {
  return isBg ? (AGE_LABELS_BG[code] ?? code) : (AGE_LABELS_EN[code] ?? code);
}
function genderLabel(code: string, isBg: boolean): string {
  return isBg ? (GENDER_LABELS_BG[code] ?? code) : (GENDER_LABELS_EN[code] ?? code);
}
function nuts2Label(code: string, isBg: boolean, data: any[]): string {
  if (isBg) return NUTS2_LABELS_BG[code] ?? code;
  // try from data
  const row = data.find(d => String(d.NUTS_Code) === code);
  return row?.NUTS ?? NUTS2_LABELS_EN[code] ?? code;
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

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function LowWorkIntensityAgeSexDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const [unitMode, setUnitMode] = useState<'pct' | 'abs'>('pct');
  const [selectedYear, setSelectedYear] = useState<string>('');

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

  // Init selectedYear
  React.useEffect(() => {
    if (latestYear && !selectedYear) setSelectedYear(latestYear);
  }, [latestYear, selectedYear]);

  const unitCode = unitMode === 'pct' ? 'perc_pop_fig' : '1000cp';
  const unitSuffix = unitMode === 'pct' ? '%' : isBg ? ' хил. лица' : ' (thou.)';

  // KPIs — national total (BG, Gender=0, Age=5)
  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const findNational = (year: string, unitC: string) =>
      data.find(d =>
        String(d.NUTS_Code) === 'BG' &&
        String(d.Gender_Code) === '0' &&
        String(d.SILC_Age_Code) === '5' &&
        String(d.Units_Code) === unitC &&
        String(d.Year) === year
      );

    const latestPct = getVal(findNational(latestYear, 'perc_pop_fig'), 'Rate');
    const prevPct = prevYear ? getVal(findNational(prevYear, 'perc_pop_fig'), 'Rate') : null;
    const latestAbs = getVal(findNational(latestYear, '1000cp'), 'Rate');

    const childPct = getVal(
      data.find(d =>
        String(d.NUTS_Code) === 'BG' &&
        String(d.Gender_Code) === '0' &&
        String(d.SILC_Age_Code) === '1' &&
        String(d.Units_Code) === 'perc_pop_fig' &&
        String(d.Year) === latestYear
      ), 'Rate'
    );

    return {
      latestYear,
      prevYear,
      latestPct,
      prevPct,
      change: latestPct != null && prevPct != null ? latestPct - prevPct : null,
      latestAbs,
      childPct,
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
            ? 'Лица в домакинства с нисък интензитет на работа по възраст и пол'
            : 'People in Households with Low Work Intensity — by Age and Sex'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | NUTS 1–3 разбивка`
            : `Annual data (${firstYear}–${latestYear}) | NUTS 1–3 breakdown`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Национален дял — общо' : 'National share — all ages'}
            </p>
            <p className="text-3xl font-bold mt-2 text-indigo-600">
              {kpi.latestPct != null ? `${kpi.latestPct.toFixed(1)}%` : '—'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {kpi.change != null && (
                <span className={`text-xs font-semibold ${kpi.change <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.change <= 0 ? '▼' : '▲'} {Math.abs(kpi.change).toFixed(1)} pp
                </span>
              )}
              <span className="text-xs text-slate-400">
                {isBg ? 'от ' : 'vs '}{kpi.prevYear ?? ''}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Абсолютен брой — общо' : 'Total affected persons'}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-700">
              {kpi.latestAbs != null ? `${kpi.latestAbs.toFixed(1)}` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'хиляди лица' : 'thousand persons'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Дял при деца (0–17 г.)' : 'Rate among children (0–17)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-amber-600">
              {kpi.childPct != null ? `${kpi.childPct.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'от всички деца на 0–17 год.' : 'of all children aged 0–17'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>
        </div>

        {/* Unit toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            {isBg ? 'Мерна единица:' : 'Unit:'}
          </span>
          {(['pct', 'abs'] as const).map(u => (
            <button
              key={u}
              onClick={() => setUnitMode(u)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                unitMode === u
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              {u === 'pct'
                ? (isBg ? '% от нас.' : '% of pop.')
                : (isBg ? 'Хил. лица' : 'Thou. persons')}
            </button>
          ))}
        </div>

        {/* ── Chart A: National trend by age group ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Национална тенденция по възрастова група'
              : 'A. National Trend by Age Group'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | Общо (пол: всички) | ${unitMode === 'pct' ? '% от групата' : 'хиляди лица'}`
              : `${firstYear}–${latestYear} | All sexes | ${unitMode === 'pct' ? '% of group' : 'thousand persons'}`}
          </p>
          <NationalTrendChart
            data={data}
            allYears={allYears}
            unitCode={unitCode}
            unitSuffix={unitSuffix}
            unitMode={unitMode}
            locale={locale}
          />
        </div>

        {/* ── Chart B: Gender breakdown for selected year ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {isBg
                  ? `Б. Разбивка по пол и възрастова група — ${selectedYear}`
                  : `B. Breakdown by Sex and Age Group — ${selectedYear}`}
              </h3>
              <p className="text-xs text-slate-400">
                {isBg ? 'Национално ниво (BG)' : 'National level (BG)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{isBg ? 'Година:' : 'Year:'}</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white"
              >
                {allYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <GenderAgeBarChart
            data={data}
            year={selectedYear}
            unitCode={unitCode}
            unitSuffix={unitSuffix}
            unitMode={unitMode}
            locale={locale}
          />
        </div>

        {/* ── Chart C: Regional comparison ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {isBg
                  ? `В. Регионално сравнение (NUTS 2) — ${selectedYear}`
                  : `C. Regional Comparison (NUTS 2) — ${selectedYear}`}
              </h3>
              <p className="text-xs text-slate-400">
                {isBg
                  ? 'Всички възрасти | Общо (двата пола)'
                  : 'All ages | Total (both sexes)'}
              </p>
            </div>
          </div>
          <RegionalBarChart
            data={data}
            year={selectedYear}
            unitCode={unitCode}
            unitSuffix={unitSuffix}
            unitMode={unitMode}
            locale={locale}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — National trend by age group (multi-line)
// ══════════════════════════════════════════════════════════════════════════════

function NationalTrendChart({ data, allYears, unitCode, unitSuffix, unitMode, locale }: {
  data: any[];
  allYears: string[];
  unitCode: string;
  unitSuffix: string;
  unitMode: 'pct' | 'abs';
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return AGE_ORDER.map(ageCode => {
      const label = ageLabel(ageCode, isBg);
      const color = AGE_COLORS[ageCode] ?? '#94a3b8';
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (String(d.NUTS_Code) !== 'BG') return;
        if (String(d.Gender_Code) !== '0') return;
        if (String(d.SILC_Age_Code) !== ageCode) return;
        if (String(d.Units_Code) !== unitCode) return;
        if (!d.Year) return;
        byYear[String(d.Year)] = getVal(d, 'Rate');
      });
      return { label, color, values: allYears.map(y => byYear[y] ?? null) };
    });
  }, [data, allYears, unitCode, isBg]);

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
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)}${unitSuffix.trim()}</span>
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
        name: unitMode === 'pct' ? '%' : isBg ? 'хил.' : 'thou.',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => unitMode === 'pct' ? `${v}%` : `${v}`,
        },
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
  }, [allYears, seriesData, unitMode, unitSuffix, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Grouped bar: age groups on x-axis, gender as series
// ══════════════════════════════════════════════════════════════════════════════

function GenderAgeBarChart({ data, year, unitCode, unitSuffix, unitMode, locale }: {
  data: any[];
  year: string;
  unitCode: string;
  unitSuffix: string;
  unitMode: 'pct' | 'abs';
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { categories, series } = useMemo(() => {
    const cats = AGE_ORDER.map(c => ageLabel(c, isBg));
    const ser = GENDER_ORDER.map(gCode => {
      const label = genderLabel(gCode, isBg);
      const color = GENDER_COLORS[gCode] ?? '#94a3b8';
      const values = AGE_ORDER.map(aCode => {
        const row = data.find(d =>
          String(d.NUTS_Code) === 'BG' &&
          String(d.Gender_Code) === gCode &&
          String(d.SILC_Age_Code) === aCode &&
          String(d.Units_Code) === unitCode &&
          String(d.Year) === year
        );
        return getVal(row, 'Rate');
      });
      return { name: label, color, values };
    });
    return { categories: cats, series: ser };
  }, [data, year, unitCode, isBg]);

  useEffect(() => {
    if (!chartRef.current || !year) return;
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
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)}${unitSuffix.trim()}</span>
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
        axisLabel: { fontSize: 11, color: '#475569', interval: 0 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: unitMode === 'pct' ? '%' : isBg ? 'хил.' : 'thou.',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => unitMode === 'pct' ? `${v}%` : `${v}`,
        },
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
          itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0], opacity: v == null ? 0 : 0.85 },
        })),
        barMaxWidth: 48,
        label: {
          show: true,
          position: 'top' as const,
          fontSize: 11,
          fontWeight: 'bold' as const,
          color: '#334155',
          formatter: (p: any) =>
            p.value != null ? `${Number(p.value).toFixed(1)}${unitMode === 'pct' ? '%' : ''}` : '',
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [categories, series, year, unitMode, unitSuffix, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Regional comparison: horizontal bar for NUTS2 + national
// ══════════════════════════════════════════════════════════════════════════════

function RegionalBarChart({ data, year, unitCode, unitSuffix, unitMode, locale }: {
  data: any[];
  year: string;
  unitCode: string;
  unitSuffix: string;
  unitMode: 'pct' | 'abs';
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { labels, values, colors, nationalValue } = useMemo(() => {
    const regional: { code: string; label: string; val: number | null }[] = [];

    NUTS2_CODES.forEach(code => {
      const row = data.find(d =>
        String(d.NUTS_Code) === code &&
        String(d.Gender_Code) === '0' &&
        String(d.SILC_Age_Code) === '5' &&
        String(d.Units_Code) === unitCode &&
        String(d.Year) === year
      );
      const val = getVal(row, 'Rate');
      regional.push({ code, label: nuts2Label(code, isBg, data), val });
    });

    // Sort descending
    regional.sort((a, b) => (b.val ?? -Infinity) - (a.val ?? -Infinity));

    const natRow = data.find(d =>
      String(d.NUTS_Code) === 'BG' &&
      String(d.Gender_Code) === '0' &&
      String(d.SILC_Age_Code) === '5' &&
      String(d.Units_Code) === unitCode &&
      String(d.Year) === year
    );
    const natVal = getVal(natRow, 'Rate');

    return {
      labels: regional.map(r => r.label),
      values: regional.map(r => r.val),
      colors: regional.map(r => NUTS2_COLORS[NUTS2_CODES.indexOf(r.code)] ?? '#94a3b8'),
      nationalValue: natVal,
    };
  }, [data, year, unitCode, isBg]);

  useEffect(() => {
    if (!chartRef.current || !year) return;
    const chart = echarts.init(chartRef.current);

    const natLabel = isBg ? 'Национален средн.' : 'National avg.';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(),
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          if (!p || p.value == null) return '';
          return `<div style="font-weight:600;color:#0f172a">${p.axisValue}</div>` +
            `<div style="color:#6366f1;font-weight:600">${Number(p.value).toFixed(1)}${unitSuffix.trim()}</div>`;
        },
      },
      grid: { left: '2%', right: '6%', top: '4%', bottom: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: unitMode === 'pct' ? '%' : isBg ? 'хил.' : 'thou.',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => unitMode === 'pct' ? `${v}%` : `${v}`,
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
        ...(nationalValue != null ? {
          markLine: undefined,
        } : {}),
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: { fontSize: 11, color: '#475569' },
        axisLine: { show: false },
        axisTick: { show: false },
        inverse: false,
      },
      series: [
        {
          type: 'bar' as const,
          data: values.map((v, i) => ({
            value: v,
            itemStyle: { color: colors[i], borderRadius: [0, 4, 4, 0], opacity: 0.85 },
          })),
          barMaxWidth: 40,
          label: {
            show: true,
            position: 'right' as const,
            fontSize: 11,
            fontWeight: 'bold' as const,
            color: '#334155',
            formatter: (p: any) =>
              p.value != null ? `${Number(p.value).toFixed(1)}${unitMode === 'pct' ? '%' : ''}` : '',
          },
          ...(nationalValue != null ? {
            markLine: {
              silent: true,
              lineStyle: { color: '#ef4444', type: 'dashed', width: 2 },
              label: {
                formatter: `${natLabel}: ${nationalValue.toFixed(1)}${unitMode === 'pct' ? '%' : ''}`,
                position: 'end',
                color: '#ef4444',
                fontSize: 11,
                fontWeight: 'bold',
              },
              data: [{ xAxis: nationalValue }],
            },
          } : {}),
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [labels, values, colors, nationalValue, year, unitMode, unitSuffix, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}
