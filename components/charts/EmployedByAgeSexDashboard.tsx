'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Constants ──────────────────────────────────────────────────────────────────

// Discrete age buckets (no aggregates) for composition charts
const DISCRETE_AGE_GROUPS = ['15 - 24', '25 - 34', '35 - 44', '45 - 54', '55 - 64', '65 and over'];
const DISCRETE_AGE_CODES = ['15 - 24', '25 - 34', '35 - 44', '45 - 54', '55 - 64', '65+'];

const AGE_COLORS: Record<string, string> = {
  '15 - 24': '#06b6d4', // cyan
  '25 - 34': '#3b82f6', // blue
  '35 - 44': '#10b981', // emerald
  '45 - 54': '#f59e0b', // amber
  '55 - 64': '#8b5cf6', // violet
  '65 and over': '#ef4444', // red
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

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EmployedByAgeSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const [selectedGender, setSelectedGender] = useState<string>('0');

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  // KPI: Latest total employment (15-64) + QoQ change
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const prevQIdx = allQuarters.length - 2;
    const prevQ = prevQIdx >= 0 ? allQuarters[prevQIdx] : null;

    // Also find same quarter previous year for YoY
    const latestP = parseQuarter(latestQ);
    const yoyQ = `${latestP.year - 1}Q${latestP.quarter}`;
    const hasYoy = allQuarters.includes(yoyQ);

    const find = (quarter: string, gender: string, age: string) =>
      data.find(d => d.Year === quarter && d.Gender_Code === gender &&
        (d.Age10_LFS_Code === age || d.Age10_LFS === age));

    const latestRow = find(latestQ, '0', '15 - 64');
    const prevRow = prevQ ? find(prevQ, '0', '15 - 64') : null;
    const yoyRow = hasYoy ? find(yoyQ, '0', '15 - 64') : null;

    const latestVal = latestRow ? getPersons(latestRow) : null;
    const prevVal = prevRow ? getPersons(prevRow) : null;
    const yoyVal = yoyRow ? getPersons(yoyRow) : null;

    const qoqChange = latestVal != null && prevVal != null
      ? ((latestVal - prevVal) / prevVal * 100) : null;
    const yoyChange = latestVal != null && yoyVal != null
      ? ((latestVal - yoyVal) / yoyVal * 100) : null;

    // Youth (15-24) and senior (55-64) latest
    const youthRow = find(latestQ, '0', '15 - 24');
    const seniorRow = find(latestQ, '0', '55 - 64');
    const youthVal = youthRow ? getPersons(youthRow) : null;
    const seniorVal = seniorRow ? getPersons(seniorRow) : null;

    return { latestQ, latestVal, qoqChange, yoyChange, youthVal, seniorVal };
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
          {isBg ? 'Мониторинг на работната сила: Тримесечни тенденции' : 'Bulgarian Labor Force Monitor: Quarterly Employment Trends'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: Хиляди лица`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: Thousands of Persons`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title={isBg ? 'Общо заети (15-64)' : 'Total Employment (15-64)'}
            value={kpiData.latestVal}
            subtitle={kpiData.latestQ}
            accentColor="text-slate-900"
          />
          <KpiCard
            title={isBg ? 'Промяна т/т' : 'QoQ Change'}
            value={null}
            changePercent={kpiData.qoqChange}
            subtitle={isBg ? 'спрямо предх. тримесечие' : 'vs previous quarter'}
            accentColor="text-slate-700"
          />
          <KpiCard
            title={isBg ? 'Младежи (15-24)' : 'Youth (15-24)'}
            value={kpiData.youthVal}
            subtitle={kpiData.latestQ}
            accentColor="text-cyan-600"
          />
          <KpiCard
            title={isBg ? 'Предпенсионни (55-64)' : 'Pre-retirement (55-64)'}
            value={kpiData.seniorVal}
            subtitle={kpiData.latestQ}
            accentColor="text-violet-600"
          />
        </div>

        {/* Gender filter for Charts B & C */}
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
          <label htmlFor="age-gender-filter" className="text-sm font-medium text-slate-600">
            {isBg ? 'Филтър по пол (за диаграми Б и В):' : 'Gender filter (Charts B & C):'}
          </label>
          <Select id="age-gender-filter" value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className="w-[140px]">
            <option value="0">{isBg ? 'Общо' : 'All'}</option>
            <option value="1">{isBg ? 'Мъже' : 'Male'}</option>
            <option value="2">{isBg ? 'Жени' : 'Female'}</option>
          </Select>
        </div>

        {/* Chart A: Gender Trend Line (full width) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Тенденции на заетостта по пол (15-64)' : 'A. Employment Trends by Gender (15-64)'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Работна сила на 15-64 години, мъже vs жени' : 'Working age population 15-64, Male vs Female'}
          </p>
          <GenderTrendChart data={data} allQuarters={allQuarters} locale={locale} />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Възрастова структура на работната сила' : 'B. Workforce Age Composition'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Последни 8 тримесечия, подредени по възраст' : 'Last 8 quarters, stacked by age group'}
            </p>
            <AgeCompositionChart data={data} allQuarters={allQuarters} selectedGender={selectedGender} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Младежи vs Предпенсионни' : 'C. Youth vs Pre-retirement'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Сравнение 15-24 и 55-64 (Q1 на всяка година)' : 'Comparing 15-24 and 55-64 (Q1 each year)'}
            </p>
            <YouthSeniorChart data={data} allQuarters={allQuarters} selectedGender={selectedGender} locale={locale} />
          </div>
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

// ── Chart A: Gender Trend Line Chart ───────────────────────────────────────────

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
      if ((row.Age10_LFS_Code === '15 - 64' || row.Age10_LFS === '15 - 64') && row.Year) {
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
              <span style="font-weight:600">${p.value != null ? Number(p.value).toFixed(1) + 'k' : 'N/A'}</span>
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

// ── Chart B: Age Composition Stacked Bar ───────────────────────────────────────

function AgeCompositionChart({ data, allQuarters, selectedGender, locale }: {
  data: any[];
  allQuarters: string[];
  selectedGender: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  // Last 8 quarters only
  const quarters = useMemo(() => allQuarters.slice(-8), [allQuarters]);

  const stackData = useMemo(() => {
    const result: Record<string, (number | null)[]> = {};
    DISCRETE_AGE_GROUPS.forEach(age => { result[age] = []; });

    quarters.forEach(q => {
      DISCRETE_AGE_GROUPS.forEach((age, i) => {
        const code = DISCRETE_AGE_CODES[i];
        const row = data.find(d =>
          d.Year === q && d.Gender_Code === selectedGender &&
          (d.Age10_LFS_Code === code || d.Age10_LFS === age)
        );
        result[age].push(row ? getPersons(row) : null);
      });
    });

    return result;
  }, [data, quarters, selectedGender]);

  useEffect(() => {
    if (!chartRef.current || quarters.length === 0) return;
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
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          let total = 0;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : 0;
            total += val;
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)}</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)}k</div>`;
          return tip;
        },
      },
      legend: {
        data: DISCRETE_AGE_GROUPS.map(a => isBg ? AGE_LABELS_BG[a] || a : ageLabel(a)),
        bottom: 0,
        textStyle: { fontSize: 10, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: quarters,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил.' : 'K',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: DISCRETE_AGE_GROUPS.map(age => ({
        name: isBg ? (AGE_LABELS_BG[age] || age) : ageLabel(age),
        type: 'bar' as const,
        stack: 'age',
        data: stackData[age],
        itemStyle: { color: AGE_COLORS[age] },
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [quarters, stackData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart C: Youth vs Senior Grouped Bar ───────────────────────────────────────

function YouthSeniorChart({ data, allQuarters, selectedGender, locale }: {
  data: any[];
  allQuarters: string[];
  selectedGender: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  // Select Q1 of each year
  const q1Quarters = useMemo(() =>
    allQuarters.filter(q => parseQuarter(q).quarter === 1),
    [allQuarters]
  );

  const barData = useMemo(() => {
    const youth: (number | null)[] = [];
    const senior: (number | null)[] = [];

    q1Quarters.forEach(q => {
      const youthRow = data.find(d =>
        d.Year === q && d.Gender_Code === selectedGender &&
        (d.Age10_LFS_Code === '15 - 24' || d.Age10_LFS === '15 - 24')
      );
      const seniorRow = data.find(d =>
        d.Year === q && d.Gender_Code === selectedGender &&
        (d.Age10_LFS_Code === '55 - 64' || d.Age10_LFS === '55 - 64')
      );
      youth.push(youthRow ? getPersons(youthRow) : null);
      senior.push(seniorRow ? getPersons(seniorRow) : null);
    });

    return { youth, senior };
  }, [data, q1Quarters, selectedGender]);

  useEffect(() => {
    if (!chartRef.current || q1Quarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
      },
      legend: {
        data: [isBg ? '15-24 (Младежи)' : '15-24 (Youth)', isBg ? '55-64 (Предпенс.)' : '55-64 (Pre-retirement)'],
        bottom: 0,
        textStyle: { fontSize: 10, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: q1Quarters.map(q => String(parseQuarter(q).year)),
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил.' : 'K',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? '15-24 (Младежи)' : '15-24 (Youth)',
          type: 'bar',
          data: barData.youth,
          itemStyle: { color: '#06b6d4', borderRadius: [3, 3, 0, 0] },
          barGap: '20%',
        },
        {
          name: isBg ? '55-64 (Предпенс.)' : '55-64 (Pre-retirement)',
          type: 'bar',
          data: barData.senior,
          itemStyle: { color: '#8b5cf6', borderRadius: [3, 3, 0, 0] },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [q1Quarters, barData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
