'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Constants ──────────────────────────────────────────────────────────────────

const SECTOR_COLORS = [
  '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#be185d', '#4f46e5', '#65a30d', '#c2410c',
  '#0d9488', '#a21caf', '#ca8a04', '#475569',
];

// Short labels for long sector names
const SHORT_LABELS: Record<string, string> = {
  'Agriculture, hunting, forestry and fishing': 'Agriculture',
  'Mining and quarrying': 'Mining',
  'Manufacturing': 'Manufacturing',
  'Electricity, gas and water supply': 'Electricity & Gas',
  'Construction': 'Construction',
  'Wholesale and retail trade; repair of motor vehicles, motorcycles and personal and household goods': 'Wholesale & Retail',
  'Hotels and restaurants': 'Hotels & Restaurants',
  'Transport, storage and communication': 'Transport & Comm.',
  'Financial intermediation': 'Financial',
  'Real estate, renting and business activities': 'Real Estate & Business',
  'Public administration and defence; compulsory social security': 'Public Admin.',
  'Education': 'Education',
  'Health and social work': 'Health & Social',
  'Other community, social and personal service activities; activities of households; extra-territorial organizations and bodies': 'Other Services',
};

const SHORT_LABELS_BG: Record<string, string> = {
  'Agriculture, hunting, forestry and fishing': 'Земеделие',
  'Mining and quarrying': 'Добивна пром.',
  'Manufacturing': 'Преработваща пром.',
  'Electricity, gas and water supply': 'Електричество',
  'Construction': 'Строителство',
  'Wholesale and retail trade; repair of motor vehicles, motorcycles and personal and household goods': 'Търговия',
  'Hotels and restaurants': 'Хотели и ресторанти',
  'Transport, storage and communication': 'Транспорт',
  'Financial intermediation': 'Финанси',
  'Real estate, renting and business activities': 'Недвижими имоти',
  'Public administration and defence; compulsory social security': 'Публична админ.',
  'Education': 'Образование',
  'Health and social work': 'Здравеопазване',
  'Other community, social and personal service activities; activities of households; extra-territorial organizations and bodies': 'Други дейности',
};

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

function shortLabel(fullName: string, isBg: boolean): string {
  return (isBg ? SHORT_LABELS_BG[fullName] : SHORT_LABELS[fullName]) || fullName;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EmployedByActivityDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  // Split into aggregated (Total sector) and detailed (specific sectors)
  const { allQuarters, aggregated, detailed, sectors } = useMemo(() => {
    const qs = new Set<string>();
    const agg: any[] = [];
    const det: any[] = [];
    const sectorSet = new Set<string>();

    data.forEach(d => {
      if (d.Year) qs.add(d.Year);
      const sectorName = d.NACE2003A17Ext || '';
      if (sectorName === 'Total') {
        agg.push(d);
      } else {
        det.push(d);
        sectorSet.add(sectorName);
      }
    });

    return {
      allQuarters: [...qs].sort(sortQuarters),
      aggregated: agg,
      detailed: det,
      sectors: [...sectorSet].sort(),
    };
  }, [data]);

  // KPI
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const prevQ = allQuarters.length >= 2 ? allQuarters[allQuarters.length - 2] : null;

    const findTotal = (q: string) => aggregated.find(d => d.Year === q && d.Gender_Code === '0');
    const latestRow = findTotal(latestQ);
    const prevRow = prevQ ? findTotal(prevQ) : null;
    const latestVal = latestRow ? getPersons(latestRow) : null;
    const prevVal = prevRow ? getPersons(prevRow) : null;
    const qoqChange = latestVal != null && prevVal != null
      ? ((latestVal - prevVal) / prevVal * 100) : null;

    return { latestQ, latestVal, qoqChange };
  }, [allQuarters, aggregated]);

  // Top 5 sectors by latest quarter Total
  const topSectors = useMemo(() => {
    if (allQuarters.length === 0) return [];
    const latestQ = allQuarters[allQuarters.length - 1];
    const sectorValues = sectors.map(s => {
      const row = detailed.find(d => d.Year === latestQ && d.Gender_Code === '0' && d.NACE2003A17Ext === s);
      return { name: s, value: row ? (getPersons(row) ?? 0) : 0 };
    }).sort((a, b) => b.value - a.value);
    return sectorValues.slice(0, 5).map(s => s.name);
  }, [allQuarters, sectors, detailed]);

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
          {dataset.title[locale]}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: Хиляди лица | НКИД 2003`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: Thousands of Persons | NACE 2003`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Общо заети (${kpiData.latestQ})` : `Total Employed (${kpiData.latestQ})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">{formatValue(kpiData.latestVal)}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Промяна т/т' : 'QoQ Growth'}
            </p>
            <p className={`text-3xl font-bold mt-2 ${kpiData.qoqChange != null ? (kpiData.qoqChange >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-300'}`}>
              {kpiData.qoqChange != null
                ? `${kpiData.qoqChange >= 0 ? '+' : ''}${kpiData.qoqChange.toFixed(1)}%`
                : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isBg ? 'спрямо предх. тримесечие' : 'vs previous quarter'}
            </p>
          </div>
        </div>

        {/* Chart A: Employment Trends by Gender (full width) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Тенденции на заетостта по пол' : 'Employment Trends by Gender'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Обща икономика, всички дейности' : 'Total economy, all activities'}
          </p>
          <GenderTrendChart aggregated={aggregated} allQuarters={allQuarters} locale={locale} />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Секторна структура' : 'Sector Composition'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Топ 5 сектора + Други (Общо по пол)' : 'Top 5 sectors + Others (Total gender)'}
            </p>
            <SectorCompositionChart detailed={detailed} allQuarters={allQuarters} topSectors={topSectors} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Сектори по пол' : 'Sector by Gender'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Мъже vs Жени за избрано тримесечие' : 'Male vs Female for selected quarter'}
            </p>
            <SectorGenderChart detailed={detailed} allQuarters={allQuarters} sectors={sectors} locale={locale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Gender Trend Line ─────────────────────────────────────────────────

function GenderTrendChart({ aggregated, allQuarters, locale }: {
  aggregated: any[];
  allQuarters: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const totalByQ: Record<string, number | null> = {};
    const maleByQ: Record<string, number | null> = {};
    const femaleByQ: Record<string, number | null> = {};

    aggregated.forEach(row => {
      if (!row.Year) return;
      const val = getPersons(row);
      if (row.Gender_Code === '0') totalByQ[row.Year] = val;
      else if (row.Gender_Code === '1') maleByQ[row.Year] = val;
      else if (row.Gender_Code === '2') femaleByQ[row.Year] = val;
    });

    return {
      total: allQuarters.map(q => totalByQ[q] ?? null),
      male: allQuarters.map(q => maleByQ[q] ?? null),
      female: allQuarters.map(q => femaleByQ[q] ?? null),
    };
  }, [aggregated, allQuarters]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
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
              <span style="font-weight:600">${p.value != null ? Number(p.value).toFixed(1) : 'N/A'} (${isBg ? 'Хиляди' : 'Thousands'})</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Общо' : 'Total', isBg ? 'Мъже' : 'Male', isBg ? 'Жени' : 'Female'],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '15%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allQuarters,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил.' : 'K',
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
          data: seriesData.total,
          itemStyle: { color: '#1e293b' },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'none',
        },
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'line',
          data: seriesData.male,
          itemStyle: { color: '#2563eb' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'line',
          data: seriesData.female,
          itemStyle: { color: '#be185d' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'none',
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '350px' }} />;
}

// ── Chart B: Sector Composition (100% Stacked Bar) ─────────────────────────────

function SectorCompositionChart({ detailed, allQuarters, topSectors, locale }: {
  detailed: any[];
  allQuarters: string[];
  topSectors: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  // Top 5 + "Others"
  const categories = useMemo(() => [...topSectors, 'Others'], [topSectors]);

  const stackData = useMemo(() => {
    const result: Record<string, (number | null)[]> = {};
    categories.forEach(c => { result[c] = []; });

    allQuarters.forEach(q => {
      const qRows = detailed.filter(d => d.Year === q && d.Gender_Code === '0');

      let othersVal = 0;
      const topVals: Record<string, number> = {};
      topSectors.forEach(s => { topVals[s] = 0; });

      qRows.forEach(row => {
        const sector = row.NACE2003A17Ext || '';
        const val = getPersons(row) ?? 0;
        if (topSectors.includes(sector)) {
          topVals[sector] = val;
        } else {
          othersVal += val;
        }
      });

      topSectors.forEach(s => { result[s].push(topVals[s]); });
      result['Others'].push(othersVal);
    });

    return result;
  }, [detailed, allQuarters, topSectors, categories]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 11 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          // Calculate total for percentages
          const total = params.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);
          params.forEach((p: any) => {
            const val = Number(p.value) || 0;
            const pct = total > 0 ? (val / total * 100).toFixed(1) : '0.0';
            tip += `<div style="display:flex;gap:4px;margin:1px 0;font-size:11px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px;flex-shrink:0"></span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.seriesName}</span>
              <span style="font-weight:600;white-space:nowrap">${val.toFixed(1)} (${pct}%)</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: categories.map(c => c === 'Others' ? (isBg ? 'Други' : 'Others') : shortLabel(c, isBg)),
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 9, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '16%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: allQuarters,
        axisLabel: { fontSize: 9, color: '#94a3b8', rotate: 45 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил.' : 'K',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: categories.map((c, i) => ({
        name: c === 'Others' ? (isBg ? 'Други' : 'Others') : shortLabel(c, isBg),
        type: 'bar' as const,
        stack: 'sector',
        data: stackData[c],
        itemStyle: { color: i < SECTOR_COLORS.length ? SECTOR_COLORS[i] : '#94a3b8' },
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, categories, stackData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart C: Sector by Gender (Bi-directional Bar) ─────────────────────────────

function SectorGenderChart({ detailed, allQuarters, sectors, locale }: {
  detailed: any[];
  allQuarters: string[];
  sectors: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');

  useEffect(() => {
    if (allQuarters.length > 0 && !selectedQuarter) {
      setSelectedQuarter(allQuarters[allQuarters.length - 1]);
    }
  }, [allQuarters, selectedQuarter]);

  const barData = useMemo(() => {
    const quarter = selectedQuarter || allQuarters[allQuarters.length - 1];

    return sectors.map(s => {
      const maleRow = detailed.find(d => d.Year === quarter && d.Gender_Code === '1' && d.NACE2003A17Ext === s);
      const femaleRow = detailed.find(d => d.Year === quarter && d.Gender_Code === '2' && d.NACE2003A17Ext === s);
      return {
        sector: s,
        label: shortLabel(s, isBg),
        male: maleRow ? (getPersons(maleRow) ?? 0) : 0,
        female: femaleRow ? (getPersons(femaleRow) ?? 0) : 0,
      };
    }).sort((a, b) => (b.male + b.female) - (a.male + a.female));
  }, [detailed, allQuarters, sectors, selectedQuarter, isBg]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    // Bi-directional: Male goes left (negative), Female goes right
    const sectorLabels = barData.map(d => d.label);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 11 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          const name = params[0].name;
          let tip = `<div style="font-weight:600;margin-bottom:4px">${name}</div>`;
          params.forEach((p: any) => {
            const val = Math.abs(Number(p.value));
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)} (${isBg ? 'Хиляди' : 'Thousands'})</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Мъже' : 'Male', isBg ? 'Жени' : 'Female'],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '3%', right: '3%', bottom: '12%', top: '3%', containLabel: true },
      yAxis: {
        type: 'category',
        data: [...sectorLabels].reverse(),
        axisLabel: { fontSize: 9, color: '#475569' },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => Math.abs(v).toFixed(0),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'bar',
          stack: 'gender',
          data: [...barData].reverse().map(d => -d.male),
          itemStyle: { color: '#2563eb', borderRadius: [4, 0, 0, 4] },
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'bar',
          stack: 'gender',
          data: [...barData].reverse().map(d => d.female),
          itemStyle: { color: '#be185d', borderRadius: [0, 4, 4, 0] },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg]);

  const chartHeight = Math.max(350, barData.length * 26 + 80);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="act-gender-q" className="text-sm font-medium text-slate-600">
          {isBg ? 'Тримесечие' : 'Quarter'}
        </label>
        <Select id="act-gender-q" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
          {allQuarters.map(q => <option key={q} value={q}>{q}</option>)}
        </Select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: chartHeight + 'px' }} />
    </div>
  );
}
