'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Constants ──────────────────────────────────────────────────────────────────

const PERMANENT_COLOR = '#475569'; // slate-600
const TEMPORARY_COLOR = '#f59e0b'; // amber-500
const TOTAL_COLOR = '#2563eb';     // blue-600

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
  permanent: number | null;
  temporary: number | null;
  tempShare: number | null;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EmployedByPermanencyDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const { allQuarters, byQuarter } = useMemo(() => {
    const qs = new Set<string>();
    const map: Record<string, QuarterData> = {};

    data.forEach(row => {
      const period = row.Year || '';
      if (!period) return;
      qs.add(period);

      if (!map[period]) map[period] = { total: null, permanent: null, temporary: null, tempShare: null };
      const val = getValue(row);
      const perm = row.LFS_JobPermanency || '';

      if (perm === 'Total') map[period].total = val;
      else if (perm === 'Employees with permanent job') map[period].permanent = val;
      else if (perm === 'Employees with temporary  job') map[period].temporary = val;
    });

    // Compute temp_share
    Object.values(map).forEach(d => {
      if (d.temporary != null && d.total != null && d.total > 0) {
        d.tempShare = +((d.temporary / d.total) * 100).toFixed(2);
      }
    });

    const sorted = [...qs].sort(sortQuarters);
    return { allQuarters: sorted, byQuarter: map };
  }, [data]);

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

  // KPI data
  const kpi = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const latest = byQuarter[latestQ];
    if (!latest) return null;

    const yoyQ = sameQuarterLastYear(latestQ);
    const yoyData = byQuarter[yoyQ];

    const calcYoY = (cur: number | null, prev: number | null) =>
      cur != null && prev != null && prev > 0 ? ((cur - prev) / prev) * 100 : null;

    return {
      latestQ,
      latest,
      totalYoY: calcYoY(latest.total, yoyData?.total ?? null),
      permanentYoY: calcYoY(latest.permanent, yoyData?.permanent ?? null),
      temporaryYoY: calcYoY(latest.temporary, yoyData?.temporary ?? null),
    };
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
          {isBg ? 'Динамика на пазара на труда' : 'Labor Market Dynamics'}
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
          <KpiCard
            label={isBg ? `Общо заети (${kpi.latestQ})` : `Total Employment (${kpi.latestQ})`}
            value={kpi.latest.total}
            yoy={kpi.totalYoY}
            unit={isBg ? 'Хиляди лица' : 'Thousand persons'}
            isBg={isBg}
          />
          <KpiCard
            label={isBg ? 'Постоянна заетост' : 'Permanent Jobs'}
            value={kpi.latest.permanent}
            yoy={kpi.permanentYoY}
            unit={isBg ? 'Хиляди лица' : 'Thousand persons'}
            isBg={isBg}
            accentColor={PERMANENT_COLOR}
          />
          <KpiCard
            label={isBg ? 'Временна заетост' : 'Temporary Jobs'}
            value={kpi.latest.temporary}
            yoy={kpi.temporaryYoY}
            unit={isBg ? 'Хиляди лица' : 'Thousand persons'}
            isBg={isBg}
            accentColor={TEMPORARY_COLOR}
            extra={kpi.latest.tempShare != null
              ? `${kpi.latest.tempShare.toFixed(1)}% ${isBg ? 'от общо' : 'of total'}`
              : undefined}
          />
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

        {/* Chart 1: Employment Stability Trends */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Тенденции в стабилността на заетостта' : 'Employment Stability Trends'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Постоянни и общо (лява ос) · Временни (дясна ос) | Хиляди лица'
              : 'Permanent & Total (left axis) · Temporary (right axis) | Thousand Persons'}
          </p>
          <StabilityChart quarters={filteredQuarters} byQuarter={byQuarter} locale={locale} />
        </div>

        {/* Chart 2: Market Agility */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Гъвкавост на пазара на труда' : 'Market Agility'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Дял на временната заетост от общата (%)'
              : 'Temporary employment as share of total (%)'}
          </p>
          <TempShareChart quarters={filteredQuarters} byQuarter={byQuarter} locale={locale} />
        </div>

        {/* Reference Data Table */}
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

// ── KPI Card ────────────────────────────────────────────────────────────────────

function KpiCard({ label, value, yoy, unit, isBg, accentColor, extra }: {
  label: string;
  value: number | null;
  yoy: number | null;
  unit: string;
  isBg: boolean;
  accentColor?: string;
  extra?: string;
}) {
  return (
    <div
      className="bg-white shadow-sm rounded-xl p-5"
      style={accentColor ? { borderLeft: `4px solid ${accentColor}` } : undefined}
    >
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-2 text-slate-900">{formatValue(value)}</p>
      <p className="text-xs text-slate-400 mt-1">{unit}</p>
      {yoy != null && (
        <p className={`text-sm font-semibold mt-2 ${yoy >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
          <span className="text-xs font-normal text-slate-400 ml-1">{isBg ? 'г/г' : 'YoY'}</span>
        </p>
      )}
      {extra && (
        <p className="text-xs font-medium mt-1" style={{ color: accentColor || '#64748b' }}>{extra}</p>
      )}
    </div>
  );
}

// ── Chart 1: Employment Stability (Dual Y-Axis) ────────────────────────────────

function StabilityChart({ quarters, byQuarter, locale }: {
  quarters: string[];
  byQuarter: Record<string, QuarterData>;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current || quarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const totalData = quarters.map(q => byQuarter[q]?.total ?? null);
    const permData = quarters.map(q => byQuarter[q]?.permanent ?? null);
    const tempData = quarters.map(q => byQuarter[q]?.temporary ?? null);

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
              <span style="font-weight:600">${val != null ? formatValue(val) + 'k' : 'N/A'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [
          isBg ? 'Общо' : 'Total',
          isBg ? 'Постоянна заетост' : 'Permanent',
          isBg ? 'Временна заетост' : 'Temporary',
        ],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '4%', bottom: '15%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: quarters,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: isBg ? 'хил. лица' : 'Thousands',
          nameTextStyle: { fontSize: 10, color: '#94a3b8' },
          axisLabel: { fontSize: 10, color: '#94a3b8' },
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
          axisLine: { show: false },
          axisTick: { show: false },
        },
        {
          type: 'value',
          name: isBg ? 'Временни (хил.)' : 'Temporary (000s)',
          nameTextStyle: { fontSize: 10, color: TEMPORARY_COLOR },
          axisLabel: { fontSize: 10, color: TEMPORARY_COLOR },
          splitLine: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
        },
      ],
      series: [
        {
          name: isBg ? 'Общо' : 'Total',
          type: 'line',
          data: totalData,
          yAxisIndex: 0,
          itemStyle: { color: TOTAL_COLOR },
          lineStyle: { width: 2, type: 'dashed' },
          smooth: true,
          symbol: 'none',
          areaStyle: { color: 'rgba(37,99,235,0.04)' },
        },
        {
          name: isBg ? 'Постоянна заетост' : 'Permanent',
          type: 'line',
          data: permData,
          yAxisIndex: 0,
          itemStyle: { color: PERMANENT_COLOR },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'none',
          areaStyle: { color: 'rgba(71,85,105,0.06)' },
        },
        {
          name: isBg ? 'Временна заетост' : 'Temporary',
          type: 'line',
          data: tempData,
          yAxisIndex: 1,
          itemStyle: { color: TEMPORARY_COLOR },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [quarters, byQuarter, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart 2: Temporary Share (Area Chart) ───────────────────────────────────────

function TempShareChart({ quarters, byQuarter, locale }: {
  quarters: string[];
  byQuarter: Record<string, QuarterData>;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current || quarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const shareData = quarters.map(q => byQuarter[q]?.tempShare ?? null);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const q = p.axisValue;
          const d = byQuarter[q];
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${q}</div>`;
          tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${TEMPORARY_COLOR}"></span>
            <span style="flex:1">${isBg ? 'Дял на временната заетост' : 'Temporary share'}</span>
            <span style="font-weight:600">${p.value != null ? Number(p.value).toFixed(1) : 'N/A'}%</span>
          </div>`;
          if (d) {
            tip += `<div style="font-size:11px;color:#64748b;margin-top:4px;border-top:1px solid #e2e8f0;padding-top:4px">
              ${isBg ? 'Временни' : 'Temporary'}: ${formatValue(d.temporary)}k · ${isBg ? 'Общо' : 'Total'}: ${formatValue(d.total)}k
            </div>`;
          }
          return tip;
        },
      },
      grid: { left: '1%', right: '3%', bottom: '8%', top: '6%', containLabel: true },
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
        name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'line',
          data: shareData,
          itemStyle: { color: TEMPORARY_COLOR },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'none',
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245,158,11,0.25)' },
                { offset: 1, color: 'rgba(245,158,11,0.02)' },
              ],
            },
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
            label: { fontSize: 10, color: '#94a3b8', position: 'insideEndTop' },
            data: shareData.length > 0 ? [{
              yAxis: +(shareData.filter(v => v != null) as number[]).reduce((a, b) => a + b, 0) /
                (shareData.filter(v => v != null).length || 1),
              label: { formatter: isBg ? 'Средно' : 'Average' },
            }] : [],
          },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [quarters, byQuarter, isBg]);

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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">
              {isBg ? 'Период' : 'Period'}
            </th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">
              {isBg ? 'Общо' : 'Total'}
            </th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">
              {isBg ? 'Постоянни' : 'Permanent'}
            </th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">
              {isBg ? 'Временни' : 'Temporary'}
            </th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">
              {isBg ? 'Дял врем. (%)' : 'Temp Share (%)'}
            </th>
          </tr>
        </thead>
        <tbody>
          {last4.map((q, i) => {
            const d = byQuarter[q];
            return (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-1.5 px-3 font-medium text-slate-700">{q}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{formatValue(d?.total ?? null)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{formatValue(d?.permanent ?? null)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{formatValue(d?.temporary ?? null)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">
                  {d?.tempShare != null ? `${d.tempShare.toFixed(1)}%` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
