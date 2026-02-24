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

// ── Types & Constants ────────────────────────────────────────────────────────────

interface DashboardProps { data: any[]; dataset: Dataset; locale?: 'bg' | 'en'; }

const COLORS = {
  total: '#334155',
  male: '#2563eb',
  female: '#e11d48',
  urban: '#059669',
  rural: '#d97706',
};

// ── Main ─────────────────────────────────────────────────────────────────────────

export function DiscouragedByResidenceSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  // Build lookup: quarter → residence_code → gender_code → value
  const lookup = useMemo(() => {
    const map: Record<string, Record<string, Record<string, number | null>>> = {};
    data.forEach(row => {
      const q = row.Year;
      const res = row.Residence_Code;
      const gen = row.Gender_Code;
      if (!q || res == null || gen == null) return;
      if (!map[q]) map[q] = {};
      if (!map[q][res]) map[q][res] = {};
      map[q][res][gen] = getVal(row);
    });
    return map;
  }, [data]);

  const getValue = (q: string, res: string, gen: string): number | null => {
    return lookup[q]?.[res]?.[gen] ?? null;
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

    const urbanVal = getValue(latestQ, '1', '0');
    const ruralVal = getValue(latestQ, '2', '0');
    const ruralPct = ruralVal != null && totalVal != null && totalVal > 0
      ? (ruralVal / totalVal * 100) : null;

    const femaleVal = getValue(latestQ, '0', '2');
    const femalePct = femaleVal != null && totalVal != null && totalVal > 0
      ? (femaleVal / totalVal * 100) : null;

    return { latestQ, totalVal, yoyChange, urbanVal, ruralVal, ruralPct, femalePct };
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
              {isBg ? `Обезкуражени (${kpiData.latestQ})` : `Discouraged (${kpiData.latestQ})`}
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
              {isBg ? '% Селско нас.' : '% Rural'}
            </p>
            <p className="text-3xl font-bold mt-2 text-amber-600">
              {kpiData.ruralPct != null ? kpiData.ruralPct.toFixed(1) + '%' : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'от обезкуражените' : 'of total discouraged'}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? '% Жени' : '% Female'}
            </p>
            <p className="text-3xl font-bold mt-2 text-rose-600">
              {kpiData.femalePct != null ? kpiData.femalePct.toFixed(1) + '%' : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'от обезкуражените' : 'of total discouraged'}</p>
          </div>
        </div>

        {/* Chart A: Time-series line chart with toggles */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Динамика във времето' : 'A. Trend Over Time'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Общ тренд с възможност за разбивка по пол или местоживеене' : 'Total trend with split by Sex or Place of Residence'}
          </p>
          <TrendLineChart allQuarters={allQuarters} getValue={getValue} locale={locale} />
        </div>

        {/* Chart B: Stacked area — gender composition over time */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Б. Структура по пол във времето' : 'B. Gender Composition Over Time'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Как се развива разликата между половете при обезкуражените' : 'How the gender gap in discouraged workers has evolved'}
          </p>
          <GenderAreaChart allQuarters={allQuarters} getValue={getValue} locale={locale} />
        </div>

        {/* Chart C: Stacked bar — recent quarters by residence */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? `В. По местоживеене (последни тримесечия)` : `C. By Residence (Recent Quarters)`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Градско срещу селско население' : 'Urban vs Rural composition'}
          </p>
          <ResidenceBarChart allQuarters={allQuarters} getValue={getValue} locale={locale} />
        </div>

        {/* Chart D: Grouped bar — latest quarter snapshot */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? `Г. Демографска снимка (${kpiData.latestQ})` : `D. Demographic Snapshot (${kpiData.latestQ})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Мъже и жени по градско/селско население' : 'Male vs Female grouped by Urban vs Rural'}
          </p>
          <GroupedBarChart latestQ={kpiData.latestQ} getValue={getValue} locale={locale} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Time-series line with toggles ──────────────────────────────────────

function TrendLineChart({ allQuarters, getValue, locale }: {
  allQuarters: string[];
  getValue: (q: string, res: string, gen: string) => number | null;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [splitBy, setSplitBy] = useState<'none' | 'sex' | 'residence'>('none');

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const brushStart = Math.max(0, Math.round((1 - 40 / allQuarters.length) * 100));

    let series: any[] = [];
    let legendData: string[] = [];

    const totalLabel = isBg ? 'Общо' : 'Total';
    const maleLabel = isBg ? 'Мъже' : 'Male';
    const femaleLabel = isBg ? 'Жени' : 'Female';
    const urbanLabel = isBg ? 'Градско' : 'Urban';
    const ruralLabel = isBg ? 'Селско' : 'Rural';

    if (splitBy === 'none') {
      legendData = [totalLabel];
      series = [{
        name: totalLabel, type: 'line',
        data: allQuarters.map(q => getValue(q, '0', '0')),
        itemStyle: { color: COLORS.total }, lineStyle: { width: 2.5 },
        smooth: true, symbol: 'none',
      }];
    } else if (splitBy === 'sex') {
      legendData = [maleLabel, femaleLabel];
      series = [
        { name: maleLabel, type: 'line', data: allQuarters.map(q => getValue(q, '0', '1')), itemStyle: { color: COLORS.male }, lineStyle: { width: 2 }, smooth: true, symbol: 'none', emphasis: { focus: 'series' as const } },
        { name: femaleLabel, type: 'line', data: allQuarters.map(q => getValue(q, '0', '2')), itemStyle: { color: COLORS.female }, lineStyle: { width: 2 }, smooth: true, symbol: 'none', emphasis: { focus: 'series' as const } },
      ];
    } else {
      legendData = [urbanLabel, ruralLabel];
      series = [
        { name: urbanLabel, type: 'line', data: allQuarters.map(q => getValue(q, '1', '0')), itemStyle: { color: COLORS.urban }, lineStyle: { width: 2 }, smooth: true, symbol: 'none', emphasis: { focus: 'series' as const } },
        { name: ruralLabel, type: 'line', data: allQuarters.map(q => getValue(q, '2', '0')), itemStyle: { color: COLORS.rural }, lineStyle: { width: 2 }, smooth: true, symbol: 'none', emphasis: { focus: 'series' as const } },
      ];
    }

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const val = Number(p.value) || 0;
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)} ${isBg ? 'хил. души' : 'thousand persons'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: { data: legendData, bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
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
        type: 'value', name: isBg ? 'хил. души' : 'Thousand persons',
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
  }, [allQuarters, getValue, splitBy, isBg]);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {([
          ['none', isBg ? 'Общо' : 'Total'],
          ['sex', isBg ? 'По пол' : 'By Sex'],
          ['residence', isBg ? 'По местоживеене' : 'By Residence'],
        ] as const).map(([code, label]) => (
          <button
            key={code}
            onClick={() => setSplitBy(code as 'none' | 'sex' | 'residence')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              splitBy === code
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
    </div>
  );
}

// ── Chart B: Gender Area Chart ───────────────────────────────────────────────────

function GenderAreaChart({ allQuarters, getValue, locale }: {
  allQuarters: string[];
  getValue: (q: string, res: string, gen: string) => number | null;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

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
              <span style="font-weight:600">${val.toFixed(1)} ${isBg ? 'хил. души' : 'thous. persons'} (${pct}%)</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)} ${isBg ? 'хил.' : 'K'}</div>`;
          return tip;
        },
      },
      legend: { data: [maleLabel, femaleLabel], bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
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
        type: 'value', name: isBg ? 'хил. души' : 'Thousand persons',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [
        {
          name: maleLabel, type: 'line', stack: 'total', areaStyle: { opacity: 0.55 },
          data: allQuarters.map(q => getValue(q, '0', '1')),
          itemStyle: { color: COLORS.male }, lineStyle: { width: 1.5 }, smooth: true, symbol: 'none',
          emphasis: { focus: 'series' as const },
        },
        {
          name: femaleLabel, type: 'line', stack: 'total', areaStyle: { opacity: 0.55 },
          data: allQuarters.map(q => getValue(q, '0', '2')),
          itemStyle: { color: COLORS.female }, lineStyle: { width: 1.5 }, smooth: true, symbol: 'none',
          emphasis: { focus: 'series' as const },
        },
      ],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [allQuarters, getValue, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ── Chart C: Residence Stacked Bar — Recent Quarters ─────────────────────────────

function ResidenceBarChart({ allQuarters, getValue, locale }: {
  allQuarters: string[];
  getValue: (q: string, res: string, gen: string) => number | null;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const recentQuarters = allQuarters.slice(-8);
    const urbanLabel = isBg ? 'Градско' : 'Urban';
    const ruralLabel = isBg ? 'Селско' : 'Rural';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
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
              <span style="font-weight:600">${val.toFixed(1)} ${isBg ? 'хил. души' : 'thous. pers.'} (${pct}%)</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)} ${isBg ? 'хил.' : 'K'}</div>`;
          return tip;
        },
      },
      legend: { data: [urbanLabel, ruralLabel], bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      grid: { left: '1%', right: '3%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: recentQuarters,
        axisLabel: { fontSize: 11, color: '#64748b' },
        axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false },
      },
      yAxis: {
        type: 'value', name: isBg ? 'хил. души' : 'Thousand persons',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [
        {
          name: urbanLabel, type: 'bar', stack: 'total',
          data: recentQuarters.map(q => getValue(q, '1', '0')),
          itemStyle: { color: COLORS.urban, borderRadius: [0, 0, 0, 0] },
          label: {
            show: true, position: 'inside', fontSize: 10, color: '#fff',
            formatter: (p: any) => { const v = Number(p.value); return v > 0 ? v.toFixed(1) : ''; },
          },
        },
        {
          name: ruralLabel, type: 'bar', stack: 'total',
          data: recentQuarters.map(q => getValue(q, '2', '0')),
          itemStyle: { color: COLORS.rural, borderRadius: [4, 4, 0, 0] },
          label: {
            show: true, position: 'inside', fontSize: 10, color: '#fff',
            formatter: (p: any) => { const v = Number(p.value); return v > 0 ? v.toFixed(1) : ''; },
          },
        },
      ],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [allQuarters, getValue, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '350px' }} />;
}

// ── Chart D: Grouped Bar — Latest Quarter ───────────────────────────────────────

function GroupedBarChart({ latestQ, getValue, locale }: {
  latestQ: string;
  getValue: (q: string, res: string, gen: string) => number | null;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const maleLabel = isBg ? 'Мъже' : 'Male';
    const femaleLabel = isBg ? 'Жени' : 'Female';
    const urbanLabel = isBg ? 'Градско' : 'Urban';
    const ruralLabel = isBg ? 'Селско' : 'Rural';

    const urbanMale = getValue(latestQ, '1', '1') ?? 0;
    const urbanFemale = getValue(latestQ, '1', '2') ?? 0;
    const ruralMale = getValue(latestQ, '2', '1') ?? 0;
    const ruralFemale = getValue(latestQ, '2', '2') ?? 0;
    const grandTotal = urbanMale + urbanFemale + ruralMale + ruralFemale;

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          let groupTotal = 0;
          params.forEach((p: any) => { groupTotal += Number(p.value) || 0; });
          params.forEach((p: any) => {
            const val = Number(p.value) || 0;
            const pctGroup = groupTotal > 0 ? (val / groupTotal * 100).toFixed(1) : '0';
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)} ${isBg ? 'хил. души' : 'thous. pers.'} (${pctGroup}%)</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Подгрупа' : 'Subtotal'}: ${groupTotal.toFixed(1)} ${isBg ? 'хил.' : 'K'}</div>`;
          return tip;
        },
      },
      legend: {
        data: [maleLabel, femaleLabel],
        bottom: 0, textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '2%', right: '6%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: [urbanLabel, ruralLabel],
        axisLabel: { fontSize: 12, color: '#475569', fontWeight: 'bold' as const },
        axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false },
      },
      yAxis: {
        type: 'value', name: isBg ? 'хил. души' : 'Thousand persons',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [
        {
          name: maleLabel, type: 'bar',
          data: [urbanMale, ruralMale],
          itemStyle: { color: COLORS.male, borderRadius: [4, 4, 0, 0] },
          barGap: '20%',
          label: {
            show: true, position: 'top',
            formatter: (p: any) => Number(p.value).toFixed(1),
            fontSize: 11, color: '#475569',
          },
        },
        {
          name: femaleLabel, type: 'bar',
          data: [urbanFemale, ruralFemale],
          itemStyle: { color: COLORS.female, borderRadius: [4, 4, 0, 0] },
          label: {
            show: true, position: 'top',
            formatter: (p: any) => Number(p.value).toFixed(1),
            fontSize: 11, color: '#475569',
          },
        },
      ],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [latestQ, getValue, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '350px' }} />;
}
