'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import type { Dataset } from '@/types/dataset';

// ── NACE A38 label dictionary ──────────────────────────────────────────────────

interface NaceInfo { en: string; bg: string; color: string; }

const NACE: Record<string, NaceInfo> = {
  '1':  { en: 'Total – all non-financial enterprises', bg: 'Общо нефинансови предприятия', color: '#64748b' },
  'A':  { en: 'Agriculture, forestry & fishing', bg: 'Селско и горско стопанство, рибарство', color: '#84cc16' },
  'B':  { en: 'Mining and quarrying', bg: 'Добивна промишленост', color: '#a16207' },
  'CA': { en: 'Food, beverages & tobacco mfg.', bg: 'Хранително-вкусова промишленост', color: '#f59e0b' },
  'CB': { en: 'Textiles & wearing apparel mfg.', bg: 'Производство на текстил и облекло', color: '#ec4899' },
  'CC': { en: 'Wood, paper & printing mfg.', bg: 'Производство на дървесина, хартия и печат', color: '#78716c' },
  'CD': { en: 'Coke & refined petroleum mfg.', bg: 'Производство на кокс и рафинирани нефтопродукти', color: '#475569' },
  'CE': { en: 'Chemicals manufacturing', bg: 'Химическа промишленост', color: '#8b5cf6' },
  'CF': { en: 'Pharmaceuticals manufacturing', bg: 'Фармацевтична промишленост', color: '#7c3aed' },
  'CG': { en: 'Rubber, plastics & non-metallic mfg.', bg: 'Производство на каучукови, пластмасови и неметални изделия', color: '#06b6d4' },
  'CH': { en: 'Basic metals & fabricated metal mfg.', bg: 'Металургия и метални изделия', color: '#94a3b8' },
  'CI': { en: 'Computer & electronic products mfg.', bg: 'Производство на компютърна и електронна техника', color: '#3b82f6' },
  'CJ': { en: 'Electrical equipment mfg.', bg: 'Производство на електрически съоръжения', color: '#6366f1' },
  'CK': { en: 'Machinery & equipment mfg.', bg: 'Производство на машини и оборудване', color: '#0ea5e9' },
  'CL': { en: 'Transport equipment mfg.', bg: 'Производство на превозни средства', color: '#14b8a6' },
  'CM': { en: 'Other manufacturing', bg: 'Други производствени дейности', color: '#a3a3a3' },
  'D':  { en: 'Electricity, gas & steam supply', bg: 'Производство и разпределение на електрическа и топлинна енергия', color: '#f97316' },
  'E':  { en: 'Water supply & waste management', bg: 'Водоснабдяване, управление на отпадъци', color: '#22d3ee' },
  'F':  { en: 'Construction', bg: 'Строителство', color: '#d97706' },
  'G':  { en: 'Wholesale & retail trade', bg: 'Търговия; ремонт на автомобили и мотоциклети', color: '#10b981' },
  'H':  { en: 'Transportation & storage', bg: 'Транспорт, складиране и пощи', color: '#0284c7' },
  'I':  { en: 'Accommodation & food services', bg: 'Хотелиерство и ресторантьорство', color: '#f43f5e' },
  'JA': { en: 'Publishing activities', bg: 'Издателска дейност', color: '#a855f7' },
  'JB': { en: 'Telecom & financial information', bg: 'Далекосъобщения и финансово-информационни услуги', color: '#2563eb' },
  'JC': { en: 'IT programming & consultancy', bg: 'Информационни технологии и услуги', color: '#0ea5e9' },
  'L':  { en: 'Real estate activities', bg: 'Операции с недвижими имоти', color: '#d97706' },
  'MA': { en: 'Professional & management consulting', bg: 'Юридически, счетоводни и консултантски дейности', color: '#0891b2' },
  'MB': { en: 'Veterinary activities', bg: 'Ветеринарни дейности', color: '#16a34a' },
  'MC': { en: 'Scientific research & development', bg: 'Научноизследователска и развойна дейност', color: '#7c3aed' },
  'N':  { en: 'Administrative & support services', bg: 'Административни и спомагателни дейности', color: '#64748b' },
  'P':  { en: 'Education', bg: 'Образование', color: '#fbbf24' },
  'QA': { en: 'Human health activities', bg: 'Хуманна медицина', color: '#ef4444' },
  'QB': { en: 'Social work activities', bg: 'Социална работа', color: '#fb923c' },
  'R':  { en: 'Arts, entertainment & recreation', bg: 'Култура, спорт и развлечения', color: '#a78bfa' },
  'S':  { en: 'Other service activities', bg: 'Други дейности', color: '#94a3b8' },
};

// Default sectors for multi-line growth chart
const DEFAULT_GROWTH_SECTORS = ['G', 'L', 'JB', 'D', 'CA', 'JC', 'H'];

// Sector picker options (ordered by typical investment magnitude)
const SECTOR_OPTIONS = [
  'G', 'L', 'JB', 'D', 'CA', 'JC', 'H', 'CH', 'CE',
  'CG', 'F', 'MA', 'MC', 'I', 'B', 'A', 'CI', 'CJ',
  'CK', 'CL', 'CB', 'CC', 'N', 'E', 'R', 'MB',
];

// ── Types ──────────────────────────────────────────────────────────────────────

/** year → (nace_code → value_thousands_eur) */
type YearSectorMap = Map<string, Map<string, number | null>>;

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseValue(v: any): number | null {
  if (v == null || v === '' || v === '..' || v === 'null' || v === '-') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

function fmtBn(v: number | null, isBg: boolean): string {
  if (v == null) return '—';
  const billions = v / 1_000_000;
  return billions.toLocaleString('bg-BG', { maximumFractionDigits: 2 }) + (isBg ? ' млрд. EUR' : ' Bn EUR');
}

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════

export function FdiByEconomicActivityDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  // ── Build indexed data ────────────────────────────────────────────────────
  const { allYears, latestYear, firstYear, byYearSector, totals } = useMemo(() => {
    const yearSet = new Set<string>();
    const map: YearSectorMap = new Map();

    for (const row of data) {
      // Code comes from NACE2008A38_Code (if generic handler added it) or NACE2008A38 directly
      const code = String(row.NACE2008A38_Code ?? row.NACE2008A38 ?? '').trim();
      const year = String(row.Year ?? '').trim();
      const val = parseValue(row.Amount ?? row.ValueColumn);
      if (!code || !year) continue;

      yearSet.add(year);
      if (!map.has(year)) map.set(year, new Map());
      const yearMap = map.get(year)!;
      // Accept first value or override null with a real value
      if (!yearMap.has(code) || (yearMap.get(code) == null && val != null)) {
        yearMap.set(code, val);
      }
    }

    const sorted = [...yearSet].sort((a, b) => parseInt(a) - parseInt(b));
    const latest = sorted[sorted.length - 1] ?? '';
    const first = sorted[0] ?? '';
    const totals = sorted.map(yr => map.get(yr)?.get('1') ?? null);

    return { allYears: sorted, latestYear: latest, firstYear: first, byYearSector: map, totals };
  }, [data]);

  // ── KPI metrics ────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const latestTotal = byYearSector.get(latestYear)?.get('1') ?? null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    const prevTotal = prevYear ? (byYearSector.get(prevYear)?.get('1') ?? null) : null;
    const yoy = latestTotal != null && prevTotal != null && prevTotal > 0
      ? ((latestTotal - prevTotal) / prevTotal) * 100 : null;

    const sectorEntries = [...(byYearSector.get(latestYear) ?? [])].filter(([c]) => c !== '1');
    sectorEntries.sort(([, a], [, b]) => (b ?? -Infinity) - (a ?? -Infinity));
    const topCode = sectorEntries[0]?.[0] ?? null;
    const topVal  = sectorEntries[0]?.[1] ?? null;
    const topLabel = topCode ? ((isBg ? NACE[topCode]?.bg : NACE[topCode]?.en) ?? topCode) : '—';
    const activeSectors = sectorEntries.filter(([, v]) => v != null).length;

    return { latestTotal, prevTotal, yoy, prevYear, topLabel, topVal, activeSectors };
  }, [byYearSector, latestYear, allYears, isBg]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || data.length === 0) {
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
            ? 'Преки чуждестранни инвестиции в нефинансовите предприятия'
            : 'Foreign Direct Investments in Non-financial Enterprises'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | По икономически дейности (НКИД Рев.2) | хил. EUR`
            : `Annual data (${firstYear}–${latestYear}) | By economic activity (NACE Rev.2) | Thousand EUR`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        {kpi && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label={isBg ? `Общо ПЧИ (${latestYear})` : `Total FDI (${latestYear})`}
              value={fmtBn(kpi.latestTotal, isBg)}
              sub={kpi.prevYear ? `${isBg ? 'Пред. год.' : 'Prev. yr.'}: ${fmtBn(kpi.prevTotal, isBg)}` : undefined}
              accent="blue"
            />
            <KpiCard
              label={isBg ? 'Годишен ръст' : 'Year-on-Year Change'}
              value={kpi.yoy != null ? `${kpi.yoy >= 0 ? '+' : ''}${kpi.yoy.toFixed(1)}%` : '—'}
              sub={kpi.prevYear ? `${isBg ? 'спрямо' : 'vs.'} ${kpi.prevYear}` : undefined}
              accent={kpi.yoy != null && kpi.yoy >= 0 ? 'green' : 'red'}
            />
            <KpiCard
              label={isBg ? `Водещ сектор (${latestYear})` : `Top Sector (${latestYear})`}
              value={kpi.topLabel.split(/[,;]/)[0]}
              sub={kpi.topVal != null ? fmtBn(kpi.topVal, isBg) : undefined}
              accent="amber"
            />
            <KpiCard
              label={isBg ? 'Активни сектори' : 'Active Sectors'}
              value={String(kpi.activeSectors)}
              sub={isBg ? `с данни за ${latestYear}` : `with data for ${latestYear}`}
              accent="purple"
            />
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="trend">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="trend">{isBg ? 'Обща динамика' : 'Total Trend'}</TabsTrigger>
            <TabsTrigger value="sectors">{isBg ? 'По сектори' : 'By Sector'}</TabsTrigger>
            <TabsTrigger value="growth">{isBg ? 'Топ сектори' : 'Sector Growth'}</TabsTrigger>
          </TabsList>

          <TabsContent value="trend">
            <TrendSection
              allYears={allYears}
              totals={totals}
              firstYear={firstYear}
              latestYear={latestYear}
              isBg={isBg}
            />
          </TabsContent>

          <TabsContent value="sectors">
            <SectorSection
              allYears={allYears}
              latestYear={latestYear}
              byYearSector={byYearSector}
              isBg={isBg}
            />
          </TabsContent>

          <TabsContent value="growth">
            <GrowthSection
              allYears={allYears}
              byYearSector={byYearSector}
              firstYear={firstYear}
              latestYear={latestYear}
              isBg={isBg}
            />
          </TabsContent>
        </Tabs>

      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

type Accent = 'blue' | 'green' | 'red' | 'amber' | 'purple';

const ACCENT_CLASSES: Record<Accent, { bg: string; text: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600' },
  red:    { bg: 'bg-red-50',    text: 'text-red-600' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
};

function KpiCard({
  label, value, sub, accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: Accent;
}) {
  const cls = ACCENT_CLASSES[accent];
  return (
    <div className={`${cls.bg} rounded-xl p-4`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
      <p className={`text-lg font-bold mt-1 leading-snug ${cls.text} break-words`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab A — Area chart: Total FDI over time
// ══════════════════════════════════════════════════════════════════════════════

function TrendSection({
  allYears, totals, firstYear, latestYear, isBg,
}: {
  allYears: string[];
  totals: (number | null)[];
  firstYear: string;
  latestYear: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const yoyChanges = useMemo(() => (
    totals.map((v, i) => {
      if (i === 0 || v == null || totals[i - 1] == null) return null;
      return ((v - totals[i - 1]!) / totals[i - 1]!) * 100;
    })
  ), [totals]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const yr = params[0]?.axisValue;
          const idx = allYears.indexOf(yr);
          const total = totals[idx];
          const yoy = yoyChanges[idx];
          let tip = `<div style="font-weight:600;margin-bottom:6px;color:#0f172a">${yr}</div>`;
          tip += `<div style="margin:2px 0">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#3b82f6;margin-right:6px"></span>
            <span>${isBg ? 'Общо ПЧИ:' : 'Total FDI:'}</span>
            <span style="font-weight:700;margin-left:6px">${total != null ? (total / 1_000_000).toFixed(2) + (isBg ? ' млрд. EUR' : ' Bn EUR') : '—'}</span>
          </div>`;
          if (yoy != null) {
            const arrow = yoy >= 0 ? '▲' : '▼';
            const color = yoy >= 0 ? '#16a34a' : '#dc2626';
            tip += `<div style="color:${color};font-size:11px;margin-top:2px">${arrow} ${Math.abs(yoy).toFixed(1)}% YoY</div>`;
          }
          return tip;
        },
      },
      grid: { left: '2%', right: '4%', bottom: '8%', top: '6%', containLabel: true },
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
        name: isBg ? 'млрд. EUR' : 'Bn EUR',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => (v / 1_000_000).toFixed(1),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: [
        {
          name: isBg ? 'Общо ПЧИ' : 'Total FDI',
          type: 'line' as const,
          data: totals,
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 3, color: '#3b82f6' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          connectNulls: true,
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#3b82f644' },
                { offset: 1, color: '#3b82f605' },
              ],
            },
          },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, totals, isBg, yoyChanges]);

  // Summary stats
  const validTotals = totals.filter((v): v is number => v != null);
  const maxVal = validTotals.length ? Math.max(...validTotals) : null;
  const minVal = validTotals.length ? Math.min(...validTotals) : null;
  const maxYear = maxVal != null ? (allYears[totals.findIndex(v => v === maxVal)] ?? '') : '';
  const minYear = minVal != null ? (allYears[totals.findIndex(v => v === minVal)] ?? '') : '';

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">
        {isBg ? 'А. Обща динамика на ПЧИ' : 'A. Total FDI Trend Over Time'}
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        {isBg
          ? `${firstYear}–${latestYear} | Общ обем на преките чуждестранни инвестиции (НКИД код „1") | хил. EUR`
          : `${firstYear}–${latestYear} | Aggregate FDI stock in non-financial enterprises (NACE code "1") | Thousand EUR`}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '380px' }} />

      {/* Summary row */}
      <div className="flex flex-wrap gap-6 mt-3 text-xs text-slate-500">
        {maxVal != null && (
          <span>
            {isBg ? 'Максимум:' : 'Peak:'}
            {' '}
            <strong className="text-blue-600">{fmtBn(maxVal, isBg)} ({maxYear})</strong>
          </span>
        )}
        {minVal != null && (
          <span>
            {isBg ? 'Минимум:' : 'Lowest:'}
            {' '}
            <strong className="text-red-500">{fmtBn(minVal, isBg)} ({minYear})</strong>
          </span>
        )}
      </div>

      {/* YoY change mini-table */}
      <div className="mt-4 overflow-x-auto">
        <p className="text-xs font-medium text-slate-500 mb-2">
          {isBg ? 'Годишен ръст (%):' : 'Year-on-Year change (%):'}
        </p>
        <div className="flex flex-wrap gap-2">
          {allYears.map((yr, i) => {
            const yoy = yoyChanges[i];
            if (yoy == null) return null;
            const positive = yoy >= 0;
            return (
              <div key={yr} className={`rounded px-2 py-1 text-[11px] font-medium ${positive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {yr}: {positive ? '+' : ''}{yoy.toFixed(1)}%
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab B — Horizontal bar: FDI by sector for a selected year
// ══════════════════════════════════════════════════════════════════════════════

function SectorSection({
  allYears, latestYear, byYearSector, isBg,
}: {
  allYears: string[];
  latestYear: string;
  byYearSector: YearSectorMap;
  isBg: boolean;
}) {
  const [selectedYear, setSelectedYear] = useState(latestYear);

  const sectorData = useMemo(() => {
    const yearMap = byYearSector.get(selectedYear || latestYear) ?? new Map();
    return [...yearMap.entries()]
      .filter(([code, val]) => code !== '1' && val != null && (val as number) > 0)
      .map(([code, val]) => {
        const info = NACE[code] ?? { en: code, bg: code, color: '#94a3b8' };
        return {
          code,
          label: isBg ? info.bg : info.en,
          value: val as number,
          color: info.color,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [byYearSector, selectedYear, latestYear, isBg]);

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || sectorData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params[0]) return '';
          const p = params[0];
          const val = p.value as number;
          return `<div style="font-weight:600;margin-bottom:4px;color:#0f172a;max-width:260px;white-space:normal">${p.name}</div>
            <div>
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-right:6px"></span>
              ${val != null ? (val / 1_000_000).toLocaleString('bg-BG', { maximumFractionDigits: 3 }) + (isBg ? ' млрд. EUR' : ' Bn EUR') : '—'}
            </div>`;
        },
      },
      grid: { left: '2%', right: '18%', bottom: '4%', top: '2%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => (v / 1_000_000).toFixed(1) + (isBg ? ' млрд.' : ' Bn'),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      yAxis: {
        type: 'category',
        data: [...sectorData].reverse().map(d => d.label),
        axisLabel: { fontSize: 10.5, color: '#475569', width: 220, overflow: 'truncate' as const },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar' as const,
          data: [...sectorData].reverse().map(d => ({
            value: d.value,
            itemStyle: { color: d.color, borderRadius: [0, 4, 4, 0] as any },
          })),
          barMaxWidth: 22,
          label: {
            show: true,
            position: 'right' as const,
            formatter: (p: any) => {
              const v = (p.value as number) / 1_000_000;
              return v.toLocaleString('bg-BG', { maximumFractionDigits: 2 }) + (isBg ? ' млрд.' : ' Bn');
            },
            fontSize: 10,
            color: '#475569',
          },
          emphasis: { focus: 'self' as const },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [sectorData, isBg]);

  const chartHeight = Math.max(400, sectorData.length * 30 + 60);

  // Share table
  const totalShown = sectorData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg ? 'Б. Разпределение на ПЧИ по икономически сектори' : 'B. FDI Distribution by Economic Sector'}
        </h3>
        <div className="flex items-center gap-1">
          <label className="text-xs text-slate-500">{isBg ? 'Година:' : 'Year:'}</label>
          <Select
            value={selectedYear || latestYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="text-xs py-1 px-2 h-8 w-24"
          >
            {[...allYears].reverse().map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isBg
          ? 'Обем на ПЧИ по сектори (без агрегата „Общо"), сортирано по размер. Сектори с поверителни данни (..) са изключени.'
          : 'FDI stock by sector (excl. aggregate "Total"), sorted by magnitude. Sectors with confidential data (..) are excluded.'}
      </p>

      <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />

      {/* Share breakdown bars */}
      {sectorData.length > 0 && totalShown > 0 && (
        <div className="mt-5">
          <p className="text-xs font-medium text-slate-500 mb-2">
            {isBg ? `Дял от показаната сума (${selectedYear}):` : `Share of displayed total (${selectedYear}):`}
          </p>
          <div className="space-y-1.5">
            {sectorData.slice(0, 10).map(d => {
              const pct = (d.value / totalShown) * 100;
              return (
                <div key={d.code} className="flex items-center gap-2">
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block', flexShrink: 0 }} />
                  <span className="text-xs text-slate-600 w-48 truncate">{d.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: d.color }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-16 text-right">
                    {fmtBn(d.value, isBg)}
                  </span>
                  <span className="text-[11px] text-slate-400 w-10 text-right">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab C — Multi-line: Top sector trends over time
// ══════════════════════════════════════════════════════════════════════════════

function GrowthSection({
  allYears, byYearSector, firstYear, latestYear, isBg,
}: {
  allYears: string[];
  byYearSector: YearSectorMap;
  firstYear: string;
  latestYear: string;
  isBg: boolean;
}) {
  const [selectedCodes, setSelectedCodes] = useState<string[]>(DEFAULT_GROWTH_SECTORS);

  const seriesData = useMemo(() => (
    selectedCodes.map(code => {
      const info = NACE[code] ?? { en: code, bg: code, color: '#94a3b8' };
      return {
        code,
        label: isBg ? info.bg : info.en,
        color: info.color,
        values: allYears.map(yr => byYearSector.get(yr)?.get(code) ?? null),
      };
    })
  ), [selectedCodes, allYears, byYearSector, isBg]);

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0 || seriesData.length === 0) return;
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
              const v = (p.value as number) / 1_000_000;
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="flex:1;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${v.toLocaleString('bg-BG', { maximumFractionDigits: 2 })} ${isBg ? 'млрд.' : 'Bn EUR'}</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: seriesData.map(s => s.label),
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 10.5, color: '#64748b' },
        itemWidth: 14,
        itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '24%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allYears,
        axisLabel: { fontSize: 11, color: '#94a3b8', rotate: 30 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'млрд. EUR' : 'Bn EUR',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => (v / 1_000_000).toFixed(1),
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
        lineStyle: { width: 2.5, color: s.color },
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData, isBg]);

  const toggleSector = (code: string) => {
    setSelectedCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <h3 className="text-sm font-semibold text-slate-700 mb-0.5">
        {isBg ? 'В. Динамика на водещите сектори' : 'C. Top Sector Growth Dynamics'}
      </h3>
      <p className="text-xs text-slate-400 mb-2">
        {isBg
          ? `${firstYear}–${latestYear} | Изберете сектори за сравнение`
          : `${firstYear}–${latestYear} | Toggle sectors to compare long-term trends`}
      </p>

      {/* Sector toggle chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SECTOR_OPTIONS.map(code => {
          const info = NACE[code] ?? { en: code, bg: code, color: '#94a3b8' };
          const active = selectedCodes.includes(code);
          const shortLabel = (isBg ? info.bg : info.en).split(/[,;&]/)[0].trim();
          return (
            <button
              key={code}
              onClick={() => toggleSector(code)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all ${
                active
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
              }`}
              style={active ? { backgroundColor: info.color, borderColor: info.color } : {}}
              title={isBg ? info.bg : info.en}
            >
              <span className="font-bold">{code}</span>
              {' – '}
              <span className="max-w-[120px] truncate inline-block align-bottom">{shortLabel}</span>
            </button>
          );
        })}
      </div>

      {selectedCodes.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
          {isBg ? 'Изберете поне един сектор' : 'Select at least one sector'}
        </div>
      ) : (
        <div ref={chartRef} style={{ width: '100%', height: '440px' }} />
      )}
    </div>
  );
}
