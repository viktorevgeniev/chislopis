'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Constants ──────────────────────────────────────────────────────────────────

const DISCRETE_AGE_GROUPS = ['15 - 24', '25 - 34', '35 - 44', '45 - 54', '55 - 64', '65 and over'];
const DISCRETE_AGE_CODES = ['15 - 24', '25 - 34', '35 - 44', '45 - 54', '55 - 64', '65+'];

const AGE_COLORS: Record<string, string> = {
  '15 - 24': '#06b6d4',
  '25 - 34': '#3b82f6',
  '35 - 44': '#10b981',
  '45 - 54': '#f59e0b',
  '55 - 64': '#8b5cf6',
  '65 and over': '#ef4444',
};

const AGE_LABELS_BG: Record<string, string> = {
  '15 - 24': '15-24',
  '25 - 34': '25-34',
  '35 - 44': '35-44',
  '45 - 54': '45-54',
  '55 - 64': '55-64',
  '65 and over': '65+',
};

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

function ageLabel(code: string): string {
  if (code === '65+' || code === '65 and over') return '65+';
  return code;
}

function matchAge(row: any, code: string, label: string): boolean {
  return row.Age10_LFS_Code === code || row.Age10_LFS === label;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function LabourForceByAgeSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const [snapshotQuarter, setSnapshotQuarter] = useState<string>('');

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  // Set default snapshot to latest quarter
  useEffect(() => {
    if (allQuarters.length > 0 && !snapshotQuarter) {
      setSnapshotQuarter(allQuarters[allQuarters.length - 1]);
    }
  }, [allQuarters, snapshotQuarter]);

  // KPI data
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const prevQIdx = allQuarters.length - 2;
    const prevQ = prevQIdx >= 0 ? allQuarters[prevQIdx] : null;

    const latestP = parseQuarter(latestQ);
    const yoyQ = `${latestP.year - 1}Q${latestP.quarter}`;
    const hasYoy = allQuarters.includes(yoyQ);

    const find = (quarter: string, gender: string, age: string) =>
      data.find(d => d.Year === quarter && d.Gender_Code === gender &&
        (d.Age10_LFS_Code === age || d.Age10_LFS === age));

    // Total labour force (age = 0 for Total)
    const latestTotal = find(latestQ, '0', '0');
    const prevTotal = prevQ ? find(prevQ, '0', '0') : null;
    const yoyTotal = hasYoy ? find(yoyQ, '0', '0') : null;

    const latestVal = latestTotal ? getPersons(latestTotal) : null;
    const prevVal = prevTotal ? getPersons(prevTotal) : null;
    const yoyVal = yoyTotal ? getPersons(yoyTotal) : null;

    const qoqChange = latestVal != null && prevVal != null
      ? ((latestVal - prevVal) / prevVal * 100) : null;
    const yoyChange = latestVal != null && yoyVal != null
      ? ((latestVal - yoyVal) / yoyVal * 100) : null;

    // Male and female totals
    const maleRow = find(latestQ, '1', '0');
    const femaleRow = find(latestQ, '2', '0');
    const maleVal = maleRow ? getPersons(maleRow) : null;
    const femaleVal = femaleRow ? getPersons(femaleRow) : null;
    const genderGap = maleVal != null && femaleVal != null ? maleVal - femaleVal : null;

    return { latestQ, latestVal, qoqChange, yoyChange, maleVal, femaleVal, genderGap };
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
          {isBg ? 'Работна сила по възрастови групи и пол' : 'Labour Force by Age Groups and Sex'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: Хиляди лица`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: Thousand Persons`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title={isBg ? 'Работна сила (общо)' : 'Total Labour Force'}
            value={kpiData.latestVal}
            subtitle={kpiData.latestQ}
            accentColor="text-slate-900"
          />
          <KpiCard
            title={isBg ? 'Промяна г/г' : 'YoY Change'}
            value={null}
            changePercent={kpiData.yoyChange}
            subtitle={isBg ? 'спрямо същото тримесечие миналата година' : 'vs same quarter previous year'}
            accentColor="text-slate-700"
          />
          <KpiCard
            title={isBg ? 'Мъже' : 'Male'}
            value={kpiData.maleVal}
            subtitle={kpiData.latestQ}
            accentColor="text-blue-600"
          />
          <KpiCard
            title={isBg ? 'Жени' : 'Female'}
            value={kpiData.femaleVal}
            subtitle={kpiData.latestQ}
            accentColor="text-rose-600"
          />
        </div>

        {/* Chart A: Gender Trend Line (full width) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Историческо развитие на работната сила по пол' : 'A. Labour Force Macro Trend by Gender'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Обща работна сила, мъже vs жени (тримесечни данни)' : 'Total labour force, Male vs Female (quarterly)'}
          </p>
          <GenderTrendChart data={data} allQuarters={allQuarters} locale={locale} />
        </div>

        {/* Chart B: Age/Gender Snapshot */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-slate-700">
              {isBg ? 'Б. Демографски профил по пол и възраст' : 'B. Demographic Composition by Gender and Age'}
            </h3>
            <Select
              value={snapshotQuarter}
              onChange={(e) => setSnapshotQuarter(e.target.value)}
              className="w-[130px]"
            >
              {[...allQuarters].reverse().map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Мъже vs Жени по дискретни възрастови групи' : 'Male vs Female by discrete age brackets'}
          </p>
          <AgeGenderSnapshotChart data={data} quarter={snapshotQuarter} locale={locale} />
        </div>

        {/* Chart C: Generational Shift (100% Stacked Area) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'В. Поколенчески промени в работната сила' : 'C. Generational Shift in Labour Force'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Процентен дял на всяка възрастова група от общата работна сила (общо пол)'
              : 'Percentage share of each age group in total labour force (all genders)'}
          </p>
          <GenerationalShiftChart data={data} allQuarters={allQuarters} locale={locale} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ title, value, changePercent, subtitle, accentColor }: {
  title: string;
  value: number | null;
  changePercent?: number | null;
  subtitle: string;
  accentColor: string;
}) {
  return (
    <div className="bg-white shadow-sm rounded-xl p-5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</p>
      {value != null ? (
        <p className={`text-3xl font-bold mt-2 ${accentColor}`}>{formatValue(value)}</p>
      ) : changePercent != null ? (
        <p className={`text-3xl font-bold mt-2 ${changePercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
        </p>
      ) : (
        <p className="text-3xl font-bold mt-2 text-slate-300">—</p>
      )}
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}

// ── Chart A: Gender Trend Multi-Line ────────────────────────────────────────

function GenderTrendChart({ data, allQuarters, locale }: {
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
      // Age code "0" = Total age
      if ((row.Age10_LFS_Code === '0' || row.Age10_LFS === 'Total') && row.Year) {
        const val = getPersons(row);
        if (row.Gender_Code === '1') maleByQ[row.Year] = val;
        else if (row.Gender_Code === '2') femaleByQ[row.Year] = val;
      }
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
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${p.value != null ? Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' Thousand persons' : 'N/A'}</span>
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
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart B: Age-Gender Snapshot (Grouped Bar) ────────────────────────────────

function AgeGenderSnapshotChart({ data, quarter, locale }: {
  data: any[];
  quarter: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const barData = useMemo(() => {
    const maleVals: (number | null)[] = [];
    const femaleVals: (number | null)[] = [];

    DISCRETE_AGE_GROUPS.forEach((age, i) => {
      const code = DISCRETE_AGE_CODES[i];
      const maleRow = data.find(d =>
        d.Year === quarter && d.Gender_Code === '1' && matchAge(d, code, age)
      );
      const femaleRow = data.find(d =>
        d.Year === quarter && d.Gender_Code === '2' && matchAge(d, code, age)
      );
      maleVals.push(maleRow ? getPersons(maleRow) : null);
      femaleVals.push(femaleRow ? getPersons(femaleRow) : null);
    });

    return { male: maleVals, female: femaleVals };
  }, [data, quarter]);

  useEffect(() => {
    if (!chartRef.current || !quarter) return;
    const chart = echarts.init(chartRef.current);

    const categories = DISCRETE_AGE_GROUPS.map(a => isBg ? (AGE_LABELS_BG[a] || a) : ageLabel(a));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
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
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' Thousand persons' : 'N/A'}</span>
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
        data: categories,
        axisLabel: { fontSize: 11, color: '#64748b' },
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
          data: barData.male,
          itemStyle: { color: '#2563eb', borderRadius: [3, 3, 0, 0] },
          barGap: '20%',
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'bar',
          data: barData.female,
          itemStyle: { color: '#e11d48', borderRadius: [3, 3, 0, 0] },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [quarter, barData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart C: Generational Shift (100% Stacked Area) ─────────────────────────

function GenerationalShiftChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const areaData = useMemo(() => {
    // For each quarter, compute the % share of each discrete age group (Total gender = code 0)
    const result: Record<string, (number | null)[]> = {};
    DISCRETE_AGE_GROUPS.forEach(age => { result[age] = []; });

    allQuarters.forEach(q => {
      const vals: (number | null)[] = [];
      DISCRETE_AGE_GROUPS.forEach((age, i) => {
        const code = DISCRETE_AGE_CODES[i];
        const row = data.find(d =>
          d.Year === q && d.Gender_Code === '0' && matchAge(d, code, age)
        );
        vals.push(row ? getPersons(row) : null);
      });

      const total = vals.reduce<number>((s, v) => s + (v ?? 0), 0);

      DISCRETE_AGE_GROUPS.forEach((age, i) => {
        if (total > 0 && vals[i] != null) {
          result[age].push(Math.round((vals[i]! / total) * 1000) / 10); // 1 decimal %
        } else {
          result[age].push(null);
        }
      });
    });

    return result;
  }, [data, allQuarters]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const brushStart = Math.max(0, Math.round((1 - 40 / allQuarters.length) * 100));

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
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? val.toFixed(1) + '%' : 'N/A'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: DISCRETE_AGE_GROUPS.map(a => isBg ? (AGE_LABELS_BG[a] || a) : ageLabel(a)),
        bottom: 0,
        textStyle: { fontSize: 10, color: '#64748b' },
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
        max: 100,
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: DISCRETE_AGE_GROUPS.map(age => ({
        name: isBg ? (AGE_LABELS_BG[age] || age) : ageLabel(age),
        type: 'line' as const,
        stack: 'pct',
        areaStyle: { opacity: 0.7 },
        data: areaData[age],
        itemStyle: { color: AGE_COLORS[age] },
        symbol: 'none',
        smooth: true,
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, areaData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}
