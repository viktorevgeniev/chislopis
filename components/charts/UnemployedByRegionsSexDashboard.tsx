'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Constants ──────────────────────────────────────────────────────────────────

const REGION_CODES = ['BG31', 'BG32', 'BG33', 'BG34', 'BG41', 'BG42'];

const REGION_COLORS: Record<string, string> = {
  BG: '#1e293b',
  BG31: '#ef4444', BG32: '#f59e0b', BG33: '#10b981',
  BG34: '#3b82f6', BG41: '#8b5cf6', BG42: '#ec4899',
};

const REGION_NAMES_BG: Record<string, string> = {
  BG: 'България',
  BG31: 'Северозападен', BG32: 'Северен централен', BG33: 'Североизточен',
  BG34: 'Югоизточен', BG41: 'Югозападен', BG42: 'Южен централен',
};

const GENDER_COLORS: Record<string, string> = { '0': '#0f172a', '1': '#3b82f6', '2': '#e11d48' };

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPersons(row: any): number | null {
  const v = row.Persons;
  if (v == null || v === '' || v === 0) return null;
  return typeof v === 'number' && !isNaN(v) && v > 0 ? v : null;
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

function getGenderLabel(code: string, locale: 'bg' | 'en'): string {
  if (code === '0') return locale === 'bg' ? 'Общо' : 'Total';
  if (code === '1') return locale === 'bg' ? 'Мъже' : 'Male';
  if (code === '2') return locale === 'bg' ? 'Жени' : 'Female';
  return code;
}

function getRegionLabel(code: string, locale: 'bg' | 'en', fallback?: string): string {
  if (locale === 'bg') return REGION_NAMES_BG[code] || fallback || code;
  return fallback || code;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function UnemployedByRegionsSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  // Build region label map from data (English labels from codelists)
  const regionLabels = useMemo(() => {
    const map: Record<string, string> = {};
    data.forEach(d => {
      if (d.NUTS_Code && d.NUTS && !map[d.NUTS_Code]) map[d.NUTS_Code] = d.NUTS;
    });
    return map;
  }, [data]);

  const getRegLabel = (code: string) => getRegionLabel(code, locale, regionLabels[code]);

  // KPI data
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const { year, quarter } = parseQuarter(latestQ);
    const prevQ = allQuarters.length > 1 ? allQuarters[allQuarters.length - 2] : null;
    const yoyQ = `${year - 1}Q${quarter}`;

    const find = (q: string, nuts: string, gender: string) =>
      data.find(d => d.Year === q && d.NUTS_Code === nuts && d.Gender_Code === gender);

    const totalVal = getPersons(find(latestQ, 'BG', '0'));
    const maleVal = getPersons(find(latestQ, 'BG', '1'));
    const femaleVal = getPersons(find(latestQ, 'BG', '2'));

    // QoQ
    const prevTotal = prevQ ? getPersons(find(prevQ, 'BG', '0')) : null;
    const qoqTotal = totalVal != null && prevTotal != null && prevTotal !== 0
      ? ((totalVal - prevTotal) / prevTotal * 100) : null;

    // YoY
    const yoyPrev = getPersons(find(yoyQ, 'BG', '0'));
    const yoyTotal = totalVal != null && yoyPrev != null && yoyPrev !== 0
      ? ((totalVal - yoyPrev) / yoyPrev * 100) : null;

    // Highest / lowest region
    type RegionKpi = { code: string; val: number } | null;
    let highest: RegionKpi = null;
    let lowest: RegionKpi = null;
    REGION_CODES.forEach(rc => {
      const v = getPersons(find(latestQ, rc, '0'));
      if (v == null) return;
      if (!highest || v > highest.val) highest = { code: rc, val: v };
      if (!lowest || v < lowest.val) lowest = { code: rc, val: v };
    });

    return { latestQ, totalVal, maleVal, femaleVal, qoqTotal, yoyTotal, highest: highest as RegionKpi, lowest: lowest as RegionKpi };
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
          {isBg ? 'Безработни лица по статистически райони и пол' : 'Unemployed Persons by Statistical Regions & Sex'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: Хиляди лица`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: Thousands of Persons`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            title={isBg ? 'Общо безработни' : 'Total Unemployed'}
            value={kpiData.totalVal}
            subtitle={kpiData.latestQ}
            accentColor="text-slate-900"
            locale={locale}
            qoqChange={kpiData.qoqTotal}
            yoyChange={kpiData.yoyTotal}
          />
          <KpiCard
            title={isBg ? 'Мъже / Жени' : 'Male / Female'}
            value={null}
            customValue={
              kpiData.maleVal != null && kpiData.femaleVal != null
                ? `${kpiData.maleVal.toFixed(1)} / ${kpiData.femaleVal.toFixed(1)}`
                : '—'
            }
            subtitle={`${isBg ? 'хил. души' : 'thousands'} — ${kpiData.latestQ}`}
            accentColor="text-slate-700"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Най-висока' : 'Highest Region'}
            value={kpiData.highest?.val ?? null}
            subtitle={kpiData.highest ? getRegLabel(kpiData.highest.code) : '—'}
            accentColor="text-red-600"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Най-ниска' : 'Lowest Region'}
            value={kpiData.lowest?.val ?? null}
            subtitle={kpiData.lowest ? getRegLabel(kpiData.lowest.code) : '—'}
            accentColor="text-emerald-600"
            locale={locale}
          />
        </div>

        {/* Chart A: National Trend by Gender */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Национални тенденции по пол' : 'A. National Unemployment Trends'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Безработни лица на национално ниво (хил. души)' : 'Total, Male, Female — national level (thousands)'}
          </p>
          <NationalTrendsChart data={data} allQuarters={allQuarters} locale={locale} />
        </div>

        {/* Charts B & C */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Регионални различия' : 'B. Regional Unemployment Disparities'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Безработни по региони (низходящо)' : 'Unemployed by region (descending)'}
            </p>
            <RegionalBarChart data={data} allQuarters={allQuarters} locale={locale} getRegLabel={getRegLabel} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Разпределение по пол и регион' : 'C. Gender Distribution by Region'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Мъже и жени за избрано тримесечие' : 'Male and Female for selected quarter'}
            </p>
            <GenderStackedBarChart data={data} allQuarters={allQuarters} locale={locale} getRegLabel={getRegLabel} />
          </div>
        </div>

        {/* Chart D: Regional Trends */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Г. Регионални тенденции' : 'D. Regional Trends Over Time'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Безработни лица по региони (хил. души)' : 'Unemployed by region over time (thousands)'}
          </p>
          <RegionalTrendsChart data={data} allQuarters={allQuarters} locale={locale} getRegLabel={getRegLabel} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ title, value, customValue, subtitle, accentColor, locale, badge, qoqChange, yoyChange }: {
  title: string;
  value: number | null;
  customValue?: string;
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
        {customValue ?? formatValue(value)}
      </p>
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

// ── Chart A: National Trends by Gender ─────────────────────────────────────────

function NationalTrendsChart({ data, allQuarters, locale }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const byGender: Record<string, Record<string, number | null>> = { '0': {}, '1': {}, '2': {} };

    data.forEach(row => {
      if (!row.Year || row.NUTS_Code !== 'BG') return;
      byGender[row.Gender_Code][row.Year] = getPersons(row);
    });

    return Object.fromEntries(
      Object.entries(byGender).map(([gc, qMap]) => [gc, allQuarters.map(q => qMap[q] ?? null)])
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
        data: ['0', '1', '2'].map(gc => getGenderLabel(gc, locale)),
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
      series: ['0', '1', '2'].map(gc => ({
        name: getGenderLabel(gc, locale),
        type: 'line' as const,
        data: seriesData[gc],
        itemStyle: { color: GENDER_COLORS[gc] },
        lineStyle: { width: gc === '0' ? 2.5 : 2 },
        smooth: true,
        symbol: 'none' as const,
        emphasis: { lineStyle: { width: gc === '0' ? 3.5 : 3 } },
        connectNulls: false,
      })),
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, seriesData, isBg, locale]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart B: Regional Disparities Bar Chart ────────────────────────────────────

function RegionalBarChart({ data, allQuarters, locale, getRegLabel }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  getRegLabel: (code: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const isBg = locale === 'bg';

  useEffect(() => {
    if (allQuarters.length > 0 && !selectedQuarter) {
      setSelectedQuarter(allQuarters[allQuarters.length - 1]);
    }
  }, [allQuarters, selectedQuarter]);

  const barData = useMemo(() => {
    const quarter = selectedQuarter || allQuarters[allQuarters.length - 1];
    return REGION_CODES.map(rc => {
      const row = data.find(d => d.Year === quarter && d.NUTS_Code === rc && d.Gender_Code === '0');
      return { code: rc, label: getRegLabel(rc), value: row ? (getPersons(row) ?? 0) : 0 };
    }).sort((a, b) => b.value - a.value);
  }, [data, allQuarters, selectedQuarter, getRegLabel]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const reversed = [...barData].reverse();

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          const d = Array.isArray(params) ? params[0] : params;
          if (!d) return '';
          const val = Number(d.value);
          return `<div style="font-weight:600;margin-bottom:2px">${d.name}</div>
            <div>${val > 0 ? formatFullValue(val) : '—'}</div>`;
        },
      },
      grid: { left: '3%', right: '12%', bottom: '5%', top: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? 'хил. души' : 'Thousands',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: reversed.map(d => d.label),
        axisLabel: { fontSize: 11, color: '#334155' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: reversed.map(d => ({
          value: d.value,
          itemStyle: { color: REGION_COLORS[d.code] || '#94a3b8', borderRadius: [0, 4, 4, 0] },
        })),
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          fontWeight: 600,
          color: '#334155',
          formatter: (p: any) => p.value > 0 ? `${Number(p.value).toFixed(1)}k` : '',
        },
      }],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg]);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="ub-reg-q" className="text-xs font-medium text-slate-500">
            {isBg ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="ub-reg-q" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[120px] text-sm">
            {[...allQuarters].reverse().map(q => <option key={q} value={q}>{q}</option>)}
          </Select>
        </div>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '280px' }} />
    </div>
  );
}

// ── Chart C: Gender Stacked Bar by Region ──────────────────────────────────────

function GenderStackedBarChart({ data, allQuarters, locale, getRegLabel }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  getRegLabel: (code: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const isBg = locale === 'bg';

  useEffect(() => {
    if (allQuarters.length > 0 && !selectedQuarter) {
      setSelectedQuarter(allQuarters[allQuarters.length - 1]);
    }
  }, [allQuarters, selectedQuarter]);

  const barData = useMemo(() => {
    const quarter = selectedQuarter || allQuarters[allQuarters.length - 1];
    return REGION_CODES.map(rc => {
      const maleRow = data.find(d => d.Year === quarter && d.NUTS_Code === rc && d.Gender_Code === '1');
      const femaleRow = data.find(d => d.Year === quarter && d.NUTS_Code === rc && d.Gender_Code === '2');
      const male = maleRow ? (getPersons(maleRow) ?? 0) : 0;
      const female = femaleRow ? (getPersons(femaleRow) ?? 0) : 0;
      return { code: rc, label: getRegLabel(rc), male, female, total: male + female };
    }).sort((a, b) => b.total - a.total);
  }, [data, allQuarters, selectedQuarter, getRegLabel]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const reversed = [...barData].reverse();

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
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].name}</div>`;
          let total = 0;
          params.forEach((p: any) => {
            const val = Number(p.value);
            total += val;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val > 0 ? formatFullValue(val) : '—'}</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${formatFullValue(total)}</div>`;
          return tip;
        },
      },
      legend: {
        data: [getGenderLabel('1', locale), getGenderLabel('2', locale)],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '3%', right: '4%', bottom: '12%', top: '3%', containLabel: true },
      yAxis: {
        type: 'category',
        data: reversed.map(d => d.label),
        axisLabel: { fontSize: 11, color: '#334155' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      xAxis: {
        type: 'value',
        name: isBg ? 'хил. души' : 'Thousands',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      },
      series: [
        {
          name: getGenderLabel('1', locale),
          type: 'bar',
          stack: 'gender',
          data: reversed.map(d => d.male),
          itemStyle: { color: '#3b82f6' },
        },
        {
          name: getGenderLabel('2', locale),
          type: 'bar',
          stack: 'gender',
          data: reversed.map(d => d.female),
          itemStyle: { color: '#ec4899', borderRadius: [0, 4, 4, 0] },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg, locale]);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="ub-gen-q" className="text-xs font-medium text-slate-500">
            {isBg ? 'Тримесечие' : 'Quarter'}
          </label>
          <Select id="ub-gen-q" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[120px] text-sm">
            {[...allQuarters].reverse().map(q => <option key={q} value={q}>{q}</option>)}
          </Select>
        </div>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '280px' }} />
    </div>
  );
}

// ── Chart D: Regional Trends Over Time ─────────────────────────────────────────

function RegionalTrendsChart({ data, allQuarters, locale, getRegLabel }: {
  data: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
  getRegLabel: (code: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedGender, setSelectedGender] = useState<string>('0');
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const byRegion: Record<string, Record<string, number | null>> = {};
    REGION_CODES.forEach(rc => { byRegion[rc] = {}; });

    data.forEach(row => {
      if (!row.Year || !REGION_CODES.includes(row.NUTS_Code) || row.Gender_Code !== selectedGender) return;
      byRegion[row.NUTS_Code][row.Year] = getPersons(row);
    });

    return Object.fromEntries(
      Object.entries(byRegion).map(([rc, qMap]) => [rc, allQuarters.map(q => qMap[q] ?? null)])
    );
  }, [data, allQuarters, selectedGender]);

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
          const sorted = [...params].sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0));
          sorted.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? `${val.toFixed(1)}k` : '—'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: REGION_CODES.map(rc => getRegLabel(rc)),
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
      series: REGION_CODES.map(rc => ({
        name: getRegLabel(rc),
        type: 'line' as const,
        data: seriesData[rc],
        itemStyle: { color: REGION_COLORS[rc] },
        lineStyle: { width: 2 },
        smooth: true,
        symbol: 'none' as const,
        emphasis: { lineStyle: { width: 3 } },
        connectNulls: false,
      })),
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, seriesData, isBg, locale, getRegLabel]);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="ub-trend-g" className="text-xs font-medium text-slate-500">
            {isBg ? 'Пол' : 'Gender'}
          </label>
          <Select id="ub-trend-g" value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className="w-[120px] text-sm">
            <option value="0">{getGenderLabel('0', locale)}</option>
            <option value="1">{getGenderLabel('1', locale)}</option>
            <option value="2">{getGenderLabel('2', locale)}</option>
          </Select>
        </div>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '380px' }} />
    </div>
  );
}
