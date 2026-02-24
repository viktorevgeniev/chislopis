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

const LABELS_EN: Record<string, string> = { TOT: 'Total', FT: 'Full-time', PT: 'Part-time' };
const LABELS_BG: Record<string, string> = { TOT: 'Общо', FT: 'Пълно работно време', PT: 'Непълно работно време' };
const COLORS: Record<string, string> = { FT: '#2563eb', PT: '#f97316', TOT: '#94a3b8' };

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EmployeesByWorkingTimeDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const labels = isBg ? LABELS_BG : LABELS_EN;

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  const find = (quarter: string, code: string) =>
    data.find(d => d.Year === quarter && d.LFS_FullPartTime_Code === code);

  // KPI data
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const { year, quarter } = parseQuarter(latestQ);
    const yoyQ = `${year - 1}Q${quarter}`;

    const totalVal = getPersons(find(latestQ, 'TOT'));
    const ftVal = getPersons(find(latestQ, 'FT'));
    const ptVal = getPersons(find(latestQ, 'PT'));

    const prevTotal = getPersons(find(yoyQ, 'TOT'));
    const prevFt = getPersons(find(yoyQ, 'FT'));
    const prevPt = getPersons(find(yoyQ, 'PT'));

    const yoyTotal = totalVal != null && prevTotal != null && prevTotal !== 0
      ? ((totalVal - prevTotal) / prevTotal * 100) : null;
    const yoyFt = ftVal != null && prevFt != null && prevFt !== 0
      ? ((ftVal - prevFt) / prevFt * 100) : null;
    const yoyPt = ptVal != null && prevPt != null && prevPt !== 0
      ? ((ptVal - prevPt) / prevPt * 100) : null;

    // Part-time share
    const ptShare = totalVal != null && ptVal != null && totalVal !== 0
      ? (ptVal / totalVal * 100) : null;

    return { latestQ, totalVal, ftVal, ptVal, yoyTotal, yoyFt, yoyPt, ptShare };
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
          {isBg ? 'Наети лица по вид работно време' : 'Employment by Working Time'}
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
            title={isBg ? 'Пълно работно време' : 'Full-time'}
            value={kpiData.ftVal}
            yoyChange={kpiData.yoyFt}
            subtitle={kpiData.latestQ}
            accentColor="text-blue-600"
            locale={locale}
            badge={kpiData.totalVal != null && kpiData.ftVal != null
              ? `${(kpiData.ftVal / kpiData.totalVal * 100).toFixed(1)}%`
              : undefined}
          />
          <KpiCard
            title={isBg ? 'Непълно работно време' : 'Part-time'}
            value={kpiData.ptVal}
            yoyChange={kpiData.yoyPt}
            subtitle={kpiData.latestQ}
            accentColor="text-orange-600"
            locale={locale}
            badge={kpiData.ptShare != null ? `${kpiData.ptShare.toFixed(1)}%` : undefined}
          />
        </div>

        {/* Chart A: Workforce Composition (Stacked Area) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Структура на заетостта' : 'A. Workforce Composition'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Пълно и непълно работно време (стекирани)' : 'Full-time and Part-time stacked over time'}
          </p>
          <CompositionAreaChart data={data} allQuarters={allQuarters} locale={locale} labels={labels} />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Годишен темп на растеж (%)' : 'B. Year-over-Year Growth (%)'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Промяна спрямо същото тримесечие на предходната година' : 'Change vs same quarter previous year'}
            </p>
            <YoYGrowthChart data={data} allQuarters={allQuarters} locale={locale} labels={labels} />
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

function KpiCard({ title, value, yoyChange, subtitle, accentColor, locale, badge }: {
  title: string;
  value: number | null;
  yoyChange?: number | null;
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

// ── Chart A: Composition Stacked Area Chart ────────────────────────────────────

function CompositionAreaChart({ data, allQuarters, locale, labels }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  labels: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const ftByQ: Record<string, number | null> = {};
    const ptByQ: Record<string, number | null> = {};

    data.forEach(row => {
      if (!row.Year) return;
      const val = getPersons(row);
      if (row.LFS_FullPartTime_Code === 'FT') ftByQ[row.Year] = val;
      else if (row.LFS_FullPartTime_Code === 'PT') ptByQ[row.Year] = val;
    });

    return {
      ft: allQuarters.map(q => ftByQ[q] ?? null),
      pt: allQuarters.map(q => ptByQ[q] ?? null),
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
          params.forEach((p: any) => { total += p.value != null ? Number(p.value) : 0; });
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : 0;
            const pct = total > 0 ? (val / total * 100).toFixed(1) : '—';
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
        data: [labels.FT, labels.PT],
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
          name: labels.FT,
          type: 'line',
          stack: 'worktime',
          areaStyle: { opacity: 0.5 },
          data: seriesData.ft,
          itemStyle: { color: COLORS.FT },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          emphasis: { focus: 'series' },
        },
        {
          name: labels.PT,
          type: 'line',
          stack: 'worktime',
          areaStyle: { opacity: 0.5 },
          data: seriesData.pt,
          itemStyle: { color: COLORS.PT },
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

// ── Chart B: YoY Growth Line Chart ─────────────────────────────────────────────

function YoYGrowthChart({ data, allQuarters, locale, labels }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  labels: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const byCode: Record<string, Record<string, number | null>> = { FT: {}, PT: {} };

    data.forEach(row => {
      if (!row.Year) return;
      const code = row.LFS_FullPartTime_Code;
      if (code === 'FT' || code === 'PT') {
        byCode[code][row.Year] = getPersons(row);
      }
    });

    // Calculate YoY growth for quarters that have a year-ago comparison
    const growthQuarters: string[] = [];
    const ftGrowth: (number | null)[] = [];
    const ptGrowth: (number | null)[] = [];

    allQuarters.forEach(q => {
      const { year, quarter } = parseQuarter(q);
      const prevQ = `${year - 1}Q${quarter}`;
      const ftCur = byCode.FT[q];
      const ftPrev = byCode.FT[prevQ];
      const ptCur = byCode.PT[q];
      const ptPrev = byCode.PT[prevQ];

      // Only include if we have at least one valid comparison
      if ((ftCur != null && ftPrev != null) || (ptCur != null && ptPrev != null)) {
        growthQuarters.push(q);
        ftGrowth.push(ftCur != null && ftPrev != null && ftPrev !== 0
          ? (ftCur - ftPrev) / ftPrev * 100 : null);
        ptGrowth.push(ptCur != null && ptPrev != null && ptPrev !== 0
          ? (ptCur - ptPrev) / ptPrev * 100 : null);
      }
    });

    return { growthQuarters, ftGrowth, ptGrowth };
  }, [data, allQuarters]);

  useEffect(() => {
    if (!chartRef.current || seriesData.growthQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const brushStart = Math.max(0, Math.round((1 - 32 / seriesData.growthQuarters.length) * 100));

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
              <span style="font-weight:600">${val != null ? (val >= 0 ? '+' : '') + val.toFixed(1) + '%' : '—'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [labels.FT, labels.PT],
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
        data: seriesData.growthQuarters,
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
          name: labels.FT,
          type: 'line',
          data: seriesData.ftGrowth,
          itemStyle: { color: COLORS.FT },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          emphasis: { lineStyle: { width: 3 } },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
            data: [{ yAxis: 0 }],
            label: { show: false },
          },
        },
        {
          name: labels.PT,
          type: 'line',
          data: seriesData.ptGrowth,
          itemStyle: { color: COLORS.PT },
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
  }, [seriesData, isBg, labels]);

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

    const buckets: Record<string, { ft: number[]; pt: number[] }> = {
      Q1: { ft: [], pt: [] },
      Q2: { ft: [], pt: [] },
      Q3: { ft: [], pt: [] },
      Q4: { ft: [], pt: [] },
    };

    data.forEach(row => {
      if (!row.Year) return;
      const { year, quarter } = parseQuarter(row.Year);
      if (year <= cutoff) return;
      const qKey = `Q${quarter}`;
      const val = getPersons(row);
      if (val == null) return;
      if (row.LFS_FullPartTime_Code === 'FT') buckets[qKey].ft.push(val);
      else if (row.LFS_FullPartTime_Code === 'PT') buckets[qKey].pt.push(val);
    });

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return ['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({
      quarter: q,
      ft: avg(buckets[q].ft),
      pt: avg(buckets[q].pt),
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
        data: [labels.FT, labels.PT],
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
          name: labels.FT,
          type: 'bar',
          data: barData.map(d => d.ft),
          itemStyle: { color: COLORS.FT, borderRadius: [4, 4, 0, 0] },
          barGap: '20%',
        },
        {
          name: labels.PT,
          type: 'bar',
          data: barData.map(d => d.pt),
          itemStyle: { color: COLORS.PT, borderRadius: [4, 4, 0, 0] },
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
