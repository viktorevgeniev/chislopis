'use client';

import React, { useEffect, useRef, useMemo } from 'react';
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

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function LongTermUnemploymentRateDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  const find = (quarter: string, gender: string) =>
    data.find(d => d.Year === quarter && d.Gender_Code === gender);

  // KPI data
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const { year, quarter } = parseQuarter(latestQ);
    const prevQ = allQuarters.length > 1 ? allQuarters[allQuarters.length - 2] : null;
    const yoyQ = `${year - 1}Q${quarter}`;

    const totalVal = getRate(find(latestQ, '0'));
    const maleVal = getRate(find(latestQ, '1'));
    const femaleVal = getRate(find(latestQ, '2'));

    // QoQ change
    const prevTotal = prevQ ? getRate(find(prevQ, '0')) : null;
    const prevMale = prevQ ? getRate(find(prevQ, '1')) : null;
    const prevFemale = prevQ ? getRate(find(prevQ, '2')) : null;

    const qoqTotal = totalVal != null && prevTotal != null ? totalVal - prevTotal : null;
    const qoqMale = maleVal != null && prevMale != null ? maleVal - prevMale : null;
    const qoqFemale = femaleVal != null && prevFemale != null ? femaleVal - prevFemale : null;

    return { latestQ, totalVal, maleVal, femaleVal, qoqTotal, qoqMale, qoqFemale };
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
          {isBg ? 'Коефициент на продължителна безработица по пол' : 'Long-Term Unemployment Rate by Sex'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: %`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: %`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title={isBg ? 'Общо' : 'Total'}
            value={kpiData.totalVal}
            qoqChange={kpiData.qoqTotal}
            subtitle={kpiData.latestQ}
            accentColor="text-slate-900"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Мъже' : 'Male'}
            value={kpiData.maleVal}
            qoqChange={kpiData.qoqMale}
            subtitle={kpiData.latestQ}
            accentColor="text-blue-600"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Жени' : 'Female'}
            value={kpiData.femaleVal}
            qoqChange={kpiData.qoqFemale}
            subtitle={kpiData.latestQ}
            accentColor="text-rose-600"
            locale={locale}
          />
        </div>

        {/* Chart A: Trend Line Chart */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Тенденции по пол' : 'A. Trends by Sex'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Коефициент на продължителна безработица (%)' : 'Long-term unemployment rate (%)'}
          </p>
          <TrendsLineChart data={data} allQuarters={allQuarters} locale={locale} />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Последно тримесечие' : 'B. Latest Quarter'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? `Разпределение по пол за ${kpiData.latestQ}` : `Gender breakdown for ${kpiData.latestQ}`}
            </p>
            <LatestQuarterBarChart data={data} latestQ={kpiData.latestQ} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Сезонност (последни 5 г.)' : 'C. Seasonal Pattern (Last 5 Years)'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Средна стойност по тримесечия' : 'Average rate by quarter'}
            </p>
            <SeasonalityBarChart data={data} allQuarters={allQuarters} locale={locale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ title, value, qoqChange, subtitle, accentColor, locale }: {
  title: string;
  value: number | null;
  qoqChange?: number | null;
  subtitle: string;
  accentColor: string;
  locale?: 'bg' | 'en';
}) {
  const isBg = locale === 'bg';
  return (
    <div className="bg-white shadow-sm rounded-xl p-5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${accentColor}`}>
        {value != null ? `${value.toFixed(1)}%` : '—'}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs text-slate-400">{subtitle}</p>
        {qoqChange != null && (
          <span className={`text-xs font-semibold ${qoqChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {qoqChange <= 0 ? '▼' : '▲'} {Math.abs(qoqChange).toFixed(1)}pp {isBg ? 'кв/кв' : 'QoQ'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Chart A: Trends Line Chart ──────────────────────────────────────────────

function TrendsLineChart({ data, allQuarters, locale }: {
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
      if (!row.Year) return;
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

// ── Chart B: Latest Quarter Bar Chart ───────────────────────────────────────────

function LatestQuarterBarChart({ data, latestQ, locale }: {
  data: any[];
  latestQ: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const barData = useMemo(() => {
    const categories = [
      { code: '0', label: isBg ? 'Общо' : 'Total', color: '#0f172a' },
      { code: '1', label: isBg ? 'Мъже' : 'Male', color: '#3b82f6' },
      { code: '2', label: isBg ? 'Жени' : 'Female', color: '#e11d48' },
    ];

    return categories.map(c => {
      const row = data.find(d => d.Year === latestQ && d.Gender_Code === c.code);
      return { ...c, value: row ? getRate(row) : null };
    });
  }, [data, latestQ, isBg]);

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
          const p = params[0];
          return `<div style="font-weight:600">${p.name}: ${p.value != null ? p.value.toFixed(1) + '%' : '—'}</div>`;
        },
      },
      grid: { left: '2%', right: '4%', bottom: '8%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: barData.map(d => d.label),
        axisLabel: { fontSize: 12, color: '#475569', fontWeight: 'bold' as const },
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
      series: [{
        type: 'bar',
        data: barData.map(d => ({
          value: d.value,
          itemStyle: { color: d.color, borderRadius: [6, 6, 0, 0] },
        })),
        barWidth: '50%',
        label: {
          show: true,
          position: 'top',
          fontSize: 13,
          fontWeight: 'bold' as const,
          color: '#334155',
          formatter: (p: any) => p.value != null ? p.value.toFixed(1) + '%' : '',
        },
      }],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart C: Seasonality Bar Chart ─────────────────────────────────────────────

function SeasonalityBarChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const barData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestYear = parseQuarter(allQuarters[allQuarters.length - 1]).year;
    const cutoff = latestYear - 5;

    const buckets: Record<string, { male: number[]; female: number[] }> = {
      Q1: { male: [], female: [] },
      Q2: { male: [], female: [] },
      Q3: { male: [], female: [] },
      Q4: { male: [], female: [] },
    };

    data.forEach(row => {
      if (!row.Year) return;
      const { year, quarter } = parseQuarter(row.Year);
      if (year <= cutoff) return;
      const qKey = `Q${quarter}`;
      const val = getRate(row);
      if (val == null) return;
      if (row.Gender_Code === '1') buckets[qKey].male.push(val);
      else if (row.Gender_Code === '2') buckets[qKey].female.push(val);
    });

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return ['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({
      quarter: q,
      male: avg(buckets[q].male),
      female: avg(buckets[q].female),
    }));
  }, [data, allQuarters]);

  useEffect(() => {
    if (!chartRef.current || !barData) return;
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
            const val = p.value != null ? Number(p.value) : 0;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)}%</span>
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
        data: barData.map(d => d.quarter),
        axisLabel: { fontSize: 11, color: '#64748b' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? '% (средно)' : '% (avg)',
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
          data: barData.map(d => parseFloat(d.male.toFixed(1))),
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
          barGap: '20%',
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'bar',
          data: barData.map(d => parseFloat(d.female.toFixed(1))),
          itemStyle: { color: '#e11d48', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
