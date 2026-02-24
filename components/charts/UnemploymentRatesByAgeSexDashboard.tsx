'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRate(row: any): number | null {
  if (row.Rate == null || row.Rate === '' || row.Rate === '..' || row.Rate === 'null') return null;
  const v = typeof row.Rate === 'number' ? row.Rate : parseFloat(row.Rate);
  return isNaN(v) ? null : v;
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

// Standard non-overlapping age buckets (exclude aggregates like 0, 15-64, 20-64, 15-29)
const AGE_BUCKETS = ['15 - 24', '25 - 34', '35 - 44', '45 - 54', '55 - 64', '65+'];
const AGE_COLORS: Record<string, string> = {
  '15 - 24': '#ef4444',
  '25 - 34': '#f97316',
  '35 - 44': '#eab308',
  '45 - 54': '#22c55e',
  '55 - 64': '#3b82f6',
  '65+': '#8b5cf6',
};
const SHORT_AGE: Record<string, string> = {
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

export function UnemploymentRatesByAgeSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
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

    const totalRate = getRate(find(latestQ, '0', '0'));
    const maleRate = getRate(find(latestQ, '1', '0'));
    const femaleRate = getRate(find(latestQ, '2', '0'));
    const youthRate = getRate(find(latestQ, '0', '15 - 24'));

    // QoQ change (percentage point diff)
    const prevTotal = prevQ ? getRate(find(prevQ, '0', '0')) : null;
    const qoqTotal = totalRate != null && prevTotal != null ? totalRate - prevTotal : null;

    // YoY change (percentage point diff)
    const yoyTotalPrev = getRate(find(yoyQ, '0', '0'));
    const yoyTotal = totalRate != null && yoyTotalPrev != null ? totalRate - yoyTotalPrev : null;

    // Gender gap
    const genderGap = maleRate != null && femaleRate != null ? femaleRate - maleRate : null;

    return { latestQ, totalRate, maleRate, femaleRate, youthRate, qoqTotal, yoyTotal, genderGap };
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
          {isBg ? 'Коефициенти на безработица по възрастови групи и пол' : 'Unemployment Rates by Age Group & Sex'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: %`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: %`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <KpiCard
            title={isBg ? 'Общо' : 'Total Rate'}
            value={kpiData.totalRate}
            subtitle={kpiData.latestQ}
            accentColor="text-slate-900"
            locale={locale}
            qoqChange={kpiData.qoqTotal}
            yoyChange={kpiData.yoyTotal}
          />
          <KpiCard
            title={isBg ? 'Младежи (15-24)' : 'Youth (15-24)'}
            value={kpiData.youthRate}
            subtitle={kpiData.latestQ}
            accentColor="text-red-600"
            locale={locale}
            badge={kpiData.totalRate != null && kpiData.youthRate != null
              ? `${(kpiData.youthRate / kpiData.totalRate).toFixed(1)}x ${isBg ? 'от общо' : 'of total'}`
              : undefined}
          />
          <KpiCard
            title={isBg ? 'Мъже' : 'Male'}
            value={kpiData.maleRate}
            subtitle={kpiData.latestQ}
            accentColor="text-blue-600"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Жени' : 'Female'}
            value={kpiData.femaleRate}
            subtitle={kpiData.latestQ}
            accentColor="text-rose-600"
            locale={locale}
            badge={kpiData.genderGap != null
              ? `${kpiData.genderGap > 0 ? '+' : ''}${kpiData.genderGap.toFixed(1)}pp ${isBg ? 'разлика' : 'gap'}`
              : undefined}
          />
        </div>

        {/* Chart A: Age Group Trends (Line Chart) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Безработица по възрастови групи' : 'A. Unemployment Rate by Age Group'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Тримесечна тенденция (стандартни кохорти, Общо)' : 'Quarterly trend — standard age cohorts (Total)'}
          </p>
          <AgeGroupTrendsChart data={data} allQuarters={allQuarters} locale={locale} />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Тенденции по пол' : 'B. Gender Trends'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Коефициент на безработица (Общо, Мъже, Жени)' : 'Unemployment rate — Total, Male, Female'}
            </p>
            <GenderTrendsChart data={data} allQuarters={allQuarters} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Безработица по възраст и пол' : 'C. Rate by Age & Gender'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? `Последно тримесечие: ${kpiData.latestQ}` : `Latest quarter: ${kpiData.latestQ}`}
            </p>
            <AgeGenderBarChart data={data} allQuarters={allQuarters} latestQ={kpiData.latestQ} locale={locale} />
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
      <p className={`text-3xl font-bold mt-2 ${accentColor}`}>
        {value != null ? `${value.toFixed(1)}%` : '—'}
      </p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <p className="text-xs text-slate-400">{subtitle}</p>
        {qoqChange != null && (
          <span className={`text-xs font-semibold ${qoqChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {qoqChange <= 0 ? '▼' : '▲'} {Math.abs(qoqChange).toFixed(1)}pp {isBg ? 'кв/кв' : 'QoQ'}
          </span>
        )}
        {yoyChange != null && (
          <span className={`text-xs font-semibold ${yoyChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {yoyChange <= 0 ? '▼' : '▲'} {Math.abs(yoyChange).toFixed(1)}pp {isBg ? 'г/г' : 'YoY'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Chart A: Age Group Trends (Line Chart) ────────────────────────────────────

function AgeGroupTrendsChart({ data, allQuarters, locale }: {
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
      byAge[ageCode][row.Year] = getRate(row);
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
        data: AGE_BUCKETS.map(a => SHORT_AGE[a] || a),
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
        name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: AGE_BUCKETS.map(age => ({
        name: SHORT_AGE[age] || age,
        type: 'line' as const,
        data: seriesData[age],
        itemStyle: { color: AGE_COLORS[age] },
        lineStyle: { width: 2 },
        smooth: true,
        symbol: 'none' as const,
        emphasis: { focus: 'series' as const, lineStyle: { width: 3 } },
      })),
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart B: Gender Trends (Line Chart) ────────────────────────────────────────

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
      const val = getRate(row);
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
              <span style="font-weight:600">${val != null ? val.toFixed(1) + '%' : '—'}</span>
            </div>`;
          });
          // Gender gap
          const maleVal = params.find((p: any) => p.seriesName === (isBg ? 'Мъже' : 'Male'))?.value;
          const femaleVal = params.find((p: any) => p.seriesName === (isBg ? 'Жени' : 'Female'))?.value;
          if (maleVal != null && femaleVal != null) {
            const gap = femaleVal - maleVal;
            tip += `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${isBg ? 'Разлика по пол' : 'Gender gap'}: ${gap > 0 ? '+' : ''}${gap.toFixed(1)}pp</div>`;
          }
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
        name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
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

// ── Chart C: Age × Gender Grouped Bar Chart ────────────────────────────────────

function AgeGenderBarChart({ data, allQuarters, latestQ, locale }: {
  data: any[];
  allQuarters: string[];
  latestQ: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [selectedQ, setSelectedQ] = useState(latestQ);

  const barData = useMemo(() => {
    return AGE_BUCKETS.map(age => {
      const maleRow = data.find(d => d.Year === selectedQ && d.Gender_Code === '1' && d.Age10_LFS_Code === age);
      const femaleRow = data.find(d => d.Year === selectedQ && d.Gender_Code === '2' && d.Age10_LFS_Code === age);
      return {
        age: SHORT_AGE[age] || age,
        male: maleRow ? getRate(maleRow) : null,
        female: femaleRow ? getRate(femaleRow) : null,
      };
    });
  }, [data, selectedQ]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

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
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? val.toFixed(1) + '%' : '—'}</span>
            </div>`;
          });
          // Gap
          const m = params.find((p: any) => p.seriesName === (isBg ? 'Мъже' : 'Male'))?.value;
          const f = params.find((p: any) => p.seriesName === (isBg ? 'Жени' : 'Female'))?.value;
          if (m != null && f != null) {
            const gap = f - m;
            tip += `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${isBg ? 'Разлика' : 'Gap'}: ${gap > 0 ? '+' : ''}${gap.toFixed(1)}pp</div>`;
          }
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
        data: barData.map(d => d.age),
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
      series: [
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'bar',
          data: barData.map(d => d.male),
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
          barGap: '20%',
          label: {
            show: true,
            position: 'top',
            fontSize: 10,
            color: '#64748b',
            formatter: (p: any) => p.value != null ? p.value.toFixed(1) + '%' : '',
          },
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'bar',
          data: barData.map(d => d.female),
          itemStyle: { color: '#e11d48', borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'top',
            fontSize: 10,
            color: '#64748b',
            formatter: (p: any) => p.value != null ? p.value.toFixed(1) + '%' : '',
          },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg]);

  return (
    <div>
      <div className="mb-2">
        <select
          value={selectedQ}
          onChange={e => setSelectedQ(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300"
        >
          {[...allQuarters].reverse().map(q => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '350px' }} />
    </div>
  );
}
