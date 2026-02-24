'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Shared constants ──────────────────────────────────────────────────────────

const GENDER_COLORS: Record<string, string> = {
  '0': '#1e293b', // Total — dark slate
  '1': '#3b82f6', // Male — blue
  '2': '#e11d48', // Female — rose
};

const AGE_COLORS: Record<string, string> = {
  '2': '#0891b2', // 18–64
  '3': '#7c3aed', // 65+
};

function getValue(row: any): number | null {
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

// ── Main Dashboard ────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

export function InWorkPovertyByAgeSexDashboard({ data, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const { allYears, latestYear, firstYear } = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => { if (d.Year) years.add(d.Year); });
    const sorted = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    return {
      allYears: sorted,
      latestYear: sorted[sorted.length - 1] || '',
      firstYear: sorted[0] || '',
    };
  }, [data]);

  // KPI values for summary cards (age=9, latest year)
  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const find = (year: string, genderCode: string, ageCode: string) =>
      data.find(d => d.Year === year && d.Gender_Code === genderCode && d.SILC_Age_Code === ageCode);

    const total  = getValue(find(latestYear, '0', '9'));
    const male   = getValue(find(latestYear, '1', '9'));
    const female = getValue(find(latestYear, '2', '9'));
    const prevTotal = prevYear ? getValue(find(prevYear, '0', '9')) : null;
    const yoy = total != null && prevTotal != null ? total - prevTotal : null;
    const gap = male != null && female != null ? female - male : null;

    const age18_64_total = getValue(find(latestYear, '0', '2'));
    const age65p_total   = getValue(find(latestYear, '0', '3'));

    return { total, male, female, yoy, gap, age18_64_total, age65p_total, latestYear };
  }, [data, latestYear, allYears]);

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
            ? 'Работещи бедни по възраст и пол'
            : 'In-Work At-Risk-of-Poverty Rate by Age and Sex'}
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
          {/* Total rate */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Общо (18+), най-нова' : 'Total (18+), latest'}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">
              {kpi.total != null ? `${kpi.total.toFixed(1)}%` : '—'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-400">{kpi.latestYear}</p>
              {kpi.yoy != null && (
                <span className={`text-xs font-semibold ${kpi.yoy <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.yoy <= 0 ? '▼' : '▲'} {Math.abs(kpi.yoy).toFixed(1)}pp {isBg ? 'г/г' : 'YoY'}
                </span>
              )}
            </div>
          </div>

          {/* Male / Female */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Мъже / Жени (18+)' : 'Male / Female (18+)'}
            </p>
            <p className="text-2xl font-bold mt-2">
              <span className="text-blue-600">{kpi.male != null ? kpi.male.toFixed(1) : '—'}</span>
              <span className="text-slate-300"> / </span>
              <span className="text-rose-600">{kpi.female != null ? kpi.female.toFixed(1) : '—'}</span>
              <span className="text-sm text-slate-400">%</span>
            </p>
            {kpi.gap != null && (
              <p className="text-xs text-slate-400 mt-1">
                {isBg ? 'Разлика' : 'Gap'}: {kpi.gap > 0 ? '+' : ''}{kpi.gap.toFixed(1)}pp
              </p>
            )}
          </div>

          {/* 18–64 total */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? '18–64 г. (общо)' : '18–64 yrs (total)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-cyan-700">
              {kpi.age18_64_total != null ? `${kpi.age18_64_total.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          {/* 65+ total */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? '65+ г. (общо)' : '65+ yrs (total)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-violet-700">
              {kpi.age65p_total != null ? `${kpi.age65p_total.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>
        </div>

        {/* ── Chart A: Trend by Gender (18+) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Времева динамика по пол (18+ г.)'
              : 'A. Trend by Gender (18 years and over)'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Относителен дял на работещите бедни (% от нас.) — Общо, Мъже и Жени за всички години'
              : 'In-work poverty rate (% of pop.) — Total, Male, Female across all years'}
          </p>
          <TrendByGenderChart data={data} allYears={allYears} locale={locale} />
        </div>

        {/* ── Charts B & C side by side ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart B: Age Demographic Comparison (latest year) */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg
                ? `Б. Демографски профил — ${latestYear}`
                : `B. Age Demographic Comparison — ${latestYear}`}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg
                ? 'Сравнение на двете възрастови групи (18–64 г. vs 65+) по пол'
                : 'Comparison of two age cohorts (18–64 yrs vs 65+) by gender'}
            </p>
            <AgeDemographicBarChart data={data} latestYear={latestYear} locale={locale} />
          </div>

          {/* Chart C: Elderly Gender Disparity (Area) */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg
                ? 'В. Полова разлика — Население 65+ г.'
                : 'C. Gender Disparity — Elderly (65+ years)'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg
                ? 'Дял на работещите бедни сред хората на 65+ г. — Мъже vs Жени'
                : 'In-work poverty rate among 65+ population — Male vs Female over time'}
            </p>
            <ElderlyGenderAreaChart data={data} allYears={allYears} locale={locale} />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart A — Trend by Gender Line Chart (SILC_Age = '9', all genders)
// ═══════════════════════════════════════════════════════════════════════════════

function TrendByGenderChart({ data, allYears, locale }: {
  data: any[];
  allYears: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const genders = useMemo(() => [
    { code: '0', label: isBg ? 'Общо' : 'Total' },
    { code: '1', label: isBg ? 'Мъже' : 'Male' },
    { code: '2', label: isBg ? 'Жени' : 'Female' },
  ], [isBg]);

  const seriesData = useMemo(() => {
    return genders.map(g => {
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (d.SILC_Age_Code !== '9' || d.Gender_Code !== g.code) return;
        if (d.Year) byYear[d.Year] = getValue(d);
      });
      return {
        code: g.code,
        label: g.label,
        values: allYears.map(y => byYear[y] ?? null),
      };
    });
  }, [data, allYears, genders]);

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
        data: genders.map(g => g.label),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
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
        itemStyle: { color: GENDER_COLORS[s.code] },
        lineStyle: { width: s.code === '0' ? 2.5 : 1.8 },
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        emphasis: { lineStyle: { width: 3.5 } },
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
// Chart B — Grouped Bar: Age Cohort Comparison (latest year, Male vs Female)
// ═══════════════════════════════════════════════════════════════════════════════

function AgeDemographicBarChart({ data, latestYear, locale }: {
  data: any[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const ageGroups = useMemo(() => [
    { code: '2', label: isBg ? '18–64 г.' : '18–64 yrs' },
    { code: '3', label: isBg ? '65+ г.' : '65+ yrs' },
  ], [isBg]);

  const genders = useMemo(() => [
    { code: '1', label: isBg ? 'Мъже' : 'Male' },
    { code: '2', label: isBg ? 'Жени' : 'Female' },
  ], [isBg]);

  const seriesData = useMemo(() => {
    if (!latestYear) return [];
    return genders.map(g => ({
      code: g.code,
      label: g.label,
      values: ageGroups.map(ag => {
        const row = data.find(d =>
          d.Year === latestYear &&
          d.Gender_Code === g.code &&
          d.SILC_Age_Code === ag.code
        );
        return getValue(row || null);
      }),
    }));
  }, [data, latestYear, genders, ageGroups]);

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
        data: genders.map(g => g.label),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ageGroups.map(a => a.label),
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
        itemStyle: { color: GENDER_COLORS[s.code] },
        barMaxWidth: 50,
        label: {
          show: true,
          position: 'top' as const,
          fontSize: 10,
          color: '#64748b',
          formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [seriesData, ageGroups, genders]);

  if (seriesData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[380px] text-sm text-slate-400">
        {isBg ? 'Няма данни за избраната година' : 'No data for selected year'}
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart C — Elderly Gender Disparity Area Chart (SILC_Age = '3', Male vs Female)
// ═══════════════════════════════════════════════════════════════════════════════

function ElderlyGenderAreaChart({ data, allYears, locale }: {
  data: any[];
  allYears: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const genders = useMemo(() => [
    { code: '1', label: isBg ? 'Мъже' : 'Male' },
    { code: '2', label: isBg ? 'Жени' : 'Female' },
  ], [isBg]);

  const seriesData = useMemo(() => {
    return genders.map(g => {
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (d.SILC_Age_Code !== '3' || d.Gender_Code !== g.code) return;
        if (d.Year) byYear[d.Year] = getValue(d);
      });
      return {
        code: g.code,
        label: g.label,
        values: allYears.map(y => byYear[y] ?? null),
      };
    });
  }, [data, allYears, genders]);

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
        data: genders.map(g => g.label),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
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
        itemStyle: { color: GENDER_COLORS[s.code] },
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.15, color: GENDER_COLORS[s.code] },
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        emphasis: { lineStyle: { width: 3 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
