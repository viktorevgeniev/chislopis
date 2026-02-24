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

const GENDER_COLORS = {
  total: '#334155',
  male: '#2563eb',
  female: '#e11d48',
};

const REASON_COLORS: Record<string, string> = {
  '1': '#ef4444',  // Discouraged — red
  '2': '#2563eb',  // Education — blue
  '3': '#f59e0b',  // Illness — amber
  '4': '#8b5cf6',  // Personal/family — violet
  '5': '#059669',  // Retirement — emerald
};

const REASON_CODES = ['1', '2', '3', '4', '5'];

const WILLINGNESS_COLORS: Record<string, string> = {
  '1': '#059669',  // Want to work — emerald
  '2': '#94a3b8',  // Do not want to work — slate
};

// ── Main ─────────────────────────────────────────────────────────────────────────

export function NotInLFByReasonsDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  // Build lookup: quarter → age_code → gender_code → willingness_code → reason_code → value
  const lookup = useMemo(() => {
    const map: Record<string, Record<string, Record<string, Record<string, Record<string, number | null>>>>> = {};
    data.forEach(row => {
      const q = row.Year;
      const age = row.Age10_LFS_Code;
      const gen = row.Gender_Code;
      const will = row.LFS_WorkWillingness_Code;
      const reason = row.LFS_ReasInactivity_Code;
      if (!q || age == null || gen == null || will == null || reason == null) return;
      if (!map[q]) map[q] = {};
      if (!map[q][age]) map[q][age] = {};
      if (!map[q][age][gen]) map[q][age][gen] = {};
      if (!map[q][age][gen][will]) map[q][age][gen][will] = {};
      map[q][age][gen][will][reason] = getVal(row);
    });
    return map;
  }, [data]);

  // Reason labels from data
  const reasonLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    data.forEach(row => {
      const code = row.LFS_ReasInactivity_Code;
      const label = row.LFS_ReasInactivity;
      if (code && label && code !== '0') labels[code] = label;
    });
    return labels;
  }, [data]);

  // Willingness labels from data
  const willLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    data.forEach(row => {
      const code = row.LFS_WorkWillingness_Code;
      const label = row.LFS_WorkWillingness;
      if (code && label && code !== '0') labels[code] = label;
    });
    return labels;
  }, [data]);

  const getValue = (q: string, age: string, gen: string, will: string, reason: string): number | null => {
    return lookup[q]?.[age]?.[gen]?.[will]?.[reason] ?? null;
  };

  // KPI
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const latestP = parseQuarter(latestQ);
    const yoyQ = `${latestP.year - 1}Q${latestP.quarter}`;

    const totalVal = getValue(latestQ, '0', '0', '0', '0');
    const prevVal = allQuarters.includes(yoyQ) ? getValue(yoyQ, '0', '0', '0', '0') : null;
    const yoyChange = totalVal != null && prevVal != null && prevVal > 0
      ? ((totalVal - prevVal) / prevVal * 100) : null;

    const maleVal = getValue(latestQ, '0', '1', '0', '0');
    const femaleVal = getValue(latestQ, '0', '2', '0', '0');
    const femalePct = femaleVal != null && totalVal != null && totalVal > 0
      ? (femaleVal / totalVal * 100) : null;

    // Largest reason
    let maxReason = '';
    let maxVal = -1;
    REASON_CODES.forEach(r => {
      const v = getValue(latestQ, '0', '0', '0', r);
      if (v != null && v > maxVal) { maxVal = v; maxReason = r; }
    });

    // Want to work
    const wantWork = getValue(latestQ, '0', '0', '1', '0');
    const wantWorkPct = wantWork != null && totalVal != null && totalVal > 0
      ? (wantWork / totalVal * 100) : null;

    return { latestQ, totalVal, yoyChange, maleVal, femaleVal, femalePct, maxReason, maxVal, wantWork, wantWorkPct };
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
              {isBg ? 'Искат да работят' : 'Want to Work'}
            </p>
            <p className="text-3xl font-bold mt-2 text-emerald-600">
              {kpiData.wantWorkPct != null ? kpiData.wantWorkPct.toFixed(1) + '%' : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{fmtVal(kpiData.wantWork)} {isBg ? 'лица' : 'persons'}</p>
          </div>
        </div>

        {/* Chart A: Time-series by gender */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Динамика по пол' : 'A. Inactivity Trends by Sex'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Общ брой лица извън работната сила — мъже и жени' : 'Total persons not in labour force — Male vs Female over time'}
          </p>
          <GenderTrendChart allQuarters={allQuarters} getValue={getValue} locale={locale} />
        </div>

        {/* Chart B: Horizontal bar - Reasons for inactivity */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Б. Причини за неактивност' : 'B. Primary Reasons for Inactivity'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? `Разбивка по причини за последния период (${kpiData.latestQ})` : `Breakdown by reason for most recent period (${kpiData.latestQ})`}
          </p>
          <ReasonsBarChart
            latestQ={kpiData.latestQ}
            getValue={getValue}
            reasonLabels={reasonLabels}
            willLabels={willLabels}
            locale={locale}
          />
        </div>

        {/* Chart C + D side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart C: Donut - Willingness to work */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? `В. Желание за работа (${kpiData.latestQ})` : `C. Willingness to Work (${kpiData.latestQ})`}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Разпределение на лицата извън работната сила' : 'Distribution of persons not in labour force'}
            </p>
            <WillingnessDonutChart latestQ={kpiData.latestQ} getValue={getValue} willLabels={willLabels} locale={locale} />
          </div>

          {/* Chart D: Gender breakdown by reason */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? `Г. Причини по пол (${kpiData.latestQ})` : `D. Gender Gap by Reason (${kpiData.latestQ})`}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Разлика между мъже и жени по причини' : 'Male vs Female comparison by reason of inactivity'}
            </p>
            <GenderReasonChart latestQ={kpiData.latestQ} getValue={getValue} reasonLabels={reasonLabels} locale={locale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Gender Trend (Stacked Area) ─────────────────────────────────────────

function GenderTrendChart({ allQuarters, getValue, locale }: {
  allQuarters: string[];
  getValue: (q: string, age: string, gen: string, will: string, reason: string) => number | null;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => ({
    male: allQuarters.map(q => getValue(q, '0', '1', '0', '0')),
    female: allQuarters.map(q => getValue(q, '0', '2', '0', '0')),
  }), [allQuarters, getValue]);

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

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart B: Horizontal Bar — Reasons for Inactivity (with toggle) ───────────────

function ReasonsBarChart({ latestQ, getValue, reasonLabels, willLabels, locale }: {
  latestQ: string;
  getValue: (q: string, age: string, gen: string, will: string, reason: string) => number | null;
  reasonLabels: Record<string, string>;
  willLabels: Record<string, string>;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [groupBy, setGroupBy] = useState<'gender' | 'willingness'>('gender');

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const reasons = REASON_CODES.filter(r => reasonLabels[r]);
    const yLabels = reasons.map(r => reasonLabels[r]);

    let series: any[];

    if (groupBy === 'gender') {
      const maleLabel = isBg ? 'Мъже' : 'Male';
      const femaleLabel = isBg ? 'Жени' : 'Female';
      series = [
        {
          name: maleLabel,
          type: 'bar',
          data: reasons.map(r => getValue(latestQ, '0', '1', '0', r)),
          itemStyle: { color: GENDER_COLORS.male },
        },
        {
          name: femaleLabel,
          type: 'bar',
          data: reasons.map(r => getValue(latestQ, '0', '2', '0', r)),
          itemStyle: { color: GENDER_COLORS.female },
        },
      ];
    } else {
      const wantLabel = willLabels['1'] || (isBg ? 'Искат да работят' : 'Want to work');
      const dontLabel = willLabels['2'] || (isBg ? 'Не искат да работят' : 'Do not want to work');
      series = [
        {
          name: wantLabel,
          type: 'bar',
          data: reasons.map(r => getValue(latestQ, '0', '0', '1', r)),
          itemStyle: { color: WILLINGNESS_COLORS['1'] },
        },
        {
          name: dontLabel,
          type: 'bar',
          data: reasons.map(r => getValue(latestQ, '0', '0', '2', r)),
          itemStyle: { color: WILLINGNESS_COLORS['2'] },
        },
      ];
    }

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const val = Number(p.value) || 0;
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)} ${isBg ? 'хил.' : 'K'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        bottom: 0, textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '2%', right: '4%', bottom: '12%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value', name: isBg ? 'хил.' : 'K',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: yLabels,
        axisLabel: {
          fontSize: 11, color: '#475569', width: 180, overflow: 'truncate',
          formatter: (v: string) => v.length > 28 ? v.substring(0, 26) + '…' : v,
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false },
      },
      series,
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [latestQ, getValue, groupBy, reasonLabels, willLabels, isBg]);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {([['gender', isBg ? 'По пол' : 'By Sex'], ['willingness', isBg ? 'По желание за работа' : 'By Willingness']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setGroupBy(key as 'gender' | 'willingness')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              groupBy === key
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '340px' }} />
    </div>
  );
}

// ── Chart C: Willingness to Work Donut ───────────────────────────────────────────

function WillingnessDonutChart({ latestQ, getValue, willLabels, locale }: {
  latestQ: string;
  getValue: (q: string, age: string, gen: string, will: string, reason: string) => number | null;
  willLabels: Record<string, string>;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const wantVal = getValue(latestQ, '0', '0', '1', '0') ?? 0;
    const dontVal = getValue(latestQ, '0', '0', '2', '0') ?? 0;
    const total = wantVal + dontVal;

    const wantLabel = willLabels['1'] || (isBg ? 'Искат да работят' : 'Want to work');
    const dontLabel = willLabels['2'] || (isBg ? 'Не искат да работят' : 'Do not want to work');

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
          { value: wantVal, name: wantLabel, itemStyle: { color: WILLINGNESS_COLORS['1'] } },
          { value: dontVal, name: dontLabel, itemStyle: { color: WILLINGNESS_COLORS['2'] } },
        ],
      }],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [latestQ, getValue, willLabels, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}

// ── Chart D: Gender Gap by Reason (Grouped horizontal bar) ───────────────────────

function GenderReasonChart({ latestQ, getValue, reasonLabels, locale }: {
  latestQ: string;
  getValue: (q: string, age: string, gen: string, will: string, reason: string) => number | null;
  reasonLabels: Record<string, string>;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const reasons = REASON_CODES.filter(r => reasonLabels[r]);
    const yLabels = reasons.map(r => reasonLabels[r]);

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
          params.forEach((p: any) => {
            const val = Number(p.value) || 0;
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)} ${isBg ? 'хил.' : 'K'}</span>
            </div>`;
          });
          // Show gap
          if (params.length === 2) {
            const m = Number(params[0].value) || 0;
            const f = Number(params[1].value) || 0;
            const gap = f - m;
            tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-size:11px;color:#64748b">${isBg ? 'Разлика (Ж−М)' : 'Gap (F−M)'}: <strong style="color:${gap > 0 ? '#e11d48' : '#2563eb'}">${gap >= 0 ? '+' : ''}${gap.toFixed(1)}</strong></div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [maleLabel, femaleLabel],
        bottom: 0, textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '2%', right: '4%', bottom: '12%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value', name: isBg ? 'хил.' : 'K',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: yLabels,
        axisLabel: {
          fontSize: 11, color: '#475569', width: 180, overflow: 'truncate',
          formatter: (v: string) => v.length > 28 ? v.substring(0, 26) + '…' : v,
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false },
      },
      series: [
        {
          name: maleLabel,
          type: 'bar',
          data: reasons.map(r => getValue(latestQ, '0', '1', '0', r)),
          itemStyle: { color: GENDER_COLORS.male },
        },
        {
          name: femaleLabel,
          type: 'bar',
          data: reasons.map(r => getValue(latestQ, '0', '2', '0', r)),
          itemStyle: { color: GENDER_COLORS.female },
        },
      ],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [latestQ, getValue, reasonLabels, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}
