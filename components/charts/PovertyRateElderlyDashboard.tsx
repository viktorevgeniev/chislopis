'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Constants ─────────────────────────────────────────────────────────────────

const GENDER_COLORS: Record<string, string> = {
  '0': '#0f172a', // Total
  '1': '#3b82f6', // Male
  '2': '#e11d48', // Female
};

// Display order for age groups
const AGE_ORDER = ['5', '12', '11', '10'];

// Short BG labels for age groups by code
const AGE_LABELS_BG: Record<string, string> = {
  '5':  'Под 60 г.',
  '10': '75 г. и повече',
  '11': 'Под 75 г.',
  '12': '60 г. и повече',
};

function getRate(row: any): number | null {
  if (row == null) return null;
  const v = row.Rate;
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const raw = typeof v === 'string' ? v.replace(/[()]/g, '') : v;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return isNaN(n) ? null : n;
}

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

export function PovertyRateElderlyDashboard({ data, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  // ── Derive dimensional catalogs ──────────────────────────────────────────────
  const { allYears, ageGroups, genderOptions } = useMemo(() => {
    const years = new Set<string>();
    const ageMap = new Map<string, string>();
    const genderMap = new Map<string, string>();

    data.forEach(d => {
      if (d.Year) years.add(String(d.Year));

      const ac = d.SILC_Age_Code || '';
      if (ac && !ageMap.has(ac)) ageMap.set(ac, d.SILC_Age || ac);

      const gc = d.Gender_Code || '';
      if (gc && !genderMap.has(gc)) genderMap.set(gc, d.Gender || gc);
    });

    const sortedYears = [...years].sort((a, b) => parseInt(a) - parseInt(b));

    // Order age groups by AGE_ORDER, then any extras
    const sortedAges = AGE_ORDER
      .filter(c => ageMap.has(c))
      .map(c => ({ code: c, en: ageMap.get(c)!, bg: AGE_LABELS_BG[c] || ageMap.get(c)! }));

    // Genders ordered 0, 1, 2
    const sortedGenders = ['0', '1', '2']
      .filter(c => genderMap.has(c))
      .map(c => ({ code: c, label: genderMap.get(c)! }));

    return { allYears: sortedYears, ageGroups: sortedAges, genderOptions: sortedGenders };
  }, [data]);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const latestYear = allYears[allYears.length - 1] || '';
  const prevYear   = allYears.length > 1 ? allYears[allYears.length - 2] : '';
  const firstYear  = allYears[0] || '';

  const [selectedAgeCode, setSelectedAgeCode] = useState('');

  useEffect(() => {
    if (ageGroups.length > 0 && !selectedAgeCode) {
      // Default to 75+ (code "10")
      setSelectedAgeCode(ageGroups.find(a => a.code === '10')?.code || ageGroups[0].code);
    }
  }, [ageGroups, selectedAgeCode]);

  const activeAgeCode = selectedAgeCode || '10';

  // ── KPI computations (all use latestYear) ────────────────────────────────────
  const kpi = useMemo(() => {
    if (!latestYear || data.length === 0) return null;

    const find = (year: string, genderCode: string, ageCode: string) =>
      data.find(d => d.Year === year && d.Gender_Code === genderCode && d.SILC_Age_Code === ageCode);

    // 75+ total latest
    const rate75Total = getRate(find(latestYear, '0', '10'));
    const rate75Prev  = prevYear ? getRate(find(prevYear, '0', '10')) : null;
    const yoy75 = rate75Total != null && rate75Prev != null ? rate75Total - rate75Prev : null;

    // 75+ male vs female
    const rate75Male   = getRate(find(latestYear, '1', '10'));
    const rate75Female = getRate(find(latestYear, '2', '10'));
    const genderGap75  = rate75Male != null && rate75Female != null ? rate75Female - rate75Male : null;

    // 60+ total latest
    const rate60Total = getRate(find(latestYear, '0', '12'));

    // <60 total latest (reference/contrast)
    const rateLt60 = getRate(find(latestYear, '0', '5'));

    return { latestYear, rate75Total, yoy75, rate75Male, rate75Female, genderGap75, rate60Total, rateLt60 };
  }, [data, latestYear, prevYear]);

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
            ? 'Относителен дял на бедните сред възрастните хора'
            : 'At-Risk-of-Poverty Rate of Older People'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear} – ${latestYear}) | Единица: % от населението`
            : `Annual data (${firstYear} – ${latestYear}) | Unit: % of population`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* 75+ Total */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? '75 г. и повече (общо)' : '75 years and over (total)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-violet-700">
              {kpi.rate75Total != null ? `${kpi.rate75Total.toFixed(1)}%` : '—'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.yoy75 != null && (
                <span className={`text-[10px] font-semibold ${kpi.yoy75 <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.yoy75 <= 0 ? '▼' : '▲'} {Math.abs(kpi.yoy75).toFixed(1)}pp YoY
                </span>
              )}
            </div>
          </div>

          {/* 60+ Total */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? '60 г. и повече (общо)' : '60 years and over (total)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-purple-600">
              {kpi.rate60Total != null ? `${kpi.rate60Total.toFixed(1)}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          {/* Gender Gap 75+ */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Мъже / Жени (75+)' : 'Male / Female (75+)'}
            </p>
            <p className="text-2xl font-bold mt-2">
              <span className="text-blue-600">
                {kpi.rate75Male != null ? kpi.rate75Male.toFixed(1) : '—'}
              </span>
              <span className="text-slate-300"> / </span>
              <span className="text-rose-600">
                {kpi.rate75Female != null ? kpi.rate75Female.toFixed(1) : '—'}
              </span>
              <span className="text-sm text-slate-400">%</span>
            </p>
            {kpi.genderGap75 != null && (
              <p className="text-xs text-slate-400 mt-1">
                {isBg ? 'Разлика (Ж–М)' : 'Gap (F–M)'}:{' '}
                {kpi.genderGap75 > 0 ? '+' : ''}{kpi.genderGap75.toFixed(1)}pp
              </p>
            )}
          </div>

          {/* Reference: <60 */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Под 60 г. (справка)' : 'Under 60 years (reference)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-600">
              {kpi.rateLt60 != null ? `${kpi.rateLt60.toFixed(1)}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3 bg-white shadow-sm rounded-xl px-4 py-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {isBg ? 'Филтри' : 'Filters'}
          </span>
          <span className="text-xs text-slate-400">
            {isBg ? 'Възрастова група за линейна диаграма:' : 'Age group for trend chart:'}
          </span>
          <Select
            value={activeAgeCode}
            onChange={e => setSelectedAgeCode(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
          >
            {ageGroups.map(ag => (
              <option key={ag.code} value={ag.code}>
                {isBg ? ag.bg : ag.en}
              </option>
            ))}
          </Select>
        </div>

        {/* ── Chart A: Time-Series Line (Gender × Years) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Времева динамика по пол'
              : 'A. Poverty Rate Trend by Sex'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `Относителен дял на бедните (% от нас.) — ${isBg ? ageGroups.find(a => a.code === activeAgeCode)?.bg : ageGroups.find(a => a.code === activeAgeCode)?.en}`
              : `Monetary poverty rate (% of pop.) — ${ageGroups.find(a => a.code === activeAgeCode)?.en}`}
          </p>
          <TrendLineChart
            data={data}
            allYears={allYears}
            genderOptions={genderOptions}
            activeAgeCode={activeAgeCode}
            locale={locale}
          />
        </div>

        {/* ── Chart B: Grouped Bar (Age × Gender) for Latest Year ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Сравнение по възрастова група и пол — ${latestYear}`
              : `B. Cross-Section by Age Group and Sex — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Дял на бедните по възрастова група — мъже и жени сравнени за последната година'
              : 'Poverty rate by age group — male vs. female compared for the most recent year'}
          </p>
          <GroupedBarChart
            data={data}
            ageGroups={ageGroups}
            genderOptions={genderOptions}
            latestYear={latestYear}
            locale={locale}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-Series Line Chart (Poverty Trend by Sex)
// X = years, series = Total / Male / Female, filtered by selected age group
// ═══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ data, allYears, genderOptions, activeAgeCode, locale }: {
  data: any[];
  allYears: string[];
  genderOptions: { code: string; label: string }[];
  activeAgeCode: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    return genderOptions.map(g => {
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (d.SILC_Age_Code !== activeAgeCode || d.Gender_Code !== g.code || !d.Year) return;
        byYear[String(d.Year)] = getRate(d);
      });
      return {
        code: g.code,
        label: g.label,
        color: GENDER_COLORS[g.code] || '#64748b',
        values: allYears.map(y => byYear[y] ?? null),
      };
    });
  }, [data, allYears, genderOptions, activeAgeCode]);

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
          [...params]
            .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))
            .forEach((p: any) => {
              const val = p.value != null ? Number(p.value) : null;
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${val != null ? val.toFixed(1) + '%' : '—'}</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: seriesData.map(s => s.label),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14,
        itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '12%', top: '6%', containLabel: true },
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
        lineStyle: { width: s.code === '0' ? 2.5 : 2, color: s.color, type: s.code === '0' ? 'dashed' : 'solid' },
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
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart B — Grouped Bar Chart (Age Group × Sex) for Latest Year
// X = age groups, grouped bars = Male / Female (Total omitted for clarity)
// ═══════════════════════════════════════════════════════════════════════════════

function GroupedBarChart({ data, ageGroups, genderOptions, latestYear, locale }: {
  data: any[];
  ageGroups: { code: string; en: string; bg: string }[];
  genderOptions: { code: string; label: string }[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  // Only Male and Female for grouped bars (codes 1, 2)
  const sexGroups = useMemo(
    () => genderOptions.filter(g => g.code === '1' || g.code === '2'),
    [genderOptions]
  );

  const seriesData = useMemo(() => {
    if (!latestYear) return [];
    return sexGroups.map(g => ({
      code: g.code,
      label: g.label,
      color: GENDER_COLORS[g.code] || '#64748b',
      values: ageGroups.map(ag => {
        const row = data.find(d =>
          d.Year === latestYear && d.SILC_Age_Code === ag.code && d.Gender_Code === g.code
        );
        return getRate(row || null);
      }),
    }));
  }, [data, ageGroups, sexGroups, latestYear]);

  const axisLabels = useMemo(
    () => ageGroups.map(ag => isBg ? ag.bg : ag.en),
    [ageGroups, isBg]
  );

  useEffect(() => {
    if (!chartRef.current || seriesData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].name}</div>`;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? val.toFixed(1) + '%' : '—'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: sexGroups.map(g => g.label),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: axisLabels,
        axisLabel: { fontSize: 11, color: '#64748b' },
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
        type: 'bar' as const,
        data: s.values.map(v => ({
          value: v,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
        })),
        itemStyle: { color: s.color },
        barMaxWidth: 48,
        label: {
          show: true,
          position: 'top',
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
  }, [seriesData, axisLabels, sexGroups]);

  if (seriesData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[380px] text-sm text-slate-400">
        {isBg ? 'Няма данни за последната година' : 'No data for the latest year'}
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
