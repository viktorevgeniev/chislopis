'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Constants ──────────────────────────────────────────────────────────────────

// Primary education levels (non-overlapping for stacking)
const PRIMARY_EDU_CODES = ['1', '2', '3', '4'];
const PRIMARY_EDU_LABELS: Record<string, string> = {
  '1': 'Higher', '2': 'Upper secondary', '3': 'Lower secondary', '4': 'Primary or lower',
};
const PRIMARY_EDU_LABELS_BG: Record<string, string> = {
  '1': 'Висше', '2': 'Средно', '3': 'Основно', '4': 'Начално и по-ниско',
};
const EDU_COLORS: Record<string, string> = {
  '1': '#2563eb', '2': '#059669', '3': '#d97706', '4': '#dc2626',
  '2_1': '#0d9488', '2_2': '#8b5cf6',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function eduLabel(code: string, isBg: boolean): string {
  return (isBg ? PRIMARY_EDU_LABELS_BG[code] : PRIMARY_EDU_LABELS[code]) || code;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps { data: any[]; dataset: Dataset; locale?: 'bg' | 'en'; }

// ── Main ───────────────────────────────────────────────────────────────────────

export function EmployedByEducationLevelDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const [selectedAge, setSelectedAge] = useState<string>('0');

  const allQuarters = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(d.Year); });
    return [...qs].sort(sortQuarters);
  }, [data]);

  // KPI
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;

    const findRow = (quarter: string, eduCode: string, ageCode: string) =>
      data.find(d => d.Year === quarter &&
        (d.LFS_EDUlevel_Code === eduCode) &&
        (d.Age10_LFS_Code === ageCode));

    const latestQ = allQuarters[allQuarters.length - 1];
    const latestP = parseQuarter(latestQ);
    const yoyQ = `${latestP.year - 1}Q${latestP.quarter}`;

    const totalRow = findRow(latestQ, '0', '0');
    const totalPrev = allQuarters.includes(yoyQ) ? findRow(yoyQ, '0', '0') : null;
    const totalVal = totalRow ? getVal(totalRow) : null;
    const prevVal = totalPrev ? getVal(totalPrev) : null;
    const yoyChange = totalVal != null && prevVal != null ? ((totalVal - prevVal) / prevVal * 100) : null;

    // Vocational ratio
    const upperSecRow = findRow(latestQ, '2', '0');
    const vocRow = findRow(latestQ, '2_1', '0');
    const upperSecVal = upperSecRow ? getVal(upperSecRow) : null;
    const vocVal = vocRow ? getVal(vocRow) : null;
    const vocPct = vocVal != null && upperSecVal != null && upperSecVal > 0
      ? (vocVal / upperSecVal * 100) : null;

    return { latestQ, totalVal, yoyChange, vocPct };
  }, [data, allQuarters]);

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Общо заети (${kpiData.latestQ})` : `Total Employed (${kpiData.latestQ})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">{fmtVal(kpiData.totalVal)}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? '% Професионално средно' : '% Vocational Secondary'}
            </p>
            <p className="text-3xl font-bold mt-2 text-teal-700">
              {kpiData.vocPct != null ? kpiData.vocPct.toFixed(1) + '%' : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'от средно образование' : 'of upper secondary'}</p>
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
        </div>

        {/* Age filter */}
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
          <label htmlFor="edu-age-filter" className="text-sm font-medium text-slate-600">
            {isBg ? 'Възрастова група (за диаграма А):' : 'Age Group (for Chart A):'}
          </label>
          <Select id="edu-age-filter" value={selectedAge} onChange={(e) => setSelectedAge(e.target.value)} className="w-[200px]">
            <option value="0">{isBg ? 'Общо' : 'Total'}</option>
            <option value="15 - 64_gr">{isBg ? '15-64 години' : '15-64 years'}</option>
          </Select>
        </div>

        {/* Chart A: Stacked Area (full width) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Образователна структура на работната сила' : 'A. Workforce Education Evolution'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Съставни образователни нива, натрупани' : 'Stacked by education level over time'}
          </p>
          <EducationStackedArea data={data} allQuarters={allQuarters} selectedAge={selectedAge} locale={locale} />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Професионално vs Общо средно' : 'B. Vocational vs General Secondary'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Тенденция на двата типа средно образование' : 'Trend of the two secondary education tracks'}
            </p>
            <VocationalVsGeneralChart data={data} allQuarters={allQuarters} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Текущо разпределение по образование' : 'C. Current Employment by Education'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? `Последно тримесечие (${kpiData.latestQ})` : `Latest quarter (${kpiData.latestQ})`}
            </p>
            <EducationSnapshotBar data={data} allQuarters={allQuarters} locale={locale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Education Stacked Area ────────────────────────────────────────────

function EducationStackedArea({ data, allQuarters, selectedAge, locale }: {
  data: any[]; allQuarters: string[]; selectedAge: string; locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const stackData = useMemo(() => {
    const result: Record<string, (number | null)[]> = {};
    PRIMARY_EDU_CODES.forEach(c => { result[c] = []; });

    allQuarters.forEach(q => {
      PRIMARY_EDU_CODES.forEach(code => {
        const row = data.find(d => d.Year === q &&
          (d.LFS_EDUlevel_Code === code) &&
          (d.Age10_LFS_Code === selectedAge));
        result[code].push(row ? getVal(row) : null);
      });
    });
    return result;
  }, [data, allQuarters, selectedAge]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const brushStart = Math.max(0, Math.round((1 - 32 / allQuarters.length) * 100));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          let total = 0;
          params.forEach((p: any) => {
            const val = Number(p.value) || 0;
            total += val;
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)} (${isBg ? 'Хиляди' : 'Thousands'})</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)}</div>`;
          return tip;
        },
      },
      legend: {
        data: PRIMARY_EDU_CODES.map(c => eduLabel(c, isBg)),
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
      series: PRIMARY_EDU_CODES.map(code => ({
        name: eduLabel(code, isBg),
        type: 'line' as const,
        stack: 'edu',
        areaStyle: { opacity: 0.65 },
        data: stackData[code],
        itemStyle: { color: EDU_COLORS[code] },
        lineStyle: { width: 1 },
        smooth: true,
        symbol: 'none',
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [allQuarters, stackData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ── Chart B: Vocational vs General Line Chart ──────────────────────────────────

function VocationalVsGeneralChart({ data, allQuarters, locale }: {
  data: any[]; allQuarters: string[]; locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const vocByQ: Record<string, number | null> = {};
    const genByQ: Record<string, number | null> = {};

    data.forEach(d => {
      if (d.Age10_LFS_Code !== '0' || !d.Year) return;
      const val = getVal(d);
      if (d.LFS_EDUlevel_Code === '2_1') vocByQ[d.Year] = val;
      else if (d.LFS_EDUlevel_Code === '2_2') genByQ[d.Year] = val;
    });

    return {
      voc: allQuarters.map(q => vocByQ[q] ?? null),
      gen: allQuarters.map(q => genByQ[q] ?? null),
    };
  }, [data, allQuarters]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const brushStart = Math.max(0, Math.round((1 - 32 / allQuarters.length) * 100));

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
              <span style="font-weight:600">${p.value != null ? Number(p.value).toFixed(1) : 'N/A'} (${isBg ? 'Хиляди' : 'Thousands'})</span>
            </div>`;
          });
          // Ratio
          if (params.length === 2 && params[0].value != null && params[1].value != null) {
            const vocV = Number(params[0].value);
            const genV = Number(params[1].value);
            if (genV > 0) {
              tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-size:11px;color:#64748b">${isBg ? 'Съотношение' : 'Ratio'}: ${(vocV / genV).toFixed(1)}:1</div>`;
            }
          }
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Професионално' : 'Vocational', isBg ? 'Общо средно' : 'General'],
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
          name: isBg ? 'Професионално' : 'Vocational',
          type: 'line', data: seriesData.voc,
          itemStyle: { color: '#0d9488' }, lineStyle: { width: 2.5 },
          smooth: true, symbol: 'none',
          areaStyle: { opacity: 0.15 },
        },
        {
          name: isBg ? 'Общо средно' : 'General',
          type: 'line', data: seriesData.gen,
          itemStyle: { color: '#8b5cf6' }, lineStyle: { width: 2.5 },
          smooth: true, symbol: 'none',
          areaStyle: { opacity: 0.15 },
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

// ── Chart C: Education Snapshot Bar ────────────────────────────────────────────

function EducationSnapshotBar({ data, allQuarters, locale }: {
  data: any[]; allQuarters: string[]; locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const barData = useMemo(() => {
    const latestQ = allQuarters[allQuarters.length - 1];
    return PRIMARY_EDU_CODES.map(code => {
      const row = data.find(d => d.Year === latestQ && d.LFS_EDUlevel_Code === code && d.Age10_LFS_Code === '0');
      return { code, label: eduLabel(code, isBg), value: row ? (getVal(row) ?? 0) : 0 };
    });
  }, [data, allQuarters, isBg]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `<strong>${p.name}</strong><br/>${Number(p.value).toFixed(1)} (${isBg ? 'Хиляди' : 'Thousands'})`;
        },
      },
      grid: { left: '3%', right: '8%', bottom: '3%', top: '6%', containLabel: true },
      yAxis: {
        type: 'category',
        data: barData.map(d => d.label),
        axisLabel: { fontSize: 11, color: '#475569' },
        axisTick: { show: false }, axisLine: { show: false },
      },
      xAxis: {
        type: 'value', name: isBg ? 'хил.' : 'K',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: barData.map(d => ({
          value: d.value,
          itemStyle: { color: EDU_COLORS[d.code], borderRadius: [0, 4, 4, 0] },
        })),
        label: {
          show: true, position: 'right',
          formatter: (p: any) => Number(p.value).toFixed(1),
          fontSize: 11, color: '#475569',
        },
        barMaxWidth: 40,
      }],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [barData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '280px' }} />;
}
