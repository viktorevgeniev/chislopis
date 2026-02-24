'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPersons(row: any): number | null {
  if (row.Persons == null || row.Persons === '' || row.Persons === '..' || row.Persons === 'null') return null;
  const v = typeof row.Persons === 'number' ? row.Persons : parseFloat(row.Persons);
  return isNaN(v) || v === 0 ? null : v;
}

function parseQuarter(q: string): { year: number; quarter: number } {
  const match = q.match(/^(\d{4})Q(\d)$/);
  if (!match) return { year: 0, quarter: 0 };
  return { year: parseInt(match[1]), quarter: parseInt(match[2]) };
}

function sortQuarters(a: string, b: string): number {
  const pa = parseQuarter(a);
  const pb = parseQuarter(b);
  return pa.year !== pb.year ? pa.year - pb.year : pa.quarter - pb.quarter;
}

function formatValue(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k';
}

function formatFullValue(v: number): string {
  const full = v * 1000;
  return full.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' persons';
}

// Duration codes and labels
const DURATION_CODES = ['1', '2', '3', '4'];
const DURATION_EN: Record<string, string> = {
  '0': 'Total', '1': 'Up to 5 months', '2': '6-11 months', '3': '12-23 months', '4': '2+ years',
};
const DURATION_BG: Record<string, string> = {
  '0': 'Общо', '1': 'До 5 месеца', '2': '6-11 месеца', '3': '12-23 месеца', '4': '2+ години',
};
const DURATION_COLORS: Record<string, string> = {
  '1': '#22c55e', // green – short term
  '2': '#eab308', // yellow – medium
  '3': '#f97316', // orange – long
  '4': '#ef4444', // red – very long
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function UnemployedByDurationSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const durLabels = isBg ? DURATION_BG : DURATION_EN;

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  const find = (quarter: string, gender: string, duration: string) =>
    data.find(d => d.Year === quarter && d.Gender_Code === gender && d.LFS_DuratUnempl_Code === duration);

  // KPI data
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const prevQ = allQuarters.length > 1 ? allQuarters[allQuarters.length - 2] : null;

    const totalVal = getPersons(find(latestQ, '0', '0'));
    const prevTotal = prevQ ? getPersons(find(prevQ, '0', '0')) : null;
    const qoqTotal = totalVal != null && prevTotal != null && prevTotal !== 0
      ? ((totalVal - prevTotal) / prevTotal * 100) : null;

    const longTermVal = getPersons(find(latestQ, '0', '4'));
    const longTermShare = totalVal != null && longTermVal != null && totalVal !== 0
      ? (longTermVal / totalVal * 100) : null;

    const shortTermVal = getPersons(find(latestQ, '0', '1'));

    return { latestQ, totalVal, qoqTotal, longTermVal, longTermShare, shortTermVal };
  }, [data, allQuarters]);

  if (!data || data.length === 0 || !kpiData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const firstYear = parseQuarter(allQuarters[0]).year;
  const lastYear = parseQuarter(allQuarters[allQuarters.length - 1]).year;

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg ? 'Безработни по продължителност и пол' : 'Unemployment by Duration & Sex'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: Хиляди лица`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: Thousands of Persons`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title={isBg ? 'Общо безработни' : 'Total Unemployed'}
            value={kpiData.totalVal}
            qoqChange={kpiData.qoqTotal}
            subtitle={kpiData.latestQ}
            accentColor="text-slate-900"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Дългосрочна (2+ г.)' : 'Long-term (2+ yrs)'}
            value={kpiData.longTermVal}
            subtitle={kpiData.latestQ}
            accentColor="text-red-600"
            locale={locale}
            badge={kpiData.longTermShare != null ? `${kpiData.longTermShare.toFixed(1)}% ${isBg ? 'от общо' : 'of total'}` : undefined}
          />
          <KpiCard
            title={isBg ? 'Краткосрочна (до 5 м.)' : 'Short-term (≤5 mo)'}
            value={kpiData.shortTermVal}
            subtitle={kpiData.latestQ}
            accentColor="text-emerald-600"
            locale={locale}
          />
        </div>

        {/* Chart A: Total Trends Line Chart */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Обща безработица' : 'A. Total Unemployment Trend'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Общ брой безработни по тримесечия' : 'Total unemployed persons quarterly'}
          </p>
          <TotalTrendChart data={data} allQuarters={allQuarters} locale={locale} />
        </div>

        {/* Charts B & C */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Структура по продължителност' : 'B. Duration Composition'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Разпределение по категории продължителност' : 'Breakdown by duration category over time'}
            </p>
            <DurationCompositionChart data={data} allQuarters={allQuarters} locale={locale} durLabels={durLabels} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Дългосрочна безработица по пол' : 'C. Long-term Unemployment by Gender'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? '2+ години безработица — последни 8 тримесечия' : '2+ years unemployed — last 8 quarters'}
            </p>
            <LongTermGenderChart data={data} allQuarters={allQuarters} locale={locale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ title, value, qoqChange, subtitle, accentColor, locale, badge }: {
  title: string;
  value: number | null;
  qoqChange?: number | null;
  subtitle: string;
  accentColor: string;
  locale?: 'bg' | 'en';
  badge?: string;
}) {
  const isBg = locale === 'bg';
  return (
    <div className="bg-white shadow-sm rounded-xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</p>
        {badge && (
          <span className="text-[10px] font-semibold bg-red-50 text-red-500 px-2 py-0.5 rounded-full">{badge}</span>
        )}
      </div>
      <p className={`text-3xl font-bold mt-2 ${accentColor}`}>{formatValue(value)}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs text-slate-400">{subtitle}</p>
        {qoqChange != null && (
          <span className={`text-xs font-semibold ${qoqChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {qoqChange <= 0 ? '▼' : '▲'} {Math.abs(qoqChange).toFixed(1)}% {isBg ? 'кв/кв' : 'QoQ'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Chart A: Total Trend Line Chart ─────────────────────────────────────────────

function TotalTrendChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const totalByQ: Record<string, number | null> = {};
    data.forEach(row => {
      if (!row.Year || row.Gender_Code !== '0' || row.LFS_DuratUnempl_Code !== '0') return;
      totalByQ[row.Year] = getPersons(row);
    });
    return allQuarters.map(q => totalByQ[q] ?? null);
  }, [data, allQuarters]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const brushStart = Math.max(0, Math.round((1 - 32 / allQuarters.length) * 100));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const val = p.value != null ? Number(p.value) : null;
          return `<div style="font-weight:600;margin-bottom:2px;color:#0f172a">${p.axisValue}</div>
            <div style="font-weight:600;color:#2563eb">${val != null ? formatFullValue(val) : '—'}</div>`;
        },
      },
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: brushStart, end: 100 },
        { type: 'slider', start: brushStart, end: 100, height: 18, bottom: 24, borderColor: '#cbd5e1', fillerColor: 'rgba(148,163,184,0.15)' },
      ],
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allQuarters,
        axisLabel: {
          fontSize: 10, color: '#94a3b8',
          formatter: (v: string) => { const p = parseQuarter(v); return p.quarter === 1 ? String(p.year) : ''; },
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил. души' : 'Thousands',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        type: 'line',
        data: seriesData,
        itemStyle: { color: '#2563eb' },
        lineStyle: { width: 2.5 },
        areaStyle: { color: 'rgba(37,99,235,0.08)' },
        smooth: true,
        symbol: 'circle',
        symbolSize: 3,
        showSymbol: false,
        emphasis: { lineStyle: { width: 3.5 }, itemStyle: { borderWidth: 2 }, scale: true },
      }],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart B: Duration Composition Stacked Area ──────────────────────────────────

function DurationCompositionChart({ data, allQuarters, locale, durLabels }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  durLabels: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const byDur: Record<string, Record<string, number | null>> = {};
    DURATION_CODES.forEach(c => { byDur[c] = {}; });

    data.forEach(row => {
      if (!row.Year || row.Gender_Code !== '0') return;
      const durCode = row.LFS_DuratUnempl_Code;
      if (DURATION_CODES.includes(durCode)) {
        byDur[durCode][row.Year] = getPersons(row);
      }
    });

    return Object.fromEntries(
      DURATION_CODES.map(c => [c, allQuarters.map(q => byDur[c][q] ?? null)])
    );
  }, [data, allQuarters]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const brushStart = Math.max(0, Math.round((1 - 32 / allQuarters.length) * 100));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 11 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          let total = 0;
          params.forEach((p: any) => { total += p.value != null ? Number(p.value) : 0; });
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : 0;
            const pct = total > 0 ? (val / total * 100).toFixed(0) : '—';
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)}k (${pct}%)</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)}k</div>`;
          return tip;
        },
      },
      legend: {
        data: DURATION_CODES.map(c => durLabels[c]),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: brushStart, end: 100 },
        { type: 'slider', start: brushStart, end: 100, height: 18, bottom: 24, borderColor: '#cbd5e1', fillerColor: 'rgba(148,163,184,0.15)' },
      ],
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allQuarters,
        axisLabel: {
          fontSize: 10, color: '#94a3b8',
          formatter: (v: string) => { const p = parseQuarter(v); return p.quarter === 1 ? String(p.year) : ''; },
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил. души' : 'Thousands',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: DURATION_CODES.map(code => ({
        name: durLabels[code],
        type: 'line' as const,
        stack: 'duration',
        areaStyle: { opacity: 0.45 },
        data: seriesData[code],
        itemStyle: { color: DURATION_COLORS[code] },
        lineStyle: { width: 1.5 },
        smooth: true,
        symbol: 'none' as const,
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, seriesData, isBg, durLabels]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart C: Long-Term by Gender (Grouped Bar, Last 8 Quarters) ─────────────────

function LongTermGenderChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const last8 = useMemo(() => allQuarters.slice(-8), [allQuarters]);

  const seriesData = useMemo(() => {
    const maleByQ: Record<string, number | null> = {};
    const femaleByQ: Record<string, number | null> = {};

    data.forEach(row => {
      if (!row.Year || row.LFS_DuratUnempl_Code !== '4') return;
      const val = getPersons(row);
      if (row.Gender_Code === '1') maleByQ[row.Year] = val;
      else if (row.Gender_Code === '2') femaleByQ[row.Year] = val;
    });

    return {
      male: last8.map(q => maleByQ[q] ?? null),
      female: last8.map(q => femaleByQ[q] ?? null),
    };
  }, [data, last8]);

  useEffect(() => {
    if (!chartRef.current || last8.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? formatFullValue(val) : '—'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Мъже' : 'Male', isBg ? 'Жени' : 'Female'],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: last8,
        axisLabel: { fontSize: 10, color: '#64748b' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил. души' : 'Thousands',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'bar',
          data: seriesData.male,
          itemStyle: { color: '#64748b', borderRadius: [4, 4, 0, 0] },
          barGap: '20%',
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'bar',
          data: seriesData.female,
          itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [last8, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
