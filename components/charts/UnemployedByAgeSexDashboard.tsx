'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPersons(row: any): number | null {
  const v = row.Persons;
  if (v == null || v === '' || v === 0) return null; // 0 means suppressed parenthesized value
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

// Distinct age buckets (exclude aggregates 0, 15-64, 20-64, 15-29)
const AGE_BUCKETS = ['15 - 24', '25 - 34', '35 - 44', '45 - 54', '55 - 64', '65+'];
const AGE_COLORS: Record<string, string> = {
  '15 - 24': '#ef4444', // red (youth)
  '25 - 34': '#f97316', // orange
  '35 - 44': '#eab308', // yellow
  '45 - 54': '#22c55e', // green
  '55 - 64': '#3b82f6', // blue
  '65+': '#8b5cf6',     // violet
};

const SHORT_AGE_EN: Record<string, string> = {
  '15 - 24': '15-24', '25 - 34': '25-34', '35 - 44': '35-44',
  '45 - 54': '45-54', '55 - 64': '55-64', '65+': '65+',
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function UnemployedByAgeSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  const find = (quarter: string, gender: string, age: string) =>
    data.find(d => d.Year === quarter && d.Gender_Code === gender && d.Age10_LFS_Code === age);

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

    // QoQ change
    const prevTotal = prevQ ? getPersons(find(prevQ, '0', '0')) : null;
    const qoqTotal = totalVal != null && prevTotal != null && prevTotal !== 0
      ? ((totalVal - prevTotal) / prevTotal * 100) : null;

    // YoY change
    const yoyTotal_prev = getPersons(find(yoyQ, '0', '0'));
    const yoyTotal = totalVal != null && yoyTotal_prev != null && yoyTotal_prev !== 0
      ? ((totalVal - yoyTotal_prev) / yoyTotal_prev * 100) : null;

    // Youth (15-29)
    const youthVal = getPersons(find(latestQ, '0', '15 - 29'));

    return { latestQ, totalVal, maleVal, femaleVal, qoqTotal, yoyTotal, youthVal };
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
          {isBg ? 'Безработни лица по възрастови групи и пол' : 'Unemployed Persons by Age & Sex'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: Хиляди лица`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: Thousands of Persons`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
            title={isBg ? 'Младежи (15-29)' : 'Youth (15-29)'}
            value={kpiData.youthVal}
            subtitle={kpiData.latestQ}
            accentColor="text-orange-600"
            locale={locale}
            badge={kpiData.totalVal != null && kpiData.youthVal != null
              ? `${(kpiData.youthVal / kpiData.totalVal * 100).toFixed(0)}% ${isBg ? 'от общо' : 'of total'}`
              : undefined}
          />
        </div>

        {/* Chart A: Gender Trends (Line Chart) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Тенденции по пол' : 'A. Gender Trends'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Общ брой безработни по тримесечия' : 'Total unemployment by quarter (Male vs Female)'}
          </p>
          <GenderTrendsChart data={data} allQuarters={allQuarters} locale={locale} />
        </div>

        {/* Charts B & C */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Безработица по възрастови групи' : 'B. Unemployment by Age Group'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Разпределение по кохорти (Общо)' : 'Age cohort composition over time (Total)'}
            </p>
            <AgeCohortChart data={data} allQuarters={allQuarters} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Младежка vs Обща безработица' : 'C. Youth vs General Unemployment'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Младежи (15-29) срещу Общо (15-64)' : 'Youth (15-29) vs Working Age (15-64)'}
            </p>
            <YouthVsGeneralChart data={data} allQuarters={allQuarters} locale={locale} />
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
      if (!row.Year || row.Age10_LFS_Code !== '0') return;
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
        data: [
          isBg ? 'Общо' : 'Total',
          isBg ? 'Мъже' : 'Male',
          isBg ? 'Жени' : 'Female',
        ],
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
          type: 'line',
          data: seriesData.total,
          itemStyle: { color: '#0f172a' },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'none',
          emphasis: { lineStyle: { width: 3.5 } },
        },
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'line',
          data: seriesData.male,
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          emphasis: { lineStyle: { width: 3 } },
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'line',
          data: seriesData.female,
          itemStyle: { color: '#e11d48' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          emphasis: { lineStyle: { width: 3 } },
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

// ── Chart B: Age Cohort Stacked Area Chart ─────────────────────────────────────

function AgeCohortChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const byAge: Record<string, Record<string, number | null>> = {};
    AGE_BUCKETS.forEach(age => { byAge[age] = {}; });

    data.forEach(row => {
      if (!row.Year || row.Gender_Code !== '0') return;
      const ageCode = row.Age10_LFS_Code;
      if (!AGE_BUCKETS.includes(ageCode)) return;
      byAge[ageCode][row.Year] = getPersons(row);
    });

    return Object.fromEntries(
      AGE_BUCKETS.map(age => [age, allQuarters.map(q => byAge[age][q] ?? null)])
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
        data: AGE_BUCKETS.map(a => SHORT_AGE_EN[a] || a),
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
      series: AGE_BUCKETS.map(age => ({
        name: SHORT_AGE_EN[age] || age,
        type: 'line' as const,
        stack: 'age',
        areaStyle: { opacity: 0.45 },
        data: seriesData[age],
        itemStyle: { color: AGE_COLORS[age] },
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
  }, [allQuarters, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart C: Youth vs General Unemployment ─────────────────────────────────────

function YouthVsGeneralChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const youthByQ: Record<string, number | null> = {};
    const generalByQ: Record<string, number | null> = {};

    data.forEach(row => {
      if (!row.Year || row.Gender_Code !== '0') return;
      const val = getPersons(row);
      if (row.Age10_LFS_Code === '15 - 29') youthByQ[row.Year] = val;
      else if (row.Age10_LFS_Code === '15 - 64') generalByQ[row.Year] = val;
    });

    return {
      youth: allQuarters.map(q => youthByQ[q] ?? null),
      general: allQuarters.map(q => generalByQ[q] ?? null),
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
              <span style="display:inline-block;width:8px;height:8px;border-radius:${p.seriesType === 'bar' ? '2' : '50'}px;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? formatFullValue(val) : '—'}</span>
            </div>`;
          });
          // Youth share
          const youthVal = params.find((p: any) => p.seriesType === 'bar')?.value;
          const generalVal = params.find((p: any) => p.seriesType === 'line')?.value;
          if (youthVal != null && generalVal != null && generalVal > 0) {
            tip += `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${isBg ? 'Дял на младежите' : 'Youth share'}: ${(youthVal / generalVal * 100).toFixed(1)}%</div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [
          isBg ? 'Младежи (15-29)' : 'Youth (15-29)',
          isBg ? 'Работна възраст (15-64)' : 'Working Age (15-64)',
        ],
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
          name: isBg ? 'Младежи (15-29)' : 'Youth (15-29)',
          type: 'bar',
          data: seriesData.youth,
          itemStyle: { color: '#f97316', borderRadius: [3, 3, 0, 0] },
          barWidth: '60%',
        },
        {
          name: isBg ? 'Работна възраст (15-64)' : 'Working Age (15-64)',
          type: 'line',
          data: seriesData.general,
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'none',
          emphasis: { lineStyle: { width: 3.5 } },
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
