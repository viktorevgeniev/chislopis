'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import type { Dataset } from '@/types/dataset';

// ── PRODCOM 2-digit sector dictionary ─────────────────────────────────────────

const SECTOR: Record<string, { en: string; color: string }> = {
  '07': { en: 'Mining of metal ores',           color: '#7c3aed' },
  '08': { en: 'Other mining & quarrying',        color: '#a16207' },
  '10': { en: 'Food products',                   color: '#f59e0b' },
  '11': { en: 'Beverages',                        color: '#f97316' },
  '12': { en: 'Tobacco products',                color: '#64748b' },
  '13': { en: 'Textiles',                         color: '#ec4899' },
  '14': { en: 'Wearing apparel',                  color: '#db2777' },
  '15': { en: 'Leather & footwear',              color: '#b45309' },
  '16': { en: 'Wood products',                   color: '#84cc16' },
  '17': { en: 'Paper products',                  color: '#22d3ee' },
  '18': { en: 'Printing & media',                color: '#94a3b8' },
  '19': { en: 'Coke & petroleum',                color: '#475569' },
  '20': { en: 'Chemicals',                        color: '#8b5cf6' },
  '21': { en: 'Pharmaceuticals',                  color: '#6d28d9' },
  '22': { en: 'Rubber & plastics',               color: '#0891b2' },
  '23': { en: 'Non-metallic minerals',           color: '#0284c7' },
  '24': { en: 'Basic metals',                    color: '#1e40af' },
  '25': { en: 'Fabricated metal products',       color: '#0369a1' },
  '26': { en: 'Computer & electronics',          color: '#3b82f6' },
  '27': { en: 'Electrical equipment',            color: '#6366f1' },
  '28': { en: 'Machinery & equipment',           color: '#0ea5e9' },
  '29': { en: 'Motor vehicles',                  color: '#14b8a6' },
  '30': { en: 'Other transport equipment',       color: '#10b981' },
  '31': { en: 'Furniture',                        color: '#d97706' },
  '32': { en: 'Other manufacturing',             color: '#a3a3a3' },
  '33': { en: 'Repair & installation',           color: '#78716c' },
  '38': { en: 'Waste management',                color: '#22c55e' },
};

// Indicator full labels as they appear after codelist mapping
const SOLD_VALUE_IND = 'Sold production (Value - thousand BGN, excl. VAT and excise duties)';
const PROD_QTY_IND   = 'Production (Quantity)';
const SOLD_QTY_IND   = 'Sold production (Quantity)';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getSector2(prodpromCode: string): string {
  const parts = prodpromCode.split('.');
  return parts[0] || prodpromCode.substring(0, 2);
}

function parseVal(v: any): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) || n === 0 ? null : n;
}

function fmtKBGN(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} bn BGN`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)} m BGN`;
  return `${v.toLocaleString('en-US', { maximumFractionDigits: 0 })} KBGN`;
}

function fmtAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}bn`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}m`;
  return String(v);
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProcessedRow {
  year: string;
  prodprom: string;
  sector: string;
  indicator: string;
  units: string;
  unitsCode: string;
  value: number;
}

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── EChart hook ────────────────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export function ProdcomDashboard({ data, locale = 'en' }: Props) {
  // ── Selectors ──
  const [selectedYear, setSelectedYear] = useState<string>('2023');
  const [tablePage, setTablePage] = useState(0);
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [tableYearFilter, setTableYearFilter] = useState<string>('all');

  // ── Pre-process all rows once ──────────────────────────────────────────────
  const rows = useMemo<ProcessedRow[]>(() => {
    return data
      .map(r => {
        const prodprom = String(r.PRODPROM_Code || r.PRODPROM || '');
        const val = parseVal(r.Value);
        if (val === null) return null;
        return {
          year:       String(r.Year || ''),
          prodprom,
          sector:     getSector2(prodprom),
          indicator:  String(r.Indicators || ''),
          units:      String(r.Units || ''),
          unitsCode:  String(r.Units_Code || ''),
          value:      val,
        } as ProcessedRow;
      })
      .filter((r): r is ProcessedRow => r !== null && r.year !== '' && r.prodprom !== '');
  }, [data]);

  // ── Derived sets ──────────────────────────────────────────────────────────
  const years = useMemo(() =>
    [...new Set(rows.map(r => r.year))].sort(), [rows]);

  const sectors = useMemo(() => {
    const used = new Set(rows.filter(r => r.indicator === SOLD_VALUE_IND).map(r => r.sector));
    return [...used].sort();
  }, [rows]);

  // default selected year to latest available
  const latestYear = years[years.length - 1] || '2023';

  // ── Tab 1: Sold Value Trends ───────────────────────────────────────────────
  // Aggregate sold value (KBGN) per sector per year
  const trendData = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const r of rows) {
      if (r.indicator !== SOLD_VALUE_IND) continue;
      if (!map.has(r.sector)) map.set(r.sector, new Map());
      const ym = map.get(r.sector)!;
      ym.set(r.year, (ym.get(r.year) || 0) + r.value);
    }
    return map;
  }, [rows]);

  // Pick top 10 sectors by total sold value for trend chart
  const topSectors = useMemo(() => {
    return [...trendData.entries()]
      .map(([sec, ym]) => ({
        sector: sec,
        total: [...ym.values()].reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(x => x.sector);
  }, [trendData]);

  const trendOption = useMemo<EChartsOption>(() => {
    const series = topSectors.map(sec => {
      const ym = trendData.get(sec) || new Map();
      const seriesData = years.map(y => {
        const v = ym.get(y);
        return v !== undefined ? v : null;
      });
      const info = SECTOR[sec];
      return {
        name: info?.en || sec,
        type: 'line' as const,
        smooth: true,
        connectNulls: false,
        data: seriesData,
        itemStyle: { color: info?.color || '#94a3b8' },
        lineStyle: { width: 2 },
        emphasis: { lineStyle: { width: 3 } },
      };
    });

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const year = params[0]?.name || '';
          const lines = params
            .filter((p: any) => p.value != null)
            .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
            .map((p: any) => `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${fmtKBGN(p.value)}</b>`)
            .join('<br/>');
          return `<b>${year}</b><br/>${lines}`;
        },
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        textStyle: { fontSize: 11 },
      },
      grid: { top: 16, left: 60, right: 16, bottom: 80 },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { rotate: 0 },
      },
      yAxis: {
        type: 'value',
        name: 'Thousand BGN',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { formatter: fmtAxis },
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'slider', xAxisIndex: 0, bottom: 44, height: 20 },
      ],
      series,
    };
  }, [years, topSectors, trendData]);

  const trendRef = useChart(trendOption);

  // ── Tab 2: Top Sectors by Value for selected year ─────────────────────────
  const barData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.year !== selectedYear) continue;
      if (r.indicator !== SOLD_VALUE_IND) continue;
      map.set(r.sector, (map.get(r.sector) || 0) + r.value);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reverse(); // reverse so largest is at top of horizontal bar
  }, [rows, selectedYear]);

  const barOption = useMemo<EChartsOption>(() => {
    const labels = barData.map(([sec]) => SECTOR[sec]?.en || sec);
    const values = barData.map(([, v]) => v);
    const colors = barData.map(([sec]) => SECTOR[sec]?.color || '#94a3b8');

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `<b>${p.name}</b><br/>${fmtKBGN(p.value)}`;
        },
      },
      grid: { top: 16, left: 8, right: 24, bottom: 16, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { formatter: fmtAxis, fontSize: 10 },
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: { fontSize: 11, width: 180, overflow: 'break' },
      },
      series: [
        {
          type: 'bar',
          data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
          label: {
            show: true,
            position: 'right',
            fontSize: 10,
            formatter: (p: any) => fmtKBGN(p.value),
          },
        },
      ],
    };
  }, [barData]);

  const barRef = useChart(barOption);

  // ── Tab 3: Data table ─────────────────────────────────────────────────────
  const tableRows = useMemo(() => {
    return rows
      .filter(r => {
        if (tableFilter !== 'all' && r.sector !== tableFilter) return false;
        if (tableYearFilter !== 'all' && r.year !== tableYearFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year.localeCompare(a.year);
        if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
        return b.value - a.value;
      });
  }, [rows, tableFilter, tableYearFilter]);

  const totalPages = Math.ceil(tableRows.length / PAGE_SIZE);
  const pageRows = tableRows.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE);

  function handleTableFilter(val: string) {
    setTableFilter(val);
    setTablePage(0);
  }
  function handleTableYearFilter(val: string) {
    setTableYearFilter(val);
    setTablePage(0);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <Tabs defaultValue="trends">
        <TabsList className="mb-4">
          <TabsTrigger value="trends">Sold Value Trends</TabsTrigger>
          <TabsTrigger value="top10">Top Sectors by Year</TabsTrigger>
          <TabsTrigger value="table">Data Table</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Trends ───────────────────────────────────────────────── */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Sold Industrial Production by Sector (Thousand BGN)</CardTitle>
              <CardDescription>
                Top 10 sectors by total sold value, 2008–2023. Use scroll / pinch to zoom on
                the year axis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={trendRef} style={{ width: '100%', height: 480 }} />
              <p className="mt-2 text-xs text-muted-foreground">
                Source: NSI PRODCOM D6 (ID 1274). Values aggregated from individual product
                codes. Only non-suppressed observations included.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Top 10 bar chart ─────────────────────────────────────── */}
        <TabsContent value="top10">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <CardTitle>Top 10 Industrial Sectors — Sold Production Value</CardTitle>
                  <CardDescription>
                    Aggregated sold production value (thousand BGN, excl. VAT &amp; excise) by
                    2-digit PRODCOM sector.
                  </CardDescription>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <label className="text-sm font-medium whitespace-nowrap">Year:</label>
                  <Select
                    value={selectedYear}
                    onChange={e => setSelectedYear(e.target.value)}
                    options={[...years].reverse().map(y => ({ value: y, label: y }))}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={barRef} style={{ width: '100%', height: 460 }} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Data table ────────────────────────────────────────────── */}
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Production Data</CardTitle>
              <CardDescription>
                Sortable data grid of individual product observations. Filter by sector or
                year; values are resolved to human-readable labels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Sector:</label>
                  <Select
                    value={tableFilter}
                    onChange={e => handleTableFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All sectors' },
                      ...sectors.map(s => ({
                        value: s,
                        label: `${s} – ${SECTOR[s]?.en || s}`,
                      })),
                    ]}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Year:</label>
                  <Select
                    value={tableYearFilter}
                    onChange={e => handleTableYearFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All years' },
                      ...[...years].reverse().map(y => ({ value: y, label: y })),
                    ]}
                  />
                </div>
                <span className="ml-auto self-center text-sm text-muted-foreground">
                  {tableRows.length.toLocaleString()} rows
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Year</th>
                      <th className="px-3 py-2 text-left">PRODCOM Code</th>
                      <th className="px-3 py-2 text-left">Sector</th>
                      <th className="px-3 py-2 text-left">Indicator</th>
                      <th className="px-3 py-2 text-left">Unit</th>
                      <th className="px-3 py-2 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/40'}>
                        <td className="px-3 py-1.5 font-mono">{r.year}</td>
                        <td className="px-3 py-1.5 font-mono text-xs">{r.prodprom}</td>
                        <td className="px-3 py-1.5 text-xs">{SECTOR[r.sector]?.en || r.sector}</td>
                        <td className="px-3 py-1.5 text-xs max-w-[220px]">
                          {r.indicator === SOLD_VALUE_IND
                            ? 'Sold production (Value, KBGN)'
                            : r.indicator === PROD_QTY_IND
                            ? 'Production (Quantity)'
                            : 'Sold production (Quantity)'}
                        </td>
                        <td className="px-3 py-1.5 text-xs">{r.units}</td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {r.value.toLocaleString('en-US', {
                            maximumFractionDigits:
                              r.indicator === SOLD_VALUE_IND ? 0 : 2,
                          })}
                        </td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                          No data for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-3 text-sm">
                <button
                  disabled={tablePage === 0}
                  onClick={() => setTablePage(p => Math.max(0, p - 1))}
                  className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-muted-foreground">
                  Page {tablePage + 1} of {Math.max(1, totalPages)}
                </span>
                <button
                  disabled={tablePage >= totalPages - 1}
                  onClick={() => setTablePage(p => Math.min(totalPages - 1, p + 1))}
                  className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  Next →
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
