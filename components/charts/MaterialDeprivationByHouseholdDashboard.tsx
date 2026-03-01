'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Household type labels ──────────────────────────────────────────────────────

const HH_LABELS_EN: Record<string, string> = {
  '1':  'Single person',
  '3':  'Without dependent children',
  '4':  'One adult < 65 yrs',
  '5':  'One adult ≥ 65 yrs',
  '6':  'Single female',
  '7':  'Single male',
  '8':  'Two adults < 65 yrs',
  '9':  'Two adults, one ≥ 65',
  '10': 'Three or more adults',
  '11': 'With dependent children',
  '12': 'Single parent + children',
  '13': 'Two adults + 1 child',
  '14': 'Two adults + 2 children',
  '15': 'Two adults + 3+ children',
  '16': 'Three+ adults + children',
  '17': 'Two+ adults + children',
  '18': 'Two+ adults, no children',
  '20': 'Two adults',
};

const HH_LABELS_BG: Record<string, string> = {
  '1':  'Едно лице',
  '3':  'Без зависими деца',
  '4':  'Едно лице под 65 г.',
  '5':  'Едно лице над 65 г.',
  '6':  'Единична жена',
  '7':  'Единичен мъж',
  '8':  'Двама под 65 г.',
  '9':  'Двама, поне един ≥ 65 г.',
  '10': 'Трима или повече',
  '11': 'Със зависими деца',
  '12': 'Единичен родител + деца',
  '13': 'Двама + 1 дете',
  '14': 'Двама + 2 деца',
  '15': 'Двама + 3+ деца',
  '16': 'Трима+ + деца',
  '17': 'Двама+ + деца',
  '18': 'Двама+, без деца',
  '20': 'Двама',
};

const HH_COLORS: Record<string, string> = {
  '1':  '#8b5cf6',
  '3':  '#10b981',
  '4':  '#a78bfa',
  '5':  '#7c3aed',
  '6':  '#f472b6',
  '7':  '#3b82f6',
  '8':  '#34d399',
  '9':  '#059669',
  '10': '#0891b2',
  '11': '#f59e0b',
  '12': '#ef4444',
  '13': '#fb923c',
  '14': '#f97316',
  '15': '#dc2626',
  '16': '#b45309',
  '17': '#d97706',
  '18': '#16a34a',
  '20': '#0284c7',
};

// ── Line chart groups ──────────────────────────────────────────────────────────

type GroupKey = 'key' | 'children' | 'singles' | 'noChildren';

const LINE_GROUPS: Record<GroupKey, { en: string; bg: string; codes: string[] }> = {
  key: {
    en: 'Key Types',
    bg: 'Ключови типове',
    codes: ['12', '5', '15', '11', '3', '1'],
  },
  children: {
    en: 'With Children',
    bg: 'С деца',
    codes: ['11', '12', '13', '14', '15', '17'],
  },
  singles: {
    en: 'Single Person',
    bg: 'Едно лице',
    codes: ['1', '4', '5', '6', '7'],
  },
  noChildren: {
    en: 'Without Children',
    bg: 'Без деца',
    codes: ['3', '8', '9', '10', '18', '20'],
  },
};

// ── Bar chart display order ────────────────────────────────────────────────────

const BAR_CODES = ['12', '5', '15', '6', '1', '9', '11', '7', '14', '13', '3', '20', '8', '10', '18', '16', '17', '4'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVal(row: any, col: string): number | null {
  const v = row?.[col];
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

function hhLabel(code: string, isBg: boolean): string {
  return isBg ? (HH_LABELS_BG[code] ?? code) : (HH_LABELS_EN[code] ?? code);
}

function tooltipBase() {
  return {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

export function MaterialDeprivationByHouseholdDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const [selectedGroup, setSelectedGroup] = useState<GroupKey>('key');

  const { allYears, latestYear, firstYear } = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => { if (d.Year) years.add(String(d.Year)); });
    const sorted = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    return {
      allYears: sorted,
      latestYear: sorted[sorted.length - 1] ?? '',
      firstYear: sorted[0] ?? '',
    };
  }, [data]);

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const findRate = (code: string, year: string) =>
      data.find(d => String(d.SILC_HHType_Code) === code && String(d.Year) === year);

    // Highest and lowest risk household types in latest year
    let highestCode = '';
    let highestRate: number | null = null;
    let lowestCode = '';
    let lowestRate: number | null = null;

    BAR_CODES.forEach(code => {
      const row = findRate(code, latestYear);
      const rate = getVal(row, 'Rate');
      if (rate == null) return;
      if (highestRate == null || rate > highestRate) { highestRate = rate; highestCode = code; }
      if (lowestRate == null || rate < lowestRate) { lowestRate = rate; lowestCode = code; }
    });

    // Single parent trend
    const singleParentLatest  = getVal(findRate('12', latestYear), 'Rate');
    const singleParentPrev    = prevYear ? getVal(findRate('12', prevYear), 'Rate') : null;
    const singleParentChange  = singleParentLatest != null && singleParentPrev != null
      ? singleParentLatest - singleParentPrev : null;

    return {
      latestYear,
      highestCode, highestRate,
      lowestCode, lowestRate,
      singleParentLatest, singleParentChange,
    };
  }, [data, allYears, latestYear]);

  if (!data || data.length === 0 || !kpi) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Тежки материални лишения по тип домакинство'
            : 'Severe Material Deprivation by Household Type'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Дял на лицата с тежки материални лишения (% от населението)`
            : `Annual data (${firstYear}–${latestYear}) | Share of persons with severe material deprivation (% of population)`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-засегнат тип домакинство' : 'Highest-risk household type'}
            </p>
            <p className="text-3xl font-bold mt-2 text-red-600">
              {kpi.highestRate != null ? `${kpi.highestRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              {hhLabel(kpi.highestCode, isBg)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-малко засегнат тип' : 'Lowest-risk household type'}
            </p>
            <p className="text-3xl font-bold mt-2 text-emerald-600">
              {kpi.lowestRate != null ? `${kpi.lowestRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              {hhLabel(kpi.lowestCode, isBg)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Единичен родител с деца' : 'Single parent with children'}
            </p>
            <p className="text-3xl font-bold mt-2 text-orange-600">
              {kpi.singleParentLatest != null ? `${kpi.singleParentLatest.toFixed(1)}%` : '—'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-500">
                {isBg ? 'Висока уязвимост' : 'High vulnerability'}
              </p>
              {kpi.singleParentChange != null && (
                <span className={`text-[10px] font-semibold ${kpi.singleParentChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.singleParentChange <= 0 ? '▼' : '▲'} {Math.abs(kpi.singleParentChange).toFixed(1)}pp
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>
        </div>

        {/* ── Chart A: Multi-line trend ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Динамика на тежките материални лишения по тип домакинство'
              : 'A. Severe Material Deprivation Trend by Household Type'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | % от съответната група население`
              : `${firstYear}–${latestYear} | % of respective population group`}
          </p>

          {/* Group selector */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-xs text-slate-500 font-medium">
              {isBg ? 'Група:' : 'Group:'}
            </span>
            {(Object.keys(LINE_GROUPS) as GroupKey[]).map(key => (
              <button
                key={key}
                onClick={() => setSelectedGroup(key)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  selectedGroup === key
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {isBg ? LINE_GROUPS[key].bg : LINE_GROUPS[key].en}
              </button>
            ))}
          </div>

          <TrendLineChart
            data={data}
            allYears={allYears}
            codes={LINE_GROUPS[selectedGroup].codes}
            locale={locale}
          />
        </div>

        {/* ── Chart B: Horizontal bar — latest year snapshot ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Тежки материални лишения по тип домакинство — ${latestYear}`
              : `B. Severe Material Deprivation by Household Type — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Дял на лицата с тежки материални лишения — наредено по стойност'
              : 'Share of persons with severe material deprivation — ranked by value'}
          </p>
          <HouseholdBarChart data={data} latestYear={latestYear} locale={locale} />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-Line Trend by Household Type
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ data, allYears, codes, locale }: {
  data: any[];
  allYears: string[];
  codes: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return codes.map(code => {
      const label = hhLabel(code, isBg);
      const color = HH_COLORS[code] ?? '#94a3b8';
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (String(d.SILC_HHType_Code) !== code) return;
        if (!d.Year) return;
        byYear[String(d.Year)] = getVal(d, 'Rate');
      });
      return { label, color, values: allYears.map(y => byYear[y] ?? null) };
    });
  }, [data, allYears, codes, isBg]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          [...params]
            .filter((p: any) => p.value != null)
            .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
            .forEach((p: any) => {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)}%</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: seriesData.map(s => s.label),
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '20%', top: '4%', containLabel: true },
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
        min: 0,
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: 2.5, color: s.color },
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Horizontal Bar: latest year snapshot by household type
// ══════════════════════════════════════════════════════════════════════════════

function HouseholdBarChart({ data, latestYear, locale }: {
  data: any[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { categories, values, colors } = useMemo(() => {
    const items = BAR_CODES
      .map(code => {
        const row = data.find(d =>
          String(d.SILC_HHType_Code) === code && String(d.Year) === latestYear
        );
        return {
          code,
          label: hhLabel(code, isBg),
          value: getVal(row, 'Rate'),
          color: HH_COLORS[code] ?? '#94a3b8',
        };
      })
      .filter(i => i.value != null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    return {
      categories: items.map(i => i.label),
      values: items.map(i => i.value),
      colors: items.map(i => i.color),
    };
  }, [data, latestYear, isBg]);

  useEffect(() => {
    if (!chartRef.current || categories.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.axisValue}</div>
            <div>${isBg ? 'Тежки материални лишения' : 'Severe material deprivation'}: <b>${p.value != null ? Number(p.value).toFixed(1) + '%' : '—'}</b></div>`;
        },
      },
      grid: { left: '2%', right: '12%', bottom: '4%', top: '2%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? '% от групата' : '% of group',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        max: (v: { max: number }) => Math.ceil(v.max * 1.15),
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: { fontSize: 11, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        inverse: true,
      },
      series: [{
        type: 'bar',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i], borderRadius: [0, 6, 6, 0], opacity: 0.85 },
        })),
        barMaxWidth: 44,
        label: {
          show: true,
          position: 'right' as const,
          fontSize: 13,
          fontWeight: 'bold' as const,
          color: '#334155',
          formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
        },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [categories, values, colors, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: `${Math.max(320, categories.length * 34)}px` }} />;
}
