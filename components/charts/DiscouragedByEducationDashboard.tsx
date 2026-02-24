'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPersons(row: any): number | null {
  if (row.Persons == null || row.Persons === '' || row.Persons === '..' || row.Persons === 'null') return null;
  const v = typeof row.Persons === 'number' ? row.Persons : parseFloat(row.Persons);
  return isNaN(v) || v === 0 ? null : v;
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

// Education levels for this dataset (no 2_2 general secondary)
const EDU_MAIN = ['1', '2', '3', '4'];
const EDU_ALL = ['1', '2', '2_1', '3', '4'];
const EDU_EN: Record<string, string> = {
  '0': 'Total', '1': 'Higher', '2': 'Upper secondary', '2_1': 'Sec. vocational',
  '3': 'Lower secondary', '4': 'Primary or lower',
};
const EDU_BG: Record<string, string> = {
  '0': 'Общо', '1': 'Висше', '2': 'Средно', '2_1': 'Средно професионално',
  '3': 'Основно', '4': 'Начално и по-ниско',
};
const EDU_COLORS: Record<string, string> = {
  '1': '#2563eb',
  '2': '#22c55e',
  '2_1': '#16a34a',
  '3': '#f97316',
  '4': '#ef4444',
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function DiscouragedByEducationDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const eduLabels = isBg ? EDU_BG : EDU_EN;

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  // This dataset has no Age10_LFS — find by edu code only
  const find = (quarter: string, edu: string) =>
    data.find(d => d.Year === quarter && d.LFS_EDUlevel_Code === edu);

  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const { year, quarter } = parseQuarter(latestQ);
    const prevQ = allQuarters.length > 1 ? allQuarters[allQuarters.length - 2] : null;
    const yoyQ = `${year - 1}Q${quarter}`;

    const totalVal = getPersons(find(latestQ, '0'));
    const higherVal = getPersons(find(latestQ, '1'));
    const secondaryVal = getPersons(find(latestQ, '2'));
    const primaryVal = getPersons(find(latestQ, '4'));

    const prevTotal = prevQ ? getPersons(find(prevQ, '0')) : null;
    const qoqTotal = totalVal != null && prevTotal != null && prevTotal !== 0
      ? ((totalVal - prevTotal) / prevTotal * 100) : null;

    const yoyTotalPrev = getPersons(find(yoyQ, '0'));
    const yoyTotal = totalVal != null && yoyTotalPrev != null && yoyTotalPrev !== 0
      ? ((totalVal - yoyTotalPrev) / yoyTotalPrev * 100) : null;

    return { latestQ, totalVal, higherVal, secondaryVal, primaryVal, qoqTotal, yoyTotal };
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
          {isBg ? 'Обезкуражени лица по степен на образование' : 'Discouraged Persons by Level of Education'}
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
            title={isBg ? 'Общо обезкуражени' : 'Total Discouraged'}
            value={kpiData.totalVal}
            subtitle={kpiData.latestQ}
            accentColor="text-slate-900"
            locale={locale}
            qoqChange={kpiData.qoqTotal}
            yoyChange={kpiData.yoyTotal}
          />
          <KpiCard
            title={eduLabels['1']}
            value={kpiData.higherVal}
            subtitle={kpiData.latestQ}
            accentColor="text-blue-600"
            locale={locale}
            badge={kpiData.totalVal != null && kpiData.higherVal != null
              ? `${(kpiData.higherVal / kpiData.totalVal * 100).toFixed(0)}%` : undefined}
          />
          <KpiCard
            title={eduLabels['2']}
            value={kpiData.secondaryVal}
            subtitle={kpiData.latestQ}
            accentColor="text-emerald-600"
            locale={locale}
            badge={kpiData.totalVal != null && kpiData.secondaryVal != null
              ? `${(kpiData.secondaryVal / kpiData.totalVal * 100).toFixed(0)}%` : undefined}
          />
          <KpiCard
            title={eduLabels['4']}
            value={kpiData.primaryVal}
            subtitle={kpiData.latestQ}
            accentColor="text-red-600"
            locale={locale}
            badge={kpiData.totalVal != null && kpiData.primaryVal != null
              ? `${(kpiData.primaryVal / kpiData.totalVal * 100).toFixed(0)}%` : undefined}
          />
        </div>

        {/* Chart A: Education Composition Stacked Area */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Тенденции по образование' : 'A. Long-Term Educational Trends'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Стекирани нива на образование' : 'Stacked education levels over time'}
          </p>
          <CompositionAreaChart data={data} allQuarters={allQuarters} locale={locale} eduLabels={eduLabels} />
        </div>

        {/* Charts B & C */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Устойчивост: Висше vs Начално' : 'B. Resiliency: Higher vs Primary'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Сравнение при висше и начално образование' : 'Higher education vs Primary — volatility comparison'}
            </p>
            <ResiliencyChart data={data} allQuarters={allQuarters} locale={locale} eduLabels={eduLabels} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Разпределение (последно тримесечие)' : 'C. Distribution Snapshot (Latest Quarter)'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Дял по степен на образование' : 'Share by education level'}
            </p>
            <DistributionBarChart data={data} allQuarters={allQuarters} locale={locale} eduLabels={eduLabels} />
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

// ── Chart A: Composition Stacked Area ───────────────────────────────────────────

function CompositionAreaChart({ data, allQuarters, locale, eduLabels }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  eduLabels: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const byEdu: Record<string, Record<string, number | null>> = {};
    EDU_MAIN.forEach(c => { byEdu[c] = {}; });

    data.forEach(row => {
      if (!row.Year) return;
      const code = row.LFS_EDUlevel_Code;
      if (EDU_MAIN.includes(code)) {
        byEdu[code][row.Year] = getPersons(row);
      }
    });

    return Object.fromEntries(
      EDU_MAIN.map(c => [c, allQuarters.map(q => byEdu[c][q] ?? null)])
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
        data: EDU_MAIN.map(c => eduLabels[c]),
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
      series: EDU_MAIN.map(code => ({
        name: eduLabels[code],
        type: 'line' as const,
        stack: 'edu',
        areaStyle: { opacity: 0.45 },
        data: seriesData[code],
        itemStyle: { color: EDU_COLORS[code] },
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
  }, [allQuarters, seriesData, isBg, eduLabels]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart B: Resiliency Gap (Higher vs Primary) ─────────────────────────────────

function ResiliencyChart({ data, allQuarters, locale, eduLabels }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  eduLabels: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const higherByQ: Record<string, number | null> = {};
    const primaryByQ: Record<string, number | null> = {};

    data.forEach(row => {
      if (!row.Year) return;
      const val = getPersons(row);
      if (row.LFS_EDUlevel_Code === '1') higherByQ[row.Year] = val;
      else if (row.LFS_EDUlevel_Code === '4') primaryByQ[row.Year] = val;
    });

    return {
      higher: allQuarters.map(q => higherByQ[q] ?? null),
      primary: allQuarters.map(q => primaryByQ[q] ?? null),
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
        data: [eduLabels['1'], eduLabels['4']],
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
          name: eduLabels['1'],
          type: 'line',
          data: seriesData.higher,
          itemStyle: { color: EDU_COLORS['1'] },
          lineStyle: { width: 2.5 },
          areaStyle: { color: 'rgba(37,99,235,0.08)' },
          smooth: true,
          symbol: 'none',
          emphasis: { lineStyle: { width: 3.5 } },
        },
        {
          name: eduLabels['4'],
          type: 'line',
          data: seriesData.primary,
          itemStyle: { color: EDU_COLORS['4'] },
          lineStyle: { width: 2.5 },
          areaStyle: { color: 'rgba(239,68,68,0.08)' },
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
  }, [allQuarters, seriesData, isBg, eduLabels]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart C: Distribution Snapshot (Horizontal Bar - Latest Quarter) ────────────

function DistributionBarChart({ data, allQuarters, locale, eduLabels }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  eduLabels: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const barData = useMemo(() => {
    if (allQuarters.length === 0) return { values: [], labels: [], colors: [], quarter: '' };
    const latestQ = allQuarters[allQuarters.length - 1];

    const values: (number | null)[] = [];
    const labels: string[] = [];
    const colors: string[] = [];

    // Show all non-total education levels including 2_1
    EDU_ALL.forEach(code => {
      const row = data.find(d => d.Year === latestQ && d.LFS_EDUlevel_Code === code);
      values.push(row ? getPersons(row) : null);
      labels.push(eduLabels[code]);
      colors.push(EDU_COLORS[code]);
    });

    return { values, labels, colors, quarter: latestQ };
  }, [data, allQuarters, eduLabels]);

  useEffect(() => {
    if (!chartRef.current || barData.labels.length === 0) return;
    const chart = echarts.init(chartRef.current);

    // Compute total for percentage
    const total = barData.values.reduce((s: number, v) => s + (v != null ? v : 0), 0);

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
          const val = p.value != null ? Number(p.value) : null;
          const pct = val != null && total > 0 ? (val / total * 100).toFixed(1) : '—';
          return `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${barData.quarter}</div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
              <span>${p.name}</span>
              <span style="font-weight:600;margin-left:auto">${val != null ? formatFullValue(val) : '—'} (${pct}%)</span>
            </div>`;
        },
      },
      grid: { left: '2%', right: '10%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? 'хил. души' : 'Thousands',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: barData.labels,
        inverse: true,
        axisLabel: { fontSize: 11, color: '#64748b' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: barData.values.map((v, i) => ({
          value: v,
          itemStyle: { color: barData.colors[i], borderRadius: [0, 4, 4, 0] },
        })),
        barWidth: '55%',
        label: {
          show: true,
          position: 'right',
          fontSize: 10,
          color: '#64748b',
          formatter: (p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            if (val == null) return '';
            const pct = total > 0 ? (val / total * 100).toFixed(0) : '0';
            return `${val.toFixed(1)}k (${pct}%)`;
          },
        },
      }],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
