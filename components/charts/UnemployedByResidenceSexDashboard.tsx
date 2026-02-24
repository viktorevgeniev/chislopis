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

function getGenderLabel(code: string, locale: 'bg' | 'en'): string {
  if (code === '0') return locale === 'bg' ? 'Общо' : 'Total';
  if (code === '1') return locale === 'bg' ? 'Мъже' : 'Male';
  if (code === '2') return locale === 'bg' ? 'Жени' : 'Female';
  return code;
}

function getResidenceLabel(code: string, locale: 'bg' | 'en'): string {
  if (code === '0') return locale === 'bg' ? 'Общо' : 'Total';
  if (code === '1') return locale === 'bg' ? 'Град' : 'Urban';
  if (code === '2') return locale === 'bg' ? 'Село' : 'Rural';
  return code;
}

// Colors
const GENDER_COLORS: Record<string, string> = { '0': '#0f172a', '1': '#3b82f6', '2': '#e11d48' };
const RESIDENCE_COLORS: Record<string, string> = { '0': '#0f172a', '1': '#3b82f6', '2': '#f59e0b' };

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function UnemployedByResidenceSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const [metric, setMetric] = useState<'absolute' | 'yoy'>('absolute');

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  const find = (quarter: string, gender: string, residence: string) =>
    data.find(d => d.Year === quarter && d.Gender_Code === gender && d.Residence_Code === residence);

  // KPI data
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const { year, quarter } = parseQuarter(latestQ);
    const prevQ = allQuarters.length > 1 ? allQuarters[allQuarters.length - 2] : null;
    const yoyQ = `${year - 1}Q${quarter}`;

    const totalVal = getPersons(find(latestQ, '0', '0'));
    const maleVal = getPersons(find(latestQ, '1', '0'));
    const femaleVal = getPersons(find(latestQ, '2', '0'));
    const urbanVal = getPersons(find(latestQ, '0', '1'));
    const ruralVal = getPersons(find(latestQ, '0', '2'));

    // QoQ
    const prevTotal = prevQ ? getPersons(find(prevQ, '0', '0')) : null;
    const qoqTotal = totalVal != null && prevTotal != null && prevTotal !== 0
      ? ((totalVal - prevTotal) / prevTotal * 100) : null;

    // YoY
    const yoyTotal_prev = getPersons(find(yoyQ, '0', '0'));
    const yoyTotal = totalVal != null && yoyTotal_prev != null && yoyTotal_prev !== 0
      ? ((totalVal - yoyTotal_prev) / yoyTotal_prev * 100) : null;

    return { latestQ, totalVal, maleVal, femaleVal, urbanVal, ruralVal, qoqTotal, yoyTotal };
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
          {isBg ? 'Безработни лица по местоживеене и пол' : 'Unemployed Persons by Residence & Sex'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: Хиляди лица`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: Thousands of Persons`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metric Toggle */}
        <div className="flex gap-1 bg-white rounded-lg p-1 w-fit shadow-sm">
          <button
            onClick={() => setMetric('absolute')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              metric === 'absolute' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isBg ? 'Абсолютни стойности' : 'Absolute Values'}
          </button>
          <button
            onClick={() => setMetric('yoy')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              metric === 'yoy' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isBg ? 'Годишна промяна' : 'Year-over-Year Change'}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <KpiCard
            title={isBg ? 'Общо безработни' : 'Total Unemployed'}
            value={kpiData.totalVal}
            subtitle={kpiData.latestQ}
            accentColor="text-slate-900"
            locale={locale}
            qoqChange={kpiData.qoqTotal}
            yoyChange={kpiData.yoyTotal}
          />
          <KpiCard
            title={isBg ? 'Мъже' : 'Male'}
            value={kpiData.maleVal}
            subtitle={kpiData.latestQ}
            accentColor="text-blue-600"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Жени' : 'Female'}
            value={kpiData.femaleVal}
            subtitle={kpiData.latestQ}
            accentColor="text-rose-600"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Град' : 'Urban'}
            value={kpiData.urbanVal}
            subtitle={kpiData.latestQ}
            accentColor="text-blue-500"
            locale={locale}
            badge={kpiData.totalVal != null && kpiData.urbanVal != null
              ? `${(kpiData.urbanVal / kpiData.totalVal * 100).toFixed(0)}%`
              : undefined}
          />
          <KpiCard
            title={isBg ? 'Село' : 'Rural'}
            value={kpiData.ruralVal}
            subtitle={kpiData.latestQ}
            accentColor="text-amber-500"
            locale={locale}
            badge={kpiData.totalVal != null && kpiData.ruralVal != null
              ? `${(kpiData.ruralVal / kpiData.totalVal * 100).toFixed(0)}%`
              : undefined}
          />
        </div>

        {/* Chart A: Gender Trends (Line Chart) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Тенденции по пол' : 'A. Unemployment Trend by Sex'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {metric === 'absolute'
              ? (isBg ? 'Безработни лица по тримесечия (хил. души)' : 'Unemployed persons by quarter (thousands)')
              : (isBg ? 'Годишна промяна спрямо същото тримесечие (%)' : 'Year-over-year change vs same quarter (%)')}
          </p>
          <GenderTrendsChart data={data} allQuarters={allQuarters} locale={locale} metric={metric} />
        </div>

        {/* Charts B & C */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Град vs Село' : 'B. Urban vs Rural'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {metric === 'absolute'
                ? (isBg ? 'Безработица по местоживеене (хил. души)' : 'Unemployment by residence (thousands)')
                : (isBg ? 'Годишна промяна по местоживеене (%)' : 'Year-over-year change by residence (%)')}
            </p>
            <ResidenceTrendsChart data={data} allQuarters={allQuarters} locale={locale} metric={metric} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Разбивка за последно тримесечие' : 'C. Latest Quarter Breakdown'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? `Пол × Местоживеене за ${kpiData.latestQ}` : `Sex × Residence for ${kpiData.latestQ}`}
            </p>
            <SnapshotBarChart data={data} latestQ={kpiData.latestQ} locale={locale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ title, value, subtitle, accentColor, locale, badge, qoqChange, yoyChange }: {
  title: string;
  value: number | null;
  subtitle: string;
  accentColor: string;
  locale?: 'bg' | 'en';
  badge?: string;
  qoqChange?: number | null;
  yoyChange?: number | null;
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
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <p className="text-xs text-slate-400">{subtitle}</p>
        {qoqChange != null && (
          <span className={`text-xs font-semibold ${qoqChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {qoqChange <= 0 ? '▼' : '▲'} {Math.abs(qoqChange).toFixed(1)}% {isBg ? 'кв/кв' : 'QoQ'}
          </span>
        )}
        {yoyChange != null && (
          <span className={`text-xs font-semibold ${yoyChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {yoyChange <= 0 ? '▼' : '▲'} {Math.abs(yoyChange).toFixed(1)}% {isBg ? 'г/г' : 'YoY'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Chart A: Gender Trends ─────────────────────────────────────────────────────

function GenderTrendsChart({ data, allQuarters, locale, metric }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  metric: 'absolute' | 'yoy';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    // Build lookup: { genderCode: { quarter: value } }
    const byGender: Record<string, Record<string, number | null>> = { '0': {}, '1': {}, '2': {} };

    data.forEach(row => {
      if (!row.Year || row.Residence_Code !== '0') return;
      byGender[row.Gender_Code][row.Year] = getPersons(row);
    });

    if (metric === 'yoy') {
      // Compute YoY % change for each quarter
      const yoyByGender: Record<string, (number | null)[]> = {};
      for (const gc of ['0', '1', '2']) {
        yoyByGender[gc] = allQuarters.map(q => {
          const { year, quarter } = parseQuarter(q);
          const cur = byGender[gc][q];
          const prev = byGender[gc][`${year - 1}Q${quarter}`];
          if (cur == null || prev == null || prev === 0) return null;
          return ((cur - prev) / prev) * 100;
        });
      }
      return yoyByGender;
    }

    return Object.fromEntries(
      Object.entries(byGender).map(([gc, qMap]) => [gc, allQuarters.map(q => qMap[q] ?? null)])
    );
  }, [data, allQuarters, metric]);

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
            const formatted = metric === 'yoy'
              ? (val != null ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}%` : '—')
              : (val != null ? formatFullValue(val) : '—');
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${formatted}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: ['0', '1', '2'].map(gc => getGenderLabel(gc, locale)),
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
        name: metric === 'yoy' ? '%' : (isBg ? 'хил. души' : 'Thousands'),
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10, color: '#94a3b8',
          formatter: metric === 'yoy' ? (v: number) => `${v >= 0 ? '+' : ''}${v}%` : undefined,
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: ['0', '1', '2'].map(gc => ({
        name: getGenderLabel(gc, locale),
        type: 'line' as const,
        data: seriesData[gc],
        itemStyle: { color: GENDER_COLORS[gc] },
        lineStyle: { width: gc === '0' ? 2.5 : 2 },
        smooth: true,
        symbol: 'none' as const,
        emphasis: { lineStyle: { width: gc === '0' ? 3.5 : 3 } },
        connectNulls: false,
      })),
    };

    // Add zero line for YoY mode
    if (metric === 'yoy') {
      (option as any).yAxis.axisLabel = {
        fontSize: 10, color: '#94a3b8',
        formatter: (v: number) => `${v >= 0 ? '+' : ''}${v}%`,
      };
      option.series = [
        ...(option.series as any[]),
        {
          type: 'line',
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#94a3b8', type: 'solid', width: 1 },
            data: [{ yAxis: 0 }],
            label: { show: false },
          },
          data: [],
        },
      ];
    }

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, seriesData, isBg, metric, locale]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart B: Urban vs Rural Stacked Area ───────────────────────────────────────

function ResidenceTrendsChart({ data, allQuarters, locale, metric }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  metric: 'absolute' | 'yoy';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const byRes: Record<string, Record<string, number | null>> = { '1': {}, '2': {} };

    data.forEach(row => {
      if (!row.Year || row.Gender_Code !== '0' || row.Residence_Code === '0') return;
      byRes[row.Residence_Code][row.Year] = getPersons(row);
    });

    if (metric === 'yoy') {
      const yoyByRes: Record<string, (number | null)[]> = {};
      for (const rc of ['1', '2']) {
        yoyByRes[rc] = allQuarters.map(q => {
          const { year, quarter } = parseQuarter(q);
          const cur = byRes[rc][q];
          const prev = byRes[rc][`${year - 1}Q${quarter}`];
          if (cur == null || prev == null || prev === 0) return null;
          return ((cur - prev) / prev) * 100;
        });
      }
      return yoyByRes;
    }

    return Object.fromEntries(
      Object.entries(byRes).map(([rc, qMap]) => [rc, allQuarters.map(q => qMap[q] ?? null)])
    );
  }, [data, allQuarters, metric]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const brushStart = Math.max(0, Math.round((1 - 32 / allQuarters.length) * 100));
    const isStacked = metric === 'absolute';

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
          let total = 0;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            if (isStacked && val != null) total += val;
            const formatted = metric === 'yoy'
              ? (val != null ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}%` : '—')
              : (val != null ? formatFullValue(val) : '—');
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${formatted}</span>
            </div>`;
          });
          if (isStacked && total > 0) {
            tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${formatFullValue(total)}</div>`;
          }
          return tip;
        },
      },
      legend: {
        data: ['1', '2'].map(rc => getResidenceLabel(rc, locale)),
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
        name: metric === 'yoy' ? '%' : (isBg ? 'хил. души' : 'Thousands'),
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10, color: '#94a3b8',
          formatter: metric === 'yoy' ? (v: number) => `${v >= 0 ? '+' : ''}${v}%` : undefined,
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: ['1', '2'].map(rc => ({
        name: getResidenceLabel(rc, locale),
        type: 'line' as const,
        ...(isStacked ? { stack: 'residence', areaStyle: { opacity: 0.4 } } : {}),
        data: seriesData[rc],
        itemStyle: { color: RESIDENCE_COLORS[rc] },
        lineStyle: { width: 2 },
        smooth: true,
        symbol: 'none' as const,
        emphasis: { focus: isStacked ? 'series' as const : 'self' as const },
        connectNulls: false,
      })),
    };

    // Add zero line for YoY mode
    if (metric === 'yoy') {
      option.series = [
        ...(option.series as any[]),
        {
          type: 'line',
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#94a3b8', type: 'solid', width: 1 },
            data: [{ yAxis: 0 }],
            label: { show: false },
          },
          data: [],
        },
      ];
    }

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, seriesData, isBg, metric, locale]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart C: Latest Quarter Snapshot (Grouped Bar) ─────────────────────────────

function SnapshotBarChart({ data, latestQ, locale }: {
  data: any[];
  latestQ: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const barData = useMemo(() => {
    // Categories: Male, Female on X-axis; grouped by Urban, Rural
    const result: { male: { urban: number | null; rural: number | null }; female: { urban: number | null; rural: number | null } } = {
      male: { urban: null, rural: null },
      female: { urban: null, rural: null },
    };

    data.forEach(row => {
      if (row.Year !== latestQ) return;
      const val = getPersons(row);
      if (row.Gender_Code === '1' && row.Residence_Code === '1') result.male.urban = val;
      if (row.Gender_Code === '1' && row.Residence_Code === '2') result.male.rural = val;
      if (row.Gender_Code === '2' && row.Residence_Code === '1') result.female.urban = val;
      if (row.Gender_Code === '2' && row.Residence_Code === '2') result.female.rural = val;
    });

    return result;
  }, [data, latestQ]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const categories = [getGenderLabel('1', locale), getGenderLabel('2', locale)];

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue} — ${latestQ}</div>`;
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
        data: [getResidenceLabel('1', locale), getResidenceLabel('2', locale)],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '3%', right: '3%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { fontSize: 12, color: '#334155', fontWeight: 600 },
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
          name: getResidenceLabel('1', locale),
          type: 'bar',
          data: [barData.male.urban, barData.female.urban],
          itemStyle: { color: RESIDENCE_COLORS['1'], borderRadius: [4, 4, 0, 0] },
          barGap: '20%',
          barCategoryGap: '40%',
          label: {
            show: true,
            position: 'top',
            fontSize: 11,
            fontWeight: 600,
            color: '#334155',
            formatter: (p: any) => p.value != null ? `${Number(p.value).toFixed(1)}k` : '',
          },
        },
        {
          name: getResidenceLabel('2', locale),
          type: 'bar',
          data: [barData.male.rural, barData.female.rural],
          itemStyle: { color: RESIDENCE_COLORS['2'], borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'top',
            fontSize: 11,
            fontWeight: 600,
            color: '#334155',
            formatter: (p: any) => p.value != null ? `${Number(p.value).toFixed(1)}k` : '',
          },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg, latestQ, locale]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
