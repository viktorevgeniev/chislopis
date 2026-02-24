'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPersons(row: any): number | null {
  if (row.Persons == null || row.Persons === '' || row.Persons === '..' || row.Persons === 'null') return null;
  const v = parseFloat(row.Persons);
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

function formatValue(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k';
}

function formatFullValue(v: number): string {
  const full = v * 1000;
  return full.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' persons';
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EmployeesBySexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  const find = (quarter: string, gender: string) =>
    data.find(d => d.Year === quarter && d.Gender_Code === gender);

  // KPI: latest quarter values + YoY change
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const { year, quarter } = parseQuarter(latestQ);
    const yoyQ = `${year - 1}Q${quarter}`;

    const totalVal = getPersons(find(latestQ, '0'));
    const maleVal = getPersons(find(latestQ, '1'));
    const femaleVal = getPersons(find(latestQ, '2'));

    const prevTotal = getPersons(find(yoyQ, '0'));
    const prevMale = getPersons(find(yoyQ, '1'));
    const prevFemale = getPersons(find(yoyQ, '2'));

    const yoyTotal = totalVal != null && prevTotal != null && prevTotal !== 0
      ? ((totalVal - prevTotal) / prevTotal * 100) : null;
    const yoyMale = maleVal != null && prevMale != null && prevMale !== 0
      ? ((maleVal - prevMale) / prevMale * 100) : null;
    const yoyFemale = femaleVal != null && prevFemale != null && prevFemale !== 0
      ? ((femaleVal - prevFemale) / prevFemale * 100) : null;

    // Gender ratio for latest quarter
    const genderRatio = maleVal != null && femaleVal != null && femaleVal !== 0
      ? maleVal / femaleVal : null;

    return { latestQ, totalVal, maleVal, femaleVal, yoyTotal, yoyMale, yoyFemale, genderRatio };
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
          {isBg ? 'Наети лица по пол' : 'Employment Trends by Gender'}
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
            title={isBg ? 'Общо наети' : 'Total Employment'}
            value={kpiData.totalVal}
            yoyChange={kpiData.yoyTotal}
            subtitle={kpiData.latestQ}
            accentColor="text-slate-900"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Мъже' : 'Male'}
            value={kpiData.maleVal}
            yoyChange={kpiData.yoyMale}
            subtitle={kpiData.latestQ}
            accentColor="text-blue-600"
            locale={locale}
            badge={kpiData.genderRatio != null ? `${isBg ? 'М/Ж' : 'M/F'}: ${kpiData.genderRatio.toFixed(2)}` : undefined}
          />
          <KpiCard
            title={isBg ? 'Жени' : 'Female'}
            value={kpiData.femaleVal}
            yoyChange={kpiData.yoyFemale}
            subtitle={kpiData.latestQ}
            accentColor="text-rose-600"
            locale={locale}
          />
        </div>

        {/* Chart A: Male vs Female Trends (Line Chart) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Тенденции Мъже vs Жени' : 'A. Male vs Female Trends'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Наети лица по тримесечия с линия за Общо' : 'Quarterly employment with Total reference line'}
          </p>
          <TrendsLineChart data={data} allQuarters={allQuarters} locale={locale} />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Структура по пол' : 'B. Gender Composition'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Мъже и Жени като дял от общия брой наети' : 'Male and Female stacked share over time'}
            </p>
            <CompositionAreaChart data={data} allQuarters={allQuarters} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Сезонност (последни 5 г.)' : 'C. Seasonal Pattern (Last 5 Years)'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Средна заетост по тримесечия' : 'Average employment by quarter'}
            </p>
            <SeasonalityBarChart data={data} allQuarters={allQuarters} locale={locale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ title, value, yoyChange, subtitle, accentColor, locale, badge }: {
  title: string;
  value: number | null;
  yoyChange: number | null;
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
        {yoyChange != null && (
          <span className={`text-xs font-semibold ${yoyChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {yoyChange >= 0 ? '▲' : '▼'} {Math.abs(yoyChange).toFixed(1)}% {isBg ? 'г/г' : 'YoY'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Chart A: Trends Line Chart (Male, Female, Total toggle) ─────────────────

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
          isBg ? 'Мъже' : 'Male',
          isBg ? 'Жени' : 'Female',
          isBg ? 'Общо' : 'Total',
        ],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        selected: { [isBg ? 'Общо' : 'Total']: false },
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
          name: isBg ? 'Мъже' : 'Male',
          type: 'line',
          data: seriesData.male,
          itemStyle: { color: '#2563eb' },
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
        {
          name: isBg ? 'Общо' : 'Total',
          type: 'line',
          data: seriesData.total,
          itemStyle: { color: '#94a3b8' },
          lineStyle: { width: 2, type: 'dashed' },
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

// ── Chart B: Composition Stacked Area Chart ────────────────────────────────────

function CompositionAreaChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const maleByQ: Record<string, number | null> = {};
    const femaleByQ: Record<string, number | null> = {};

    data.forEach(row => {
      if (!row.Year) return;
      const val = getPersons(row);
      if (row.Gender_Code === '1') maleByQ[row.Year] = val;
      else if (row.Gender_Code === '2') femaleByQ[row.Year] = val;
    });

    return {
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
        textStyle: { color: '#334155', fontSize: 11 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          let total = 0;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : 0;
            total += val;
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)}k</span>
            </div>`;
          });
          const malePct = total > 0 ? ((params[0]?.value ?? 0) / total * 100).toFixed(1) : '—';
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)}k</div>`;
          tip += `<div style="font-size:10px;color:#94a3b8">${isBg ? 'Мъже дял' : 'Male share'}: ${malePct}%</div>`;
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Мъже' : 'Male', isBg ? 'Жени' : 'Female'],
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
          name: isBg ? 'Мъже' : 'Male',
          type: 'line',
          stack: 'gender',
          areaStyle: { opacity: 0.4 },
          data: seriesData.male,
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          emphasis: { focus: 'series' },
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'line',
          stack: 'gender',
          areaStyle: { opacity: 0.4 },
          data: seriesData.female,
          itemStyle: { color: '#e11d48' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          emphasis: { focus: 'series' },
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

// ── Chart C: Seasonality Bar Chart (Last 5 Years Average) ─────────────────────

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
      const val = getPersons(row);
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
        name: isBg ? 'хил. души (средно)' : 'Thousands (avg)',
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
          data: barData.map(d => d.male),
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
          barGap: '20%',
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'bar',
          data: barData.map(d => d.female),
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
