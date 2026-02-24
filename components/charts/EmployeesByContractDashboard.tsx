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

// Code → label mappings
const LABELS_EN: Record<string, string> = {
  '0': 'Total',
  '1': 'Labour/civil service contract',
  '2': 'Civil or other',
  '3': 'Without contract',
};
const LABELS_BG: Record<string, string> = {
  '0': 'Общо',
  '1': 'Трудов/служебен договор',
  '2': 'Граждански или друг',
  '3': 'Без договор',
};

const COLORS: Record<string, string> = {
  '1': '#2563eb', // blue – labour contract
  '2': '#8b5cf6', // violet – civil/other
  '3': '#ef4444', // red – without contract
  '0': '#94a3b8', // slate – total
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EmployeesByContractDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const labels = isBg ? LABELS_BG : LABELS_EN;

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  const find = (quarter: string, code: string) =>
    data.find(d => d.Year === quarter && d.LFS_LabourContract_Code === code);

  // KPI data
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const { year, quarter } = parseQuarter(latestQ);
    const prevQ = `${year - 1}Q${quarter}`;

    const totalVal = getPersons(find(latestQ, '0'));
    const labourVal = getPersons(find(latestQ, '1'));
    const civilVal = getPersons(find(latestQ, '2'));
    const noContractVal = getPersons(find(latestQ, '3'));

    const prevTotal = getPersons(find(prevQ, '0'));
    const yoyTotal = totalVal != null && prevTotal != null && prevTotal !== 0
      ? ((totalVal - prevTotal) / prevTotal * 100) : null;

    // Vulnerability index: (civil + no contract) / total * 100
    const vulnCurrent = totalVal != null && civilVal != null && noContractVal != null && totalVal !== 0
      ? ((civilVal + noContractVal) / totalVal * 100) : null;
    const prevCivil = getPersons(find(prevQ, '2'));
    const prevNoContract = getPersons(find(prevQ, '3'));
    const vulnPrev = prevTotal != null && prevCivil != null && prevNoContract != null && prevTotal !== 0
      ? ((prevCivil + prevNoContract) / prevTotal * 100) : null;
    const vulnChange = vulnCurrent != null && vulnPrev != null ? vulnCurrent - vulnPrev : null;

    return { latestQ, totalVal, labourVal, civilVal, noContractVal, yoyTotal, vulnCurrent, vulnChange };
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
          {isBg ? 'Наети лица по вид на договора' : 'Employment by Labour Contract Type'}
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
            title={isBg ? 'Трудов/служебен договор' : 'Labour Contract'}
            value={kpiData.labourVal}
            subtitle={kpiData.latestQ}
            accentColor="text-blue-600"
            locale={locale}
            badge={kpiData.totalVal != null && kpiData.labourVal != null
              ? `${(kpiData.labourVal / kpiData.totalVal * 100).toFixed(1)}%`
              : undefined}
          />
          <KpiCard
            title={isBg ? 'Индекс на уязвимост' : 'Vulnerability Index'}
            value={null}
            subtitle={kpiData.latestQ}
            accentColor="text-red-600"
            locale={locale}
            customValue={kpiData.vulnCurrent != null ? `${kpiData.vulnCurrent.toFixed(1)}%` : '—'}
            customDescription={isBg ? '(граждански + без договор) / общо' : '(civil + no contract) / total'}
            yoyChange={kpiData.vulnChange}
            invertYoy
          />
        </div>

        {/* Chart A: Contract Type Trends (Line Chart) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Тенденции по вид договор' : 'A. Contract Type Trends'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Наети лица по тримесечия (без Общо)' : 'Quarterly employment by contract type (excl. Total)'}
          </p>
          <TrendsLineChart data={data} allQuarters={allQuarters} locale={locale} labels={labels} />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Структура на заетостта (%)' : 'B. Workforce Composition (%)'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Процентен дял по вид договор' : 'Percentage share by contract type over time'}
            </p>
            <CompositionAreaChart data={data} allQuarters={allQuarters} locale={locale} labels={labels} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Сезонност (последни 5 г.)' : 'C. Seasonal Pattern (Last 5 Years)'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Средна заетост по тримесечия' : 'Average employment by quarter'}
            </p>
            <SeasonalityBarChart data={data} allQuarters={allQuarters} locale={locale} labels={labels} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ title, value, yoyChange, subtitle, accentColor, locale, badge, customValue, customDescription, invertYoy }: {
  title: string;
  value: number | null;
  yoyChange?: number | null;
  subtitle: string;
  accentColor: string;
  locale?: 'bg' | 'en';
  badge?: string;
  customValue?: string;
  customDescription?: string;
  invertYoy?: boolean;
}) {
  const isBg = locale === 'bg';
  const displayValue = customValue ?? formatValue(value);
  // For vulnerability index, a decrease is good (green)
  const isPositive = invertYoy
    ? (yoyChange != null && yoyChange <= 0)
    : (yoyChange != null && yoyChange >= 0);

  return (
    <div className="bg-white shadow-sm rounded-xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</p>
        {badge && (
          <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{badge}</span>
        )}
      </div>
      <p className={`text-3xl font-bold mt-2 ${accentColor}`}>{displayValue}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs text-slate-400">{subtitle}</p>
        {yoyChange != null && (
          <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {yoyChange >= 0 ? '▲' : '▼'} {Math.abs(yoyChange).toFixed(1)}{invertYoy ? 'pp' : '%'} {isBg ? 'г/г' : 'YoY'}
          </span>
        )}
      </div>
      {customDescription && (
        <p className="text-[10px] text-slate-400 mt-1">{customDescription}</p>
      )}
    </div>
  );
}

// ── Chart A: Trends Line Chart ──────────────────────────────────────────────

function TrendsLineChart({ data, allQuarters, locale, labels }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  labels: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const byCode: Record<string, Record<string, number | null>> = { '1': {}, '2': {}, '3': {} };

    data.forEach(row => {
      if (!row.Year) return;
      const code = row.LFS_LabourContract_Code;
      if (code === '1' || code === '2' || code === '3') {
        byCode[code][row.Year] = getPersons(row);
      }
    });

    return Object.fromEntries(
      Object.entries(byCode).map(([code, qMap]) => [
        code,
        allQuarters.map(q => qMap[q] ?? null),
      ])
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
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          // Find total for this quarter to calculate %
          const q = params[0].axisValue;
          const totalRow = data.find(d => d.Year === q && d.LFS_LabourContract_Code === '0');
          const totalVal = totalRow ? getPersons(totalRow) : null;

          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${q}</div>`;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            const pctStr = val != null && totalVal != null && totalVal !== 0
              ? ` (${(val / totalVal * 100).toFixed(1)}%)`
              : '';
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? formatFullValue(val) : '—'}${pctStr}</span>
            </div>`;
          });
          if (totalVal != null) {
            tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;color:#64748b;font-size:11px">${isBg ? 'Общо' : 'Total'}: ${formatFullValue(totalVal)}</div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [labels['1'], labels['2'], labels['3']],
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
          name: labels['1'],
          type: 'line',
          data: seriesData['1'],
          itemStyle: { color: COLORS['1'] },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          emphasis: { lineStyle: { width: 3 } },
        },
        {
          name: labels['2'],
          type: 'line',
          data: seriesData['2'],
          itemStyle: { color: COLORS['2'] },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          emphasis: { lineStyle: { width: 3 } },
        },
        {
          name: labels['3'],
          type: 'line',
          data: seriesData['3'],
          itemStyle: { color: COLORS['3'] },
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
  }, [allQuarters, seriesData, isBg, labels, data]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart B: Composition Stacked Area Chart (Percentage) ────────────────────

function CompositionAreaChart({ data, allQuarters, locale, labels }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  labels: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const byCode: Record<string, Record<string, number | null>> = { '1': {}, '2': {}, '3': {} };

    data.forEach(row => {
      if (!row.Year) return;
      const code = row.LFS_LabourContract_Code;
      if (code === '1' || code === '2' || code === '3') {
        byCode[code][row.Year] = getPersons(row);
      }
    });

    // Calculate percentages
    return Object.fromEntries(
      Object.entries(byCode).map(([code, qMap]) => [
        code,
        allQuarters.map(q => {
          const v1 = byCode['1'][q] ?? 0;
          const v2 = byCode['2'][q] ?? 0;
          const v3 = byCode['3'][q] ?? 0;
          const sum = v1 + v2 + v3;
          if (sum === 0) return null;
          const val = qMap[q] ?? 0;
          return parseFloat((val / sum * 100).toFixed(2));
        }),
      ])
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
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : 0;
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)}%</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [labels['1'], labels['2'], labels['3']],
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
        max: 100,
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: labels['1'],
          type: 'line',
          stack: 'pct',
          areaStyle: { opacity: 0.4 },
          data: seriesData['1'],
          itemStyle: { color: COLORS['1'] },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          emphasis: { focus: 'series' },
        },
        {
          name: labels['2'],
          type: 'line',
          stack: 'pct',
          areaStyle: { opacity: 0.4 },
          data: seriesData['2'],
          itemStyle: { color: COLORS['2'] },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          emphasis: { focus: 'series' },
        },
        {
          name: labels['3'],
          type: 'line',
          stack: 'pct',
          areaStyle: { opacity: 0.4 },
          data: seriesData['3'],
          itemStyle: { color: COLORS['3'] },
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
  }, [allQuarters, seriesData, isBg, labels]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart C: Seasonality Bar Chart (Last 5 Years Average) ─────────────────────

function SeasonalityBarChart({ data, allQuarters, locale, labels }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  labels: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const barData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestYear = parseQuarter(allQuarters[allQuarters.length - 1]).year;
    const cutoff = latestYear - 5;

    const buckets: Record<string, Record<string, number[]>> = {
      Q1: { '1': [], '2': [], '3': [] },
      Q2: { '1': [], '2': [], '3': [] },
      Q3: { '1': [], '2': [], '3': [] },
      Q4: { '1': [], '2': [], '3': [] },
    };

    data.forEach(row => {
      if (!row.Year) return;
      const { year, quarter } = parseQuarter(row.Year);
      if (year <= cutoff) return;
      const code = row.LFS_LabourContract_Code;
      if (code === '1' || code === '2' || code === '3') {
        const val = getPersons(row);
        if (val != null) buckets[`Q${quarter}`][code].push(val);
      }
    });

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return ['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({
      quarter: q,
      labour: avg(buckets[q]['1']),
      civil: avg(buckets[q]['2']),
      noContract: avg(buckets[q]['3']),
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
        data: [labels['1'], labels['2'], labels['3']],
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
          name: labels['1'],
          type: 'bar',
          data: barData.map(d => d.labour),
          itemStyle: { color: COLORS['1'], borderRadius: [4, 4, 0, 0] },
          barGap: '20%',
        },
        {
          name: labels['2'],
          type: 'bar',
          data: barData.map(d => d.civil),
          itemStyle: { color: COLORS['2'], borderRadius: [4, 4, 0, 0] },
        },
        {
          name: labels['3'],
          type: 'bar',
          data: barData.map(d => d.noContract),
          itemStyle: { color: COLORS['3'], borderRadius: [4, 4, 0, 0] },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg, labels]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
