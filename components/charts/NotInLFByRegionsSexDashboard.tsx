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

// ── Types & Constants ────────────────────────────────────────────────────────────

interface DashboardProps { data: any[]; dataset: Dataset; locale?: 'bg' | 'en'; }

const GENDER_COLORS = {
  total: '#334155',
  male: '#2563eb',
  female: '#e11d48',
};

// Distinct colours for the 6 NUTS2 statistical regions
const REGION_COLORS: Record<string, string> = {
  BG31: '#2563eb',  // Severozapaden
  BG32: '#059669',  // Severen tsentralen
  BG33: '#d97706',  // Severoiztochen
  BG34: '#e11d48',  // Yugoiztochen
  BG41: '#7c3aed',  // Yugozapaden
  BG42: '#0891b2',  // Yuzhen tsentralen
};

const REGION_CODES = ['BG31', 'BG32', 'BG33', 'BG34', 'BG41', 'BG42'];

// ── Main ─────────────────────────────────────────────────────────────────────────

export function NotInLFByRegionsSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  // Region labels from data
  const regionLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    data.forEach(row => {
      const code = row.NUTS_Code;
      const label = row.NUTS;
      if (code && label && code !== 'BG') labels[code] = label;
    });
    return labels;
  }, [data]);

  // Build lookup: quarter → nuts_code → gender_code → value
  // We only use Age10_LFS_Code = "0" (Total)
  const lookup = useMemo(() => {
    const map: Record<string, Record<string, Record<string, number | null>>> = {};
    data.forEach(row => {
      const q = row.Year;
      const nuts = row.NUTS_Code;
      const gen = row.Gender_Code;
      const age = row.Age10_LFS_Code;
      if (!q || nuts == null || gen == null) return;
      // Only use Total age group
      if (age != null && age !== '0') return;
      if (!map[q]) map[q] = {};
      if (!map[q][nuts]) map[q][nuts] = {};
      map[q][nuts][gen] = getVal(row);
    });
    return map;
  }, [data]);

  const getValue = (q: string, nuts: string, gen: string): number | null => {
    return lookup[q]?.[nuts]?.[gen] ?? null;
  };

  // KPI
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const latestP = parseQuarter(latestQ);
    const yoyQ = `${latestP.year - 1}Q${latestP.quarter}`;

    const totalVal = getValue(latestQ, 'BG', '0');
    const prevVal = allQuarters.includes(yoyQ) ? getValue(yoyQ, 'BG', '0') : null;
    const yoyChange = totalVal != null && prevVal != null && prevVal > 0
      ? ((totalVal - prevVal) / prevVal * 100) : null;

    const maleVal = getValue(latestQ, 'BG', '1');
    const femaleVal = getValue(latestQ, 'BG', '2');
    const femalePct = femaleVal != null && totalVal != null && totalVal > 0
      ? (femaleVal / totalVal * 100) : null;

    // Largest region
    let maxRegion = '';
    let maxVal = -1;
    REGION_CODES.forEach(r => {
      const v = getValue(latestQ, r, '0');
      if (v != null && v > maxVal) { maxVal = v; maxRegion = r; }
    });

    return { latestQ, totalVal, yoyChange, maleVal, femaleVal, femalePct, maxRegion, maxVal };
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
              {isBg ? `Извън раб. сила (${kpiData.latestQ})` : `Not in LF (${kpiData.latestQ})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">{fmtVal(kpiData.totalVal)}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Промяна г/г' : 'YoY Change'}
            </p>
            <p className={`text-3xl font-bold mt-2 ${kpiData.yoyChange != null ? (kpiData.yoyChange >= 0 ? 'text-red-500' : 'text-emerald-600') : 'text-slate-300'}`}>
              {kpiData.yoyChange != null ? `${kpiData.yoyChange >= 0 ? '+' : ''}${kpiData.yoyChange.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'спрямо същото тримесечие' : 'vs same quarter prev. year'}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? '% Жени' : '% Female'}
            </p>
            <p className="text-3xl font-bold mt-2 text-rose-600">
              {kpiData.femalePct != null ? kpiData.femalePct.toFixed(1) + '%' : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'от общия брой' : 'of total not in LF'}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-голям район' : 'Largest Region'}
            </p>
            <p className="text-2xl font-bold mt-2 text-violet-700">
              {regionLabels[kpiData.maxRegion] || kpiData.maxRegion || '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{fmtVal(kpiData.maxVal)}</p>
          </div>
        </div>

        {/* Chart A: Time-series by gender with region filter */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Динамика по пол' : 'A. Trends by Sex'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Лица извън работната сила — мъже и жени с филтър по район' : 'Persons not in labour force — Male vs Female with region filter'}
          </p>
          <GenderTrendChart allQuarters={allQuarters} getValue={getValue} regionLabels={regionLabels} locale={locale} />
        </div>

        {/* Chart B: Grouped bar by region */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? `Б. Регионално сравнение (${kpiData.latestQ})` : `B. Regional Comparison (${kpiData.latestQ})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Мъже и жени извън работната сила по статистически райони' : 'Male vs Female not in labour force by statistical regions'}
          </p>
          <RegionalBarChart latestQ={kpiData.latestQ} getValue={getValue} regionLabels={regionLabels} locale={locale} />
        </div>

        {/* Charts C + D side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart C: Gender donut */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? `В. Разпределение по пол (${kpiData.latestQ})` : `C. Gender Split (${kpiData.latestQ})`}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Мъже и жени — общо за страната' : 'Male vs Female — country total'}
            </p>
            <GenderDonutChart latestQ={kpiData.latestQ} getValue={getValue} locale={locale} />
          </div>

          {/* Chart D: Regional donut */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? `Г. Разпределение по райони (${kpiData.latestQ})` : `D. Regional Split (${kpiData.latestQ})`}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Дял на всеки статистически район' : 'Share of each statistical region'}
            </p>
            <RegionalDonutChart latestQ={kpiData.latestQ} getValue={getValue} regionLabels={regionLabels} locale={locale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Gender Trend with region filter ─────────────────────────────────────

function GenderTrendChart({ allQuarters, getValue, regionLabels, locale }: {
  allQuarters: string[];
  getValue: (q: string, nuts: string, gen: string) => number | null;
  regionLabels: Record<string, string>;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [regionFilter, setRegionFilter] = useState<string>('BG');

  const regionOptions = useMemo(() => {
    const opts: { code: string; label: string }[] = [
      { code: 'BG', label: isBg ? 'Общо за страната' : 'Country Total' },
    ];
    REGION_CODES.forEach(code => {
      if (regionLabels[code]) opts.push({ code, label: regionLabels[code] });
    });
    return opts;
  }, [regionLabels, isBg]);

  const seriesData = useMemo(() => ({
    male: allQuarters.map(q => getValue(q, regionFilter, '1')),
    female: allQuarters.map(q => getValue(q, regionFilter, '2')),
  }), [allQuarters, getValue, regionFilter]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const brushStart = Math.max(0, Math.round((1 - 40 / allQuarters.length) * 100));

    const maleLabel = isBg ? 'Мъже' : 'Male';
    const femaleLabel = isBg ? 'Жени' : 'Female';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          let total = 0;
          params.forEach((p: any) => { total += Number(p.value) || 0; });
          params.forEach((p: any) => {
            const val = Number(p.value) || 0;
            const pct = total > 0 ? (val / total * 100).toFixed(1) : '0';
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)} (${pct}%)</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)} ${isBg ? 'хил.' : 'K'}</div>`;
          return tip;
        },
      },
      legend: {
        data: [maleLabel, femaleLabel],
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
      series: [
        {
          name: maleLabel,
          type: 'line', stack: 'gender',
          areaStyle: { opacity: 0.55 },
          data: seriesData.male,
          itemStyle: { color: GENDER_COLORS.male },
          lineStyle: { width: 1.5 },
          smooth: true, symbol: 'none',
          emphasis: { focus: 'series' as const },
        },
        {
          name: femaleLabel,
          type: 'line', stack: 'gender',
          areaStyle: { opacity: 0.55 },
          data: seriesData.female,
          itemStyle: { color: GENDER_COLORS.female },
          lineStyle: { width: 1.5 },
          smooth: true, symbol: 'none',
          emphasis: { focus: 'series' as const },
        },
      ],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [allQuarters, seriesData, isBg]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {regionOptions.map(({ code, label }) => (
          <button
            key={code}
            onClick={() => setRegionFilter(code)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              regionFilter === code
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '380px' }} />
    </div>
  );
}

// ── Chart B: Grouped Bar by Region ───────────────────────────────────────────────

function RegionalBarChart({ latestQ, getValue, regionLabels, locale }: {
  latestQ: string;
  getValue: (q: string, nuts: string, gen: string) => number | null;
  regionLabels: Record<string, string>;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const regions = REGION_CODES.filter(r => regionLabels[r]);
    const xLabels = regions.map(r => regionLabels[r]);

    const maleLabel = isBg ? 'Мъже' : 'Male';
    const femaleLabel = isBg ? 'Жени' : 'Female';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          let total = 0;
          params.forEach((p: any) => { total += Number(p.value) || 0; });
          params.forEach((p: any) => {
            const val = Number(p.value) || 0;
            const pct = total > 0 ? (val / total * 100).toFixed(1) : '0';
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)} ${isBg ? 'хил.' : 'K'} (${pct}%)</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)} ${isBg ? 'хил.' : 'K'}</div>`;
          return tip;
        },
      },
      legend: {
        data: [maleLabel, femaleLabel],
        bottom: 0, textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '2%', right: '3%', bottom: '12%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLabel: { fontSize: 10, color: '#475569', interval: 0, rotate: 15 },
        axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false },
      },
      yAxis: {
        type: 'value', name: isBg ? 'хил.' : 'K',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [
        {
          name: maleLabel,
          type: 'bar',
          data: regions.map(r => getValue(latestQ, r, '1')),
          itemStyle: { color: GENDER_COLORS.male, borderRadius: [4, 4, 0, 0] },
          barGap: '10%',
        },
        {
          name: femaleLabel,
          type: 'bar',
          data: regions.map(r => getValue(latestQ, r, '2')),
          itemStyle: { color: GENDER_COLORS.female, borderRadius: [4, 4, 0, 0] },
        },
      ],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [latestQ, getValue, regionLabels, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}

// ── Chart C: Gender Donut ────────────────────────────────────────────────────────

function GenderDonutChart({ latestQ, getValue, locale }: {
  latestQ: string;
  getValue: (q: string, nuts: string, gen: string) => number | null;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const maleVal = getValue(latestQ, 'BG', '1') ?? 0;
    const femaleVal = getValue(latestQ, 'BG', '2') ?? 0;
    const total = maleVal + femaleVal;

    const maleLabel = isBg ? 'Мъже' : 'Male';
    const femaleLabel = isBg ? 'Жени' : 'Female';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          const pct = total > 0 ? (params.value / total * 100).toFixed(1) : '0';
          return `<strong>${params.name}</strong><br/>${Number(params.value).toFixed(1)} ${isBg ? 'хил.' : 'K'} (${pct}%)`;
        },
      },
      legend: {
        bottom: 0, textStyle: { fontSize: 11, color: '#64748b' },
      },
      series: [{
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true, position: 'outside',
          formatter: (p: any) => `${p.name}\n${Number(p.value).toFixed(1)}${isBg ? ' хил.' : 'K'}`,
          fontSize: 11, color: '#475569',
        },
        data: [
          { value: maleVal, name: maleLabel, itemStyle: { color: GENDER_COLORS.male } },
          { value: femaleVal, name: femaleLabel, itemStyle: { color: GENDER_COLORS.female } },
        ],
      }],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [latestQ, getValue, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}

// ── Chart D: Regional Donut ──────────────────────────────────────────────────────

function RegionalDonutChart({ latestQ, getValue, regionLabels, locale }: {
  latestQ: string;
  getValue: (q: string, nuts: string, gen: string) => number | null;
  regionLabels: Record<string, string>;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const regions = REGION_CODES.filter(r => regionLabels[r]);
    const regionData = regions.map(r => ({
      value: getValue(latestQ, r, '0') ?? 0,
      name: regionLabels[r],
      itemStyle: { color: REGION_COLORS[r] },
    }));

    const total = regionData.reduce((sum, d) => sum + d.value, 0);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          const pct = total > 0 ? (params.value / total * 100).toFixed(1) : '0';
          return `<strong>${params.name}</strong><br/>${Number(params.value).toFixed(1)} ${isBg ? 'хил.' : 'K'} (${pct}%)`;
        },
      },
      legend: {
        bottom: 0, textStyle: { fontSize: 11, color: '#64748b' },
      },
      series: [{
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true, position: 'outside',
          formatter: (p: any) => `${p.name}\n${Number(p.value).toFixed(1)}${isBg ? ' хил.' : 'K'}`,
          fontSize: 11, color: '#475569',
        },
        data: regionData,
      }],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [latestQ, getValue, regionLabels, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}
