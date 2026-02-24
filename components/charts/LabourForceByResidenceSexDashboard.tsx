'use client';

import React, { useEffect, useRef, useMemo } from 'react';
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

const COLORS = {
  total: '#334155',
  male: '#2563eb',
  female: '#e11d48',
  urban: '#059669',
  rural: '#d97706',
};

// ── Main ─────────────────────────────────────────────────────────────────────────

export function LabourForceByResidenceSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  // Build a lookup: quarter → residence_code → gender_code → value
  const lookup = useMemo(() => {
    const map: Record<string, Record<string, Record<string, number | null>>> = {};
    data.forEach(row => {
      const q = row.Year;
      const res = row.PlaceResidence_Code ?? row.Residence_Code;
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

    const maleVal = getValue(latestQ, '0', '1');
    const femaleVal = getValue(latestQ, '0', '2');
    const malePct = maleVal != null && totalVal != null && totalVal > 0
      ? (maleVal / totalVal * 100) : null;

    const urbanVal = getValue(latestQ, '1', '0');
    const urbanPct = urbanVal != null && totalVal != null && totalVal > 0
      ? (urbanVal / totalVal * 100) : null;

    return { latestQ, totalVal, yoyChange, malePct, urbanPct };
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
              {isBg ? `Работна сила (${kpiData.latestQ})` : `Labour Force (${kpiData.latestQ})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">{fmtVal(kpiData.totalVal)}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Промяна г/г' : 'YoY Growth'}
            </p>
            <p className={`text-3xl font-bold mt-2 ${kpiData.yoyChange != null ? (kpiData.yoyChange >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-300'}`}>
              {kpiData.yoyChange != null ? `${kpiData.yoyChange >= 0 ? '+' : ''}${kpiData.yoyChange.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'спрямо същото тримесечие' : 'vs same quarter prev. year'}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? '% Мъже' : '% Male'}
            </p>
            <p className="text-3xl font-bold mt-2 text-blue-700">
              {kpiData.malePct != null ? kpiData.malePct.toFixed(1) + '%' : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'от общата работна сила' : 'of total labour force'}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? '% Градски' : '% Urban'}
            </p>
            <p className="text-3xl font-bold mt-2 text-emerald-700">
              {kpiData.urbanPct != null ? kpiData.urbanPct.toFixed(1) + '%' : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'от общата работна сила' : 'of total labour force'}</p>
          </div>
        </div>

        {/* Chart A: Macro Trend - National total */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Обща тенденция на работната сила' : 'A. National Labour Force Trend'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Общо за страната (местоживеене = Общо, пол = Общо)' : 'Total for the country (Residence = Total, Sex = Total)'}
          </p>
          <MacroTrendChart allQuarters={allQuarters} getValue={getValue} locale={locale} />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Разпределение по пол' : 'B. Gender Distribution'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Мъже и жени в работната сила' : 'Male and female labour force over time'}
            </p>
            <GenderSplitChart allQuarters={allQuarters} getValue={getValue} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Градско / Селско местоживеене' : 'C. Urban vs Rural'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Динамика на урбанизацията' : 'Urbanization dynamics in the workforce'}
            </p>
            <GeographicShiftChart allQuarters={allQuarters} getValue={getValue} locale={locale} />
          </div>
        </div>

        {/* Chart D: Cross-sectional snapshot */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? `Г. Структура на работната сила (${kpiData.latestQ})` : `D. Labour Force Composition (${kpiData.latestQ})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Текущо разпределение по пол и местоживеене' : 'Current breakdown by sex and residence'}
          </p>
          <SnapshotChart latestQ={kpiData.latestQ} getValue={getValue} locale={locale} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Macro Trend (Line) ─────────────────────────────────────────────────

function MacroTrendChart({ allQuarters, getValue, locale }: {
  allQuarters: string[];
  getValue: (q: string, res: string, gen: string) => number | null;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() =>
    allQuarters.map(q => getValue(q, '0', '0')),
    [allQuarters, getValue]
  );

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const brushStart = Math.max(0, Math.round((1 - 40 / allQuarters.length) * 100));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `<div style="font-weight:600">${p.axisValue}</div>
            <div style="margin-top:4px">${p.marker} ${p.seriesName}: <strong>${p.value != null ? Number(p.value).toFixed(1) : 'N/A'}</strong> ${isBg ? 'хил.' : 'K'}</div>`;
        },
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
      series: [{
        name: isBg ? 'Работна сила' : 'Labour Force',
        type: 'line',
        data: seriesData,
        itemStyle: { color: COLORS.total },
        lineStyle: { width: 2.5 },
        areaStyle: { opacity: 0.08 },
        smooth: true,
        symbol: 'none',
        markLine: {
          silent: true,
          lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
          data: [{ type: 'average', name: isBg ? 'Средно' : 'Average' }],
          label: { fontSize: 10, color: '#94a3b8' },
        },
      }],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [allQuarters, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart B: Gender Split (Stacked Area) ────────────────────────────────────────

function GenderSplitChart({ allQuarters, getValue, locale }: {
  allQuarters: string[];
  getValue: (q: string, res: string, gen: string) => number | null;
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
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)}</div>`;
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
          itemStyle: { color: COLORS.male },
          lineStyle: { width: 1.5 },
          smooth: true, symbol: 'none',
          emphasis: { focus: 'series' as const },
        },
        {
          name: femaleLabel,
          type: 'line', stack: 'gender',
          areaStyle: { opacity: 0.55 },
          data: seriesData.female,
          itemStyle: { color: COLORS.female },
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

// ── Chart C: Geographic Shift (Multi-line) ──────────────────────────────────────

function GeographicShiftChart({ allQuarters, getValue, locale }: {
  allQuarters: string[];
  getValue: (q: string, res: string, gen: string) => number | null;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => ({
    urban: allQuarters.map(q => getValue(q, '1', '0')),
    rural: allQuarters.map(q => getValue(q, '2', '0')),
  }), [allQuarters, getValue]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const brushStart = Math.max(0, Math.round((1 - 40 / allQuarters.length) * 100));

    const urbanLabel = isBg ? 'Градско' : 'Urban';
    const ruralLabel = isBg ? 'Селско' : 'Rural';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${p.value != null ? Number(p.value).toFixed(1) : 'N/A'} ${isBg ? 'хил.' : 'K'}</span>
            </div>`;
          });
          if (params.length === 2 && params[0].value != null && params[1].value != null) {
            const uV = Number(params[0].value);
            const rV = Number(params[1].value);
            if (rV > 0) {
              tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-size:11px;color:#64748b">${isBg ? 'Съотношение град/село' : 'Urban/Rural ratio'}: ${(uV / rV).toFixed(1)}:1</div>`;
            }
          }
          return tip;
        },
      },
      legend: {
        data: [urbanLabel, ruralLabel],
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
          name: urbanLabel,
          type: 'line',
          data: seriesData.urban,
          itemStyle: { color: COLORS.urban },
          lineStyle: { width: 2.5 },
          smooth: true, symbol: 'none',
          areaStyle: { opacity: 0.12 },
        },
        {
          name: ruralLabel,
          type: 'line',
          data: seriesData.rural,
          itemStyle: { color: COLORS.rural },
          lineStyle: { width: 2.5, type: 'dashed' },
          smooth: true, symbol: 'none',
          areaStyle: { opacity: 0.12 },
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

// ── Chart D: Cross-Sectional Snapshot (Donut pair) ──────────────────────────────

function SnapshotChart({ latestQ, getValue, locale }: {
  latestQ: string;
  getValue: (q: string, res: string, gen: string) => number | null;
  locale: 'bg' | 'en';
}) {
  const genderRef = useRef<HTMLDivElement>(null);
  const residenceRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const snapData = useMemo(() => {
    const maleVal = getValue(latestQ, '0', '1') ?? 0;
    const femaleVal = getValue(latestQ, '0', '2') ?? 0;
    const urbanVal = getValue(latestQ, '1', '0') ?? 0;
    const ruralVal = getValue(latestQ, '2', '0') ?? 0;
    return { maleVal, femaleVal, urbanVal, ruralVal };
  }, [latestQ, getValue]);

  // Gender donut
  useEffect(() => {
    if (!genderRef.current) return;
    const chart = echarts.init(genderRef.current);

    const total = snapData.maleVal + snapData.femaleVal;
    const mLabel = isBg ? 'Мъже' : 'Male';
    const fLabel = isBg ? 'Жени' : 'Female';

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
          { value: snapData.maleVal, name: mLabel, itemStyle: { color: COLORS.male } },
          { value: snapData.femaleVal, name: fLabel, itemStyle: { color: COLORS.female } },
        ],
      }],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [snapData, isBg]);

  // Residence donut
  useEffect(() => {
    if (!residenceRef.current) return;
    const chart = echarts.init(residenceRef.current);

    const total = snapData.urbanVal + snapData.ruralVal;
    const uLabel = isBg ? 'Градско' : 'Urban';
    const rLabel = isBg ? 'Селско' : 'Rural';

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
          { value: snapData.urbanVal, name: uLabel, itemStyle: { color: COLORS.urban } },
          { value: snapData.ruralVal, name: rLabel, itemStyle: { color: COLORS.rural } },
        ],
      }],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [snapData, isBg]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-medium text-slate-500 text-center mb-1">
          {isBg ? 'По пол' : 'By Sex'}
        </p>
        <div ref={genderRef} style={{ width: '100%', height: '320px' }} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 text-center mb-1">
          {isBg ? 'По местоживеене' : 'By Residence'}
        </p>
        <div ref={residenceRef} style={{ width: '100%', height: '320px' }} />
      </div>
    </div>
  );
}
