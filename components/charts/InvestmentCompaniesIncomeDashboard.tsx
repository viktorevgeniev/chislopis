'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Indicator codes (Income Statement, NSI ID 1046 – Investment Companies) ──
const C = {
  // EXPENDITURE SIDE (profitable companies)
  TOTAL_EXP:      '3.1.2.5.1.1',       // TOTAL (expenditure side)
  EXPENDITURE:    '3.1.2.5.1.1.1',     // Expenditure (total costs)
  FIN_COSTS:      '3.1.2.5.1.1.1.1',   // Financial costs
  NON_FIN_COSTS:  '3.1.2.5.1.1.1.2',   // Non-financial costs
  PROFIT_ORD:     '3.1.2.5.1.1.2',     // Profit from ordinary activity
  EXT_EXP:        '3.1.2.5.1.1.3',     // Extraordinary expenditure
  PROFIT_BEFORE:  '3.1.2.5.1.1.4',     // Profit before tax
  TAXES:          '3.1.2.5.1.1.5',     // Taxes
  NET_PROFIT:     '3.1.2.5.1.1.6',     // Net profit

  // REVENUE SIDE (loss-making companies)
  TOTAL_REV:      '3.1.2.5.1.2',       // TOTAL (revenue side)
  REVENUES:       '3.1.2.5.1.2.1',     // Revenues
  FIN_RECEIPTS:   '3.1.2.5.1.2.1.1',  // Financial receipts
  NON_FIN_REV:    '3.1.2.5.1.2.1.2',  // Non-financial revenues
  LOSS_ORD:       '3.1.2.5.1.2.2',     // Loss from ordinary activity
  EXT_REV:        '3.1.2.5.1.2.3',     // Extraordinary revenues
  LOSS_BEFORE:    '3.1.2.5.1.2.4',     // Loss before tax
  NET_LOSS:       '3.1.2.5.1.2.5',     // Net loss
} as const;

const LABEL_EN: Record<string, string> = {
  [C.TOTAL_EXP]:     'Total',
  [C.EXPENDITURE]:   'Expenditure',
  [C.FIN_COSTS]:     'Financial Costs',
  [C.NON_FIN_COSTS]: 'Non-financial Costs',
  [C.PROFIT_ORD]:    'Profit from Ordinary Activity',
  [C.EXT_EXP]:       'Extraordinary Expenditure',
  [C.PROFIT_BEFORE]: 'Profit before Tax',
  [C.TAXES]:         'Taxes',
  [C.NET_PROFIT]:    'Net Profit',
  [C.TOTAL_REV]:     'Total',
  [C.REVENUES]:      'Revenues',
  [C.FIN_RECEIPTS]:  'Financial Receipts',
  [C.NON_FIN_REV]:   'Non-financial Revenues',
  [C.LOSS_ORD]:      'Loss from Ordinary Activity',
  [C.EXT_REV]:       'Extraordinary Revenues',
  [C.LOSS_BEFORE]:   'Loss before Tax',
  [C.NET_LOSS]:      'Net Loss',
};

const LABEL_BG: Record<string, string> = {
  [C.TOTAL_EXP]:     'Общо',
  [C.EXPENDITURE]:   'Разходи',
  [C.FIN_COSTS]:     'Финансови разходи',
  [C.NON_FIN_COSTS]: 'Нефинансови разходи',
  [C.PROFIT_ORD]:    'Печалба от обичайна дейност',
  [C.EXT_EXP]:       'Извънредни разходи',
  [C.PROFIT_BEFORE]: 'Печалба преди данъци',
  [C.TAXES]:         'Данъци',
  [C.NET_PROFIT]:    'Нетна печалба',
  [C.TOTAL_REV]:     'Общо',
  [C.REVENUES]:      'Приходи',
  [C.FIN_RECEIPTS]:  'Финансови приходи',
  [C.NON_FIN_REV]:   'Нефинансови приходи',
  [C.LOSS_ORD]:      'Загуба от обичайна дейност',
  [C.EXT_REV]:       'Извънредни приходи',
  [C.LOSS_BEFORE]:   'Загуба преди данъци',
  [C.NET_LOSS]:      'Нетна загуба',
};

// ── Types ────────────────────────────────────────────────────────────────────
type DataMap = Map<string, Map<string, number | null>>;

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getVal(v: any): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const s = String(v).trim();
  if (!s || s === '..' || s === '-' || s === '.' || s === '#' || s === 'null') return null;
  const n = parseFloat(s.replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

function safeVal(v: any): number {
  return getVal(v) ?? 0;
}

function fmtShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}B`;
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(1)}M`;
  return `${sign}${abs.toFixed(0)}K`;
}

function fmtFull(n: number, isBg: boolean): string {
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  const unit = isBg ? 'хил. лв.' : 'K BGN';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}B ${isBg ? 'лв.' : 'BGN'}`;
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(1)}M ${unit}`;
  return `${sign}${abs.toLocaleString()} ${unit}`;
}

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

const COLORS = {
  revenues:    '#3b82f6',
  expenditure: '#ef4444',
  finCosts:    '#f97316',
  nonFinCosts: '#fb923c',
  netProfit:   '#10b981',
  netLoss:     '#f43f5e',
  profitBT:    '#8b5cf6',
  taxes:       '#94a3b8',
  total:       '#0f172a',
};

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════
export function InvestmentCompaniesIncomeDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const label = (code: string) => (isBg ? LABEL_BG[code] : LABEL_EN[code]) ?? code;

  // ── Build DataMap: year → code → value ─────────────────────────────────────
  const dataMap = useMemo<DataMap>(() => {
    const map: DataMap = new Map();
    for (const row of data) {
      const year = String(row.Year ?? '');
      const code = String(row.Indicators_Code ?? row.Indicators ?? '');
      const raw  = row.Amount;
      const val  = typeof raw === 'number' ? (isNaN(raw) ? null : raw) : getVal(raw);
      if (!year || !code) continue;
      if (!map.has(year)) map.set(year, new Map());
      map.get(year)!.set(code, val);
    }
    return map;
  }, [data]);

  const allYears   = useMemo(() => [...dataMap.keys()].sort(), [dataMap]);
  const latestYear = allYears[allYears.length - 1] ?? '';
  const firstYear  = allYears[0] ?? '';

  // ── KPI (latest year) ──────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const yd = dataMap.get(latestYear);
    const revenues   = yd?.get(C.REVENUES)      ?? null;
    const netProfit  = yd?.get(C.NET_PROFIT)     ?? null;
    const netLoss    = yd?.get(C.NET_LOSS)       ?? null;
    const taxes      = yd?.get(C.TAXES)          ?? null;
    return { revenues, netProfit, netLoss, taxes };
  }, [dataMap, latestYear]);

  // ── Table state ────────────────────────────────────────────────────────────
  const [selectedYear, setSelectedYear] = useState(latestYear);
  const [indicatorFilter, setIndicatorFilter] = useState('all');
  const [yearFilter, setYearFilter]           = useState('all');
  const [sortKey, setSortKey]   = useState<'year' | 'value'>('year');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc');
  const [page, setPage]         = useState(0);
  const PAGE_SIZE = 12;

  // Sync selectedYear to latestYear once data loads
  const [yearInit, setYearInit] = useState(false);
  useMemo(() => {
    if (!yearInit && latestYear) { setSelectedYear(latestYear); setYearInit(true); }
  }, [latestYear, yearInit]);

  const allTableRows = useMemo(() => {
    return data
      .map(row => {
        const code = String(row.Indicators_Code ?? row.Indicators ?? '');
        return {
          year:  String(row.Year ?? ''),
          code,
          label: (isBg ? LABEL_BG[code] : LABEL_EN[code]) ?? String(row.Indicators ?? code),
          value: typeof row.Amount === 'number' ? (isNaN(row.Amount) ? null : row.Amount) : getVal(row.Amount),
        };
      })
      .filter(r => r.year && r.code);
  }, [data, isBg]);

  const uniqueIndicators = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of allTableRows) {
      if (!seen.has(r.code)) seen.set(r.code, r.label);
    }
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [allTableRows]);

  const filteredRows = useMemo(() => {
    let rows = allTableRows;
    if (indicatorFilter !== 'all') rows = rows.filter(r => r.code === indicatorFilter);
    if (yearFilter !== 'all')      rows = rows.filter(r => r.year === yearFilter);
    return [...rows].sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'year') return mult * a.year.localeCompare(b.year);
      const av = a.value ?? -Infinity, bv = b.value ?? -Infinity;
      return mult * (av - bv);
    });
  }, [allTableRows, indicatorFilter, yearFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
  const pagedRows  = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: 'year' | 'value') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(0);
  };

  if (!data?.length) {
    return <div className="py-8 text-center text-muted-foreground">No data available</div>;
  }

  // ── Net result (profit − loss) for latest year ─────────────────────────────
  const netResult    = (kpi.netProfit ?? 0) - (kpi.netLoss ?? 0);
  const isNetPositive = netResult >= 0;

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Обобщен отчет за доходите на инвестиционните дружества'
            : 'Investment Companies — Summarized Income Statement'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Приходи, разходи, печалба / загуба | хиляди лв.`
            : `Annual data (${firstYear}–${latestYear}) | Revenues, costs, profit / loss | Thousand BGN`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <KPICard
            label={isBg ? 'Приходи' : 'Revenues'}
            value={kpi.revenues}
            year={latestYear}
            color="text-blue-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Нетна печалба' : 'Net Profit'}
            value={kpi.netProfit}
            year={latestYear}
            color="text-emerald-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Нетна загуба' : 'Net Loss'}
            value={kpi.netLoss}
            year={latestYear}
            color="text-rose-600"
            isBg={isBg}
          />
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Нетен резултат' : 'Net Result'}
            </p>
            <p className={`text-2xl font-bold mt-2 ${isNetPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {(kpi.netProfit !== null || kpi.netLoss !== null)
                ? fmtFull(netResult, isBg)
                : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{isBg ? `${latestYear} г.` : `Year ${latestYear}`}</p>
          </div>
        </div>

        {/* ── Chart A: Macro Trend — Line Chart ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Макро тенденции' : 'A. Macro Trend'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Приходи · Разходи · Нетна печалба · Нетна загуба · динамика по години | хиляди лв.'
              : 'Revenues · Expenditure · Net Profit · Net Loss · annual trajectory | Thousand BGN'}
          </p>
          <MacroTrendChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart B: Cost Structure — Stacked Bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Б. Структура на разходите' : 'B. Cost Structure'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Финансови разходи · Нефинансови разходи — стекиран по години | хиляди лв.'
              : 'Financial Costs · Non-financial Costs — stacked by year | Thousand BGN'}
          </p>
          <CostStructureChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart C: Profitability Funnel — Selected Year ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-0.5">
                {isBg ? 'В. Приходно-разходна каскада' : 'C. Profitability Waterfall'}
              </h3>
              <p className="text-xs text-slate-400">
                {isBg
                  ? 'Стъпаловиден преход: Приходи → Разходи → Печалба преди данъци → Данъци → Нетна печалба | хиляди лв.'
                  : 'Step-by-step: Revenues → Costs → Profit before Tax → Taxes → Net Profit | Thousand BGN'}
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {isBg ? 'Година' : 'Year'}
              </label>
              <select
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
              >
                {allYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <ProfitabilityWaterfallChart
            dataMap={dataMap}
            year={selectedYear}
            isBg={isBg}
            label={label}
          />
        </div>

        {/* ── Chart D: Revenue Composition — Stacked Bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Г. Структура на приходите' : 'D. Revenue Composition'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Финансови приходи · Нефинансови приходи — стекиран по години | хиляди лв.'
              : 'Financial Receipts · Non-financial Revenues — stacked by year | Thousand BGN'}
          </p>
          <RevenueCompositionChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Interactive Data Table ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            {isBg ? 'Д. Подробни данни' : 'E. Detailed Data Table'}
          </h3>

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {isBg ? 'Показател' : 'Indicator'}
              </label>
              <select
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[280px]"
                value={indicatorFilter}
                onChange={e => { setIndicatorFilter(e.target.value); setPage(0); }}
              >
                <option value="all">{isBg ? '— Всички —' : '— All —'}</option>
                {uniqueIndicators.map(([code, lbl]) => (
                  <option key={code} value={code}>{lbl} ({code})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {isBg ? 'Година' : 'Year'}
              </label>
              <select
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={yearFilter}
                onChange={e => { setYearFilter(e.target.value); setPage(0); }}
              >
                <option value="all">{isBg ? '— Всички —' : '— All —'}</option>
                {allYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th
                    className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none"
                    onClick={() => toggleSort('year')}
                  >
                    {isBg ? 'Година' : 'Year'}
                    {sortKey === 'year' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {isBg ? 'Показател' : 'Indicator'}
                  </th>
                  <th
                    className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none"
                    onClick={() => toggleSort('value')}
                  >
                    {isBg ? 'Стойност (хил. лв.)' : 'Value (K BGN)'}
                    {sortKey === 'value' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-slate-400 text-sm">
                      {isBg ? 'Няма данни' : 'No data'}
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row, i) => (
                    <tr
                      key={`${row.year}-${row.code}-${i}`}
                      className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/40 transition-colors`}
                    >
                      <td className="py-2 px-3 font-mono text-slate-600">{row.year}</td>
                      <td className="py-2 px-3 text-slate-700">
                        <span className="font-medium">{row.label}</span>
                        <span className="ml-2 text-xs text-slate-400 font-mono">{row.code}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {row.value != null
                          ? row.value.toLocaleString()
                          : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                {isBg
                  ? `${filteredRows.length} реда · Страница ${page + 1} от ${totalPages}`
                  : `${filteredRows.length} rows · Page ${page + 1} of ${totalPages}`}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPage(0)} disabled={page === 0}
                  className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                  const p = start + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-2 py-1 text-xs rounded border ${p === page ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      {p + 1}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">›</button>
                <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
                  className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
              </div>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, year, color, isBg }: {
  label: string; value: number | null | undefined; year: string; color: string; isBg: boolean;
}) {
  return (
    <div className="bg-white shadow-sm rounded-xl p-5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${color}`}>
        {value != null ? fmtFull(value, isBg) : '—'}
      </p>
      <p className="text-xs text-slate-500 mt-1">{isBg ? `${year} г.` : `Year ${year}`}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Macro Trend: Revenues, Expenditure, Net Profit, Net Loss (line)
// ══════════════════════════════════════════════════════════════════════════════
function MacroTrendChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => ({
    revenues:    years.map(y => dataMap.get(y)?.get(C.REVENUES)    ?? null),
    expenditure: years.map(y => dataMap.get(y)?.get(C.EXPENDITURE) ?? null),
    netProfit:   years.map(y => dataMap.get(y)?.get(C.NET_PROFIT)  ?? null),
    netLoss:     years.map(y => dataMap.get(y)?.get(C.NET_LOSS)    ?? null),
  }), [dataMap, years]);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const makeLine = (
      name: string,
      seriesData: (number | null)[],
      color: string,
      rgb: string,
      dashed = false,
    ) => ({
      name,
      type: 'line' as const,
      data: seriesData,
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      connectNulls: true,
      itemStyle: { color },
      lineStyle: { width: 2.5, color, type: dashed ? ('dashed' as const) : ('solid' as const) },
      areaStyle: {
        color: {
          type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: `rgba(${rgb},0.10)` },
            { offset: 1, color: `rgba(${rgb},0)` },
          ],
        },
      },
    });

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          for (const p of params) {
            if (p.value == null) continue;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtFull(p.value as number, isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [label(C.REVENUES), label(C.EXPENDITURE), label(C.NET_PROFIT), label(C.NET_LOSS)],
        bottom: '2%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { fontSize: 10, color: '#94a3b8', rotate: years.length > 15 ? 30 : 0 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил. лв.' : 'Thousand BGN',
        nameTextStyle: { fontSize: 9, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtShort(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        makeLine(label(C.REVENUES),    series.revenues,    COLORS.revenues,    '59,130,246'),
        makeLine(label(C.EXPENDITURE), series.expenditure, COLORS.expenditure, '239,68,68', true),
        makeLine(label(C.NET_PROFIT),  series.netProfit,   COLORS.netProfit,   '16,185,129'),
        makeLine(label(C.NET_LOSS),    series.netLoss,     COLORS.netLoss,     '244,63,94', true),
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [series, years, isBg, label]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Cost Structure: Stacked Bar (Financial + Non-financial costs)
// ══════════════════════════════════════════════════════════════════════════════
function CostStructureChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const bands = [
      { code: C.FIN_COSTS,     color: COLORS.finCosts },
      { code: C.NON_FIN_COSTS, color: COLORS.nonFinCosts },
    ];

    const barSeries = bands.map(({ code, color }) => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'costs',
      data: years.map(y => safeVal(dataMap.get(y)?.get(code))),
      itemStyle: { color },
      emphasis: { focus: 'series' as const },
    }));

    const totalLine = {
      name: label(C.EXPENDITURE),
      type: 'line' as const,
      data: years.map(y => dataMap.get(y)?.get(C.EXPENDITURE) ?? null),
      itemStyle: { color: COLORS.total },
      lineStyle: { width: 2, color: COLORS.total, type: 'dashed' as const },
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      connectNulls: true,
      z: 10,
    };

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          for (const p of params) {
            if (p.value == null || (typeof p.value === 'number' && p.value === 0 && p.seriesType !== 'line')) continue;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:${p.seriesType === 'line' ? '50%' : '2px'};background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtFull(p.value as number, isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [label(C.FIN_COSTS), label(C.NON_FIN_COSTS), label(C.EXPENDITURE)],
        bottom: '2%',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 12, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { fontSize: 10, color: '#94a3b8', rotate: years.length > 15 ? 30 : 0 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил. лв.' : 'Thousand BGN',
        nameTextStyle: { fontSize: 9, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtShort(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [...barSeries, totalLine],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [dataMap, years, isBg, label]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Profitability Waterfall for selected year
// Uses ECharts stacked bar technique: transparent base + colored delta
// ══════════════════════════════════════════════════════════════════════════════
function ProfitabilityWaterfallChart({ dataMap, year, isBg, label }: {
  dataMap: DataMap; year: string; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const waterfallData = useMemo(() => {
    const yd = dataMap.get(year);
    if (!yd) return null;

    const revenues   = safeVal(yd.get(C.REVENUES));
    const finCosts   = safeVal(yd.get(C.FIN_COSTS));
    const nonFinCosts= safeVal(yd.get(C.NON_FIN_COSTS));
    const profitBT   = safeVal(yd.get(C.PROFIT_BEFORE));
    // Use loss data if profitBT is 0 and there's net loss
    const lossOrd    = safeVal(yd.get(C.LOSS_ORD));
    const taxes      = safeVal(yd.get(C.TAXES));
    const netProfit  = safeVal(yd.get(C.NET_PROFIT));
    const netLoss    = safeVal(yd.get(C.NET_LOSS));

    // Determine if the year is net-profitable
    const isProfit = netProfit >= netLoss;

    // Categories for the waterfall
    const cats = [
      label(C.REVENUES),
      label(C.FIN_COSTS),
      label(C.NON_FIN_COSTS),
      isProfit ? label(C.PROFIT_BEFORE) : label(C.LOSS_BEFORE),
      taxes > 0 ? label(C.TAXES) : null,
      isProfit ? label(C.NET_PROFIT) : label(C.NET_LOSS),
    ].filter(Boolean) as string[];

    // Waterfall positions
    // Each step: [invisible_base, visible_delta, isDecrease, isResult]
    const steps: Array<{ base: number; delta: number; decrease: boolean; result: boolean; color: string }> = [];

    // Step 1: Revenues (increase from 0)
    steps.push({ base: 0, delta: revenues, decrease: false, result: false, color: COLORS.revenues });

    // Step 2: Financial costs (decrease)
    const afterFinCosts = revenues - finCosts;
    steps.push({ base: afterFinCosts, delta: finCosts, decrease: true, result: false, color: COLORS.finCosts });

    // Step 3: Non-financial costs (decrease)
    const afterNonFinCosts = afterFinCosts - nonFinCosts;
    steps.push({ base: afterNonFinCosts, delta: nonFinCosts, decrease: true, result: false, color: COLORS.nonFinCosts });

    // Step 4: Profit/Loss before tax (result bar)
    if (isProfit) {
      steps.push({ base: 0, delta: profitBT, decrease: false, result: true, color: COLORS.profitBT });
    } else {
      steps.push({ base: 0, delta: lossOrd, decrease: false, result: true, color: COLORS.netLoss });
    }

    // Step 5: Taxes (if any)
    if (taxes > 0) {
      const afterTaxBase = Math.max(0, isProfit ? profitBT - taxes : lossOrd - taxes);
      steps.push({ base: afterTaxBase, delta: taxes, decrease: true, result: false, color: COLORS.taxes });
    }

    // Step 6: Net profit/loss (result bar)
    steps.push({
      base: 0,
      delta: isProfit ? netProfit : netLoss,
      decrease: false,
      result: true,
      color: isProfit ? COLORS.netProfit : COLORS.netLoss,
    });

    return { cats, steps };
  }, [dataMap, year, label]);

  useEffect(() => {
    if (!chartRef.current || !waterfallData) return;
    const chart = echarts.init(chartRef.current);
    const { cats, steps } = waterfallData;

    const invisibleData = steps.map(s => s.result ? 0 : s.base);
    const visibleData   = steps.map(s => s.delta);
    const visibleColors = steps.map(s => s.color);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          const colored = params.find((p: any) => p.seriesName === (isBg ? 'Стойност' : 'Value'));
          if (!colored || colored.value == null) return '';
          return `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${colored.name}</div>
            <div style="font-weight:600;color:${colored.color}">${fmtFull(colored.value as number, isBg)}</div>`;
        },
      },
      grid: { left: '1%', right: '4%', bottom: '3%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: cats,
        axisLabel: { fontSize: 10, color: '#64748b', interval: 0, overflow: 'truncate', width: 90 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил. лв.' : 'Thousand BGN',
        nameTextStyle: { fontSize: 9, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtShort(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          // Transparent base (invisible)
          name: isBg ? 'База' : 'Base',
          type: 'bar',
          stack: 'waterfall',
          itemStyle: { borderColor: 'transparent', color: 'transparent' },
          emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
          data: invisibleData,
        },
        {
          // Colored value bars
          name: isBg ? 'Стойност' : 'Value',
          type: 'bar',
          stack: 'waterfall',
          label: {
            show: true,
            position: 'top',
            formatter: (p: any) => fmtShort(p.value as number),
            fontSize: 10,
            color: '#334155',
          },
          data: visibleData.map((v, i) => ({
            value: v,
            itemStyle: { color: visibleColors[i], borderRadius: steps[i].result ? [4, 4, 0, 0] : [2, 2, 0, 0] },
          })),
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [waterfallData, isBg]);

  if (!waterfallData) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        {isBg ? 'Няма данни за избраната година' : 'No data for selected year'}
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart D — Revenue Composition: Stacked Bar (Financial + Non-financial revenues)
// ══════════════════════════════════════════════════════════════════════════════
function RevenueCompositionChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const bands = [
      { code: C.FIN_RECEIPTS, color: COLORS.revenues },
      { code: C.NON_FIN_REV,  color: '#60a5fa' },
    ];

    const barSeries = bands.map(({ code, color }) => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'revenues',
      data: years.map(y => safeVal(dataMap.get(y)?.get(code))),
      itemStyle: { color },
      emphasis: { focus: 'series' as const },
    }));

    const totalLine = {
      name: label(C.REVENUES),
      type: 'line' as const,
      data: years.map(y => dataMap.get(y)?.get(C.REVENUES) ?? null),
      itemStyle: { color: COLORS.total },
      lineStyle: { width: 2, color: COLORS.total, type: 'dashed' as const },
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      connectNulls: true,
      z: 10,
    };

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          for (const p of params) {
            if (p.value == null || (typeof p.value === 'number' && p.value === 0 && p.seriesType !== 'line')) continue;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:${p.seriesType === 'line' ? '50%' : '2px'};background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtFull(p.value as number, isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [label(C.FIN_RECEIPTS), label(C.NON_FIN_REV), label(C.REVENUES)],
        bottom: '2%',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 12, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { fontSize: 10, color: '#94a3b8', rotate: years.length > 15 ? 30 : 0 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил. лв.' : 'Thousand BGN',
        nameTextStyle: { fontSize: 9, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtShort(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [...barSeries, totalLine],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [dataMap, years, isBg, label]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
