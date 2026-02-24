'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPersons(row: any): number | null {
  const v = row.Persons;
  if (v == null || v === '' || v === 0) return null;
  return typeof v === 'number' && !isNaN(v) && v > 0 ? v : null;
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

// Reason codes (excluding 0=Total)
const REASON_CODES = ['1', '2', '3', '5', '6', '8'];
const REASON_EN: Record<string, string> = {
  '0': 'Total', '1': 'Redundancy', '2': 'Seasonal/temp ended',
  '3': 'Unsatisfied conditions', '5': 'Others', '6': 'Unknown/no work 8yr', '8': 'Family reasons',
};
const REASON_BG: Record<string, string> = {
  '0': 'Общо', '1': 'Съкращение', '2': 'Сезонна/временна работа',
  '3': 'Недоволство от условията', '5': 'Други', '6': 'Неизвестни/без работа 8г.', '8': 'Семейни причини',
};
const REASON_COLORS: Record<string, string> = {
  '1': '#ef4444', '2': '#f97316', '3': '#eab308', '5': '#94a3b8', '6': '#8b5cf6', '8': '#ec4899',
};

// Experience codes
const EXPR_EN: Record<string, string> = { '0': 'Total', '1': 'With experience', '2': 'First job seekers' };
const EXPR_BG: Record<string, string> = { '0': 'Общо', '1': 'С предишен опит', '2': 'Търсещи първа работа' };

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function UnemployedByExperienceDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const reasonLabels = isBg ? REASON_BG : REASON_EN;
  const exprLabels = isBg ? EXPR_BG : EXPR_EN;

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  const [selectedYear, setSelectedYear] = useState('');
  useMemo(() => {
    if (allQuarters.length > 0 && !selectedYear) {
      setSelectedYear(allQuarters[allQuarters.length - 1]);
    }
  }, [allQuarters, selectedYear]);

  // Find helper for 3 dimensions
  const findRow = (quarter: string, gender: string, reason: string, expr: string) =>
    data.find(d => d.Year === quarter && d.Gender_Code === gender
      && d.LFS_ReasLeaveJob_Code === reason && d.LFS_EmplExpr_Unempl_Code === expr);

  // KPI data
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const prevQ = allQuarters.length > 1 ? allQuarters[allQuarters.length - 2] : null;

    const totalVal = getPersons(findRow(latestQ, '0', '0', '0'));
    const prevTotal = prevQ ? getPersons(findRow(prevQ, '0', '0', '0')) : null;
    const qoqTotal = totalVal != null && prevTotal != null && prevTotal !== 0
      ? ((totalVal - prevTotal) / prevTotal * 100) : null;

    const withExpVal = getPersons(findRow(latestQ, '0', '0', '1'));
    const firstJobVal = getPersons(findRow(latestQ, '0', '0', '2'));

    return { latestQ, totalVal, qoqTotal, withExpVal, firstJobVal };
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
          {isBg ? 'Безработни по предишен трудов опит' : 'Unemployed by Previous Experience'}
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
            title={exprLabels['1']}
            value={kpiData.withExpVal}
            subtitle={kpiData.latestQ}
            accentColor="text-blue-600"
            locale={locale}
            badge={kpiData.totalVal != null && kpiData.withExpVal != null
              ? `${(kpiData.withExpVal / kpiData.totalVal * 100).toFixed(0)}%`
              : undefined}
          />
          <KpiCard
            title={exprLabels['2']}
            value={kpiData.firstJobVal}
            subtitle={kpiData.latestQ}
            accentColor="text-orange-600"
            locale={locale}
            badge={kpiData.totalVal != null && kpiData.firstJobVal != null
              ? `${(kpiData.firstJobVal / kpiData.totalVal * 100).toFixed(0)}%`
              : undefined}
          />
        </div>

        {/* Chart A: Gender Trends */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Тенденции по пол' : 'A. Unemployment Trends by Gender'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Общ брой безработни по тримесечия' : 'Total unemployed by quarter'}
          </p>
          <GenderTrendsChart data={data} allQuarters={allQuarters} locale={locale} />
        </div>

        {/* Charts B & C with shared quarter selector */}
        <div className="flex items-center justify-end mb-1">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white"
          >
            {allQuarters.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Причини за напускане' : 'B. Reasons for Leaving Job'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? `По пол за ${selectedYear}` : `By gender for ${selectedYear}`}
            </p>
            <ReasonsBarChart data={data} quarter={selectedYear} locale={locale} reasonLabels={reasonLabels} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Предишен опит' : 'C. Prior Experience'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? `Разпределение за ${selectedYear}` : `Distribution for ${selectedYear}`}
            </p>
            <ExperiencePieChart data={data} quarter={selectedYear} locale={locale} exprLabels={exprLabels} />
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
          <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{badge}</span>
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

// ── Chart A: Gender Trends Line Chart ───────────────────────────────────────────

function GenderTrendsChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const totalByQ: Record<string, number | null> = {};
    const maleByQ: Record<string, number | null> = {};
    const femaleByQ: Record<string, number | null> = {};

    data.forEach(row => {
      if (!row.Year || row.LFS_ReasLeaveJob_Code !== '0' || row.LFS_EmplExpr_Unempl_Code !== '0') return;
      const val = getPersons(row);
      if (row.Gender_Code === '0') totalByQ[row.Year] = val;
      else if (row.Gender_Code === '1') maleByQ[row.Year] = val;
      else if (row.Gender_Code === '2') femaleByQ[row.Year] = val;
    });

    return {
      total: allQuarters.map(q => totalByQ[q] ?? null),
      male: allQuarters.map(q => maleByQ[q] ?? null),
      female: allQuarters.map(q => femaleByQ[q] ?? null),
    };
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
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? formatFullValue(val) : '—'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Общо' : 'Total', isBg ? 'Мъже' : 'Male', isBg ? 'Жени' : 'Female'],
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
      series: [
        {
          name: isBg ? 'Общо' : 'Total',
          type: 'line', data: seriesData.total,
          itemStyle: { color: '#0f172a' }, lineStyle: { width: 2.5 },
          smooth: true, symbol: 'none', emphasis: { lineStyle: { width: 3.5 } },
        },
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'line', data: seriesData.male,
          itemStyle: { color: '#3b82f6' }, lineStyle: { width: 2 },
          smooth: true, symbol: 'none', emphasis: { lineStyle: { width: 3 } },
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'line', data: seriesData.female,
          itemStyle: { color: '#e11d48' }, lineStyle: { width: 2 },
          smooth: true, symbol: 'none', emphasis: { lineStyle: { width: 3 } },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart B: Reasons Horizontal Bar (by gender) ────────────────────────────────

function ReasonsBarChart({ data, quarter, locale, reasonLabels }: {
  data: any[];
  quarter: string;
  locale: 'bg' | 'en';
  reasonLabels: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const barData = useMemo(() => {
    if (!quarter) return [];
    const items: { code: string; label: string; male: number; female: number }[] = [];

    REASON_CODES.forEach(code => {
      const maleRow = data.find(d => d.Year === quarter && d.Gender_Code === '1'
        && d.LFS_ReasLeaveJob_Code === code && d.LFS_EmplExpr_Unempl_Code === '1');
      const femaleRow = data.find(d => d.Year === quarter && d.Gender_Code === '2'
        && d.LFS_ReasLeaveJob_Code === code && d.LFS_EmplExpr_Unempl_Code === '1');
      const maleVal = maleRow ? getPersons(maleRow) : null;
      const femaleVal = femaleRow ? getPersons(femaleRow) : null;

      if (maleVal != null || femaleVal != null) {
        items.push({
          code,
          label: reasonLabels[code] || code,
          male: maleVal ?? 0,
          female: femaleVal ?? 0,
        });
      }
    });

    return items.sort((a, b) => (b.male + b.female) - (a.male + a.female));
  }, [data, quarter, reasonLabels]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 11 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].name}</div>`;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : 0;
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${formatFullValue(val)}</span>
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
      grid: { left: '2%', right: '4%', bottom: '10%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: barData.map(d => d.label),
        axisLabel: { fontSize: 10, color: '#475569', width: 140, overflow: 'truncate' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'bar',
          stack: 'reason',
          data: barData.map(d => d.male),
          itemStyle: { color: '#3b82f6' },
          barWidth: '60%',
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'bar',
          stack: 'reason',
          data: barData.map(d => d.female),
          itemStyle: { color: '#e11d48' },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg]);

  const chartHeight = Math.max(300, barData.length * 45);
  return <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />;
}

// ── Chart C: Experience Pie/Donut Chart ─────────────────────────────────────────

function ExperiencePieChart({ data, quarter, locale, exprLabels }: {
  data: any[];
  quarter: string;
  locale: 'bg' | 'en';
  exprLabels: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const pieData = useMemo(() => {
    if (!quarter) return [];
    const items: { name: string; value: number; color: string }[] = [];

    const withExpRow = data.find(d => d.Year === quarter && d.Gender_Code === '0'
      && d.LFS_ReasLeaveJob_Code === '0' && d.LFS_EmplExpr_Unempl_Code === '1');
    const firstJobRow = data.find(d => d.Year === quarter && d.Gender_Code === '0'
      && d.LFS_ReasLeaveJob_Code === '0' && d.LFS_EmplExpr_Unempl_Code === '2');

    const withExpVal = withExpRow ? getPersons(withExpRow) : null;
    const firstJobVal = firstJobRow ? getPersons(firstJobRow) : null;

    if (withExpVal != null) items.push({ name: exprLabels['1'], value: withExpVal, color: '#3b82f6' });
    if (firstJobVal != null) items.push({ name: exprLabels['2'], value: firstJobVal, color: '#f97316' });

    return items;
  }, [data, quarter, exprLabels]);

  useEffect(() => {
    if (!chartRef.current || pieData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const total = pieData.reduce((s, d) => s + d.value, 0);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (p: any) => {
          return `<div style="font-weight:600;margin-bottom:2px">${p.name}</div>
            <div>${formatFullValue(p.value)} (${p.percent?.toFixed(1)}%)</div>`;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
        label: {
          show: true,
          formatter: (p: any) => `${p.percent?.toFixed(0)}%`,
          fontSize: 14,
          fontWeight: 'bold' as const,
          color: '#334155',
        },
        data: pieData.map(d => ({
          value: d.value,
          name: d.name,
          itemStyle: { color: d.color },
        })),
      }],
      graphic: [{
        type: 'text',
        left: 'center',
        top: '40%',
        style: {
          text: formatValue(total),
          fontSize: 20,
          fontWeight: 'bold',
          fill: '#0f172a',
          textAlign: 'center',
        },
      }, {
        type: 'text',
        left: 'center',
        top: '48%',
        style: {
          text: isBg ? 'Общо' : 'Total',
          fontSize: 11,
          fill: '#94a3b8',
          textAlign: 'center',
        },
      }],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [pieData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
