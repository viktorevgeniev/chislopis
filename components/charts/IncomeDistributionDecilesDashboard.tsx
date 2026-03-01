'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Constants ────────────────────────────────────────────────────────────────

const DECILE_CODES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

// Gradient palette from light-blue to deep-indigo
const DECILE_COLORS: Record<string, string> = {
  '1': '#bfdbfe',
  '2': '#93c5fd',
  '3': '#60a5fa',
  '4': '#3b82f6',
  '5': '#2563eb',
  '6': '#1d4ed8',
  '7': '#1e40af',
  '8': '#1e3a8a',
  '9': '#172554',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

function getVal(row: any, col: string): number | null {
  if (!row) return null;
  const v = row[col];
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

function formatAmount(val: number | null, currency: string): string {
  if (val == null) return '—';
  return `${val.toLocaleString('en-US')} ${currency === 'BGN_fig' ? 'BGN' : 'EUR'}`;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════

export function IncomeDistributionDecilesDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const [unitCode, setUnitCode] = useState<'euro' | 'BGN_fig'>('euro');

  // ── Derived metadata ──────────────────────────────────────────────────────

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

  // ── Filtered data for selected currency ──────────────────────────────────

  const filteredData = useMemo(
    () => data.filter(d => d.Units_Code === unitCode),
    [data, unitCode]
  );

  // ── KPI calculations ──────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    if (!latestYear || filteredData.length === 0) return null;

    const findRow = (yr: string, decileCode: string) =>
      filteredData.find(d => String(d.Year) === yr && String(d.Decile_Code) === decileCode);

    const d1Latest = getVal(findRow(latestYear, '1'), 'Amount');
    const d9Latest = getVal(findRow(latestYear, '9'), 'Amount');
    const d5Latest = getVal(findRow(latestYear, '5'), 'Amount');

    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    const d1Prev = prevYear ? getVal(findRow(prevYear, '1'), 'Amount') : null;
    const d9Prev = prevYear ? getVal(findRow(prevYear, '9'), 'Amount') : null;

    const d9d1Ratio = d9Latest != null && d1Latest != null && d1Latest > 0
      ? d9Latest / d1Latest
      : null;

    const d9YoY = d9Latest != null && d9Prev != null && d9Prev > 0
      ? ((d9Latest - d9Prev) / d9Prev) * 100
      : null;

    const d1YoY = d1Latest != null && d1Prev != null && d1Prev > 0
      ? ((d1Latest - d1Prev) / d1Prev) * 100
      : null;

    return { d1Latest, d9Latest, d5Latest, d9d1Ratio, d9YoY, d1YoY, latestYear };
  }, [filteredData, latestYear, allYears]);

  const currencyLabel = unitCode === 'euro'
    ? (isBg ? 'Евро' : 'EUR')
    : (isBg ? 'Лева' : 'BGN');

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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900">
              {isBg
                ? 'Разпределение на дохода по децили'
                : 'Distribution of Income by Deciles'}
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              {isBg
                ? `Горна граница на дохода по децили (${firstYear}–${latestYear})`
                : `Top cut-off point of income by decile (${firstYear}–${latestYear})`}
            </CardDescription>
          </div>

          {/* Currency toggle */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 self-start">
            <button
              onClick={() => setUnitCode('euro')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                unitCode === 'euro'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              EUR
            </button>
            <button
              onClick={() => setUnitCode('BGN_fig')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                unitCode === 'BGN_fig'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              BGN
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Децил 9 (горен) — ${latestYear}` : `Decile 9 (top) — ${latestYear}`}
            </p>
            <p className="text-3xl font-bold mt-2 text-blue-700">
              {kpi.d9Latest != null ? kpi.d9Latest.toLocaleString('en-US') : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{currencyLabel}</p>
            {kpi.d9YoY != null && (
              <span className={`text-[11px] font-semibold mt-1 inline-block ${kpi.d9YoY >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.d9YoY >= 0 ? '▲' : '▼'} {Math.abs(kpi.d9YoY).toFixed(1)}% YoY
              </span>
            )}
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Децил 1 (долен) — ${latestYear}` : `Decile 1 (bottom) — ${latestYear}`}
            </p>
            <p className="text-3xl font-bold mt-2 text-sky-400">
              {kpi.d1Latest != null ? kpi.d1Latest.toLocaleString('en-US') : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{currencyLabel}</p>
            {kpi.d1YoY != null && (
              <span className={`text-[11px] font-semibold mt-1 inline-block ${kpi.d1YoY >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.d1YoY >= 0 ? '▲' : '▼'} {Math.abs(kpi.d1YoY).toFixed(1)}% YoY
              </span>
            )}
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Съотношение D9/D1 — ${latestYear}` : `D9/D1 Ratio — ${latestYear}`}
            </p>
            <p className="text-3xl font-bold mt-2 text-violet-600">
              {kpi.d9d1Ratio != null ? `${kpi.d9d1Ratio.toFixed(2)}×` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg
                ? 'Горен децил спрямо долен'
                : 'Top decile relative to bottom'}
            </p>
          </div>

        </div>

        {/* ── Chart A: Multi-line time series ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Динамика на прага на дохода по децили'
              : 'A. Income Threshold Trends by Decile'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | Годишна горна граница на дохода по децил, ${currencyLabel}`
              : `${firstYear}–${latestYear} | Annual top cut-off income threshold by decile, ${currencyLabel}`}
          </p>
          <TrendLineChart
            data={filteredData}
            allYears={allYears}
            unitCode={unitCode}
            locale={locale}
          />
        </div>

        {/* ── Chart B: Latest-year bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Праг на дохода по децили — ${latestYear}`
              : `B. Income Threshold by Decile — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `Горна граница на дохода за всеки децил за ${latestYear}, ${currencyLabel}`
              : `Top cut-off point per decile for ${latestYear}, ${currencyLabel}`}
          </p>
          <LatestYearBarChart
            data={filteredData}
            latestYear={latestYear}
            unitCode={unitCode}
            locale={locale}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-line time series (one line per decile)
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ data, allYears, unitCode, locale }: {
  data: any[];
  allYears: string[];
  unitCode: 'euro' | 'BGN_fig';
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const currencyLabel = unitCode === 'euro' ? 'EUR' : 'BGN';

  const seriesData = useMemo(() => (
    DECILE_CODES.map(code => {
      const label = isBg ? `Децил ${code}` : `Decile ${code}`;
      return {
        label,
        color: DECILE_COLORS[code],
        values: allYears.map(yr => {
          const row = data.find(d => String(d.Year) === yr && String(d.Decile_Code) === code);
          return getVal(row, 'Amount');
        }),
      };
    })
  ), [data, allYears, isBg]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
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
                <span style="font-weight:600;margin-left:8px">${p.value != null ? Number(p.value).toLocaleString('en-US') + ' ' + currencyLabel : '—'}</span>
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
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
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
        name: currencyLabel,
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
        },
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
  }, [allYears, seriesData, currencyLabel]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Vertical bar chart for latest year
// ══════════════════════════════════════════════════════════════════════════════

function LatestYearBarChart({ data, latestYear, unitCode, locale }: {
  data: any[];
  latestYear: string;
  unitCode: 'euro' | 'BGN_fig';
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const currencyLabel = unitCode === 'euro' ? 'EUR' : 'BGN';

  const chartData = useMemo(() => (
    DECILE_CODES.map(code => {
      const row = data.find(d => String(d.Year) === latestYear && String(d.Decile_Code) === code);
      return {
        label: isBg ? `Децил ${code}` : `Decile ${code}`,
        color: DECILE_COLORS[code],
        value: getVal(row, 'Amount'),
      };
    })
  ), [data, latestYear, isBg]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.name}</div>
            <div>${isBg ? 'Горна граница' : 'Top cut-off'}: <b>${p.value != null ? Number(p.value).toLocaleString('en-US') + ' ' + currencyLabel : '—'}</b></div>`;
        },
      },
      grid: { left: '2%', right: '4%', bottom: '6%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: chartData.map(d => d.label),
        axisLabel: { fontSize: 11, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: currencyLabel,
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
        max: (v: { max: number }) => Math.ceil(v.max * 1.15),
      },
      series: [{
        type: 'bar' as const,
        data: chartData.map(d => ({
          value: d.value,
          itemStyle: { color: d.color, borderRadius: [6, 6, 0, 0], opacity: 0.92 },
          name: d.label,
        })),
        barMaxWidth: 80,
        label: {
          show: true,
          position: 'top' as const,
          fontSize: 11,
          fontWeight: 'bold' as const,
          color: '#334155',
          formatter: (p: any) =>
            p.value != null
              ? Number(p.value) >= 1000
                ? `${(Number(p.value) / 1000).toFixed(1)}k`
                : String(p.value)
              : '',
        },
        emphasis: { itemStyle: { opacity: 1 } },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, isBg, currencyLabel]);

  return <div ref={chartRef} style={{ width: '100%', height: '340px' }} />;
}
