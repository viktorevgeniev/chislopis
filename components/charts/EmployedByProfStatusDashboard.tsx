'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  '1': '#475569',   // Employers – Slate
  '2': '#0ea5e9',   // Self-employed – Sky
  '3': '#4f46e5',   // Employees – Indigo
  '3_1': '#818cf8',  // Employees (private) – Indigo-400
  '3_2': '#6366f1',  // Employees (public) – Indigo-500
  '4': '#f43f5e',   // Unpaid family workers – Rose
};

const STATUS_LABELS_EN: Record<string, string> = {
  '0': 'Total',
  '1': 'Employers',
  '2': 'Self-employed',
  '3': 'Employees',
  '3_1': 'Private sector',
  '3_2': 'Public sector',
  '4': 'Unpaid family workers',
};

const STATUS_LABELS_BG: Record<string, string> = {
  '0': 'Общо',
  '1': 'Работодатели',
  '2': 'Самостоятелни',
  '3': 'Наемни лица',
  '3_1': 'Частен сектор',
  '3_2': 'Публичен сектор',
  '4': 'Неплатени семейни',
};

// Main statuses for stacked/line views (exclude sub-categories to avoid double-count)
const MAIN_CODES = ['1', '2', '3', '4'];
// All non-total codes for the gender bar
const ALL_CODES = ['1', '2', '3', '3_1', '3_2', '4'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseQuarter(q: string): number {
  const m = q.match(/^(\d{4})Q(\d)$/);
  if (!m) return 0;
  return parseInt(m[1]) * 10 + parseInt(m[2]);
}
function sortQuarters(a: string, b: string) { return parseQuarter(a) - parseQuarter(b); }

function fmtQ(q: string): string {
  const m = q.match(/^(\d{4})Q(\d)$/);
  return m ? `${m[1]} Q${m[2]}` : q;
}

function getVal(v: any): number {
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[()]/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function formatThousands(v: number, isBg: boolean): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + (isBg ? ' хил.' : 'K');
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Row { [key: string]: any; Year: string; Gender_Code: string; Persons: number; }
interface Props { data: Row[]; dataset: Dataset; locale: 'bg' | 'en'; }

// ── Reusable ECharts wrapper ───────────────────────────────────────────────────

function Chart({ option, height = 420 }: { option: EChartsOption; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption(option, true);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [option]);
  return <div ref={ref} style={{ width: '100%', height }} />;
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export function EmployedByProfStatusDashboard({ data, dataset, locale }: Props) {
  const isBg = locale === 'bg';
  const labels = isBg ? STATUS_LABELS_BG : STATUS_LABELS_EN;

  // Detect the status column name (generic loader creates LFS_ProfStatus_Code)
  const statusCol = useMemo(() => {
    if (data.length === 0) return 'LFS_ProfStatus_Code';
    const first = data[0];
    if ('LFS_ProfStatus_Code' in first) return 'LFS_ProfStatus_Code';
    return 'LFS_ProfStatus_Code';
  }, [data]);

  // Sorted unique quarters
  const quarters = useMemo(
    () => [...new Set(data.map(r => r.Year))].sort(sortQuarters),
    [data]
  );

  // Gender filter for Views A & C
  const [genderFilter, setGenderFilter] = useState<string>('0');

  // Lookup map: statusCode|quarter|genderCode → value
  const lookup = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data) {
      const code = r[statusCol] ?? '';
      m.set(`${code}|${r.Year}|${r.Gender_Code}`, getVal(r.Persons));
    }
    return m;
  }, [data, statusCol]);

  const g = (status: string, q: string, gender: string) => lookup.get(`${status}|${q}|${gender}`) ?? 0;

  // ── KPI cards ────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const lastQ = quarters[quarters.length - 1];
    if (!lastQ) return null;

    // YoY: same quarter one year ago
    const lp = lastQ.match(/^(\d{4})Q(\d)$/);
    const yoyQ = lp ? `${parseInt(lp[1]) - 1}Q${lp[2]}` : null;
    const total = g('0', lastQ, '0');
    const totalYoy = yoyQ ? g('0', yoyQ, '0') : 0;
    const yoyPct = totalYoy > 0 ? ((total - totalYoy) / totalYoy) * 100 : null;

    const selfEmployed = g('2', lastQ, '0');

    return { lastQ, total, selfEmployed, yoyPct };
  }, [quarters, lookup]);

  // ── View A: Employment Trends by Sector (Multi-Line) ─────────────────────────
  const trendOption = useMemo((): EChartsOption => {
    const xData = quarters.map(fmtQ);
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#334155', fontSize: 12 },
        valueFormatter: (v: any) => `${Number(v).toFixed(1)} ${isBg ? 'хил.' : 'K'}`,
      },
      legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      grid: { top: 20, left: 60, right: 20, bottom: 50 },
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: false,
        axisLabel: { fontSize: 10, color: '#94a3b8', rotate: 45 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил. лица' : 'Thousands',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: MAIN_CODES.map(code => ({
        name: labels[code],
        type: 'line' as const,
        data: quarters.map(q => g(code, q, genderFilter)),
        itemStyle: { color: STATUS_COLORS[code] },
        lineStyle: { width: 2.5 },
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: false,
        emphasis: { focus: 'series' as const },
      })),
    };
  }, [quarters, genderFilter, isBg, labels, lookup]);

  // ── View B: Gender Distribution by Professional Status (Grouped Bar) ─────────
  const genderBarOption = useMemo((): EChartsOption => {
    const lastQ = quarters[quarters.length - 1];
    if (!lastQ) return {};
    const yData = ALL_CODES.map(c => labels[c]);
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#334155', fontSize: 12 },
        valueFormatter: (v: any) => `${Number(v).toFixed(1)} ${isBg ? 'хил.' : 'K'}`,
      },
      legend: {
        data: [isBg ? 'Мъже' : 'Male', isBg ? 'Жени' : 'Female'],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { top: 10, left: 150, right: 30, bottom: 40 },
      xAxis: {
        type: 'value',
        name: isBg ? 'хил. лица' : 'Thousands',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: yData,
        axisLabel: { fontSize: 11, color: '#475569', width: 140, overflow: 'truncate' },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'bar' as const,
          data: ALL_CODES.map(c => g(c, lastQ, '1')),
          itemStyle: { color: '#3b82f6', borderRadius: [0, 4, 4, 0] },
          barGap: '20%',
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'bar' as const,
          data: ALL_CODES.map(c => g(c, lastQ, '2')),
          itemStyle: { color: '#ec4899', borderRadius: [0, 4, 4, 0] },
        },
      ],
    };
  }, [quarters, isBg, labels, lookup]);

  // ── View C: Workforce Composition (100% Stacked Area) ────────────────────────
  const stackedOption = useMemo((): EChartsOption => {
    const xData = quarters.map(fmtQ);

    // Compute percentage shares per quarter
    const totals = quarters.map(q =>
      MAIN_CODES.reduce((sum, c) => sum + g(c, q, genderFilter), 0)
    );

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${Number(p.value).toFixed(1)}%</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      grid: { top: 20, left: 60, right: 20, bottom: 50 },
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: false,
        axisLabel: { fontSize: 10, color: '#94a3b8', rotate: 45 },
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
      series: MAIN_CODES.map(code => ({
        name: labels[code],
        type: 'line' as const,
        stack: 'pct',
        areaStyle: { opacity: 0.7 },
        emphasis: { focus: 'series' as const },
        symbol: 'none',
        itemStyle: { color: STATUS_COLORS[code] },
        data: quarters.map((q, i) => {
          const total = totals[i];
          return total > 0 ? +((g(code, q, genderFilter) / total) * 100).toFixed(2) : 0;
        }),
      })),
    };
  }, [quarters, genderFilter, isBg, labels, lookup]);

  if (!data || data.length === 0 || !kpis) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const firstYear = quarters[0]?.slice(0, 4);
  const lastYear = quarters[quarters.length - 1]?.slice(0, 4);

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {dataset.title[locale]}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: Хиляди лица`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: Thousands of Persons`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Общо заети (${fmtQ(kpis.lastQ)})` : `Total Employed (${fmtQ(kpis.lastQ)})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">
              {formatThousands(kpis.total, isBg)}
            </p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Самостоятелно заети' : 'Total Self-Employed'}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">
              {formatThousands(kpis.selfEmployed, isBg)}
            </p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Ръст г/г' : 'YoY Growth Rate'}
            </p>
            <p className={`text-3xl font-bold mt-2 ${kpis.yoyPct != null ? (kpis.yoyPct >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-300'}`}>
              {kpis.yoyPct != null
                ? `${kpis.yoyPct >= 0 ? '+' : ''}${kpis.yoyPct.toFixed(1)}%`
                : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isBg ? 'спрямо съответното тримесечие' : 'vs same quarter last year'}
            </p>
          </div>
        </div>

        {/* ── Gender filter for Views A & C ── */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600">
            {isBg ? 'Филтър по пол:' : 'Gender Filter:'}
          </label>
          <Select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="w-48"
          >
            <option value="0">{isBg ? 'Общо население' : 'Total Population'}</option>
            <option value="1">{isBg ? 'Мъже' : 'Male'}</option>
            <option value="2">{isBg ? 'Жени' : 'Female'}</option>
          </Select>
        </div>

        {/* ── View A: Employment Trends by Sector (Multi-Line) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Тенденции на заетостта по статус' : 'Employment Trends by Status'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Хиляди лица по тримесечия' : 'Thousands of persons, quarterly'}
          </p>
          <Chart option={trendOption} height={380} />
        </div>

        {/* ── Views B & C side by side ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* View B: Gender Distribution (Grouped Bar) */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Полово разпределение по статус' : 'Gender Distribution by Status'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? `Последно тримесечие: ${fmtQ(kpis.lastQ)}` : `Latest quarter: ${fmtQ(kpis.lastQ)}`}
            </p>
            <Chart option={genderBarOption} height={380} />
          </div>

          {/* View C: 100% Stacked Area (Workforce Composition) */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Структура на работната сила' : 'Workforce Composition'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Процентно разпределение по тримесечия' : 'Percentage share over time'}
            </p>
            <Chart option={stackedOption} height={380} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
