'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import type { Dataset } from '@/types/dataset';

// ── Constants ──────────────────────────────────────────────────────────────────

const BUILD_TYPE_COLORS: Record<string, string> = {
  '1': '#3b82f6', // Residential — blue
  '2': '#f59e0b', // Administrative — amber
  '3': '#10b981', // Other — green
};

const BUILD_TYPE_LABELS: Record<string, string> = {
  '1': 'Residential',
  '2': 'Administrative',
  '3': 'Other',
};

const METRICS: { code: string; label: string; unit: string }[] = [
  { code: '4', label: 'Number of permits',          unit: 'permits'   },
  { code: '5', label: 'Number of dwellings',         unit: 'dwellings' },
  { code: '6', label: 'Gross building area (sq.m)', unit: 'sq.m'     },
];

const QUARTER_ORDER = ['Q1', 'Q2', 'Q3', 'Q4'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseVal(v: any): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '' || s === '-' || s === '..' || s === 'NA' || s === 'N/A') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function fmtNum(v: number, metricCode: string): string {
  if (metricCode === '6') {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M m²`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K m²`;
    return `${v.toLocaleString('en-US', { maximumFractionDigits: 0 })} m²`;
  }
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
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
  value: number;
  buildTypeCode: string;   // '1' | '2' | '3'
  buildTypeLabel: string;  // human-readable (locale-dependent)
  metricCode: string;      // '4' | '5' | '6'
  districtCode: string;    // 'BG' | 'BGS' | ...
  districtLabel: string;   // human-readable district name
  year: string;
  quarterCode: string;     // 'Q1' | 'Q2' | 'Q3' | 'Q4'
}

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BuildingPermitsDashboard({ data, locale = 'en' }: Props) {
  const [metricCode, setMetricCode]         = useState<string>('4');
  const [buildTypeFilter, setBuildTypeFilter] = useState<string>('all');
  const [districtCode, setDistrictCode]     = useState<string>('BG');
  const [selectedYear, setSelectedYear]     = useState<string>('');

  // ── Process rows ────────────────────────────────────────────────────────────

  const rows = useMemo<Row[]>(() => {
    return data
      .map(r => {
        const value = parseVal(r.Count ?? r.Value ?? r.ValueColumn);
        if (value === null) return null;

        // Use _Code variants (locale-independent) for filtering; labels for display
        const buildTypeCode  = String(r.BUILD_Permit_Code  ?? r.BUILD_Permit  ?? '');
        const buildTypeLabel = String(r.BUILD_Permit ?? buildTypeCode);
        const metricCode     = String(r.BUILD_Permit1_Code ?? r.BUILD_Permit1 ?? '');
        const districtCode   = String(r.District_Projection_Code ?? r.District_Projection ?? '');
        const districtLabel  = String(r.District_Projection ?? districtCode);
        const year           = String(r.Year ?? '');

        // Quarter: prefer _Code column, otherwise detect from label
        let quarterCode = String(r.periods_name_Code ?? r.periods_name ?? '');
        if (!QUARTER_ORDER.includes(quarterCode)) {
          const lq = quarterCode.toLowerCase();
          if (lq.includes('first')  || lq === 'q1') quarterCode = 'Q1';
          else if (lq.includes('second') || lq === 'q2') quarterCode = 'Q2';
          else if (lq.includes('third')  || lq === 'q3') quarterCode = 'Q3';
          else if (lq.includes('fourth') || lq === 'q4') quarterCode = 'Q4';
        }

        if (!buildTypeCode || !metricCode || !year || !quarterCode) return null;

        return { value, buildTypeCode, buildTypeLabel, metricCode, districtCode, districtLabel, year, quarterCode } as Row;
      })
      .filter((r): r is Row => r !== null);
  }, [data]);

  // ── Derived dimension lists ──────────────────────────────────────────────────

  const years = useMemo(() => [...new Set(rows.map(r => r.year))].sort(), [rows]);

  // Build district list with labels, put BG (Total) first
  const districts = useMemo<{ code: string; label: string }[]>(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.districtCode, r.districtLabel);
    const entries = [...map.entries()].sort((a, b) => a[0] === 'BG' ? -1 : b[0] === 'BG' ? 1 : a[1].localeCompare(b[1]));
    return entries.map(([code, label]) => ({ code, label }));
  }, [rows]);

  const buildTypes = useMemo<{ code: string; label: string }[]>(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.buildTypeCode, r.buildTypeLabel);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label }));
  }, [rows]);

  const effectiveYear = selectedYear || years[years.length - 1] || '';

  // ── Tab 1: Quarterly Time-Series Line Chart ──────────────────────────────────

  const timeLabels = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.metricCode !== metricCode) continue;
      if (r.districtCode !== districtCode) continue;
      set.add(`${r.year}-${r.quarterCode}`);
    }
    return [...set].sort((a, b) => {
      const [ay, aq] = a.split('-');
      const [by, bq] = b.split('-');
      if (ay !== by) return ay.localeCompare(by);
      return QUARTER_ORDER.indexOf(aq) - QUARTER_ORDER.indexOf(bq);
    });
  }, [rows, metricCode, districtCode]);

  // Aggregate value per (buildType, timeLabel)
  const trendMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const r of rows) {
      if (r.metricCode !== metricCode) continue;
      if (r.districtCode !== districtCode) continue;
      if (!map.has(r.buildTypeCode)) map.set(r.buildTypeCode, new Map());
      const ym = map.get(r.buildTypeCode)!;
      const tl = `${r.year}-${r.quarterCode}`;
      ym.set(tl, (ym.get(tl) || 0) + r.value);
    }
    return map;
  }, [rows, metricCode, districtCode]);

  const activeBuildTypes = buildTypeFilter === 'all' ? buildTypes : buildTypes.filter(bt => bt.code === buildTypeFilter);

  const trendOption = useMemo<EChartsOption>(() => {
    const series = activeBuildTypes.map(bt => ({
      name: BUILD_TYPE_LABELS[bt.code] || bt.label,
      type: 'line' as const,
      smooth: true,
      connectNulls: false,
      data: timeLabels.map(tl => trendMap.get(bt.code)?.get(tl) ?? null),
      itemStyle: { color: BUILD_TYPE_COLORS[bt.code] || '#94a3b8' },
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.08 },
    }));

    const metricInfo = METRICS.find(m => m.code === metricCode);
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const label = params[0]?.name || '';
          const lines = (params as any[])
            .filter(p => p.value != null)
            .map(p => `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${fmtNum(p.value, metricCode)}</b>`)
            .join('<br/>');
          return `<b>${label}</b><br/>${lines}`;
        },
      },
      legend: { type: 'scroll', bottom: 0 },
      grid: { top: 16, left: 70, right: 16, bottom: 80 },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLabel: { rotate: 45, fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        name: metricInfo?.unit || '',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { formatter: (v: number) => fmtNum(v, metricCode), fontSize: 10 },
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'slider', xAxisIndex: 0, bottom: 44, height: 20 },
      ],
      series,
    };
  }, [activeBuildTypes, timeLabels, trendMap, metricCode]);

  const trendRef = useChart(trendOption);

  // ── Tab 2: Regional Bar Chart ────────────────────────────────────────────────

  const regionalData = useMemo<{ code: string; label: string; value: number }[]>(() => {
    const map = new Map<string, { label: string; value: number }>();
    for (const r of rows) {
      if (r.year !== effectiveYear) continue;
      if (r.metricCode !== metricCode) continue;
      if (buildTypeFilter !== 'all' && r.buildTypeCode !== buildTypeFilter) continue;
      if (r.districtCode === 'BG') continue; // exclude national total
      const existing = map.get(r.districtCode);
      if (existing) existing.value += r.value;
      else map.set(r.districtCode, { label: r.districtLabel, value: r.value });
    }
    return [...map.entries()]
      .map(([code, { label, value }]) => ({ code, label, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows, effectiveYear, metricCode, buildTypeFilter]);

  const barOption = useMemo<EChartsOption>(() => {
    const reversed = [...regionalData].reverse(); // largest at top of horizontal bar
    const labels = reversed.map(d => d.label);
    const values = reversed.map(d => d.value);
    const metricInfo = METRICS.find(m => m.code === metricCode);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `<b>${p.name}</b><br/>${fmtNum(p.value, metricCode)} ${metricInfo?.unit || ''}`;
        },
      },
      grid: { top: 16, left: 8, right: 80, bottom: 16, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { formatter: (v: number) => fmtNum(v, metricCode), fontSize: 10 },
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: { fontSize: 11 },
      },
      series: [{
        type: 'bar',
        data: values.map(v => ({ value: v, itemStyle: { color: '#3b82f6' } })),
        label: {
          show: true,
          position: 'right',
          fontSize: 10,
          formatter: (p: any) => fmtNum(p.value, metricCode),
        },
      }],
    };
  }, [regionalData, metricCode]);

  const barRef = useChart(barOption);

  // ── Tab 3: Donut — composition by building type ──────────────────────────────

  const pieData = useMemo(() => {
    const map = new Map<string, { label: string; value: number }>();
    for (const r of rows) {
      if (r.year !== effectiveYear) continue;
      if (r.metricCode !== metricCode) continue;
      if (r.districtCode !== districtCode) continue;
      const existing = map.get(r.buildTypeCode);
      if (existing) existing.value += r.value;
      else map.set(r.buildTypeCode, { label: r.buildTypeLabel, value: r.value });
    }
    return [...map.entries()].map(([code, { label, value }]) => ({
      name: BUILD_TYPE_LABELS[code] || label,
      value,
      itemStyle: { color: BUILD_TYPE_COLORS[code] || '#94a3b8' },
    }));
  }, [rows, effectiveYear, metricCode, districtCode]);

  const pieOption = useMemo<EChartsOption>(() => {
    const metricInfo = METRICS.find(m => m.code === metricCode);
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) =>
          `${params.name}: <b>${fmtNum(params.value, metricCode)} ${metricInfo?.unit || ''}</b> (${params.percent?.toFixed(1)}%)`,
      },
      legend: { type: 'scroll', bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '45%'],
        data: pieData,
        label: {
          formatter: (p: any) => `${p.name}\n${p.percent?.toFixed(1)}%`,
          fontSize: 12,
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.4)' },
        },
      }],
    };
  }, [pieData, metricCode]);

  const pieRef = useChart(pieOption);

  // ── Render ───────────────────────────────────────────────────────────────────

  const metricInfo = METRICS.find(m => m.code === metricCode);
  const districtLabel = districts.find(d => d.code === districtCode)?.label ?? districtCode;

  return (
    <div className="space-y-4">

      {/* Global filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Metric:</label>
              <Select
                value={metricCode}
                onChange={e => setMetricCode(e.target.value)}
                options={METRICS.map(m => ({ value: m.code, label: m.label }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Building type:</label>
              <Select
                value={buildTypeFilter}
                onChange={e => setBuildTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All types' },
                  ...buildTypes.map(bt => ({
                    value: bt.code,
                    label: BUILD_TYPE_LABELS[bt.code] || bt.label,
                  })),
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">District:</label>
              <Select
                value={districtCode}
                onChange={e => setDistrictCode(e.target.value)}
                options={districts.map(d => ({ value: d.code, label: d.label }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Year:</label>
              <Select
                value={effectiveYear}
                onChange={e => setSelectedYear(e.target.value)}
                options={[...years].reverse().map(y => ({ value: y, label: y }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="trend">
        <TabsList className="mb-4">
          <TabsTrigger value="trend">Quarterly Trend</TabsTrigger>
          <TabsTrigger value="regional">Regional Comparison</TabsTrigger>
          <TabsTrigger value="composition">Composition</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Quarterly Trend Line Chart ─────────────────────────────── */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>Building Permits — Quarterly Trend</CardTitle>
              <CardDescription>
                {metricInfo?.label} by building type across quarters.
                District: <strong>{districtLabel}</strong>. Use the scroll/zoom control below to focus on a range.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={trendRef} style={{ width: '100%', height: 500 }} />
              <p className="mt-2 text-xs text-muted-foreground">
                Source: NSI Dataset 654 — Building permits issued for new buildings by district (Quarterly).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Regional Bar Chart ─────────────────────────────────────── */}
        <TabsContent value="regional">
          <Card>
            <CardHeader>
              <CardTitle>Regional Comparison — {effectiveYear}</CardTitle>
              <CardDescription>
                {metricInfo?.label} summed across all quarters for <strong>{effectiveYear}</strong>
                {buildTypeFilter !== 'all' ? ` — ${BUILD_TYPE_LABELS[buildTypeFilter] || buildTypeFilter} buildings` : ''}.
                National total (Bulgaria) is excluded to preserve scale.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                ref={barRef}
                style={{ width: '100%', height: Math.max(420, regionalData.length * 26 + 60) }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Donut — Building Type Composition ──────────────────────── */}
        <TabsContent value="composition">
          <Card>
            <CardHeader>
              <CardTitle>
                Building Type Composition — {effectiveYear} / {districtLabel}
              </CardTitle>
              <CardDescription>
                Share of {metricInfo?.label.toLowerCase()} by building type (Residential, Administrative, Other).
                All quarters for the selected year are summed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No data for the selected combination.
                </div>
              ) : (
                <div ref={pieRef} style={{ width: '100%', height: 420 }} />
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Note: &quot;Number of dwellings&quot; (metric 5) is only reported for Residential buildings.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
