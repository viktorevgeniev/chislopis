'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import type { Dataset } from '@/types/dataset';

// ── Constants ──────────────────────────────────────────────────────────────────

// Aggregate/subtotal codes — excluded from breakdown charts
const AGGREGATE_CODES = new Set(['7560', '7591', '7592']);

// Petrol/gas station codes — excluded from "Top 7" default stacked view
const STATION_CODES = new Set(['7540', '7550']);

// Food-specialized store codes
const FOOD_CODES = new Set(['7561', '7562', '7563', '7564', '7565', '7566', '7568']);

// English fallback labels per trade object code
const CODE_LABELS_EN: Record<string, string> = {
  '7540': 'Petrol stations',
  '7550': 'Gas stations',
  '7560': 'Shops & pavilions – Total',
  '7561': 'Fruit & vegetables',
  '7562': 'Meat & meat products',
  '7563': 'Fish & fish products',
  '7564': 'Bread & bakery',
  '7565': 'Sugar & confectionery',
  '7566': 'Beverages',
  '7568': 'Unspecialized (food)',
  '7569/7570': 'Pharmacies & optical',
  '7571': 'Perfume & cosmetics',
  '7572': 'Textiles',
  '7573': 'Clothing',
  '7574': 'Footwear & leather',
  '7575': 'Furniture & lighting',
  '7576/7577': 'Appliances & electronics',
  '7578': 'Ironmongery & varnishes',
  '7579': 'Building materials',
  '7580': 'Books & stationery',
  '7581': 'Automobiles & spare parts',
  '7583': 'Unspecialized (non-food)',
  '7591': 'Food, beverages & tobacco',
  '7592': 'Durable consumer goods',
};

// Macro-trend series: code → [color, lineWidth, hasArea]
const MACRO_SERIES: Array<{ code: string; color: string; width: number; area: boolean }> = [
  { code: '7560', color: '#3b82f6', width: 3, area: true },   // Total — blue, thicker
  { code: '7591', color: '#10b981', width: 2, area: false },   // Food subtotal — green
  { code: '7592', color: '#f59e0b', width: 2, area: false },   // Non-food subtotal — amber
];

// Color palette for multi-series charts
const PALETTE = [
  '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
  '#6366f1', '#a78bfa', '#fb923c', '#34d399', '#60a5fa',
  '#fbbf24', '#f87171',
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseVal(v: any): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '' || s === '.' || s === '-' || s === '..' || s === 'N/A' || s === 'NA') return null;
  const n = parseFloat(s.replace(/[\s,]/g, ''));
  return isNaN(n) ? null : n;
}

function fmtNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Returns true for structural "of which:" rows that carry no real data */
function isArtifactCode(code: string): boolean {
  if (!code || code.trim() === '') return true;
  // Mangled UTF-8 variants of "в т.ч." and "в т.ч.:"
  if (code.includes('\u00e2') || code.includes('\u00f7') || code.includes('\u2020')) return true;
  if (code.startsWith('\u0432') || code.startsWith('â')) return true;
  // Any code that does not start with a digit is non-standard
  return !/^\d/.test(code.trim());
}

// ── ECharts hook ───────────────────────────────────────────────────────────────

function useChart(option: EChartsOption | null) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    }
    if (option) chartRef.current.setOption(option, true);
    const obs = new ResizeObserver(() => chartRef.current?.resize());
    obs.observe(ref.current);
    return () => {
      obs.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option]);

  return ref;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Row {
  year: string;
  code: string;
  label: string;
  value: number;
}

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Component ──────────────────────────────────────────────────────────────────

export function RetailOutletsDashboard({ data, locale = 'en' }: Props) {
  const [categorySet, setCategorySet] = useState<'top7' | 'food' | 'nonfood' | 'stations'>('top7');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // ── Parse & clean raw rows ──────────────────────────────────────────────────

  const rows = useMemo<Row[]>(() => {
    return data
      .map(r => {
        // Code comes from the _Code column (locale-independent), label from the mapped column
        const code = String(r.TradeObjects_Code ?? r.TradeObjects ?? '').trim();
        if (isArtifactCode(code)) return null;

        const value = parseVal(r.Count ?? r.ValueColumn ?? r.Value);
        if (value === null) return null;

        const year = String(r.Year ?? r.periods ?? '').trim();
        if (!year) return null;

        // Use the locale-mapped label from the data; fall back to hardcoded EN map
        const label = String(r.TradeObjects ?? CODE_LABELS_EN[code] ?? code).trim();

        return { year, code, label, value } as Row;
      })
      .filter((r): r is Row => r !== null);
  }, [data]);

  const years = useMemo(() => [...new Set(rows.map(r => r.year))].sort(), [rows]);
  const latestYear = years[years.length - 1] ?? '';
  const effectiveYear = selectedYear || latestYear;

  // Build code → display-label map (locale-aware, from actual data labels)
  const codeToLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (!map.has(r.code)) map.set(r.code, r.label);
    }
    return map;
  }, [rows]);

  const getLabel = (code: string) =>
    codeToLabel.get(code) ?? CODE_LABELS_EN[code] ?? code;

  // ── Tab 1: Macro Trend line chart ───────────────────────────────────────────

  const macroOption = useMemo<EChartsOption>(() => {
    const series = MACRO_SERIES.map(({ code, color, width, area }) => {
      const byYear = new Map(rows.filter(r => r.code === code).map(r => [r.year, r.value]));
      return {
        name: getLabel(code),
        type: 'line' as const,
        smooth: true,
        connectNulls: false,
        data: years.map(y => byYear.get(y) ?? null),
        itemStyle: { color },
        lineStyle: { width },
        areaStyle: area ? { opacity: 0.1 } : undefined,
        symbolSize: 7,
      };
    });

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const yr = params[0]?.name ?? '';
          const lines = (params as any[])
            .filter(p => p.value != null)
            .map(p => `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${fmtNum(p.value)}</b>`)
            .join('<br/>');
          return `<b>${yr}</b><br/>${lines}`;
        },
      },
      legend: { bottom: 0 },
      grid: { top: 20, left: 64, right: 16, bottom: 56 },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { fontSize: 11 },
        name: 'Year',
        nameLocation: 'middle',
        nameGap: 28,
      },
      yAxis: {
        type: 'value',
        name: 'Outlets',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { formatter: (v: number) => fmtNum(v), fontSize: 10 },
      },
      series,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, years]);

  const macroRef = useChart(macroOption);

  // ── Tab 2: Stacked Bar — Category Evolution ─────────────────────────────────

  // All leaf codes (no aggregates)
  const allLeafCodes = useMemo(
    () => [...new Set(rows.map(r => r.code))].filter(c => !AGGREGATE_CODES.has(c)),
    [rows],
  );

  const visibleCodes = useMemo(() => {
    if (categorySet === 'food') return allLeafCodes.filter(c => FOOD_CODES.has(c));
    if (categorySet === 'nonfood') return allLeafCodes.filter(c => !FOOD_CODES.has(c) && !STATION_CODES.has(c));
    if (categorySet === 'stations') return allLeafCodes.filter(c => STATION_CODES.has(c));
    // top7: rank by average count across years, exclude stations from default
    const candidates = allLeafCodes.filter(c => !STATION_CODES.has(c));
    const avgByCode = new Map<string, number>();
    for (const code of candidates) {
      const vals = rows.filter(r => r.code === code).map(r => r.value);
      avgByCode.set(code, vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
    }
    return [...candidates].sort((a, b) => (avgByCode.get(b) ?? 0) - (avgByCode.get(a) ?? 0)).slice(0, 7);
  }, [allLeafCodes, rows, categorySet]);

  const stackedBarOption = useMemo<EChartsOption>(() => {
    const series = visibleCodes.map((code, idx) => {
      const byYear = new Map(rows.filter(r => r.code === code).map(r => [r.year, r.value]));
      return {
        name: getLabel(code),
        type: 'bar' as const,
        stack: 'total',
        emphasis: { focus: 'series' as const },
        data: years.map(y => byYear.get(y) ?? 0),
        itemStyle: { color: PALETTE[idx % PALETTE.length] },
      };
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const yr = (params as any[])[0]?.name ?? '';
          const visible = (params as any[]).filter(p => p.value > 0).sort((a, b) => b.value - a.value);
          const total = visible.reduce((s, p) => s + (p.value || 0), 0);
          const lines = visible
            .map(p => `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${fmtNum(p.value)}</b>`)
            .join('<br/>');
          return `<b>${yr}</b> — Visible total: <b>${fmtNum(total)}</b><br/>${lines}`;
        },
      },
      legend: { type: 'scroll', bottom: 0 },
      grid: { top: 20, left: 64, right: 16, bottom: 80 },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { fontSize: 11 },
        name: 'Year',
        nameLocation: 'middle',
        nameGap: 28,
      },
      yAxis: {
        type: 'value',
        name: 'Outlets',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { formatter: (v: number) => fmtNum(v), fontSize: 10 },
      },
      series,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, years, visibleCodes]);

  const stackedRef = useChart(stackedBarOption);

  // ── Tab 3: Donut — Market Snapshot ──────────────────────────────────────────

  const pieData = useMemo(() => {
    return rows
      .filter(r => r.year === effectiveYear && !AGGREGATE_CODES.has(r.code))
      .sort((a, b) => b.value - a.value)
      .map((r, idx) => ({
        name: getLabel(r.code),
        value: r.value,
        itemStyle: { color: PALETTE[idx % PALETTE.length] },
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, effectiveYear]);

  const snapshotTotal = pieData.reduce((s, d) => s + d.value, 0);

  const pieOption = useMemo<EChartsOption>(() => ({
    tooltip: {
      trigger: 'item',
      formatter: (params: any) =>
        `${params.name}: <b>${fmtNum(params.value)}</b> outlets (${params.percent?.toFixed(1)}%)`,
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { fontSize: 11 },
    },
    series: [{
      type: 'pie',
      radius: ['38%', '65%'],
      center: ['38%', '50%'],
      data: pieData,
      label: {
        show: true,
        formatter: (p: any) => `${p.percent?.toFixed(1)}%`,
        fontSize: 10,
      },
      labelLine: { length: 8, length2: 8 },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.35)' },
      },
    }],
  }), [pieData]);

  const pieRef = useChart(pieOption);

  // ── Summary stats for macro trend card ──────────────────────────────────────

  const totalRows = useMemo(() => rows.filter(r => r.code === '7560'), [rows]);
  const firstYear = years[0] ?? '';
  const firstVal = totalRows.find(r => r.year === firstYear)?.value ?? null;
  const lastVal = totalRows.find(r => r.year === latestYear)?.value ?? null;
  const peakRow = totalRows.reduce<Row | null>((best, r) => (!best || r.value > best.value ? r : best), null);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          No data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      {/* Global filter bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Category group (Evolution tab):</label>
              <Select
                value={categorySet}
                onChange={e => setCategorySet(e.target.value as any)}
                options={[
                  { value: 'top7', label: 'Top 7 overall' },
                  { value: 'food', label: 'Food categories' },
                  { value: 'nonfood', label: 'Non-food categories' },
                  { value: 'stations', label: 'Fuel stations' },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Snapshot year:</label>
              <Select
                value={effectiveYear}
                onChange={e => setSelectedYear(e.target.value)}
                options={[...years].reverse().map(y => ({ value: y, label: y }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'First year', value: firstYear, sub: firstVal != null ? `${fmtNum(firstVal)} outlets` : '—' },
          { label: 'Latest year', value: latestYear, sub: lastVal != null ? `${fmtNum(lastVal)} outlets` : '—' },
          {
            label: 'Peak year',
            value: peakRow?.year ?? '—',
            sub: peakRow ? `${fmtNum(peakRow.value)} outlets` : '—',
          },
          {
            label: 'Change',
            value: firstVal != null && lastVal != null
              ? `${firstVal < lastVal ? '+' : ''}${(((lastVal - firstVal) / firstVal) * 100).toFixed(1)}%`
              : '—',
            sub: `${firstYear}→${latestYear}`,
          },
        ].map(({ label, value, sub }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="trend">
        <TabsList className="mb-4">
          <TabsTrigger value="trend">Macro Trend</TabsTrigger>
          <TabsTrigger value="evolution">Category Evolution</TabsTrigger>
          <TabsTrigger value="snapshot">Market Snapshot</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Macro Trend ─────────────────────────────────────────────── */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>Total Retail Outlets — Annual Trend ({firstYear}–{latestYear})</CardTitle>
              <CardDescription>
                All shops and pavilions (code 7560) counted as of December 31st each year, with food (7591)
                and durable-goods (7592) sub-totals shown for comparison.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={macroRef} style={{ width: '100%', height: 420 }} />
              <p className="mt-2 text-xs text-muted-foreground">
                Source: NSI Dataset 454 — Retail sales premises as of 31.12.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Category Evolution ──────────────────────────────────────── */}
        <TabsContent value="evolution">
          <Card>
            <CardHeader>
              <CardTitle>Retail Category Evolution Over Time</CardTitle>
              <CardDescription>
                Stacked count of outlet types by year. Use the <strong>Category group</strong> filter above
                to focus on food, non-food, fuel stations, or the top 7 categories by average size.
                Click a legend item to isolate a category.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={stackedRef} style={{ width: '100%', height: 500 }} />
              <p className="mt-2 text-xs text-muted-foreground">
                Source: NSI Dataset 454. "Top 7 overall" ranks non-station categories by mean annual outlet count.
                Aggregate totals (7560, 7591, 7592) are excluded to avoid double-counting.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Market Snapshot ─────────────────────────────────────────── */}
        <TabsContent value="snapshot">
          <Card>
            <CardHeader>
              <CardTitle>Retail Market Structure — {effectiveYear}</CardTitle>
              <CardDescription>
                Distribution of specialized and unspecialized store types as of December 31, {effectiveYear}.
                {snapshotTotal > 0 && (
                  <> Total: <strong>{fmtNum(snapshotTotal)}</strong> outlets counted.
                    Aggregate totals (7560, 7591, 7592) are excluded to show the true categorical breakdown.
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No data for the selected year.
                </div>
              ) : (
                <div ref={pieRef} style={{ width: '100%', height: 500 }} />
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Source: NSI Dataset 454 — Retail sales premises as of 31.12.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
