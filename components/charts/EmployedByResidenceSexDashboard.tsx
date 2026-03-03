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

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EmployedByResidenceSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  // Helper to find a row by quarter, residence code, gender code
  const find = (quarter: string, residence: string, gender: string) =>
    data.find(d => d.Year === quarter && d.Residence_Code === residence && d.Gender_Code === gender);

  // KPI computations
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const prevQ = allQuarters.length >= 2 ? allQuarters[allQuarters.length - 2] : null;

    const totalRow = find(latestQ, '0', '0');
    const urbanRow = find(latestQ, '1', '0');
    const ruralRow = find(latestQ, '2', '0');
    const prevTotalRow = prevQ ? find(prevQ, '0', '0') : null;

    const totalVal = totalRow ? getPersons(totalRow) : null;
    const urbanVal = urbanRow ? getPersons(urbanRow) : null;
    const ruralVal = ruralRow ? getPersons(ruralRow) : null;
    const prevTotalVal = prevTotalRow ? getPersons(prevTotalRow) : null;

    const qoqChange = totalVal != null && prevTotalVal != null
      ? ((totalVal - prevTotalVal) / prevTotalVal * 100) : null;

    return { latestQ, totalVal, urbanVal, ruralVal, qoqChange };
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
          {isBg ? 'Заети лица по местоживеене и пол' : 'Employed Persons by Residence & Sex'}
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
            title={isBg ? 'Общо заети' : 'Total Employed'}
            value={kpiData.totalVal}
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
            title={isBg ? 'Градско' : 'Urban'}
            value={kpiData.urbanVal}
            subtitle={kpiData.latestQ}
            accentColor="text-blue-600"
          />
          <KpiCard
            title={isBg ? 'Селско' : 'Rural'}
            value={kpiData.ruralVal}
            subtitle={kpiData.latestQ}
            accentColor="text-emerald-600"
          />
        </div>

        {/* Chart A: Gender Trend (full width) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Тенденции по пол' : 'A. Employment Trends by Gender'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Общо заети лица, мъже vs жени' : 'Total employed persons, Male vs Female'}
          </p>
          <GenderTrendChart data={data} allQuarters={allQuarters} locale={locale} />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Структура по местоживеене' : 'B. Urban vs Rural Composition'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Градско и Селско население в състава на работната сила' : 'Urban and Rural share of total employment over time'}
            </p>
            <ResidenceStackedChart data={data} allQuarters={allQuarters} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Разпределение по пол (последно)' : 'C. Gender Distribution (Latest)'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Мъже vs Жени за последното тримесечие' : 'Male vs Female for the most recent quarter'}
            </p>
            <GenderDonutChart data={data} latestQ={allQuarters[allQuarters.length - 1]} locale={locale} />
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
      // Total residence (code 0), split by gender
      if (row.Residence_Code === '0' && row.Year) {
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
          let total = 0;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : 0;
            total += val;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)}k</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)}k</div>`;
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

// ── Chart B: Residence Stacked Area Chart ──────────────────────────────────────

function ResidenceStackedChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const urbanByQ: Record<string, number | null> = {};
    const ruralByQ: Record<string, number | null> = {};

    data.forEach(row => {
      // Total gender (code 0), split by residence
      if (row.Gender_Code === '0' && row.Year) {
        const val = getPersons(row);
        if (row.Residence_Code === '1') urbanByQ[row.Year] = val;
        else if (row.Residence_Code === '2') ruralByQ[row.Year] = val;
      }
    });

    return {
      urban: allQuarters.map(q => urbanByQ[q] ?? null),
      rural: allQuarters.map(q => ruralByQ[q] ?? null),
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
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)}k</div>`;
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Градско' : 'Urban', isBg ? 'Селско' : 'Rural'],
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
          name: isBg ? 'Градско' : 'Urban',
          type: 'line',
          stack: 'residence',
          areaStyle: { opacity: 0.4 },
          data: seriesData.urban,
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          emphasis: { focus: 'series' },
        },
        {
          name: isBg ? 'Селско' : 'Rural',
          type: 'line',
          stack: 'residence',
          areaStyle: { opacity: 0.4 },
          data: seriesData.rural,
          itemStyle: { color: '#10b981' },
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

// ── Chart C: Gender Donut Chart (Latest Quarter) ──────────────────────────────

function GenderDonutChart({ data, latestQ, locale }: {
  data: any[];
  latestQ: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const pieData = useMemo(() => {
    const maleRow = data.find(d => d.Year === latestQ && d.Residence_Code === '0' && d.Gender_Code === '1');
    const femaleRow = data.find(d => d.Year === latestQ && d.Residence_Code === '0' && d.Gender_Code === '2');
    const totalRow = data.find(d => d.Year === latestQ && d.Residence_Code === '0' && d.Gender_Code === '0');

    const maleVal = maleRow ? getPersons(maleRow) : null;
    const femaleVal = femaleRow ? getPersons(femaleRow) : null;
    const totalVal = totalRow ? getPersons(totalRow) : null;

    return { maleVal, femaleVal, totalVal };
  }, [data, latestQ]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          return `<div style="font-weight:600">${params.name}</div>
            <div>${params.value != null ? Number(params.value).toFixed(1) + 'k' : 'N/A'} (${params.percent}%)</div>`;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      series: [
        {
          type: 'pie',
          radius: ['50%', '75%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          label: {
            show: true,
            position: 'center',
            formatter: () => pieData.totalVal != null ? `${formatValue(pieData.totalVal)}\n${latestQ}` : '—',
            fontSize: 16,
            fontWeight: 'bold',
            color: '#0f172a',
            lineHeight: 22,
          },
          emphasis: {
            label: { show: true, fontSize: 18, fontWeight: 'bold' },
          },
          labelLine: { show: false },
          data: [
            { value: pieData.maleVal ?? undefined, name: isBg ? 'Мъже' : 'Male', itemStyle: { color: '#2563eb' } },
            { value: pieData.femaleVal ?? undefined, name: isBg ? 'Жени' : 'Female', itemStyle: { color: '#e11d48' } },
          ],
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [pieData, latestQ, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
