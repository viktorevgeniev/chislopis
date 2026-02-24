'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

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

// Method codes (excluding 0=Total)
const METHOD_CODES = ['1', '2', '3', '4', '5', '6', '7'];

const METHOD_EN: Record<string, string> = {
  '0': 'Total',
  '1': 'Public employment office',
  '2': 'Direct contact with employers',
  '3': 'Competitions/tests/interviews',
  '4': 'Friends and relatives',
  '5': 'Job advertisements',
  '6': 'Studying job ads',
  '7': 'Placing CVs online',
};
const METHOD_BG: Record<string, string> = {
  '0': 'Общо',
  '1': 'Бюро по труда',
  '2': 'Директен контакт с работодатели',
  '3': 'Конкурси/тестове/интервюта',
  '4': 'Приятели и роднини',
  '5': 'Обяви за работа',
  '6': 'Проучване на обяви',
  '7': 'Публикуване на CV онлайн',
};

const METHOD_SHORT_EN: Record<string, string> = {
  '1': 'Empl. office',
  '2': 'Direct contact',
  '3': 'Competitions',
  '4': 'Friends/relatives',
  '5': 'Job ads',
  '6': 'Studying ads',
  '7': 'CVs online',
};
const METHOD_SHORT_BG: Record<string, string> = {
  '1': 'Бюро',
  '2': 'Директен',
  '3': 'Конкурси',
  '4': 'Приятели',
  '5': 'Обяви',
  '6': 'Проучване',
  '7': 'CV онлайн',
};

const METHOD_COLORS: Record<string, string> = {
  '1': '#3b82f6', // blue - public employment office
  '2': '#10b981', // emerald - direct contact
  '3': '#f59e0b', // amber - competitions
  '4': '#8b5cf6', // violet - friends & relatives
  '5': '#ef4444', // red - job ads
  '6': '#06b6d4', // cyan - studying ads
  '7': '#ec4899', // pink - CVs online
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Component ──────────────────────────────────────────────────────────────────

export function UnemployedByJobSearchDashboard({ data, dataset, locale = 'bg' }: DashboardProps) {
  const isBg = locale === 'bg';
  const chartRefA = useRef<HTMLDivElement>(null);
  const chartRefB = useRef<HTMLDivElement>(null);
  const chartRefC = useRef<HTMLDivElement>(null);

  const [genderFilter, setGenderFilter] = useState<string>('0'); // for Chart A

  // ── Data Processing ────────────────────────────────────────────────────────

  const { allQuarters, latestQ, prevQ, prevYearQ, kpis, methodLabel, methodShort } = useMemo(() => {
    const ml = isBg ? METHOD_BG : METHOD_EN;
    const ms = isBg ? METHOD_SHORT_BG : METHOD_SHORT_EN;

    const quarterSet = new Set<string>();
    data.forEach(r => { if (r.Year) quarterSet.add(r.Year); });
    const qs = Array.from(quarterSet).sort(sortQuarters);
    const latest = qs[qs.length - 1] || '';
    const { year: ly, quarter: lq } = parseQuarter(latest);
    const prev = lq > 1 ? `${ly}Q${lq - 1}` : `${ly - 1}Q4`;
    const prevYear = `${ly - 1}Q${lq}`;

    // KPIs
    function findRow(quarter: string, gender: string, method: string) {
      return data.find(
        r => r.Year === quarter && r.Gender_Code === gender && r.LFS_JobSearch_Meth_Code === method
      );
    }

    const totalNow = getPersons(findRow(latest, '0', '0'));
    const totalPrev = getPersons(findRow(prev, '0', '0'));
    const totalPrevYear = getPersons(findRow(prevYear, '0', '0'));

    // Find most popular method in latest quarter (total gender)
    let maxMethod = '1';
    let maxVal = 0;
    for (const mc of METHOD_CODES) {
      const v = getPersons(findRow(latest, '0', mc));
      if (v != null && v > maxVal) { maxVal = v; maxMethod = mc; }
    }

    // QoQ and YoY for total
    const qoqTotal = totalNow != null && totalPrev != null ? totalNow - totalPrev : null;
    const yoyTotal = totalNow != null && totalPrevYear != null ? totalNow - totalPrevYear : null;

    // Most popular method values
    const topNow = getPersons(findRow(latest, '0', maxMethod));
    const topPrevYear = getPersons(findRow(prevYear, '0', maxMethod));
    const yoyTop = topNow != null && topPrevYear != null ? topNow - topPrevYear : null;

    // Digital share: CVs online (7) as % of total
    const cvNow = getPersons(findRow(latest, '0', '7'));
    const cvPrevYear = getPersons(findRow(prevYear, '0', '7'));
    const digitalShareNow = cvNow != null && totalNow != null && totalNow > 0 ? (cvNow / totalNow) * 100 : null;
    const digitalSharePrevYear = cvPrevYear != null && totalPrevYear != null && totalPrevYear > 0 ? (cvPrevYear / totalPrevYear) * 100 : null;
    const digitalShareChange = digitalShareNow != null && digitalSharePrevYear != null ? digitalShareNow - digitalSharePrevYear : null;

    return {
      allQuarters: qs,
      latestQ: latest,
      prevQ: prev,
      prevYearQ: prevYear,
      methodLabel: ml,
      methodShort: ms,
      kpis: {
        totalNow, qoqTotal, yoyTotal,
        maxMethod, topNow, yoyTop,
        digitalShareNow, digitalShareChange,
      },
    };
  }, [data, isBg]);

  // ── Lookup helper ──────────────────────────────────────────────────────────

  const findRow = useMemo(() => {
    const idx = new Map<string, any>();
    data.forEach(r => {
      const key = `${r.Year}|${r.Gender_Code}|${r.LFS_JobSearch_Meth_Code}`;
      idx.set(key, r);
    });
    return (q: string, g: string, m: string) => idx.get(`${q}|${g}|${m}`);
  }, [data]);

  // ── Chart A: Trends in Job Search Methods (Line) ──────────────────────────

  useEffect(() => {
    if (!chartRefA.current) return;
    const chart = echarts.init(chartRefA.current);
    const brushStart = Math.max(0, Math.round((1 - 32 / allQuarters.length) * 100));

    const series: any[] = METHOD_CODES.map(mc => ({
      name: methodShort[mc],
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2 },
      itemStyle: { color: METHOD_COLORS[mc] },
      data: allQuarters.map(q => {
        const row = findRow(q, genderFilter, mc);
        return row ? getPersons(row) : null;
      }),
    }));

    const option: EChartsOption = {
      title: {
        text: isBg ? 'Методи за търсене на работа — тенденции' : 'Job Search Methods — Trends',
        left: 'center', textStyle: { fontSize: 15, fontWeight: 'bold' as const },
      },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: any) => typeof v === 'number' ? formatFullValue(v) : '—',
      },
      legend: { bottom: 30, type: 'scroll', textStyle: { fontSize: 11 } },
      grid: { left: 60, right: 20, top: 50, bottom: 90 },
      xAxis: { type: 'category', data: allQuarters, axisLabel: { rotate: 45, fontSize: 10 } },
      yAxis: {
        type: 'value',
        name: isBg ? 'Хил. лица' : 'Thous. persons',
        axisLabel: { formatter: (v: number) => v.toFixed(0) },
      },
      dataZoom: [{ type: 'slider', start: brushStart, end: 100, bottom: 60 }],
      series,
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, findRow, genderFilter, isBg, methodShort]);

  // ── Chart B: Gender Distribution by Method (Grouped Bar) ──────────────────

  useEffect(() => {
    if (!chartRefB.current) return;
    const chart = echarts.init(chartRefB.current);

    const maleData = METHOD_CODES.map(mc => {
      const row = findRow(latestQ, '1', mc);
      return row ? getPersons(row) : null;
    });
    const femaleData = METHOD_CODES.map(mc => {
      const row = findRow(latestQ, '2', mc);
      return row ? getPersons(row) : null;
    });
    const categories = METHOD_CODES.map(mc => methodShort[mc]);

    const option: EChartsOption = {
      title: {
        text: isBg ? `Разпределение по пол — ${latestQ}` : `Gender Distribution — ${latestQ}`,
        left: 'center', textStyle: { fontSize: 15, fontWeight: 'bold' as const },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: any) => typeof v === 'number' ? formatFullValue(v) : '—',
      },
      legend: { bottom: 5, data: [isBg ? 'Мъже' : 'Male', isBg ? 'Жени' : 'Female'] },
      grid: { left: 120, right: 20, top: 50, bottom: 40 },
      xAxis: {
        type: 'value',
        name: isBg ? 'Хил. лица' : 'Thous. persons',
        axisLabel: { formatter: (v: number) => v.toFixed(0) },
      },
      yAxis: { type: 'category', data: categories, axisLabel: { fontSize: 11 } },
      series: [
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'bar', data: maleData,
          itemStyle: { color: '#3b82f6' },
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'bar', data: femaleData,
          itemStyle: { color: '#ec4899' },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [latestQ, findRow, isBg, methodShort]);

  // ── Chart C: 100% Stacked Area — Composition over time ────────────────────

  useEffect(() => {
    if (!chartRefC.current) return;
    const chart = echarts.init(chartRefC.current);
    const brushStart = Math.max(0, Math.round((1 - 32 / allQuarters.length) * 100));

    // Compute percentage shares per quarter (gender=Total)
    const series: any[] = METHOD_CODES.map(mc => ({
      name: methodShort[mc],
      type: 'line',
      stack: 'share',
      areaStyle: { opacity: 0.85 },
      symbol: 'none',
      lineStyle: { width: 0.5 },
      itemStyle: { color: METHOD_COLORS[mc] },
      emphasis: { focus: 'series' },
      data: allQuarters.map(q => {
        // Sum all methods for this quarter
        let total = 0;
        for (const m of METHOD_CODES) {
          const v = getPersons(findRow(q, '0', m));
          if (v != null) total += v;
        }
        const v = getPersons(findRow(q, '0', mc));
        return total > 0 && v != null ? Math.round((v / total) * 1000) / 10 : null;
      }),
    }));

    const option: EChartsOption = {
      title: {
        text: isBg ? 'Състав на методите за търсене (%)' : 'Search Method Composition (%)',
        left: 'center', textStyle: { fontSize: 15, fontWeight: 'bold' as const },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let html = `<b>${params[0].axisValueLabel}</b><br/>`;
          for (const p of params) {
            if (p.value != null) {
              html += `${p.marker} ${p.seriesName}: <b>${p.value.toFixed(1)}%</b><br/>`;
            }
          }
          return html;
        },
      },
      legend: { bottom: 30, type: 'scroll', textStyle: { fontSize: 11 } },
      grid: { left: 50, right: 20, top: 50, bottom: 90 },
      xAxis: { type: 'category', data: allQuarters, axisLabel: { rotate: 45, fontSize: 10 } },
      yAxis: {
        type: 'value', max: 100,
        name: '%',
        axisLabel: { formatter: '{value}%' },
      },
      dataZoom: [{ type: 'slider', start: brushStart, end: 100, bottom: 60 }],
      series,
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, findRow, isBg, methodShort]);

  // ── KPI Cards ──────────────────────────────────────────────────────────────

  const kpiCards = useMemo(() => {
    const { totalNow, qoqTotal, yoyTotal, maxMethod, topNow, yoyTop, digitalShareNow, digitalShareChange } = kpis;

    function changeArrow(diff: number | null, invertColor = true) {
      if (diff == null) return <span className="text-gray-400 text-xs ml-1">—</span>;
      // For unemployment, decrease = green
      const isGood = invertColor ? diff < 0 : diff > 0;
      const color = isGood ? 'text-green-600' : 'text-red-500';
      const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '—';
      return (
        <span className={`text-xs ml-1 ${color}`}>
          {arrow} {Math.abs(diff).toFixed(1)}k
        </span>
      );
    }

    return [
      {
        title: isBg ? 'Общо безработни' : 'Total Unemployed',
        value: formatValue(totalNow),
        sub: (
          <div className="flex flex-col gap-0.5">
            <span>QoQ: {changeArrow(qoqTotal)}</span>
            <span>YoY: {changeArrow(yoyTotal)}</span>
          </div>
        ),
        color: 'bg-slate-50 border-slate-200',
      },
      {
        title: isBg ? 'Най-популярен метод' : 'Most Common Method',
        value: methodShort[maxMethod],
        sub: (
          <div className="flex flex-col gap-0.5">
            <span>{formatValue(topNow)}</span>
            <span>YoY: {changeArrow(yoyTop)}</span>
          </div>
        ),
        color: `bg-opacity-10 border-opacity-30`,
        borderColor: METHOD_COLORS[maxMethod],
      },
      {
        title: isBg ? 'CV онлайн (дял)' : 'CVs Online (share)',
        value: digitalShareNow != null ? digitalShareNow.toFixed(1) + '%' : '—',
        sub: (
          <div>
            <span>YoY: </span>
            {digitalShareChange != null ? (
              <span className={`text-xs ${digitalShareChange > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                {digitalShareChange > 0 ? '▲' : '▼'} {Math.abs(digitalShareChange).toFixed(1)}pp
              </span>
            ) : <span className="text-gray-400 text-xs">—</span>}
          </div>
        ),
        color: 'bg-pink-50 border-pink-200',
      },
    ];
  }, [kpis, isBg, methodShort]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map((kpi, i) => (
          <div
            key={i}
            className={`rounded-xl border p-4 ${kpi.color}`}
            style={kpi.borderColor ? { borderColor: kpi.borderColor, backgroundColor: kpi.borderColor + '10' } : undefined}
          >
            <div className="text-xs font-medium text-gray-500 mb-1">{kpi.title}</div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            <div className="mt-1 text-sm text-gray-600">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart A: Trends with gender filter */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {isBg ? 'Тенденции по методи' : 'Trends by Search Method'}
              </CardTitle>
              <CardDescription>
                {isBg ? 'Динамика на методите за търсене на работа' : 'Dynamics of job search methods over time'}
              </CardDescription>
            </div>
            <select
              value={genderFilter}
              onChange={e => setGenderFilter(e.target.value)}
              className="text-sm border rounded-md px-2 py-1 bg-white"
            >
              <option value="0">{isBg ? 'Общо' : 'Total'}</option>
              <option value="1">{isBg ? 'Мъже' : 'Male'}</option>
              <option value="2">{isBg ? 'Жени' : 'Female'}</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={chartRefA} style={{ width: '100%', height: 420 }} />
        </CardContent>
      </Card>

      {/* Chart B: Gender distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isBg ? 'Разпределение по пол' : 'Gender Distribution'}
          </CardTitle>
          <CardDescription>
            {isBg ? `Сравнение мъже / жени за ${latestQ}` : `Male vs Female comparison for ${latestQ}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={chartRefB} style={{ width: '100%', height: 380 }} />
        </CardContent>
      </Card>

      {/* Chart C: Composition */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isBg ? 'Състав на методите (%)' : 'Method Composition (%)'}
          </CardTitle>
          <CardDescription>
            {isBg ? 'Еволюция на дела на всеки метод' : 'Evolution of each method\'s share'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={chartRefC} style={{ width: '100%', height: 420 }} />
        </CardContent>
      </Card>
    </div>
  );
}
