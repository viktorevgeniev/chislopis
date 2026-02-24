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

// ── Education level codes (from codelists) ──────────────────────────────────────

// Codes: 0=Total, 1=Higher, 2=Upper secondary, 2_1=Secondary vocational,
//        2_2=Secondary general, 3=Lower secondary, 4=Primary or lower
const EDU_CODES_MAIN = ['1', '2', '3', '4'];  // exclude Total and sub-categories
const EDU_CODES_ALL = ['1', '2', '2_1', '2_2', '3', '4'];

const EDU_LABELS_EN: Record<string, string> = {
  '0': 'Total',
  '1': 'Higher',
  '2': 'Upper secondary',
  '2_1': 'Secondary vocational',
  '2_2': 'Secondary general',
  '3': 'Lower secondary',
  '4': 'Primary or lower',
};

const EDU_LABELS_BG: Record<string, string> = {
  '0': 'Общо',
  '1': 'Висше',
  '2': 'Средно',
  '2_1': 'Средно професионално',
  '2_2': 'Средно общо',
  '3': 'Основно',
  '4': 'Начално и по-ниско',
};

const EDU_COLORS: Record<string, string> = {
  '1': '#2563eb',    // blue — Higher
  '2': '#059669',    // emerald — Upper secondary
  '2_1': '#10b981',  // lighter emerald — Sec vocational
  '2_2': '#6ee7b7',  // very light emerald — Sec general
  '3': '#d97706',    // amber — Lower secondary
  '4': '#e11d48',    // rose — Primary or lower
};

// Age group codes
const AGE_CODES = { total: '0', working: '15 - 64_gr' };

// ── Main ─────────────────────────────────────────────────────────────────────────

export function NotInLFByEducationDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const [ageGroup, setAgeGroup] = useState<'0' | '15 - 64_gr'>('0');

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  // Build lookup: quarter → edu_code → age_code → value
  const lookup = useMemo(() => {
    const map: Record<string, Record<string, Record<string, number | null>>> = {};
    data.forEach(row => {
      const q = row.Year;
      const edu = row.LFS_EDUlevel_Code;
      const age = row.Age10_LFS_Code;
      if (!q || edu == null || age == null) return;
      if (!map[q]) map[q] = {};
      if (!map[q][edu]) map[q][edu] = {};
      map[q][edu][age] = getVal(row);
    });
    return map;
  }, [data]);

  const getValue = (q: string, edu: string, age: string): number | null => {
    return lookup[q]?.[edu]?.[age] ?? null;
  };

  // KPI data
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const latestP = parseQuarter(latestQ);
    const yoyQ = `${latestP.year - 1}Q${latestP.quarter}`;

    const totalVal = getValue(latestQ, '0', ageGroup);
    const prevVal = allQuarters.includes(yoyQ) ? getValue(yoyQ, '0', ageGroup) : null;
    const yoyChange = totalVal != null && prevVal != null && prevVal > 0
      ? ((totalVal - prevVal) / prevVal * 100) : null;

    // Find largest education group for current age filter
    let maxEdu = '';
    let maxVal = -1;
    EDU_CODES_MAIN.forEach(edu => {
      const v = getValue(latestQ, edu, ageGroup);
      if (v != null && v > maxVal) { maxVal = v; maxEdu = edu; }
    });

    // Higher education share
    const higherVal = getValue(latestQ, '1', ageGroup);
    const higherPct = higherVal != null && totalVal != null && totalVal > 0
      ? (higherVal / totalVal * 100) : null;

    return { latestQ, totalVal, yoyChange, maxEdu, maxVal, higherPct };
  }, [allQuarters, lookup, ageGroup]);

  if (!data || data.length === 0 || !kpiData) {
    return <div className="text-center py-8 text-muted-foreground">{isBg ? 'Няма данни' : 'No data available'}</div>;
  }

  const eduLabels = isBg ? EDU_LABELS_BG : EDU_LABELS_EN;
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
        {/* Age Group Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {isBg ? 'Възрастова група:' : 'Age Group:'}
          </span>
          <div className="flex gap-2">
            {([
              ['0', isBg ? 'Общо (всички)' : 'Total (all ages)'],
              ['15 - 64_gr', isBg ? '15–64 години' : '15–64 years'],
            ] as const).map(([code, label]) => (
              <button
                key={code}
                onClick={() => setAgeGroup(code as '0' | '15 - 64_gr')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  ageGroup === code
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

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
              {isBg ? '% с висше обр.' : '% Higher Edu'}
            </p>
            <p className="text-3xl font-bold mt-2 text-blue-600">
              {kpiData.higherPct != null ? kpiData.higherPct.toFixed(1) + '%' : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'от общия брой' : 'of total not in LF'}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-голяма група' : 'Largest Edu Group'}
            </p>
            <p className="text-2xl font-bold mt-2 text-violet-700">
              {kpiData.maxEdu ? eduLabels[kpiData.maxEdu] : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{fmtVal(kpiData.maxVal)}</p>
          </div>
        </div>

        {/* Chart A: Multi-line trend by education level */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Динамика по степен на образование' : 'A. Trend by Education Level'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Лица извън работната сила по образование (без „Общо")' : 'Persons not in labour force by education (excl. Total)'}
          </p>
          <EducationTrendChart
            allQuarters={allQuarters}
            getValue={getValue}
            ageGroup={ageGroup}
            locale={locale}
          />
        </div>

        {/* Chart B: Horizontal bar — latest quarter snapshot */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? `Б. Моментна снимка (${kpiData.latestQ})` : `B. Snapshot (${kpiData.latestQ})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Разпределение по образование за последното тримесечие' : 'Education breakdown for the latest quarter, sorted by volume'}
          </p>
          <EducationBarChart
            latestQ={kpiData.latestQ}
            getValue={getValue}
            ageGroup={ageGroup}
            locale={locale}
          />
        </div>

        {/* Chart C: Stacked area — composition over time (with sub-categories) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'В. Структура по образование (подробно)' : 'C. Education Composition (detailed)'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Включва средно професионално и средно общо' : 'Includes secondary vocational and secondary general'}
          </p>
          <EducationStackedChart
            allQuarters={allQuarters}
            getValue={getValue}
            ageGroup={ageGroup}
            locale={locale}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Multi-line trend by education level ────────────────────────────────

function EducationTrendChart({ allQuarters, getValue, ageGroup, locale }: {
  allQuarters: string[];
  getValue: (q: string, edu: string, age: string) => number | null;
  ageGroup: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const eduLabels = isBg ? EDU_LABELS_BG : EDU_LABELS_EN;

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const brushStart = Math.max(0, Math.round((1 - 40 / allQuarters.length) * 100));

    const series = EDU_CODES_MAIN.map(code => ({
      name: eduLabels[code],
      type: 'line' as const,
      data: allQuarters.map(q => getValue(q, code, ageGroup)),
      itemStyle: { color: EDU_COLORS[code] },
      lineStyle: { width: 2 },
      smooth: true,
      symbol: 'none',
      emphasis: { focus: 'series' as const },
    }));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          const sorted = [...params].sort((a: any, b: any) => (Number(b.value) || 0) - (Number(a.value) || 0));
          sorted.forEach((p: any) => {
            const val = Number(p.value) || 0;
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)} ${isBg ? 'хил.' : 'K'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: EDU_CODES_MAIN.map(c => eduLabels[c]),
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
      series,
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [allQuarters, getValue, ageGroup, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ── Chart B: Horizontal bar — latest quarter snapshot ───────────────────────────

function EducationBarChart({ latestQ, getValue, ageGroup, locale }: {
  latestQ: string;
  getValue: (q: string, edu: string, age: string) => number | null;
  ageGroup: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const eduLabels = isBg ? EDU_LABELS_BG : EDU_LABELS_EN;

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    // Build data sorted by value descending
    const barData = EDU_CODES_ALL.map(code => ({
      code,
      name: eduLabels[code],
      value: getValue(latestQ, code, ageGroup) ?? 0,
      color: EDU_COLORS[code],
    })).sort((a, b) => a.value - b.value); // ascending for horizontal bar (bottom = smallest)

    const total = barData.reduce((s, d) => s + d.value, 0);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const pct = total > 0 ? (p.value / total * 100).toFixed(1) : '0';
          return `<strong>${p.name}</strong><br/>${Number(p.value).toFixed(1)} ${isBg ? 'хил.' : 'K'} (${pct}%)`;
        },
      },
      grid: { left: '2%', right: '10%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value', name: isBg ? 'хил. лица' : 'Thousand persons',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: barData.map(d => d.name),
        axisLabel: { fontSize: 11, color: '#475569', width: 160, overflow: 'truncate' },
        axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: barData.map(d => ({
          value: d.value,
          itemStyle: { color: d.color, borderRadius: [0, 4, 4, 0] },
        })),
        barWidth: '60%',
        label: {
          show: true, position: 'right',
          formatter: (p: any) => {
            const pct = total > 0 ? (p.value / total * 100).toFixed(1) : '0';
            return `${Number(p.value).toFixed(1)} (${pct}%)`;
          },
          fontSize: 11, color: '#475569',
        },
      }],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [latestQ, getValue, ageGroup, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}

// ── Chart C: Stacked area (detailed with sub-categories) ────────────────────────

function EducationStackedChart({ allQuarters, getValue, ageGroup, locale }: {
  allQuarters: string[];
  getValue: (q: string, edu: string, age: string) => number | null;
  ageGroup: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const eduLabels = isBg ? EDU_LABELS_BG : EDU_LABELS_EN;

  // Use non-overlapping categories: Higher, Sec vocational, Sec general, Lower sec, Primary or lower
  const stackCodes = ['1', '2_1', '2_2', '3', '4'];

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const brushStart = Math.max(0, Math.round((1 - 40 / allQuarters.length) * 100));

    const series = stackCodes.map(code => ({
      name: eduLabels[code],
      type: 'line' as const,
      stack: 'edu',
      areaStyle: { opacity: 0.6 },
      data: allQuarters.map(q => getValue(q, code, ageGroup)),
      itemStyle: { color: EDU_COLORS[code] },
      lineStyle: { width: 1.5 },
      smooth: true,
      symbol: 'none',
      emphasis: { focus: 'series' as const },
    }));

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
        data: stackCodes.map(c => eduLabels[c]),
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
      series,
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [allQuarters, getValue, ageGroup, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}
