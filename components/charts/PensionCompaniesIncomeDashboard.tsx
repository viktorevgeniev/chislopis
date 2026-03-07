'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Indicator codes (Income Statement, NSI ID 646 – Pension Companies) ────────
const C = {
  // Expenditure side
  TOTAL_EXP_SIDE:  '3.1.2.4.1.1',
  EXPENDITURE:     '3.1.2.4.1.1.1',
  EXP_ELEMENTS:    '3.1.2.4.1.1.1.1',
  EXP_CORRECTIVE:  '3.1.2.4.1.1.1.2',
  EXP_MGMT:        '3.1.2.4.1.1.1.3',
  EXP_INVEST:      '3.1.2.4.1.1.1.4',
  EXP_RETAINED:    '3.1.2.4.1.1.1.5',
  TOTAL_EXP:       '3.1.2.4.1.1.4',
  PROFIT_ACT:      '3.1.2.4.1.1.5',
  TAX:             '3.1.2.4.1.1.6',
  PROFIT:          '3.1.2.4.1.1.7',
  // Revenue side
  TOTAL_REV_SIDE:  '3.1.2.4.1.2',
  REVENUES:        '3.1.2.4.1.2.1',
  REV_FEES:        '3.1.2.4.1.2.1.1',
  REV_MGMT:        '3.1.2.4.1.2.1.2',
  REV_INVEST:      '3.1.2.4.1.2.1.3',
  REV_RELEASED:    '3.1.2.4.1.2.1.4',
  TOTAL_REV:       '3.1.2.4.1.2.4',
  LOSS_ACT:        '3.1.2.4.1.2.5',
  LOSS:            '3.1.2.4.1.2.6',
} as const;

const LABEL_EN: Record<string, string> = {
  [C.TOTAL_EXP_SIDE]: 'Total (Expenditure Side)',
  [C.EXPENDITURE]:    'Expenditure from Activity',
  [C.EXP_ELEMENTS]:   'Expenditure by Elements',
  [C.EXP_CORRECTIVE]: 'Corrective Sum',
  [C.EXP_MGMT]:       'Exp. for Management of Funds',
  [C.EXP_INVEST]:     'Exp. for Investment of Spec. Reserves',
  [C.EXP_RETAINED]:   'Retained Special Reserves',
  [C.TOTAL_EXP]:      'Total Expenditure',
  [C.PROFIT_ACT]:     'Profit from Activity',
  [C.TAX]:            'Tax Expenditure/Revenue',
  [C.PROFIT]:         'Profit',
  [C.TOTAL_REV_SIDE]: 'Total (Revenue Side)',
  [C.REVENUES]:       'Revenues from Activity',
  [C.REV_FEES]:       'Revenues from Fees',
  [C.REV_MGMT]:       'Revenues from Management of Funds',
  [C.REV_INVEST]:     'Revenues from Investment of Spec. Reserves',
  [C.REV_RELEASED]:   'Released Specialized Reserves',
  [C.TOTAL_REV]:      'Total Revenues',
  [C.LOSS_ACT]:       'Loss from Activity',
  [C.LOSS]:           'Loss',
};

const LABEL_BG: Record<string, string> = {
  [C.TOTAL_EXP_SIDE]: 'Общо (разходна страна)',
  [C.EXPENDITURE]:    'Разходи за дейността',
  [C.EXP_ELEMENTS]:   'Разходи по елементи',
  [C.EXP_CORRECTIVE]: 'Коригираща сума',
  [C.EXP_MGMT]:       'Разходи за управление на фондове',
  [C.EXP_INVEST]:     'Разходи за инвестиране на спец. резерви',
  [C.EXP_RETAINED]:   'Задържани специализирани резерви',
  [C.TOTAL_EXP]:      'Общо разходи за дейността',
  [C.PROFIT_ACT]:     'Печалба от дейността',
  [C.TAX]:            'Данъчни разходи/приходи',
  [C.PROFIT]:         'Печалба',
  [C.TOTAL_REV_SIDE]: 'Общо (приходна страна)',
  [C.REVENUES]:       'Приходи от дейността',
  [C.REV_FEES]:       'Приходи от такси и комисиони',
  [C.REV_MGMT]:       'Приходи от управление на фондове',
  [C.REV_INVEST]:     'Приходи от инвестиране на спец. резерви',
  [C.REV_RELEASED]:   'Освободени специализирани резерви',
  [C.TOTAL_REV]:      'Общо приходи за дейността',
  [C.LOSS_ACT]:       'Загуба от дейността',
  [C.LOSS]:           'Загуба',
};

// ── Types ──────────────────────────────────────────────────────────────────────
type DataMap = Map<string, Map<string, number | null>>;

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getVal(v: any): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const s = String(v).trim();
  if (!s || s === '..' || s === '-' || s === '.' || s === '#' || s === 'null') return null;
  const n = parseFloat(s.replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

function fmtShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}B`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}M`;
  return `${sign}${abs.toFixed(0)}K`;
}

function fmtFull(n: number, isBg: boolean): string {
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  const unit = isBg ? 'хил. лв.' : 'K BGN';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}B ${isBg ? 'лв.' : 'BGN'}`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}M ${unit}`;
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

// ── Color palette ──────────────────────────────────────────────────────────────
const COLORS = {
  totalRev:     '#10b981',
  totalExp:     '#ef4444',
  profit:       '#3b82f6',
  profitAct:    '#6366f1',
  tax:          '#f97316',
  loss:         '#dc2626',
  expElements:  '#ef4444',
  expCorrective:'#f87171',
  expMgmt:      '#fb923c',
  expInvest:    '#fbbf24',
  expRetained:  '#a78bfa',
  revFees:      '#10b981',
  revMgmt:      '#06b6d4',
  revInvest:    '#8b5cf6',
  revReleased:  '#f59e0b',
};

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════
export function PensionCompaniesIncomeDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const label = (code: string) => (isBg ? LABEL_BG[code] : LABEL_EN[code]) ?? code;

  // ── Build DataMap: year → code → value ──────────────────────────────────────
  const dataMap = useMemo<DataMap>(() => {
    const map: DataMap = new Map();
    for (const row of data) {
      const year = String(row.Year ?? '');
      const code = String(row.Indicators_Code ?? row.Indicators ?? '');
      const val  = getVal(row.Amount);
      if (!year || !code) continue;
      if (!map.has(year)) map.set(year, new Map());
      map.get(year)!.set(code, val);
    }
    return map;
  }, [data]);

  const allYears   = useMemo(() => [...dataMap.keys()].sort(), [dataMap]);
  const latestYear = allYears[allYears.length - 1] ?? '';
  const firstYear  = allYears[0] ?? '';

  // ── KPI ─────────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const yd = dataMap.get(latestYear);
    const totalRev = yd?.get(C.TOTAL_REV)  ?? yd?.get(C.TOTAL_REV_SIDE) ?? null;
    const totalExp = yd?.get(C.TOTAL_EXP)  ?? null;
    const profit   = yd?.get(C.PROFIT)     ?? null;
    const profitAct = yd?.get(C.PROFIT_ACT) ?? null;
    const margin = (profit != null && totalRev != null && totalRev > 0)
      ? ((profit / totalRev) * 100)
      : null;
    return { totalRev, totalExp, profit, profitAct, margin };
  }, [dataMap, latestYear]);

  // ── Table state ──────────────────────────────────────────────────────────────
  const [indicatorFilter, setIndicatorFilter] = useState('all');
  const [yearFilter, setYearFilter]           = useState('all');
  const [sortKey, setSortKey]   = useState<'year' | 'value'>('year');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc');
  const [page, setPage]         = useState(0);
  const PAGE_SIZE = 12;

  // ── Build flat table rows ────────────────────────────────────────────────────
  const allTableRows = useMemo(() => {
    return data
      .map(row => {
        const code = String(row.Indicators_Code ?? row.Indicators ?? '');
        return {
          year:  String(row.Year ?? ''),
          code,
          label: (isBg ? LABEL_BG[code] : LABEL_EN[code]) ?? String(row.Indicators ?? code),
          value: getVal(row.Amount),
        };
      })
      .filter(r => r.year && r.code);
  }, [data, isBg]);

  const uniqueIndicators = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of allTableRows) {
      if (!seen.has(row.code)) seen.set(row.code, row.label);
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

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Обобщен отчет за доходите на пенсионноосигурителните дружества'
            : 'Pension Companies — Summarized Income Statement'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Приходи, разходи и печалба | хиляди лв.`
            : `Annual data (${firstYear}–${latestYear}) | Revenues, expenditures and profit | Thousand BGN`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <KPICard
            label={isBg ? 'Общо приходи' : 'Total Revenues'}
            value={kpi.totalRev}
            year={latestYear}
            color="text-emerald-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Общо разходи' : 'Total Expenditure'}
            value={kpi.totalExp}
            year={latestYear}
            color="text-rose-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Печалба' : 'Net Profit'}
            value={kpi.profit}
            year={latestYear}
            color="text-blue-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Марж на печалбата' : 'Profit Margin'}
            value={kpi.margin}
            year={latestYear}
            color="text-violet-600"
            isBg={isBg}
            isPercent
          />
        </div>

        {/* ── Chart A: Revenue vs Expenditure vs Profit (multi-line) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Приходи, разходи и печалба' : 'A. Revenues, Expenditures & Profit'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Общо приходи · Общо разходи · Печалба | хиляди лв.'
              : 'Total Revenues · Total Expenditure · Profit | Thousand BGN'}
          </p>
          <FinancialTrendChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart B: Expenditure Breakdown Stacked Bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Б. Структура на разходите за дейността' : 'B. Expenditure Breakdown'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Разходи по елементи · Управление · Инвестиране · Резерви | хиляди лв.'
              : 'By Elements · Management · Investment · Retained Reserves | Thousand BGN'}
          </p>
          <ExpenditureBreakdownChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart C: Revenue Breakdown Stacked Bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'В. Структура на приходите от дейността' : 'C. Revenue Breakdown'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Такси и комисиони · Управление · Инвестиране · Освободени резерви | хиляди лв.'
              : 'Fees & Commissions · Management · Investment · Released Reserves | Thousand BGN'}
          </p>
          <RevenueBreakdownChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Interactive Data Table ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            {isBg ? 'Г. Подробни данни' : 'D. Detailed Data Table'}
          </h3>

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {isBg ? 'Показател' : 'Indicator'}
              </label>
              <select
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[260px]"
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

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KPICard({ label, value, year, color, isBg, isPercent }: {
  label: string; value: number | null | undefined; year: string; color: string; isBg: boolean; isPercent?: boolean;
}) {
  const display = value != null
    ? (isPercent ? `${value.toFixed(1)}%` : fmtFull(value, isBg))
    : '—';
  return (
    <div className="bg-white shadow-sm rounded-xl p-5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${color}`}>{display}</p>
      <p className="text-xs text-slate-500 mt-1">{isBg ? `${year} г.` : `Year ${year}`}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Financial Trend: Total Revenues vs Total Expenditure vs Profit
// ══════════════════════════════════════════════════════════════════════════════
function FinancialTrendChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => ({
    rev:    years.map(y => {
      const yd = dataMap.get(y);
      return yd?.get(C.TOTAL_REV) ?? yd?.get(C.TOTAL_REV_SIDE) ?? null;
    }),
    exp:    years.map(y => dataMap.get(y)?.get(C.TOTAL_EXP) ?? null),
    profit: years.map(y => dataMap.get(y)?.get(C.PROFIT)    ?? null),
  }), [dataMap, years]);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const makeLine = (
      name: string,
      data: (number | null)[],
      color: string,
      areaColor?: string,
    ) => ({
      name,
      type: 'line' as const,
      data,
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      connectNulls: true,
      itemStyle: { color },
      lineStyle: { width: 2.5, color },
      ...(areaColor ? {
        areaStyle: {
          color: {
            type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: areaColor.replace(')', ',0.12)').replace('rgb', 'rgba') },
              { offset: 1, color: areaColor.replace(')', ',0)').replace('rgb', 'rgba') },
            ],
          },
        },
      } : {}),
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
        data: [label(C.TOTAL_REV), label(C.TOTAL_EXP), label(C.PROFIT)],
        bottom: '2%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
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
        makeLine(label(C.TOTAL_REV), series.rev,    COLORS.totalRev, 'rgb(16,185,129)'),
        makeLine(label(C.TOTAL_EXP), series.exp,    COLORS.totalExp, 'rgb(239,68,68)'),
        makeLine(label(C.PROFIT),    series.profit, COLORS.profit,   'rgb(59,130,246)'),
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
// Chart B — Expenditure Breakdown: Stacked Bar
// ══════════════════════════════════════════════════════════════════════════════
const EXP_CODES = [C.EXP_ELEMENTS, C.EXP_MGMT, C.EXP_INVEST, C.EXP_RETAINED] as const;

const EXP_COLORS: Record<string, string> = {
  [C.EXP_ELEMENTS]:  COLORS.expElements,
  [C.EXP_MGMT]:      COLORS.expMgmt,
  [C.EXP_INVEST]:    COLORS.expInvest,
  [C.EXP_RETAINED]:  COLORS.expRetained,
};

function ExpenditureBreakdownChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const barSeries = EXP_CODES.map(code => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'exp',
      data: years.map(y => {
        const v = dataMap.get(y)?.get(code);
        return v != null && v > 0 ? v : null;
      }),
      itemStyle: { color: EXP_COLORS[code] },
      emphasis: { focus: 'series' as const },
    }));

    const totalLine = {
      name: label(C.TOTAL_EXP),
      type: 'line' as const,
      data: years.map(y => dataMap.get(y)?.get(C.TOTAL_EXP) ?? null),
      itemStyle: { color: '#0f172a' },
      lineStyle: { width: 2, color: '#0f172a', type: 'dashed' as const },
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
            if (p.value == null) continue;
            const v = p.value as number;
            if (Math.abs(v) < 1) continue;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:2px;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtFull(Math.abs(v), isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [...EXP_CODES.map(c => label(c)), label(C.TOTAL_EXP)],
        bottom: '2%',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 12, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '22%', top: '6%', containLabel: true },
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

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Revenue Breakdown: Stacked Bar
// ══════════════════════════════════════════════════════════════════════════════
const REV_CODES = [C.REV_FEES, C.REV_MGMT, C.REV_INVEST, C.REV_RELEASED] as const;

const REV_COLORS: Record<string, string> = {
  [C.REV_FEES]:     COLORS.revFees,
  [C.REV_MGMT]:     COLORS.revMgmt,
  [C.REV_INVEST]:   COLORS.revInvest,
  [C.REV_RELEASED]: COLORS.revReleased,
};

function RevenueBreakdownChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const barSeries = REV_CODES.map(code => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'rev',
      data: years.map(y => {
        const v = dataMap.get(y)?.get(code);
        return v != null && v > 0 ? v : null;
      }),
      itemStyle: { color: REV_COLORS[code] },
      emphasis: { focus: 'series' as const },
    }));

    const totalLine = {
      name: label(C.TOTAL_REV),
      type: 'line' as const,
      data: years.map(y => {
        const yd = dataMap.get(y);
        return yd?.get(C.TOTAL_REV) ?? yd?.get(C.TOTAL_REV_SIDE) ?? null;
      }),
      itemStyle: { color: '#0f172a' },
      lineStyle: { width: 2, color: '#0f172a', type: 'dashed' as const },
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
            if (p.value == null) continue;
            const v = p.value as number;
            if (Math.abs(v) < 1) continue;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:2px;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtFull(Math.abs(v), isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [...REV_CODES.map(c => label(c)), label(C.TOTAL_REV)],
        bottom: '2%',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 12, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '22%', top: '6%', containLabel: true },
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

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}
