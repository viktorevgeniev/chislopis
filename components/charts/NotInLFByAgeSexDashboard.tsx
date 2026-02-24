'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Helpers ──────────────────────────────────────────────────────────────────────

function getVal(row: any): number | null {
  const v = row.Persons;
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const cleaned = typeof v === 'string' ? v.replace(/[()]/g, '') : v;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseQuarter(q: string): { year: number; quarter: number } {
  const m = q.match(/^(\d{4})Q(\d)$/);
  if (!m) return { year: 0, quarter: 0 };
  return { year: parseInt(m[1]), quarter: parseInt(m[2]) };
}

function sortQuarters(a: string, b: string): number {
  const pa = parseQuarter(a); const pb = parseQuarter(b);
  return pa.year !== pb.year ? pa.year - pb.year : pa.quarter - pb.quarter;
}

function fmtVal(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k';
}

// ── Types ────────────────────────────────────────────────────────────────────────

interface DashboardProps { data: any[]; dataset: Dataset; locale?: 'bg' | 'en'; }

// ── Colours ──────────────────────────────────────────────────────────────────────

const GENDER_COLORS = {
  total: '#334155',
  male: '#2563eb',
  female: '#e11d48',
};

// 10-year age group colours (excluding aggregates like Total, 15-64, 20-64, 15-29)
const AGE_GROUP_COLORS: Record<string, string> = {
  '15 - 24': '#2563eb',
  '25 - 34': '#059669',
  '35 - 44': '#d97706',
  '45 - 54': '#e11d48',
  '55 - 64': '#7c3aed',
  '65+': '#0891b2',
};

// The discrete (non-overlapping) age groups for compositional analysis
const DISCRETE_AGE_GROUPS = ['15 - 24', '25 - 34', '35 - 44', '45 - 54', '55 - 64', '65+'];

// ── Main ─────────────────────────────────────────────────────────────────────────

export function NotInLFByAgeSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  // Build lookup: quarter → age_code → gender_code → value
  const lookup = useMemo(() => {
    const map: Record<string, Record<string, Record<string, number | null>>> = {};
    data.forEach(row => {
      const q = row.Year;
      const age = row.Age10_LFS_Code;
      const gen = row.Gender_Code;
      if (!q || age == null || gen == null) return;
      if (!map[q]) map[q] = {};
      if (!map[q][age]) map[q][age] = {};
      map[q][age][gen] = getVal(row);
    });
    return map;
  }, [data]);

  const getValue = (q: string, age: string, gen: string): number | null => {
    return lookup[q]?.[age]?.[gen] ?? null;
  };

  // KPI
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const latestP = parseQuarter(latestQ);
    const yoyQ = `${latestP.year - 1}Q${latestP.quarter}`;

    const totalVal = getValue(latestQ, '0', '0');
    const prevVal = allQuarters.includes(yoyQ) ? getValue(yoyQ, '0', '0') : null;
    const yoyChange = totalVal != null && prevVal != null && prevVal > 0
      ? ((totalVal - prevVal) / prevVal * 100) : null;

    const maleVal = getValue(latestQ, '0', '1');
    const femaleVal = getValue(latestQ, '0', '2');
    const femalePct = femaleVal != null && totalVal != null && totalVal > 0
      ? (femaleVal / totalVal * 100) : null;

    // Largest age group
    let maxAge = '';
    let maxVal = -1;
    DISCRETE_AGE_GROUPS.forEach(age => {
      const v = getValue(latestQ, age, '0');
      if (v != null && v > maxVal) { maxVal = v; maxAge = age; }
    });

    return { latestQ, totalVal, yoyChange, maleVal, femaleVal, femalePct, maxAge, maxVal };
  }, [allQuarters, lookup]);

  if (!data || data.length === 0 || !kpiData) {
    return <div className="text-center py-8 text-muted-foreground">{isBg ? 'Няма данни' : 'No data available'}</div>;
  }

  const firstYear = parseQuarter(allQuarters[0]).year;
  const lastYear = parseQuarter(allQuarters[allQuarters.length - 1]).year;

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">{dataset.title[locale]}</CardTitle>
        <CardDescription className="text-slate-500">
          {isBg ? `Тримесечни данни (${firstYear}–${lastYear}) | Хиляди лица`
            : `Quarterly Data (${firstYear}–${lastYear}) | Thousands of Persons`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Извън раб. сила (${kpiData.latestQ})` : `Not in LF (${kpiData.latestQ})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">{fmtVal(kpiData.totalVal)}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Промяна г/г' : 'YoY Change'}
            </p>
            <p className={`text-3xl font-bold mt-2 ${kpiData.yoyChange != null ? (kpiData.yoyChange >= 0 ? 'text-red-500' : 'text-emerald-600') : 'text-slate-300'}`}>
              {kpiData.yoyChange != null ? `${kpiData.yoyChange >= 0 ? '+' : ''}${kpiData.yoyChange.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'спрямо същото тримесечие' : 'vs same quarter prev. year'}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? '% Жени' : '% Female'}
            </p>
            <p className="text-3xl font-bold mt-2 text-rose-600">
              {kpiData.femalePct != null ? kpiData.femalePct.toFixed(1) + '%' : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'от общия брой' : 'of total not in LF'}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-голяма група' : 'Largest Age Group'}
            </p>
            <p className="text-2xl font-bold mt-2 text-violet-700">
              {kpiData.maxAge || '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{fmtVal(kpiData.maxVal)}</p>
          </div>
        </div>

        {/* Chart A: Macro trend - Male vs Female */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Динамика по пол' : 'A. Trend by Sex'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Лица извън работната сила (общо по възраст) — мъже и жени' : 'Persons not in labour force (all ages) — Male vs Female'}
          </p>
          <GenderTrendChart allQuarters={allQuarters} getValue={getValue} locale={locale} />
        </div>

        {/* Chart B: Stacked bar by age groups */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Б. Демографска структура по възраст' : 'B. Age Group Composition'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Разпределение по възрастови групи с възможност за филтриране по пол' : 'Breakdown by age groups with sex filter toggle'}
          </p>
          <AgeStackedChart allQuarters={allQuarters} getValue={getValue} locale={locale} />
        </div>

        {/* Chart C: Donut - Current gender snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? `В. Разпределение по пол (${kpiData.latestQ})` : `C. Gender Split (${kpiData.latestQ})`}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Мъже и жени извън работната сила' : 'Male vs Female not in labour force'}
            </p>
            <GenderDonutChart latestQ={kpiData.latestQ} getValue={getValue} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? `Г. Разпределение по възраст (${kpiData.latestQ})` : `D. Age Split (${kpiData.latestQ})`}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Дял на всяка възрастова група' : 'Share of each age group'}
            </p>
            <AgeDonutChart latestQ={kpiData.latestQ} getValue={getValue} locale={locale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Gender Trend (Stacked Area) ─────────────────────────────────────────

function GenderTrendChart({ allQuarters, getValue, locale }: {
  allQuarters: string[];
  getValue: (q: string, age: string, gen: string) => number | null;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => ({
    male: allQuarters.map(q => getValue(q, '0', '1')),
    female: allQuarters.map(q => getValue(q, '0', '2')),
  }), [allQuarters, getValue]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const brushStart = Math.max(0, Math.round((1 - 40 / allQuarters.length) * 100));

    const maleLabel = isBg ? 'Мъже' : 'Male';
    const femaleLabel = isBg ? 'Жени' : 'Female';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          let total = 0;
          params.forEach((p: any) => { total += Number(p.value) || 0; });
          params.forEach((p: any) => {
            const val = Number(p.value) || 0;
            const pct = total > 0 ? (val / total * 100).toFixed(1) : '0';
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)} (${pct}%)</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)} ${isBg ? 'хил.' : 'K'}</div>`;
          return tip;
        },
      },
      legend: {
        data: [maleLabel, femaleLabel],
        bottom: 0, textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: brushStart, end: 100 },
        { type: 'slider', start: brushStart, end: 100, height: 18, bottom: 24, borderColor: '#cbd5e1' },
      ],
      xAxis: {
        type: 'category', boundaryGap: false, data: allQuarters,
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: string) => { const p = parseQuarter(v); return p.quarter === 1 ? String(p.year) : ''; } },
        axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false },
      },
      yAxis: {
        type: 'value', name: isBg ? 'хил.' : 'K',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [
        {
          name: maleLabel,
          type: 'line', stack: 'gender',
          areaStyle: { opacity: 0.55 },
          data: seriesData.male,
          itemStyle: { color: GENDER_COLORS.male },
          lineStyle: { width: 1.5 },
          smooth: true, symbol: 'none',
          emphasis: { focus: 'series' as const },
        },
        {
          name: femaleLabel,
          type: 'line', stack: 'gender',
          areaStyle: { opacity: 0.55 },
          data: seriesData.female,
          itemStyle: { color: GENDER_COLORS.female },
          lineStyle: { width: 1.5 },
          smooth: true, symbol: 'none',
          emphasis: { focus: 'series' as const },
        },
      ],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [allQuarters, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart B: Age Stacked Bar (with gender toggle) ────────────────────────────────

function AgeStackedChart({ allQuarters, getValue, locale }: {
  allQuarters: string[];
  getValue: (q: string, age: string, gen: string) => number | null;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [genderFilter, setGenderFilter] = useState<'0' | '1' | '2'>('0');

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const brushStart = Math.max(0, Math.round((1 - 40 / allQuarters.length) * 100));

    const series = DISCRETE_AGE_GROUPS.map(age => ({
      name: age === '65+' ? (isBg ? '65 и повече' : '65 and over') : age,
      type: 'bar' as const,
      stack: 'age',
      data: allQuarters.map(q => getValue(q, age, genderFilter)),
      itemStyle: { color: AGE_GROUP_COLORS[age] },
      emphasis: { focus: 'series' as const },
    }));

    const legendData = DISCRETE_AGE_GROUPS.map(age =>
      age === '65+' ? (isBg ? '65 и повече' : '65 and over') : age
    );

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          let total = 0;
          params.forEach((p: any) => { total += Number(p.value) || 0; });
          const sorted = [...params].sort((a: any, b: any) => (Number(b.value) || 0) - (Number(a.value) || 0));
          sorted.forEach((p: any) => {
            const val = Number(p.value) || 0;
            const pct = total > 0 ? (val / total * 100).toFixed(1) : '0';
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)} (${pct}%)</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)} ${isBg ? 'хил.' : 'K'}</div>`;
          return tip;
        },
      },
      legend: {
        data: legendData,
        bottom: 0, textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: brushStart, end: 100 },
        { type: 'slider', start: brushStart, end: 100, height: 18, bottom: 24, borderColor: '#cbd5e1' },
      ],
      xAxis: {
        type: 'category', data: allQuarters,
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: string) => { const p = parseQuarter(v); return p.quarter === 1 ? String(p.year) : ''; } },
        axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false },
      },
      yAxis: {
        type: 'value', name: isBg ? 'хил.' : 'K',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series,
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [allQuarters, getValue, genderFilter, isBg]);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {([['0', isBg ? 'Общо' : 'Total'], ['1', isBg ? 'Мъже' : 'Male'], ['2', isBg ? 'Жени' : 'Female']] as const).map(([code, label]) => (
          <button
            key={code}
            onClick={() => setGenderFilter(code as '0' | '1' | '2')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              genderFilter === code
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '420px' }} />
    </div>
  );
}

// ── Chart C: Gender Donut ────────────────────────────────────────────────────────

function GenderDonutChart({ latestQ, getValue, locale }: {
  latestQ: string;
  getValue: (q: string, age: string, gen: string) => number | null;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const maleVal = getValue(latestQ, '0', '1') ?? 0;
    const femaleVal = getValue(latestQ, '0', '2') ?? 0;
    const total = maleVal + femaleVal;

    const maleLabel = isBg ? 'Мъже' : 'Male';
    const femaleLabel = isBg ? 'Жени' : 'Female';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          const pct = total > 0 ? (params.value / total * 100).toFixed(1) : '0';
          return `<strong>${params.name}</strong><br/>${Number(params.value).toFixed(1)} ${isBg ? 'хил.' : 'K'} (${pct}%)`;
        },
      },
      legend: {
        bottom: 0, textStyle: { fontSize: 11, color: '#64748b' },
      },
      series: [{
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true, position: 'outside',
          formatter: (p: any) => `${p.name}\n${Number(p.value).toFixed(1)}${isBg ? ' хил.' : 'K'}`,
          fontSize: 11, color: '#475569',
        },
        data: [
          { value: maleVal, name: maleLabel, itemStyle: { color: GENDER_COLORS.male } },
          { value: femaleVal, name: femaleLabel, itemStyle: { color: GENDER_COLORS.female } },
        ],
      }],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [latestQ, getValue, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}

// ── Chart D: Age Donut ───────────────────────────────────────────────────────────

function AgeDonutChart({ latestQ, getValue, locale }: {
  latestQ: string;
  getValue: (q: string, age: string, gen: string) => number | null;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const ageData = DISCRETE_AGE_GROUPS.map(age => ({
      value: getValue(latestQ, age, '0') ?? 0,
      name: age === '65+' ? (isBg ? '65 и повече' : '65 and over') : age,
      itemStyle: { color: AGE_GROUP_COLORS[age] },
    }));

    const total = ageData.reduce((sum, d) => sum + d.value, 0);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          const pct = total > 0 ? (params.value / total * 100).toFixed(1) : '0';
          return `<strong>${params.name}</strong><br/>${Number(params.value).toFixed(1)} ${isBg ? 'хил.' : 'K'} (${pct}%)`;
        },
      },
      legend: {
        bottom: 0, textStyle: { fontSize: 11, color: '#64748b' },
      },
      series: [{
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true, position: 'outside',
          formatter: (p: any) => `${p.name}\n${Number(p.value).toFixed(1)}${isBg ? ' хил.' : 'K'}`,
          fontSize: 11, color: '#475569',
        },
        data: ageData,
      }],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [latestQ, getValue, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}
