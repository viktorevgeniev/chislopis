'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Color palette per household type code ────────────────────────────────────
const HH_COLORS: Record<string, string> = {
  '3':  '#64748b', // Households without dependent children (aggregate)
  '4':  '#3b82f6', // One adult <65
  '5':  '#0284c7', // One adult ≥65
  '6':  '#e11d48', // Single female
  '7':  '#1d4ed8', // Single male
  '8':  '#10b981', // Two adults <65
  '9':  '#047857', // Two adults ≥65
  '10': '#8b5cf6', // Three or more adults (no children)
  '11': '#f59e0b', // Households with dependent children (aggregate)
  '12': '#ef4444', // Single parent with dep. children
  '13': '#f97316', // Two adults, 1 dep. child
  '14': '#ca8a04', // Two adults, 2 dep. children
  '15': '#dc2626', // Two adults, 3+ dep. children
  '16': '#7c3aed', // Three or more adults with dep. children
};

// ── Bulgarian translations for HH type codes ─────────────────────────────────
const HH_LABELS_BG: Record<string, string> = {
  '3':  'Домакинства без зависими деца',
  '4':  'Едно лице под 65 г.',
  '5':  'Едно лице над 65 г.',
  '6':  'Самотна жена',
  '7':  'Самотен мъж',
  '8':  'Двама возрастни под 65 г.',
  '9':  'Двама (поне един 65+)',
  '10': 'Три и повече лица без деца',
  '11': 'Домакинства с деца',
  '12': 'Еднородителско с деца',
  '13': 'Двама + 1 дете',
  '14': 'Двама + 2 деца',
  '15': 'Двама + 3 и повече деца',
  '16': 'Три и повече лица с деца',
};

// ── Household type groups for the line chart filter ──────────────────────────
const HH_GROUPS: Array<{ key: string; en: string; bg: string; codes: string[] }> = [
  {
    key: 'all',
    en: 'All household types',
    bg: 'Всички типове домакинства',
    codes: ['3','4','5','6','7','8','9','10','11','12','13','14','15','16'],
  },
  {
    key: 'no_children',
    en: 'Without dependent children',
    bg: 'Без зависими деца',
    codes: ['4','5','6','7','8','9','10'],
  },
  {
    key: 'with_children',
    en: 'With dependent children',
    bg: 'Със зависими деца',
    codes: ['11','12','13','14','15','16'],
  },
  {
    key: 'single',
    en: 'Single-person households',
    bg: 'Едночленни домакинства',
    codes: ['4','5','6','7'],
  },
];

function tooltipBase(): Partial<EChartsOption['tooltip']> {
  return {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

export function PovertyRateByHouseholdDashboard({ data, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  // ── Derive catalog ───────────────────────────────────────────────────────────
  const { allYears, hhTypes } = useMemo(() => {
    const years = new Set<string>();
    const typeMap = new Map<string, string>(); // code → English label

    data.forEach(d => {
      if (d.Year) years.add(String(d.Year));
      const code = d.SILC_HHType_Code;
      if (code && !typeMap.has(code)) {
        typeMap.set(code, d.SILC_HHType || code);
      }
    });

    const sortedYears = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    const sortedTypes = [...typeMap.entries()]
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([code, enLabel]) => ({
        code,
        enLabel,
        bgLabel: HH_LABELS_BG[code] || enLabel,
      }));

    return { allYears: sortedYears, hhTypes: sortedTypes };
  }, [data]);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const latestYear = allYears[allYears.length - 1] || '';
  const firstYear  = allYears[0] || '';
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');

  useEffect(() => {
    if (latestYear && !selectedYear) setSelectedYear(latestYear);
  }, [latestYear, selectedYear]);

  const activeYear = selectedYear || latestYear;

  // ── KPI computations ─────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    if (!latestYear || data.length === 0) return null;

    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const ratesLatest = hhTypes.map(t => {
      const row = data.find(d => d.Year === latestYear && d.SILC_HHType_Code === t.code);
      const v = row?.Rate;
      const rate = v != null ? parseFloat(String(v)) : null;
      return { ...t, rate: isNaN(rate as number) ? null : rate };
    }).filter(r => r.rate != null) as Array<{ code: string; enLabel: string; bgLabel: string; rate: number }>;

    ratesLatest.sort((a, b) => b.rate - a.rate);

    const highest = ratesLatest[0] || null;
    const lowest  = ratesLatest[ratesLatest.length - 1] || null;

    // Single parent (code 12) and two adults 3+ children (code 15)
    const singleParent = ratesLatest.find(r => r.code === '12') || null;
    const largeFamily  = ratesLatest.find(r => r.code === '15') || null;

    // YoY for highest type
    let yoy: number | null = null;
    if (highest && prevYear) {
      const prevRow = data.find(d => d.Year === prevYear && d.SILC_HHType_Code === highest.code);
      const prevRate = prevRow?.Rate != null ? parseFloat(String(prevRow.Rate)) : null;
      if (prevRate != null && !isNaN(prevRate)) yoy = highest.rate - prevRate;
    }

    return { highest, lowest, singleParent, largeFamily, yoy, latestYear };
  }, [data, hhTypes, allYears, latestYear]);

  if (!data || data.length === 0 || !kpi) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const label = (t: { enLabel: string; bgLabel: string }) => isBg ? t.bgLabel : t.enLabel;

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Относителен дял на бедните по тип домакинство'
            : 'At-Risk-of-Poverty Rate by Household Type'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear} – ${latestYear}) | Единица: % от населението`
            : `Annual data (${firstYear} – ${latestYear}) | Unit: % of population`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Most vulnerable */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-висок риск' : 'Highest Risk'}
            </p>
            <p className="text-3xl font-bold mt-2 text-red-600">
              {kpi.highest ? `${kpi.highest.rate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              {kpi.highest ? label(kpi.highest) : '—'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.yoy != null && (
                <span className={`text-[10px] font-semibold ${kpi.yoy <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.yoy <= 0 ? '▼' : '▲'} {Math.abs(kpi.yoy).toFixed(1)}pp YoY
                </span>
              )}
            </div>
          </div>

          {/* Least vulnerable */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-нисък риск' : 'Lowest Risk'}
            </p>
            <p className="text-3xl font-bold mt-2 text-emerald-600">
              {kpi.lowest ? `${kpi.lowest.rate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              {kpi.lowest ? label(kpi.lowest) : '—'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          {/* Single parent */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Еднородителски' : 'Single Parent'}
            </p>
            <p className="text-3xl font-bold mt-2 text-orange-600">
              {kpi.singleParent ? `${kpi.singleParent.rate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              {isBg ? 'Еднородителско с деца' : 'Single parent w/ dep. children'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          {/* Large families */}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? '2 + 3 деца (или повече)' : '2 adults + 3 children'}
            </p>
            <p className="text-3xl font-bold mt-2 text-rose-700">
              {kpi.largeFamily ? `${kpi.largeFamily.rate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              {isBg ? 'Двама + 3 и повече деца' : 'Two adults, 3+ dep. children'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3 bg-white shadow-sm rounded-xl px-4 py-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {isBg ? 'Филтри' : 'Filters'}
          </span>
          <Select
            value={activeYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
          >
            {[...allYears].reverse().map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          <Select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
          >
            {HH_GROUPS.map(g => (
              <option key={g.key} value={g.key}>
                {isBg ? g.bg : g.en}
              </option>
            ))}
          </Select>
        </div>

        {/* ── Line Chart: Poverty Trend by Household Type ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Времева динамика на риска от бедност по тип домакинство'
              : 'A. Poverty Rate Trend by Household Type'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Всяка линия представлява отделен тип домакинство; използвайте легендата за включване/изключване'
              : 'Each line represents a distinct household type; click legend items to toggle'}
          </p>
          <TrendLineChart
            data={data}
            allYears={allYears}
            hhTypes={hhTypes}
            selectedGroup={selectedGroup}
            locale={locale}
          />
        </div>

        {/* ── Bar Chart: Cross-Section for Selected Year ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Сравнение по тип домакинство — ${activeYear}`
              : `B. Cross-Section by Household Type — ${activeYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Всички типове домакинства, наредени по дял на бедните (намаляващ ред)'
              : 'All household types ranked by poverty rate (descending)'}
          </p>
          <CrossSectionBarChart
            data={data}
            hhTypes={hhTypes}
            activeYear={activeYear}
            locale={locale}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-Series Line Chart (Poverty Trend by Household Type)
// ═══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ data, allYears, hhTypes, selectedGroup, locale }: {
  data: any[];
  allYears: string[];
  hhTypes: Array<{ code: string; enLabel: string; bgLabel: string }>;
  selectedGroup: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const group = useMemo(
    () => HH_GROUPS.find(g => g.key === selectedGroup) || HH_GROUPS[0],
    [selectedGroup]
  );

  const visibleTypes = useMemo(
    () => hhTypes.filter(t => group.codes.includes(t.code)),
    [hhTypes, group]
  );

  const seriesData = useMemo(() => {
    return visibleTypes.map(t => {
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (d.SILC_HHType_Code !== t.code || !d.Year) return;
        const v = parseFloat(String(d.Rate ?? ''));
        byYear[d.Year] = isNaN(v) ? null : v;
      });
      return {
        code: t.code,
        label: isBg ? t.bgLabel : t.enLabel,
        color: HH_COLORS[t.code] || '#64748b',
        values: allYears.map(y => byYear[y] ?? null),
      };
    });
  }, [data, allYears, visibleTypes, isBg]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0 || seriesData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          const sorted = [...params].sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
          sorted.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${val != null ? val.toFixed(1) + '%' : '—'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: seriesData.map(s => s.label),
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 14,
        itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '18%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allYears,
        axisLabel: { fontSize: 11, color: '#94a3b8' },
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
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: 2, color: s.color },
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        connectNulls: true,
        emphasis: { lineStyle: { width: 3.5 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '440px' }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart B — Horizontal Bar Chart (Cross-Section, sorted descending)
// ═══════════════════════════════════════════════════════════════════════════════

function CrossSectionBarChart({ data, hhTypes, activeYear, locale }: {
  data: any[];
  hhTypes: Array<{ code: string; enLabel: string; bgLabel: string }>;
  activeYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const sorted = useMemo(() => {
    if (!activeYear) return [];
    const items = hhTypes.map(t => {
      const row = data.find(d => d.Year === activeYear && d.SILC_HHType_Code === t.code);
      const v = row?.Rate != null ? parseFloat(String(row.Rate)) : null;
      return {
        code: t.code,
        label: isBg ? t.bgLabel : t.enLabel,
        rate: v != null && !isNaN(v) ? v : null,
      };
    }).filter(r => r.rate != null) as Array<{ code: string; label: string; rate: number }>;

    items.sort((a, b) => b.rate - a.rate);
    return items;
  }, [data, hhTypes, activeYear, isBg]);

  // Reverse for horizontal bar (ECharts renders bottom-to-top)
  const reversed = useMemo(() => [...sorted].reverse(), [sorted]);

  useEffect(() => {
    if (!chartRef.current || reversed.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const val = p.value != null ? Number(p.value) : null;
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.name}</div>
            <div>${isBg ? 'Дял на бедните' : 'Poverty rate'}: <b>${val != null ? val.toFixed(1) + '%' : '—'}</b></div>`;
        },
      },
      grid: { left: '1%', right: '9%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: reversed.map(d => d.label),
        axisLabel: { fontSize: 10, color: '#64748b', width: 200, overflow: 'truncate' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: reversed.map(d => ({
            value: d.rate,
            itemStyle: {
              color: HH_COLORS[d.code] || '#64748b',
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: 18,
          label: {
            show: true,
            position: 'right',
            fontSize: 10,
            color: '#64748b',
            formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
          },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [reversed, isBg]);

  if (reversed.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-sm text-slate-400">
        {isBg ? 'Няма данни за избраната година' : 'No data for selected year'}
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: `${Math.max(360, reversed.length * 34 + 60)}px` }} />;
}
