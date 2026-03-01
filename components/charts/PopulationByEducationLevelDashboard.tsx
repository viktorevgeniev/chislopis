'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Dimension constants ─────────────────────────────────────────────────────
// LFS_EDUlevel codes (from codelists):
//   "0"   → Total
//   "1"   → Higher
//   "2"   → Upper secondary (aggregate)
//   "2_1" → Secondary vocational
//   "2_2" → Secondary general
//   "3"   → Lower secondary
//   "4"   → Primary or lower
//
// Age10_LFS codes:
//   "0"          → Total
//   "15 - 64_gr" → Of which 15–64 years

const EDU_MAIN = ['1', '2', '3', '4'] as const; // main levels (no sub-levels, no total)
const EDU_DETAIL = ['1', '2_1', '2_2', '3', '4'] as const; // upper-sec broken into sub-types

const EDU_COLORS: Record<string, string> = {
  '1':   '#10b981', // Higher — green
  '2':   '#3b82f6', // Upper secondary — blue
  '2_1': '#6366f1', // Secondary vocational — indigo
  '2_2': '#8b5cf6', // Secondary general — purple
  '3':   '#f59e0b', // Lower secondary — amber
  '4':   '#ef4444', // Primary or lower — red
  '0':   '#64748b', // Total — slate
};

const EDU_LABELS_EN: Record<string, string> = {
  '0':   'Total',
  '1':   'Higher',
  '2':   'Upper Secondary',
  '2_1': 'Secondary Vocational',
  '2_2': 'Secondary General',
  '3':   'Lower Secondary',
  '4':   'Primary or Lower',
};
const EDU_LABELS_BG: Record<string, string> = {
  '0':   'Общо',
  '1':   'Висше',
  '2':   'Средно',
  '2_1': 'Средно-професионално',
  '2_2': 'Средно-общо',
  '3':   'Основно',
  '4':   'Начално или по-ниско',
};

const AGE_LABELS_EN: Record<string, string> = {
  '0':          'Total (15+)',
  '15 - 64_gr': '15–64 years',
};
const AGE_LABELS_BG: Record<string, string> = {
  '0':          'Общо (15+)',
  '15 - 64_gr': '15–64 години',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseQuarter(q: string): { year: number; quarter: number } {
  const m = q.match(/^(\d{4})Q(\d)$/);
  return m ? { year: parseInt(m[1]), quarter: parseInt(m[2]) } : { year: 0, quarter: 0 };
}

function sortQuarters(a: string, b: string): number {
  const pa = parseQuarter(a);
  const pb = parseQuarter(b);
  return pa.year !== pb.year ? pa.year - pb.year : pa.quarter - pb.quarter;
}

function getPersons(row: any): number | null {
  const v = row?.Persons ?? row?.ValueColumn ?? row?.value;
  if (v == null || v === '' || v === '.' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

function getEduCode(row: any): string {
  return String(row.LFS_EDUlevel_Code ?? row.LFS_EDUlevel ?? '');
}

function getAgeCode(row: any): string {
  return String(row.Age10_LFS_Code ?? row.Age10_LFS ?? '');
}

function eduLabel(code: string, isBg: boolean): string {
  return isBg ? (EDU_LABELS_BG[code] ?? code) : (EDU_LABELS_EN[code] ?? code);
}

function ageLabel(code: string, isBg: boolean): string {
  return isBg ? (AGE_LABELS_BG[code] ?? code) : (AGE_LABELS_EN[code] ?? code);
}

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export function PopulationByEducationLevelDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const [selectedAge, setSelectedAge] = useState<string>('0');

  const { allQuarters, latestQuarter, firstYear, latestYear } = useMemo(() => {
    const qs = new Set<string>();
    data.forEach(d => { if (d.Year) qs.add(String(d.Year)); });
    const sorted = [...qs].sort(sortQuarters);
    const first = sorted[0] ? parseQuarter(sorted[0]).year : '';
    const last  = sorted[sorted.length - 1] ? parseQuarter(sorted[sorted.length - 1]).year : '';
    return {
      allQuarters: sorted,
      latestQuarter: sorted[sorted.length - 1] ?? '',
      firstYear: first,
      latestYear: last,
    };
  }, [data]);

  // KPI cards: latest quarter, selectedAge, main education levels (not Total)
  const kpis = useMemo(() => {
    if (!latestQuarter) return [];
    const prevQ = allQuarters.length > 1 ? allQuarters[allQuarters.length - 2] : null;
    return EDU_MAIN.map(code => {
      const row = data.find(d =>
        getEduCode(d) === code &&
        getAgeCode(d) === selectedAge &&
        String(d.Year) === latestQuarter
      );
      const prev = prevQ
        ? data.find(d =>
            getEduCode(d) === code &&
            getAgeCode(d) === selectedAge &&
            String(d.Year) === prevQ
          )
        : null;
      const val  = getPersons(row);
      const pval = getPersons(prev);
      return {
        code,
        label: eduLabel(code, isBg),
        color: EDU_COLORS[code] ?? '#94a3b8',
        val,
        change: val != null && pval != null ? val - pval : null,
        prevQ,
      };
    });
  }, [data, allQuarters, latestQuarter, selectedAge, isBg]);

  // Total population in latest quarter (for context)
  const totalPopulation = useMemo(() => {
    if (!latestQuarter) return null;
    const row = data.find(d =>
      getEduCode(d) === '0' &&
      getAgeCode(d) === selectedAge &&
      String(d.Year) === latestQuarter
    );
    return getPersons(row);
  }, [data, latestQuarter, selectedAge]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const ageOptions: Array<{ code: string; label: string }> = [
    { code: '0', label: ageLabel('0', isBg) },
    { code: '15 - 64_gr', label: ageLabel('15 - 64_gr', isBg) },
  ];

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Население на 15+ по степен на образование'
            : 'Population Aged 15+ by Level of Education'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear}–${latestYear}) | хиляди лица`
            : `Quarterly data (${firstYear}–${latestYear}) | Thousand persons`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Age group selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {isBg ? 'Възрастова група:' : 'Age group:'}
          </span>
          <div className="flex gap-2">
            {ageOptions.map(opt => (
              <button
                key={opt.code}
                onClick={() => setSelectedAge(opt.code)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedAge === opt.code
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {totalPopulation != null && (
            <span className="ml-auto text-xs text-slate-400">
              {isBg ? 'Общо' : 'Total'}: <span className="font-semibold text-slate-700">{totalPopulation.toFixed(1)}</span>{' '}
              {isBg ? 'хил. лица' : 'thousand'} · {latestQuarter}
            </span>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map(k => (
            <div
              key={k.code}
              className="bg-white shadow-sm rounded-xl p-4"
              style={{ borderTop: `3px solid ${k.color}` }}
            >
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide leading-4">
                {k.label}
              </p>
              <p className="text-2xl font-bold mt-2" style={{ color: k.color }}>
                {k.val != null ? k.val.toFixed(1) : '—'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isBg ? 'хил. лица' : 'thousand'}
              </p>
              {k.change != null && (
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-xs font-semibold ${k.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {k.change >= 0 ? '▲' : '▼'} {Math.abs(k.change).toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isBg ? 'от ' : 'vs '}{k.prevQ}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chart A: Multi-line time series */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-700">
              {isBg
                ? 'А. Динамика по степен на образование'
                : 'A. Trend by Education Level'}
            </h3>
            <p className="text-xs text-slate-400">
              {isBg
                ? `${firstYear}–${latestYear} | хиляди лица | ${ageLabel(selectedAge, isBg)}`
                : `${firstYear}–${latestYear} | Thousand persons | ${ageLabel(selectedAge, isBg)}`}
            </p>
          </div>
          <TrendLineChart
            data={data}
            allQuarters={allQuarters}
            ageCode={selectedAge}
            isBg={isBg}
          />
        </div>

        {/* Chart B: 100% Stacked Area — education shares over time */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-700">
              {isBg
                ? 'Б. Структура по образование (% от общо)'
                : 'B. Education Composition (% of total)'}
            </h3>
            <p className="text-xs text-slate-400">
              {isBg
                ? `Дял на всяка образователна степен | ${ageLabel(selectedAge, isBg)}`
                : `Share of each education level | ${ageLabel(selectedAge, isBg)}`}
            </p>
          </div>
          <StackedAreaChart
            data={data}
            allQuarters={allQuarters}
            ageCode={selectedAge}
            isBg={isBg}
          />
        </div>

        {/* Chart C: Latest quarter snapshot — Total vs 15-64 side by side */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-700">
              {isBg
                ? `В. Моментна снимка — ${latestQuarter}`
                : `C. Snapshot — ${latestQuarter}`}
            </h3>
            <p className="text-xs text-slate-400">
              {isBg
                ? 'Общо (15+) срещу Работоспособна възраст (15–64)'
                : 'Total (15+) vs Working-age (15–64) — absolute values'}
            </p>
          </div>
          <SnapshotBarChart
            data={data}
            latestQuarter={latestQuarter}
            isBg={isBg}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-line trend
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ data, allQuarters, ageCode, isBg }: {
  data: any[];
  allQuarters: string[];
  ageCode: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Build one series per main education level + Total line
  const seriesData = useMemo(() => {
    const levels = ['0', ...EDU_MAIN] as const;
    return levels.map(code => {
      const label = eduLabel(code, isBg);
      const color = EDU_COLORS[code] ?? '#94a3b8';
      const byQ: Record<string, number | null> = {};
      data.forEach(d => {
        if (getEduCode(d) !== code) return;
        if (getAgeCode(d) !== ageCode) return;
        if (!d.Year) return;
        byQ[String(d.Year)] = getPersons(d);
      });
      return {
        code,
        label,
        color,
        values: allQuarters.map(q => byQ[q] ?? null),
        dashed: code === '0',
      };
    });
  }, [data, allQuarters, ageCode, isBg]);

  // X-axis: show year labels only (one per year, first quarter)
  const xLabels = useMemo(() =>
    allQuarters.map(q => {
      const { quarter, year } = parseQuarter(q);
      return quarter === 1 ? String(year) : '';
    }),
    [allQuarters]
  );

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const q = params[0].axisValue;
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${q}</div>`;
          [...params]
            .filter((p: any) => p.value != null)
            .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
            .forEach((p: any) => {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)}</span>
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
      grid: { left: '1%', right: '2%', bottom: '18%', top: '4%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', bottom: '10%', height: 20, borderColor: '#e2e8f0', fillerColor: 'rgba(99,102,241,0.1)' },
      ],
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allQuarters,
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (_: string, idx: number) => xLabels[idx],
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил. лица' : 'thousand',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
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
        lineStyle: {
          width: s.code === '0' ? 2 : 2.5,
          color: s.color,
          type: s.dashed ? ('dashed' as const) : ('solid' as const),
        },
        smooth: false,
        symbol: 'none',
        connectNulls: true,
        emphasis: { lineStyle: { width: s.code === '0' ? 3 : 4 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allQuarters, seriesData, xLabels, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — 100% Stacked Area (education shares over time)
// ══════════════════════════════════════════════════════════════════════════════

function StackedAreaChart({ data, allQuarters, ageCode, isBg }: {
  data: any[];
  allQuarters: string[];
  ageCode: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Use the detailed breakdown for stacking (avoids double-counting "2" total)
  const seriesData = useMemo(() => {
    return EDU_DETAIL.map(code => {
      const label = eduLabel(code, isBg);
      const color = EDU_COLORS[code] ?? '#94a3b8';
      const byQ: Record<string, number | null> = {};
      data.forEach(d => {
        if (getEduCode(d) !== code) return;
        if (getAgeCode(d) !== ageCode) return;
        if (!d.Year) return;
        byQ[String(d.Year)] = getPersons(d);
      });
      // Compute share per quarter using the "0" total for the same age group
      const totals: Record<string, number | null> = {};
      data.forEach(d => {
        if (getEduCode(d) !== '0') return;
        if (getAgeCode(d) !== ageCode) return;
        if (!d.Year) return;
        totals[String(d.Year)] = getPersons(d);
      });
      return {
        code,
        label,
        color,
        values: allQuarters.map(q => {
          const val = byQ[q];
          const tot = totals[q];
          if (val == null || tot == null || tot === 0) return null;
          return parseFloat(((val / tot) * 100).toFixed(2));
        }),
      };
    });
  }, [data, allQuarters, ageCode, isBg]);

  const xLabels = useMemo(() =>
    allQuarters.map(q => {
      const { quarter, year } = parseQuarter(q);
      return quarter === 1 ? String(year) : '';
    }),
    [allQuarters]
  );

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const q = params[0].axisValue;
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${q}</div>`;
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
      grid: { left: '1%', right: '2%', bottom: '15%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allQuarters,
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (_: string, idx: number) => xLabels[idx],
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '%',
        min: 0,
        max: 100,
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'line' as const,
        stack: 'share',
        areaStyle: { opacity: 0.8 },
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: 1, color: s.color },
        smooth: false,
        symbol: 'none',
        connectNulls: true,
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allQuarters, seriesData, xLabels]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Snapshot bar: latest quarter, Total vs 15-64 grouped bars
// ══════════════════════════════════════════════════════════════════════════════

function SnapshotBarChart({ data, latestQuarter, isBg }: {
  data: any[];
  latestQuarter: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const { categories, series } = useMemo(() => {
    const cats = EDU_MAIN.map(c => eduLabel(c, isBg));
    const ageSeries = (['0', '15 - 64_gr'] as const).map(ageCode => {
      const label = ageLabel(ageCode, isBg);
      const values = EDU_MAIN.map(eduCode => {
        const row = data.find(d =>
          getEduCode(d) === eduCode &&
          getAgeCode(d) === ageCode &&
          String(d.Year) === latestQuarter
        );
        return getPersons(row);
      });
      return { name: label, values, ageCode };
    });
    return { categories: cats, series: ageSeries };
  }, [data, latestQuarter, isBg]);

  const AGE_COLORS: Record<string, string> = {
    '0':          '#6366f1',
    '15 - 64_gr': '#10b981',
  };

  useEffect(() => {
    if (!chartRef.current || !latestQuarter) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          [...params]
            .filter((p: any) => p.value != null)
            .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
            .forEach((p: any) => {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)} ${isBg ? 'хил.' : 'th.'}</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: series.map(s => s.name),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '15%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          fontSize: 11,
          color: '#475569',
          interval: 0,
          width: 100,
          overflow: 'break' as const,
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил. лица' : 'thousand',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: series.map(s => ({
        name: s.name,
        type: 'bar' as const,
        data: s.values.map(v => ({
          value: v,
          itemStyle: {
            color: AGE_COLORS[s.ageCode] ?? '#94a3b8',
            borderRadius: [4, 4, 0, 0] as [number, number, number, number],
            opacity: v == null ? 0 : 0.85,
          },
        })),
        barMaxWidth: 60,
        label: {
          show: true,
          position: 'top' as const,
          fontSize: 11,
          fontWeight: 'bold' as const,
          color: '#334155',
          formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) : '',
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [categories, series, latestQuarter, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}
