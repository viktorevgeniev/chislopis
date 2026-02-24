'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Helpers ──────────────────────────────────────────────────────────────────────

function getVal(row: any): number | null {
  const v = row.Persons;
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const cleaned = typeof v === 'string' ? v.replace(/[()]/g, '') : v;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseQuarter(q: string): { year: number; quarter: number } {
  const m = q.match(/^(\d{4})Q(\d)$/);
  if (!m) return { year: 0, quarter: 0 };
  return { year: parseInt(m[1]), quarter: parseInt(m[2]) };
}

function sortQuarters(a: string, b: string): number {
  const pa = parseQuarter(a); const pb = parseQuarter(b);
  return pa.year !== pb.year ? pa.year - pb.year : pa.quarter - pb.quarter;
}

function fmtVal(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k';
}

// ── Types ────────────────────────────────────────────────────────────────────────

interface DashboardProps { data: any[]; dataset: Dataset; locale?: 'bg' | 'en'; }

// ── Colours ──────────────────────────────────────────────────────────────────────

const REGION_COLORS: Record<string, string> = {
  BG31: '#2563eb',
  BG32: '#059669',
  BG33: '#d97706',
  BG34: '#e11d48',
  BG41: '#7c3aed',
  BG42: '#0891b2',
};

const GENDER_COLORS = {
  total: '#334155',
  male: '#2563eb',
  female: '#e11d48',
};

const REGION_NAMES_EN: Record<string, string> = {
  BG31: 'Severozapaden',
  BG32: 'Severen tsentralen',
  BG33: 'Severoiztochen',
  BG34: 'Yugoiztochen',
  BG41: 'Yugozapaden',
  BG42: 'Yuzhen tsentralen',
};

const REGION_NAMES_BG: Record<string, string> = {
  BG31: 'Северозападен',
  BG32: 'Северен централен',
  BG33: 'Североизточен',
  BG34: 'Югоизточен',
  BG41: 'Югозападен',
  BG42: 'Южен централен',
};

const REGION_CODES = ['BG31', 'BG32', 'BG33', 'BG34', 'BG41', 'BG42'];

// ── Main ─────────────────────────────────────────────────────────────────────────

export function LabourForceByRegionsSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const regionNames = isBg ? REGION_NAMES_BG : REGION_NAMES_EN;

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  // Build lookup: quarter → nuts_code → age_code → gender_code → value
  const lookup = useMemo(() => {
    const map: Record<string, Record<string, Record<string, Record<string, number | null>>>> = {};
    data.forEach(row => {
      const q = row.Year;
      const nuts = row.NUTS_Code;
      const age = row.Age10_LFS_Code;
      const gen = row.Gender_Code;
      if (!q || nuts == null || age == null || gen == null) return;
      if (!map[q]) map[q] = {};
      if (!map[q][nuts]) map[q][nuts] = {};
      if (!map[q][nuts][age]) map[q][nuts][age] = {};
      map[q][nuts][age][gen] = getVal(row);
    });
    return map;
  }, [data]);

  const getValue = (q: string, nuts: string, age: string, gen: string): number | null => {
    return lookup[q]?.[nuts]?.[age]?.[gen] ?? null;
  };

  // KPI
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const latestP = parseQuarter(latestQ);
    const yoyQ = `${latestP.year - 1}Q${latestP.quarter}`;

    const totalVal = getValue(latestQ, 'BG', '0', '0');
    const prevVal = allQuarters.includes(yoyQ) ? getValue(yoyQ, 'BG', '0', '0') : null;
    const yoyChange = totalVal != null && prevVal != null && prevVal > 0
      ? ((totalVal - prevVal) / prevVal * 100) : null;

    const maleVal = getValue(latestQ, 'BG', '0', '1');
    const femaleVal = getValue(latestQ, 'BG', '0', '2');
    const malePct = maleVal != null && totalVal != null && totalVal > 0
      ? (maleVal / totalVal * 100) : null;

    // Largest region
    let maxRegion = '';
    let maxVal = -1;
    REGION_CODES.forEach(code => {
      const v = getValue(latestQ, code, '0', '0');
      if (v != null && v > maxVal) { maxVal = v; maxRegion = code; }
    });

    return { latestQ, totalVal, yoyChange, malePct, maleVal, femaleVal, maxRegion, maxVal };
  }, [allQuarters, lookup]);

  if (!data || data.length === 0 || !kpiData) {
    return <div className="text-center py-8 text-muted-foreground">{isBg ? 'Няма данни' : 'No data available'}</div>;
  }

  const firstYear = parseQuarter(allQuarters[0]).year;
  const lastYear = parseQuarter(allQuarters[allQuarters.length - 1]).year;

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">{dataset.title[locale]}</CardTitle>
        <CardDescription className="text-slate-500">
          {isBg ? `Тримесечни данни (${firstYear}–${lastYear}) | Хиляди лица`
            : `Quarterly Data (${firstYear}–${lastYear}) | Thousands of Persons`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Работна сила (${kpiData.latestQ})` : `Labour Force (${kpiData.latestQ})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">{fmtVal(kpiData.totalVal)}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Промяна г/г' : 'YoY Growth'}
            </p>
            <p className={`text-3xl font-bold mt-2 ${kpiData.yoyChange != null ? (kpiData.yoyChange >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-300'}`}>
              {kpiData.yoyChange != null ? `${kpiData.yoyChange >= 0 ? '+' : ''}${kpiData.yoyChange.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'спрямо същото тримесечие' : 'vs same quarter prev. year'}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? '% Мъже' : '% Male'}
            </p>
            <p className="text-3xl font-bold mt-2 text-blue-700">
              {kpiData.malePct != null ? kpiData.malePct.toFixed(1) + '%' : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'от общата работна сила' : 'of total labour force'}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-голям район' : 'Largest Region'}
            </p>
            <p className="text-2xl font-bold mt-2 text-violet-700">
              {regionNames[kpiData.maxRegion] || '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{fmtVal(kpiData.maxVal)}</p>
          </div>
        </div>

        {/* Chart A: National trend with gender split toggle */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Обща тенденция на работната сила' : 'A. National Labour Force Trend'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Национално ниво с възможност за разделяне по пол или район' : 'National level with gender/region split toggle'}
          </p>
          <TrendChart allQuarters={allQuarters} getValue={getValue} locale={locale} regionNames={regionNames} />
        </div>

        {/* Chart B: Regional comparison bar */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? `Б. Сравнение по райони (${kpiData.latestQ})` : `B. Regional Comparison (${kpiData.latestQ})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Работна сила по статистически райони за избрано тримесечие' : 'Labour force by statistical regions for selected quarter'}
          </p>
          <RegionalBarChart allQuarters={allQuarters} getValue={getValue} locale={locale} regionNames={regionNames} />
        </div>

        {/* Charts C & D side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? `В. Разпределение по пол (${kpiData.latestQ})` : `C. Gender Composition (${kpiData.latestQ})`}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Мъже и жени в работната сила (15-64 г.)' : 'Male vs Female labour force (15-64 years)'}
            </p>
            <GenderPieChart latestQ={kpiData.latestQ} getValue={getValue} locale={locale} regionNames={regionNames} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Г. Регионална динамика' : 'D. Regional Dynamics'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Промяна на работната сила по райони във времето' : 'Labour force change by region over time'}
            </p>
            <RegionalTrendChart allQuarters={allQuarters} getValue={getValue} locale={locale} regionNames={regionNames} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Trend with toggle (Total / Gender / Regions) ────────────────────────

type SplitMode = 'total' | 'gender' | 'region';

function TrendChart({ allQuarters, getValue, locale, regionNames }: {
  allQuarters: string[];
  getValue: (q: string, nuts: string, age: string, gen: string) => number | null;
  locale: 'bg' | 'en';
  regionNames: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [splitMode, setSplitMode] = useState<SplitMode>('total');

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const brushStart = Math.max(0, Math.round((1 - 40 / allQuarters.length) * 100));

    let series: any[] = [];
    let legendData: string[] = [];

    if (splitMode === 'total') {
      const totalLabel = isBg ? 'Работна сила' : 'Labour Force';
      legendData = [totalLabel];
      series = [{
        name: totalLabel,
        type: 'line',
        data: allQuarters.map(q => getValue(q, 'BG', '0', '0')),
        itemStyle: { color: GENDER_COLORS.total },
        lineStyle: { width: 2.5 },
        areaStyle: { opacity: 0.08 },
        smooth: true,
        symbol: 'none',
        markLine: {
          silent: true,
          lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
          data: [{ type: 'average', name: isBg ? 'Средно' : 'Average' }],
          label: { fontSize: 10, color: '#94a3b8' },
        },
      }];
    } else if (splitMode === 'gender') {
      const maleLabel = isBg ? 'Мъже' : 'Male';
      const femaleLabel = isBg ? 'Жени' : 'Female';
      legendData = [maleLabel, femaleLabel];
      series = [
        {
          name: maleLabel,
          type: 'line', stack: 'gender',
          areaStyle: { opacity: 0.55 },
          data: allQuarters.map(q => getValue(q, 'BG', '0', '1')),
          itemStyle: { color: GENDER_COLORS.male },
          lineStyle: { width: 1.5 },
          smooth: true, symbol: 'none',
          emphasis: { focus: 'series' as const },
        },
        {
          name: femaleLabel,
          type: 'line', stack: 'gender',
          areaStyle: { opacity: 0.55 },
          data: allQuarters.map(q => getValue(q, 'BG', '0', '2')),
          itemStyle: { color: GENDER_COLORS.female },
          lineStyle: { width: 1.5 },
          smooth: true, symbol: 'none',
          emphasis: { focus: 'series' as const },
        },
      ];
    } else {
      legendData = REGION_CODES.map(c => regionNames[c]);
      series = REGION_CODES.map(code => ({
        name: regionNames[code],
        type: 'line',
        data: allQuarters.map(q => getValue(q, code, '0', '0')),
        itemStyle: { color: REGION_COLORS[code] },
        lineStyle: { width: 2 },
        smooth: true,
        symbol: 'none',
        emphasis: { focus: 'series' as const },
      }));
    }

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${p.value != null ? Number(p.value).toFixed(1) : 'N/A'} ${isBg ? 'хил.' : 'K'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: legendData,
        bottom: 0, textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: brushStart, end: 100 },
        { type: 'slider', start: brushStart, end: 100, height: 18, bottom: 24, borderColor: '#cbd5e1' },
      ],
      xAxis: {
        type: 'category', boundaryGap: false, data: allQuarters,
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: string) => { const p = parseQuarter(v); return p.quarter === 1 ? String(p.year) : ''; } },
        axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false },
      },
      yAxis: {
        type: 'value', name: isBg ? 'хил.' : 'K',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series,
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [allQuarters, getValue, splitMode, isBg, regionNames]);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(['total', 'gender', 'region'] as SplitMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setSplitMode(mode)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              splitMode === mode
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {mode === 'total' ? (isBg ? 'Общо' : 'Total')
              : mode === 'gender' ? (isBg ? 'По пол' : 'By Sex')
              : (isBg ? 'По райони' : 'By Region')}
          </button>
        ))}
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
    </div>
  );
}

// ── Chart B: Regional Bar (with quarter selector) ────────────────────────────────

function RegionalBarChart({ allQuarters, getValue, locale, regionNames }: {
  allQuarters: string[];
  getValue: (q: string, nuts: string, age: string, gen: string) => number | null;
  locale: 'bg' | 'en';
  regionNames: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');

  const quarter = selectedQuarter || (allQuarters.length > 0 ? allQuarters[allQuarters.length - 1] : '');

  // Get recent quarters for the selector (last 20)
  const recentQuarters = useMemo(() => {
    return allQuarters.slice(-20).reverse();
  }, [allQuarters]);

  useEffect(() => {
    if (!chartRef.current || !quarter) return;
    const chart = echarts.init(chartRef.current);

    const regionData = REGION_CODES.map(code => ({
      name: regionNames[code],
      value: getValue(quarter, code, '0', '0'),
      maleVal: getValue(quarter, code, '0', '1'),
      femaleVal: getValue(quarter, code, '0', '2'),
      code,
    })).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const idx = p.dataIndex;
          const d = regionData[idx];
          let tip = `<div style="font-weight:600;margin-bottom:4px">${d.name}</div>`;
          tip += `<div>${isBg ? 'Общо' : 'Total'}: <strong>${d.value != null ? d.value.toFixed(1) : 'N/A'}</strong> ${isBg ? 'хил.' : 'K'}</div>`;
          if (d.maleVal != null) tip += `<div style="color:${GENDER_COLORS.male}">${isBg ? 'Мъже' : 'Male'}: ${d.maleVal.toFixed(1)}</div>`;
          if (d.femaleVal != null) tip += `<div style="color:${GENDER_COLORS.female}">${isBg ? 'Жени' : 'Female'}: ${d.femaleVal.toFixed(1)}</div>`;
          return tip;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '5%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: regionData.map(d => d.name),
        axisLabel: { fontSize: 10, color: '#64748b', interval: 0, rotate: 15 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил.' : 'K',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: regionData.map(d => ({
          value: d.value,
          itemStyle: { color: REGION_COLORS[d.code], borderRadius: [6, 6, 0, 0] },
        })),
        barMaxWidth: 60,
        label: {
          show: true,
          position: 'top',
          fontSize: 11,
          fontWeight: 'bold',
          color: '#475569',
          formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) : '',
        },
      }],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [quarter, getValue, isBg, regionNames]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <label className="text-xs font-medium text-slate-500">
          {isBg ? 'Тримесечие:' : 'Quarter:'}
        </label>
        <select
          value={quarter}
          onChange={(e) => setSelectedQuarter(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700"
        >
          {recentQuarters.map(q => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '360px' }} />
    </div>
  );
}

// ── Chart C: Gender Pie (working-age, all regions stacked bar) ───────────────────

function GenderPieChart({ latestQ, getValue, locale, regionNames }: {
  latestQ: string;
  getValue: (q: string, nuts: string, age: string, gen: string) => number | null;
  locale: 'bg' | 'en';
  regionNames: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const maleLabel = isBg ? 'Мъже' : 'Male';
    const femaleLabel = isBg ? 'Жени' : 'Female';

    // Per-region stacked 100% bar (working-age: 15-64)
    const regionLabels = REGION_CODES.map(c => regionNames[c]);
    const maleData = REGION_CODES.map(code => {
      const m = getValue(latestQ, code, '15 - 64_gr', '1') ?? 0;
      const f = getValue(latestQ, code, '15 - 64_gr', '2') ?? 0;
      const total = m + f;
      return total > 0 ? +(m / total * 100).toFixed(1) : 0;
    });
    const femaleData = REGION_CODES.map(code => {
      const m = getValue(latestQ, code, '15 - 64_gr', '1') ?? 0;
      const f = getValue(latestQ, code, '15 - 64_gr', '2') ?? 0;
      const total = m + f;
      return total > 0 ? +(f / total * 100).toFixed(1) : 0;
    });

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          const idx = params[0].dataIndex;
          const code = REGION_CODES[idx];
          const mAbs = getValue(latestQ, code, '15 - 64_gr', '1');
          const fAbs = getValue(latestQ, code, '15 - 64_gr', '2');
          let tip = `<div style="font-weight:600;margin-bottom:4px">${regionLabels[idx]}</div>`;
          tip += `<div style="color:${GENDER_COLORS.male}">${maleLabel}: ${params[0].value}% (${mAbs != null ? mAbs.toFixed(1) : 'N/A'} ${isBg ? 'хил.' : 'K'})</div>`;
          tip += `<div style="color:${GENDER_COLORS.female}">${femaleLabel}: ${params[1].value}% (${fAbs != null ? fAbs.toFixed(1) : 'N/A'} ${isBg ? 'хил.' : 'K'})</div>`;
          return tip;
        },
      },
      legend: {
        data: [maleLabel, femaleLabel],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '3%', right: '4%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: regionLabels,
        axisLabel: { fontSize: 10, color: '#64748b', interval: 0, rotate: 15 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        max: 100,
        name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [
        {
          name: maleLabel,
          type: 'bar',
          stack: 'gender',
          data: maleData,
          itemStyle: { color: GENDER_COLORS.male, borderRadius: [0, 0, 0, 0] },
          barMaxWidth: 50,
        },
        {
          name: femaleLabel,
          type: 'bar',
          stack: 'gender',
          data: femaleData,
          itemStyle: { color: GENDER_COLORS.female, borderRadius: [6, 6, 0, 0] },
          barMaxWidth: 50,
        },
      ],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [latestQ, getValue, isBg, regionNames]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart D: Regional Trend (multiline) ──────────────────────────────────────────

function RegionalTrendChart({ allQuarters, getValue, locale, regionNames }: {
  allQuarters: string[];
  getValue: (q: string, nuts: string, age: string, gen: string) => number | null;
  locale: 'bg' | 'en';
  regionNames: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const brushStart = Math.max(0, Math.round((1 - 40 / allQuarters.length) * 100));

    const legendData = REGION_CODES.map(c => regionNames[c]);

    const series = REGION_CODES.map(code => ({
      name: regionNames[code],
      type: 'line' as const,
      data: allQuarters.map(q => getValue(q, code, '0', '0')),
      itemStyle: { color: REGION_COLORS[code] },
      lineStyle: { width: 2 },
      smooth: true,
      symbol: 'none',
      emphasis: { focus: 'series' as const },
    }));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          const sorted = [...params].sort((a: any, b: any) => (Number(b.value) || 0) - (Number(a.value) || 0));
          sorted.forEach((p: any) => {
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${p.value != null ? Number(p.value).toFixed(1) : 'N/A'} ${isBg ? 'хил.' : 'K'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: legendData,
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: brushStart, end: 100 },
        { type: 'slider', start: brushStart, end: 100, height: 18, bottom: 24, borderColor: '#cbd5e1' },
      ],
      xAxis: {
        type: 'category', boundaryGap: false, data: allQuarters,
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: string) => { const p = parseQuarter(v); return p.quarter === 1 ? String(p.year) : ''; } },
        axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false },
      },
      yAxis: {
        type: 'value', name: isBg ? 'хил.' : 'K',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series,
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [allQuarters, getValue, isBg, regionNames]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
