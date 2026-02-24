'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Constants ──────────────────────────────────────────────────────────────────

const PRIVATE_COLOR = '#2563eb';
const PUBLIC_COLOR = '#f59e0b';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getValue(row: any): number | null {
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
  return v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function sameQuarterLastYear(q: string): string {
  const p = parseQuarter(q);
  return `${p.year - 1}Q${p.quarter}`;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

interface QuarterData {
  total: number | null;
  private: number | null;
  public: number | null;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EmployedByOwnershipDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  // Parse all data into a map: period → { total, private, public }
  const { allQuarters, byQuarter } = useMemo(() => {
    const qs = new Set<string>();
    const map: Record<string, QuarterData> = {};

    data.forEach(row => {
      const period = row.Year || '';
      if (!period) return;
      qs.add(period);

      if (!map[period]) map[period] = { total: null, private: null, public: null };
      const val = getValue(row);
      const ownership = row.Ownership_LFS || '';

      if (ownership === 'Total') map[period].total = val;
      else if (ownership === 'Private sector') map[period].private = val;
      else if (ownership === 'Public sector') map[period].public = val;
    });

    const sorted = [...qs].sort(sortQuarters);
    return { allQuarters: sorted, byQuarter: map };
  }, [data]);

  // Time range filter
  const [timeRange, setTimeRange] = useState<'5y' | 'all'>('all');

  const filteredQuarters = useMemo(() => {
    if (timeRange === 'all' || allQuarters.length === 0) return allQuarters;
    const lastQ = parseQuarter(allQuarters[allQuarters.length - 1]);
    const cutoffYear = lastQ.year - 5;
    return allQuarters.filter(q => {
      const p = parseQuarter(q);
      return p.year > cutoffYear || (p.year === cutoffYear && p.quarter >= lastQ.quarter);
    });
  }, [allQuarters, timeRange]);

  // KPI data: latest quarter
  const kpi = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const latest = byQuarter[latestQ];
    if (!latest) return null;

    const yoyQ = sameQuarterLastYear(latestQ);
    const yoyData = byQuarter[yoyQ];

    const totalYoY = latest.total != null && yoyData?.total != null
      ? ((latest.total - yoyData.total) / yoyData.total) * 100 : null;

    const privateShare = latest.private != null && latest.total != null && latest.total > 0
      ? (latest.private / latest.total) * 100 : null;

    const publicShare = latest.public != null && latest.total != null && latest.total > 0
      ? (latest.public / latest.total) * 100 : null;

    return { latestQ, latest, totalYoY, privateShare, publicShare };
  }, [allQuarters, byQuarter]);

  if (!data || data.length === 0 || !kpi) {
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
          {dataset.title[locale]}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: Хиляди лица`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: Thousand Persons`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Общо заети (${kpi.latestQ})` : `Total Employment (${kpi.latestQ})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">
              {formatValue(kpi.latest.total)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isBg ? 'Хиляди лица' : 'Thousand persons'}
            </p>
            {kpi.totalYoY != null && (
              <p className={`text-sm font-semibold mt-2 ${kpi.totalYoY >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.totalYoY >= 0 ? '+' : ''}{kpi.totalYoY.toFixed(1)}%
                <span className="text-xs font-normal text-slate-400 ml-1">
                  {isBg ? 'г/г' : 'YoY'}
                </span>
              </p>
            )}
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5 border-l-4" style={{ borderLeftColor: PRIVATE_COLOR }}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Частен сектор' : 'Private Sector'}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">
              {formatValue(kpi.latest.private)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isBg ? 'Хиляди лица' : 'Thousand persons'}
            </p>
            {kpi.privateShare != null && (
              <p className="text-sm font-semibold mt-2" style={{ color: PRIVATE_COLOR }}>
                {kpi.privateShare.toFixed(1)}%
                <span className="text-xs font-normal text-slate-400 ml-1">
                  {isBg ? 'от общо' : 'of total'}
                </span>
              </p>
            )}
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5 border-l-4" style={{ borderLeftColor: PUBLIC_COLOR }}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Публичен сектор' : 'Public Sector'}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">
              {formatValue(kpi.latest.public)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isBg ? 'Хиляди лица' : 'Thousand persons'}
            </p>
            {kpi.publicShare != null && (
              <p className="text-sm font-semibold mt-2" style={{ color: PUBLIC_COLOR }}>
                {kpi.publicShare.toFixed(1)}%
                <span className="text-xs font-normal text-slate-400 ml-1">
                  {isBg ? 'от общо' : 'of total'}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600">
            {isBg ? 'Период' : 'Time Range'}
          </label>
          <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value as '5y' | 'all')} className="w-[160px]">
            <option value="all">{isBg ? 'Всички данни' : 'All Time'}</option>
            <option value="5y">{isBg ? 'Последни 5 години' : 'Last 5 Years'}</option>
          </Select>
        </div>

        {/* Chart A: Sector Evolution Trends (Line Chart) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Динамика по сектори' : 'Sector Evolution Trends'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Частен и публичен сектор (хиляди лица)' : 'Private vs Public sector (Thousand Persons)'}
          </p>
          <TrendLineChart quarters={filteredQuarters} byQuarter={byQuarter} locale={locale} />
        </div>

        {/* Chart B: Structural Composition (100% Stacked Area) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Структурна композиция' : 'Structural Composition'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Дял на частния и публичния сектор (%)' : 'Private vs Public sector share (%)'}
          </p>
          <StackedAreaChart quarters={filteredQuarters} byQuarter={byQuarter} locale={locale} />
        </div>

        {/* Reference Data Table: Last 4 quarters */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            {isBg ? 'Справочна таблица' : 'Reference Data Table'}
          </h3>
          <ReferenceTable allQuarters={allQuarters} byQuarter={byQuarter} locale={locale} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Trend Line Chart ──────────────────────────────────────────────────

function TrendLineChart({ quarters, byQuarter, locale }: {
  quarters: string[];
  byQuarter: Record<string, QuarterData>;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => ({
    private: quarters.map(q => byQuarter[q]?.private ?? null),
    public: quarters.map(q => byQuarter[q]?.public ?? null),
  }), [quarters, byQuarter]);

  useEffect(() => {
    if (!chartRef.current || quarters.length === 0) return;
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
          const q = params[0].axisValue;
          const totalVal = byQuarter[q]?.total;
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${q}</div>`;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            const share = val != null && totalVal != null && totalVal > 0
              ? (val / totalVal * 100).toFixed(1) : '—';
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? formatValue(val) : 'N/A'} (${share}%)</span>
            </div>`;
          });
          if (totalVal != null) {
            tip += `<div style="border-top:1px solid #e2e8f0;margin-top:4px;padding-top:4px;font-size:11px;color:#64748b">
              ${isBg ? 'Общо' : 'Total'}: ${formatValue(totalVal)} ${isBg ? 'хил. лица' : 'thousand persons'}
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Частен сектор' : 'Private Sector', isBg ? 'Публичен сектор' : 'Public Sector'],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '15%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: quarters,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
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
      series: [
        {
          name: isBg ? 'Частен сектор' : 'Private Sector',
          type: 'line',
          data: seriesData.private,
          itemStyle: { color: PRIVATE_COLOR },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'none',
          areaStyle: { color: 'rgba(37,99,235,0.06)' },
        },
        {
          name: isBg ? 'Публичен сектор' : 'Public Sector',
          type: 'line',
          data: seriesData.public,
          itemStyle: { color: PUBLIC_COLOR },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'none',
          areaStyle: { color: 'rgba(245,158,11,0.06)' },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [quarters, seriesData, byQuarter, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '350px' }} />;
}

// ── Chart B: 100% Stacked Area Chart ───────────────────────────────────────────

function StackedAreaChart({ quarters, byQuarter, locale }: {
  quarters: string[];
  byQuarter: Record<string, QuarterData>;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const privatePct: (number | null)[] = [];
    const publicPct: (number | null)[] = [];

    quarters.forEach(q => {
      const d = byQuarter[q];
      if (d?.private != null && d?.public != null && d.total != null && d.total > 0) {
        privatePct.push(+(d.private / d.total * 100).toFixed(2));
        publicPct.push(+(d.public / d.total * 100).toFixed(2));
      } else {
        privatePct.push(null);
        publicPct.push(null);
      }
    });

    return { privatePct, publicPct };
  }, [quarters, byQuarter]);

  useEffect(() => {
    if (!chartRef.current || quarters.length === 0) return;
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
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${p.value != null ? Number(p.value).toFixed(1) : 'N/A'}%</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Частен сектор' : 'Private Sector', isBg ? 'Публичен сектор' : 'Public Sector'],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '15%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: quarters,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? 'Частен сектор' : 'Private Sector',
          type: 'line',
          stack: 'pct',
          areaStyle: { color: PRIVATE_COLOR, opacity: 0.7 },
          data: seriesData.privatePct,
          itemStyle: { color: PRIVATE_COLOR },
          lineStyle: { width: 0 },
          symbol: 'none',
          smooth: true,
        },
        {
          name: isBg ? 'Публичен сектор' : 'Public Sector',
          type: 'line',
          stack: 'pct',
          areaStyle: { color: PUBLIC_COLOR, opacity: 0.7 },
          data: seriesData.publicPct,
          itemStyle: { color: PUBLIC_COLOR },
          lineStyle: { width: 0 },
          symbol: 'none',
          smooth: true,
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [quarters, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '300px' }} />;
}

// ── Reference Data Table ───────────────────────────────────────────────────────

function ReferenceTable({ allQuarters, byQuarter, locale }: {
  allQuarters: string[];
  byQuarter: Record<string, QuarterData>;
  locale: 'bg' | 'en';
}) {
  const isBg = locale === 'bg';
  const last4 = allQuarters.slice(-4);

  const rows = last4.flatMap(q => {
    const d = byQuarter[q];
    return [
      { period: q, sector: isBg ? 'Частен сектор' : 'Private Sector', value: d?.private },
      { period: q, sector: isBg ? 'Публичен сектор' : 'Public Sector', value: d?.public },
      { period: q, sector: isBg ? 'Общо' : 'Total', value: d?.total },
    ];
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">
              {isBg ? 'Период' : 'Period'}
            </th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">
              {isBg ? 'Сектор' : 'Sector'}
            </th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">
              {isBg ? 'Заети (хил.)' : "Employment (000s)"}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`border-b border-slate-100 ${r.sector === (isBg ? 'Общо' : 'Total') ? 'font-semibold bg-slate-50' : ''}`}
            >
              <td className="py-1.5 px-3 text-slate-700">{r.period}</td>
              <td className="py-1.5 px-3 text-slate-700">{r.sector}</td>
              <td className="py-1.5 px-3 text-right text-slate-700">{formatValue(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
