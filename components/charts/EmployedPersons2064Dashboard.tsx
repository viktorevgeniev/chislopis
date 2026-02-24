'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
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

interface PivotedRow {
  period: string;
  Total: number | null;
  Male: number | null;
  Female: number | null;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EmployedPersons2064Dashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  // Pivot data: one row per period with Total/Male/Female columns
  const { pivotedData, allQuarters } = useMemo(() => {
    const periodMap = new Map<string, { Total: number | null; Male: number | null; Female: number | null }>();

    data.forEach(row => {
      const period = row.Year;
      if (!period) return;
      if (!periodMap.has(period)) periodMap.set(period, { Total: null, Male: null, Female: null });
      const entry = periodMap.get(period)!;
      const val = getPersons(row);
      if (row.Gender_Code === '0') entry.Total = val;
      else if (row.Gender_Code === '1') entry.Male = val;
      else if (row.Gender_Code === '2') entry.Female = val;
    });

    const quarters = [...periodMap.keys()].sort(sortQuarters);
    const pivoted: PivotedRow[] = quarters.map(p => ({
      period: p,
      ...periodMap.get(p)!,
    }));

    return { pivotedData: pivoted, allQuarters: quarters };
  }, [data]);

  // KPI calculations
  const kpiData = useMemo(() => {
    if (pivotedData.length === 0) return null;
    const latest = pivotedData[pivotedData.length - 1];
    const latestParsed = parseQuarter(latest.period);
    const prevYearPeriod = `${latestParsed.year - 1}Q${latestParsed.quarter}`;
    const prev = pivotedData.find(r => r.period === prevYearPeriod);

    const yoyTotal = latest.Total != null && prev?.Total != null
      ? ((latest.Total - prev.Total) / prev.Total * 100) : null;
    const yoyMale = latest.Male != null && prev?.Male != null
      ? ((latest.Male - prev.Male) / prev.Male * 100) : null;
    const yoyFemale = latest.Female != null && prev?.Female != null
      ? ((latest.Female - prev.Female) / prev.Female * 100) : null;

    return {
      period: latest.period,
      total: latest.Total, male: latest.Male, female: latest.Female,
      yoyTotal, yoyMale, yoyFemale,
    };
  }, [pivotedData]);

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
        <CardTitle className="text-xl font-semibold text-slate-800">
          {isBg ? 'Статистика на заетостта: Население на 20-64 години' : 'Employment Statistics: Population Aged 20-64'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: Хиляди лица`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: Thousands of Persons`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Summary Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            title={isBg ? 'Общо заети' : 'Total Employed'}
            value={kpiData.total}
            yoy={kpiData.yoyTotal}
            period={kpiData.period}
            color="bg-white"
            accentColor="text-slate-800"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Мъже' : 'Male Employed'}
            value={kpiData.male}
            yoy={kpiData.yoyMale}
            period={kpiData.period}
            color="bg-white"
            accentColor="text-blue-600"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Жени' : 'Female Employed'}
            value={kpiData.female}
            yoy={kpiData.yoyFemale}
            period={kpiData.period}
            color="bg-white"
            accentColor="text-rose-500"
            locale={locale}
          />
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="bg-white shadow-sm rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                {isBg ? 'Тенденция на заетостта' : 'Employment Trend'}
              </h3>
              <TrendLineChart pivotedData={pivotedData} allQuarters={allQuarters} locale={locale} />
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white shadow-sm rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                {isBg ? 'Структура по пол' : 'Workforce Composition'}
              </h3>
              <CompositionAreaChart pivotedData={pivotedData} allQuarters={allQuarters} locale={locale} />
            </div>
          </div>
        </div>

        {/* Quarterly Comparison Bar */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            {isBg ? 'Годишно сравнение по тримесечия' : 'Year-over-Year Quarterly Comparison'}
          </h3>
          <YoyComparisonChart pivotedData={pivotedData} allQuarters={allQuarters} locale={locale} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ title, value, yoy, period, color, accentColor, locale }: {
  title: string;
  value: number | null;
  yoy: number | null;
  period: string;
  color: string;
  accentColor: string;
  locale: 'bg' | 'en';
}) {
  const isBg = locale === 'bg';
  return (
    <div className={`${color} shadow-sm rounded-xl p-5`}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${accentColor}`}>
        {formatValue(value)}
      </p>
      <div className="flex items-center gap-2 mt-2">
        {yoy != null && (
          <span className={`inline-flex items-center text-sm font-medium ${yoy >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            <span className="mr-0.5">{yoy >= 0 ? '\u2191' : '\u2193'}</span>
            {Math.abs(yoy).toFixed(1)}%
          </span>
        )}
        <span className="text-xs text-slate-400">
          {isBg ? 'г/г' : 'YoY'} ({period})
        </span>
      </div>
    </div>
  );
}

// ── Trend Line Chart ───────────────────────────────────────────────────────────

function TrendLineChart({ pivotedData, allQuarters, locale }: {
  pivotedData: PivotedRow[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current || pivotedData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    // Default brush range: last ~6 years
    const totalLen = allQuarters.length;
    const brushStart = Math.max(0, Math.round((1 - 24 / totalLen) * 100));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#1e293b">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const color = p.color;
            const val = p.value != null ? Number(p.value).toFixed(1) : 'N/A';
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val}k</span>
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
      grid: { left: '1%', right: '3%', bottom: '18%', top: '8%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: brushStart, end: 100 },
        { type: 'slider', start: brushStart, end: 100, height: 18, bottom: 24, borderColor: '#cbd5e1', fillerColor: 'rgba(148,163,184,0.15)' },
      ],
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allQuarters,
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (value: string) => {
            const p = parseQuarter(value);
            return p.quarter === 1 ? String(p.year) : '';
          },
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
          name: isBg ? 'Общо' : 'Total',
          type: 'line',
          data: pivotedData.map(r => r.Total),
          itemStyle: { color: '#1e293b' },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'none',
          emphasis: { lineStyle: { width: 3.5 } },
        },
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'line',
          data: pivotedData.map(r => r.Male),
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
          emphasis: { lineStyle: { width: 3 } },
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'line',
          data: pivotedData.map(r => r.Female),
          itemStyle: { color: '#f43f5e' },
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
  }, [pivotedData, allQuarters, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Composition Area Chart (Stacked Male + Female) ─────────────────────────────

function CompositionAreaChart({ pivotedData, allQuarters, locale }: {
  pivotedData: PivotedRow[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current || pivotedData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          let total = 0;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : 0;
            total += val;
            tip += `<div style="display:flex;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)}k</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:4px;padding-top:4px;font-weight:600">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)}k</div>`;
          return tip;
        },
      },
      grid: { left: '1%', right: '3%', bottom: '8%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allQuarters,
        axisLabel: {
          fontSize: 9,
          color: '#94a3b8',
          formatter: (value: string) => {
            const p = parseQuarter(value);
            return p.quarter === 1 ? String(p.year) : '';
          },
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 9, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'line',
          stack: 'composition',
          areaStyle: { opacity: 0.6 },
          data: pivotedData.map(r => r.Male),
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 1 },
          smooth: true,
          symbol: 'none',
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'line',
          stack: 'composition',
          areaStyle: { opacity: 0.6 },
          data: pivotedData.map(r => r.Female),
          itemStyle: { color: '#f43f5e' },
          lineStyle: { width: 1 },
          smooth: true,
          symbol: 'none',
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [pivotedData, allQuarters, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── YoY Quarterly Comparison (Bar Chart) ───────────────────────────────────────

function YoyComparisonChart({ pivotedData, allQuarters, locale }: {
  pivotedData: PivotedRow[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const yoyData = useMemo(() => {
    return pivotedData.map(row => {
      const parsed = parseQuarter(row.period);
      const prevPeriod = `${parsed.year - 1}Q${parsed.quarter}`;
      const prev = pivotedData.find(r => r.period === prevPeriod);

      const yoyTotal = row.Total != null && prev?.Total != null
        ? ((row.Total - prev.Total) / prev.Total * 100) : null;

      return { period: row.period, yoy: yoyTotal };
    }).filter(r => r.yoy != null);
  }, [pivotedData]);

  useEffect(() => {
    if (!chartRef.current || yoyData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const val = Number(p.value);
          const sign = val >= 0 ? '+' : '';
          return `<strong>${p.name}</strong><br/>${isBg ? 'Промяна г/г' : 'YoY Change'}: <span style="color:${val >= 0 ? '#059669' : '#dc2626'};font-weight:600">${sign}${val.toFixed(1)}%</span>`;
        },
      },
      grid: { left: '1%', right: '3%', bottom: '18%', top: '8%', containLabel: true },
      dataZoom: [
        { type: 'slider', start: 60, end: 100, height: 18, bottom: 4, borderColor: '#cbd5e1', fillerColor: 'rgba(148,163,184,0.15)' },
      ],
      xAxis: {
        type: 'category',
        data: yoyData.map(d => d.period),
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          rotate: 45,
          formatter: (value: string) => {
            const p = parseQuarter(value);
            return p.quarter === 1 ? String(p.year) : '';
          },
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%` },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        name: isBg ? 'Промяна г/г' : 'YoY Change',
        type: 'bar',
        data: yoyData.map(d => ({
          value: d.yoy,
          itemStyle: {
            color: d.yoy! >= 0 ? '#059669' : '#dc2626',
            borderRadius: d.yoy! >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3],
          },
        })),
        barMaxWidth: 16,
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#94a3b8', type: 'solid', width: 1 },
          data: [{ yAxis: 0 }],
          label: { show: false },
        },
      }],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [yoyData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '280px' }} />;
}
