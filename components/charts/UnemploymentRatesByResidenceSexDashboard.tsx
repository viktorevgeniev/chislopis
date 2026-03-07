'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRate(row: any): number | null {
  if (row.Rate == null || row.Rate === '' || row.Rate === '..' || row.Rate === 'null') return null;
  const v = typeof row.Rate === 'number' ? row.Rate : parseFloat(row.Rate);
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

function getGenderLabel(code: string, locale: 'bg' | 'en'): string {
  if (code === '0') return locale === 'bg' ? 'Общо' : 'Total';
  if (code === '1') return locale === 'bg' ? 'Мъже' : 'Male';
  if (code === '2') return locale === 'bg' ? 'Жени' : 'Female';
  return code;
}

function getResidenceLabel(code: string, locale: 'bg' | 'en'): string {
  if (code === '0') return locale === 'bg' ? 'Общо' : 'Total';
  if (code === '1') return locale === 'bg' ? 'Град' : 'Urban';
  if (code === '2') return locale === 'bg' ? 'Село' : 'Rural';
  return code;
}

// Colors
const GENDER_COLORS: Record<string, string> = { '0': '#0f172a', '1': '#3b82f6', '2': '#e11d48' };
const RESIDENCE_COLORS: Record<string, string> = { '0': '#0f172a', '1': '#3b82f6', '2': '#f59e0b' };

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function UnemploymentRatesByResidenceSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const [groupBy, setGroupBy] = useState<'gender' | 'residence'>('gender');

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  const find = (quarter: string, gender: string, residence: string) =>
    data.find(d => d.Year === quarter && d.Gender_Code === gender && d.Residence_Code === residence);

  // KPI data
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const { year, quarter } = parseQuarter(latestQ);
    const prevQ = allQuarters.length > 1 ? allQuarters[allQuarters.length - 2] : null;
    const yoyQ = `${year - 1}Q${quarter}`;

    const totalRate = getRate(find(latestQ, '0', '0'));
    const urbanRate = getRate(find(latestQ, '0', '1'));
    const ruralRate = getRate(find(latestQ, '0', '2'));
    const maleRate = getRate(find(latestQ, '1', '0'));
    const femaleRate = getRate(find(latestQ, '2', '0'));

    // QoQ change
    const prevTotal = prevQ ? getRate(find(prevQ, '0', '0')) : null;
    const qoqChange = totalRate != null && prevTotal != null ? totalRate - prevTotal : null;

    // YoY change
    const yoyPrev = getRate(find(yoyQ, '0', '0'));
    const yoyChange = totalRate != null && yoyPrev != null ? totalRate - yoyPrev : null;

    // Urban–Rural gap
    const urbanRuralGap = urbanRate != null && ruralRate != null ? ruralRate - urbanRate : null;

    // Gender gap
    const genderGap = maleRate != null && femaleRate != null ? femaleRate - maleRate : null;

    return {
      latestQ, totalRate, urbanRate, ruralRate, maleRate, femaleRate,
      qoqChange, yoyChange, urbanRuralGap, genderGap,
    };
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
          {isBg ? 'Коефициенти на безработица по местоживеене и пол' : 'Unemployment Rates by Residence & Sex'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: %`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: %`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <KpiCard
            title={isBg ? 'Национално' : 'National Avg.'}
            value={kpiData.totalRate}
            subtitle={kpiData.latestQ}
            accentColor="text-slate-900"
            locale={locale}
            qoqChange={kpiData.qoqChange}
            yoyChange={kpiData.yoyChange}
          />
          <KpiCard
            title={isBg ? 'Град' : 'Urban'}
            value={kpiData.urbanRate}
            subtitle={kpiData.latestQ}
            accentColor="text-blue-600"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Село' : 'Rural'}
            value={kpiData.ruralRate}
            subtitle={kpiData.latestQ}
            accentColor="text-amber-600"
            locale={locale}
            badge={kpiData.urbanRuralGap != null
              ? `${kpiData.urbanRuralGap > 0 ? '+' : ''}${kpiData.urbanRuralGap.toFixed(1)}pp ${isBg ? 'vs Град' : 'vs Urban'}`
              : undefined}
          />
        </div>

        {/* Chart A: Trend Line Chart with groupBy toggle */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-slate-700">
              {isBg ? 'А. Тенденции на безработицата' : 'A. Unemployment Rate Trends'}
            </h3>
            <div className="flex gap-1 bg-slate-50 rounded-lg p-0.5">
              <button
                onClick={() => setGroupBy('gender')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  groupBy === 'gender' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {isBg ? 'По пол' : 'By Sex'}
              </button>
              <button
                onClick={() => setGroupBy('residence')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  groupBy === 'residence' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {isBg ? 'По местоживеене' : 'By Residence'}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            {groupBy === 'gender'
              ? (isBg ? 'Коефициент на безработица: Общо, Мъже, Жени' : 'Unemployment rate: Total, Male, Female')
              : (isBg ? 'Коефициент на безработица: Общо, Град, Село' : 'Unemployment rate: Total, Urban, Rural')}
          </p>
          <TrendsChart data={data} allQuarters={allQuarters} locale={locale} groupBy={groupBy} />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Град vs Село по пол' : 'B. Urban vs Rural by Sex'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? `Последно тримесечие: ${kpiData.latestQ}` : `Latest quarter: ${kpiData.latestQ}`}
            </p>
            <ResidenceGenderBarChart data={data} allQuarters={allQuarters} latestQ={kpiData.latestQ} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Разлика Град – Село' : 'C. Urban–Rural Gap'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Тримесечна тенденция на разликата (pp)' : 'Quarterly gap trend (percentage points)'}
            </p>
            <UrbanRuralGapChart data={data} allQuarters={allQuarters} locale={locale} />
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
      <p className={`text-3xl font-bold mt-2 ${accentColor}`}>
        {value != null ? `${value.toFixed(1)}%` : '—'}
      </p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <p className="text-xs text-slate-400">{subtitle}</p>
        {qoqChange != null && (
          <span className={`text-xs font-semibold ${qoqChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {qoqChange <= 0 ? '▼' : '▲'} {Math.abs(qoqChange).toFixed(1)}pp {isBg ? 'кв/кв' : 'QoQ'}
          </span>
        )}
        {yoyChange != null && (
          <span className={`text-xs font-semibold ${yoyChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {yoyChange <= 0 ? '▼' : '▲'} {Math.abs(yoyChange).toFixed(1)}pp {isBg ? 'г/г' : 'YoY'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Chart A: Trends (Line Chart with groupBy toggle) ──────────────────────────

function TrendsChart({ data, allQuarters, locale, groupBy }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  groupBy: 'gender' | 'residence';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    if (groupBy === 'gender') {
      // Group by gender, filter Residence=Total
      const byGender: Record<string, Record<string, number | null>> = { '0': {}, '1': {}, '2': {} };
      data.forEach(row => {
        if (!row.Year || row.Residence_Code !== '0') return;
        byGender[row.Gender_Code][row.Year] = getRate(row);
      });
      return ['0', '1', '2'].map(gc => ({
        code: gc,
        name: getGenderLabel(gc, locale),
        color: GENDER_COLORS[gc],
        values: allQuarters.map(q => byGender[gc][q] ?? null),
        width: gc === '0' ? 2.5 : 2,
      }));
    } else {
      // Group by residence, filter Gender=Total
      const byRes: Record<string, Record<string, number | null>> = { '0': {}, '1': {}, '2': {} };
      data.forEach(row => {
        if (!row.Year || row.Gender_Code !== '0') return;
        byRes[row.Residence_Code][row.Year] = getRate(row);
      });
      return ['0', '1', '2'].map(rc => ({
        code: rc,
        name: getResidenceLabel(rc, locale),
        color: RESIDENCE_COLORS[rc],
        values: allQuarters.map(q => byRes[rc][q] ?? null),
        width: rc === '0' ? 2.5 : 2,
      }));
    }
  }, [data, allQuarters, groupBy, locale]);

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
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? val.toFixed(1) + '%' : '—'}</span>
            </div>`;
          });
          // Show gap if grouped by residence
          if (groupBy === 'residence') {
            const urbanVal = params.find((p: any) => p.seriesName === getResidenceLabel('1', locale))?.value;
            const ruralVal = params.find((p: any) => p.seriesName === getResidenceLabel('2', locale))?.value;
            if (urbanVal != null && ruralVal != null) {
              const gap = ruralVal - urbanVal;
              tip += `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${isBg ? 'Разлика Село–Град' : 'Rural–Urban gap'}: ${gap > 0 ? '+' : ''}${gap.toFixed(1)}pp</div>`;
            }
          }
          // Show gap if grouped by gender
          if (groupBy === 'gender') {
            const maleVal = params.find((p: any) => p.seriesName === getGenderLabel('1', locale))?.value;
            const femaleVal = params.find((p: any) => p.seriesName === getGenderLabel('2', locale))?.value;
            if (maleVal != null && femaleVal != null) {
              const gap = femaleVal - maleVal;
              tip += `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${isBg ? 'Разлика по пол' : 'Gender gap'}: ${gap > 0 ? '+' : ''}${gap.toFixed(1)}pp</div>`;
            }
          }
          return tip;
        },
      },
      legend: {
        data: seriesData.map(s => s.name),
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
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: seriesData.map(s => ({
        name: s.name,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: s.width },
        smooth: true,
        symbol: 'none' as const,
        emphasis: { focus: 'series' as const, lineStyle: { width: s.width + 1 } },
      })),
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, seriesData, isBg, groupBy, locale]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ── Chart B: Grouped Bar — Residence × Gender ─────────────────────────────────

function ResidenceGenderBarChart({ data, allQuarters, latestQ, locale }: {
  data: any[];
  allQuarters: string[];
  latestQ: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [selectedQ, setSelectedQ] = useState(latestQ);

  useEffect(() => {
    if (latestQ && !selectedQ) setSelectedQ(latestQ);
  }, [latestQ, selectedQ]);

  const barData = useMemo(() => {
    const quarter = selectedQ || latestQ;
    // X-axis: Urban, Rural. Groups: Male, Female
    const findRate = (gender: string, residence: string) => {
      const row = data.find(d =>
        d.Year === quarter && d.Gender_Code === gender && d.Residence_Code === residence
      );
      return row ? getRate(row) : null;
    };
    return {
      urban: { male: findRate('1', '1'), female: findRate('2', '1') },
      rural: { male: findRate('1', '2'), female: findRate('2', '2') },
    };
  }, [data, selectedQ, latestQ]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const categories = [getResidenceLabel('1', locale), getResidenceLabel('2', locale)];

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
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue} — ${selectedQ || latestQ}</div>`;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? val.toFixed(1) + '%' : '—'}</span>
            </div>`;
          });
          // Gap
          const m = params.find((p: any) => p.seriesName === getGenderLabel('1', locale))?.value;
          const f = params.find((p: any) => p.seriesName === getGenderLabel('2', locale))?.value;
          if (m != null && f != null) {
            const gap = f - m;
            tip += `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${isBg ? 'Разлика по пол' : 'Gender gap'}: ${gap > 0 ? '+' : ''}${gap.toFixed(1)}pp</div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [getGenderLabel('1', locale), getGenderLabel('2', locale)],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '3%', right: '3%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { fontSize: 12, color: '#334155', fontWeight: 600 },
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
          name: getGenderLabel('1', locale),
          type: 'bar',
          data: [barData.urban.male, barData.rural.male],
          itemStyle: { color: GENDER_COLORS['1'], borderRadius: [4, 4, 0, 0] },
          barGap: '20%',
          barCategoryGap: '40%',
          label: {
            show: true,
            position: 'top',
            fontSize: 11,
            fontWeight: 'bold',
            color: '#334155',
            formatter: (p: any) => p.value != null ? p.value.toFixed(1) + '%' : '',
          },
        },
        {
          name: getGenderLabel('2', locale),
          type: 'bar',
          data: [barData.urban.female, barData.rural.female],
          itemStyle: { color: GENDER_COLORS['2'], borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'top',
            fontSize: 11,
            fontWeight: 'bold',
            color: '#334155',
            formatter: (p: any) => p.value != null ? p.value.toFixed(1) + '%' : '',
          },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg, selectedQ, latestQ, locale]);

  return (
    <div>
      <div className="mb-2">
        <select
          value={selectedQ}
          onChange={e => setSelectedQ(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300"
        >
          {[...allQuarters].reverse().map(q => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '320px' }} />
    </div>
  );
}

// ── Chart C: Urban–Rural Gap Over Time (Area) ─────────────────────────────────

function UrbanRuralGapChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { gapValues, urbanValues, ruralValues } = useMemo(() => {
    const urbanByQ: Record<string, number | null> = {};
    const ruralByQ: Record<string, number | null> = {};

    data.forEach(row => {
      if (!row.Year || row.Gender_Code !== '0') return;
      if (row.Residence_Code === '1') urbanByQ[row.Year] = getRate(row);
      else if (row.Residence_Code === '2') ruralByQ[row.Year] = getRate(row);
    });

    return {
      urbanValues: allQuarters.map(q => urbanByQ[q] ?? null),
      ruralValues: allQuarters.map(q => ruralByQ[q] ?? null),
      gapValues: allQuarters.map(q => {
        const u = urbanByQ[q];
        const r = ruralByQ[q];
        return u != null && r != null ? r - u : null;
      }),
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
          const qLabel = params[0].axisValue;
          const qi = allQuarters.indexOf(qLabel);
          const urban = qi >= 0 ? urbanValues[qi] : null;
          const rural = qi >= 0 ? ruralValues[qi] : null;
          const gap = qi >= 0 ? gapValues[qi] : null;

          return `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${qLabel}</div>
            <div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${RESIDENCE_COLORS['2']}"></span>
              <span style="flex:1">${isBg ? 'Село' : 'Rural'}</span>
              <span style="font-weight:600">${rural != null ? rural.toFixed(1) + '%' : '—'}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${RESIDENCE_COLORS['1']}"></span>
              <span style="flex:1">${isBg ? 'Град' : 'Urban'}</span>
              <span style="font-weight:600">${urban != null ? urban.toFixed(1) + '%' : '—'}</span>
            </div>
            <div style="font-size:11px;font-weight:600;margin-top:4px;padding-top:4px;border-top:1px solid #e2e8f0;color:#0f172a">
              ${isBg ? 'Разлика (Село – Град)' : 'Gap (Rural – Urban)'}: ${gap != null ? gap.toFixed(1) + ' pp' : '—'}
            </div>`;
        },
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
        name: 'pp',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        name: isBg ? 'Разлика (pp)' : 'Gap (pp)',
        type: 'line',
        data: gapValues,
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245,158,11,0.25)' },
              { offset: 1, color: 'rgba(245,158,11,0.02)' },
            ],
          },
        },
        itemStyle: { color: '#f59e0b' },
        lineStyle: { width: 2.5, color: '#f59e0b' },
        smooth: true,
        symbol: 'none',
        connectNulls: true,
      }],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, gapValues, urbanValues, ruralValues, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}
