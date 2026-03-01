'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Indicator codes (Income Statement, NSI ID 785 – Supplementary Pension Insurance Funds) ──
const C = {
  // Expenditure side
  TOTAL_EXP_SIDE:  '3.1.2.4.1.0.1',        // Total (expenditure side = revenue side)
  EXP_TOTAL:       '3.1.2.4.1.0.1.1',       // Total expenditure (investment costs)
  EXP_ON_INV:      '3.1.2.4.1.0.1.1.1',     // Expenditure on investments
  EXP_INTERESTS:   '3.1.2.4.1.0.1.1.1.1',   // Expenditure on interests
  EXP_FIN_INST:    '3.1.2.4.1.0.1.1.1.2',   // Expenditure on transactions with financial instruments
  EXP_FOREIGN:     '3.1.2.4.1.0.1.1.1.3',   // Expenditure on transactions with foreign currency
  EXP_INV_ESTATE:  '3.1.2.4.1.0.1.1.1.4',   // Expenditure on investment estate
  EXP_OTHER:       '3.1.2.4.1.0.1.1.1.5',   // Other expenditure
  INCOME:          '3.1.2.4.1.0.1.2',        // Income (distributed to fund members)
  INCOME_INSURED:  '3.1.2.4.1.0.1.2.1',     // For insured persons
  INCOME_PENSION:  '3.1.2.4.1.0.1.2.2',     // For pension insurance companies
  // Revenue side
  TOTAL_REV_SIDE:  '3.1.2.4.1.0.2',         // Total (revenue side)
  REV_TOTAL:       '3.1.2.4.1.0.2.1',        // Total revenues
  REV_FROM_INV:    '3.1.2.4.1.0.2.1.1',      // Revenues from investments
  REV_DIVIDENDS:   '3.1.2.4.1.0.2.1.1.1',    // Revenues from dividends
  REV_INTERESTS:   '3.1.2.4.1.0.2.1.1.2',    // Revenues from interests
  REV_FIN_INST:    '3.1.2.4.1.0.2.1.1.3',    // Revenues from transactions with financial instruments
  REV_FOREIGN:     '3.1.2.4.1.0.2.1.1.4',    // Revenues from transactions with foreign currency
  REV_INV_ESTATE:  '3.1.2.4.1.0.2.1.1.5',    // Revenues from investment estate
  REV_OTHER:       '3.1.2.4.1.0.2.1.1.6',    // Other revenues
  REV_COMPENSATION:'3.1.2.4.1.0.2.1.3',      // Revenue from pension insurance companies (compensation)
  NEG_RESULT:      '3.1.2.4.1.0.2.2',        // Negative result
} as const;

const LABEL_EN: Record<string, string> = {
  [C.TOTAL_EXP_SIDE]:  'Grand Total',
  [C.EXP_TOTAL]:       'Total Expenditure',
  [C.EXP_ON_INV]:      'Expenditure on Investments',
  [C.EXP_INTERESTS]:   'Exp. on Interests',
  [C.EXP_FIN_INST]:    'Exp. on Financial Instruments',
  [C.EXP_FOREIGN]:     'Exp. on Foreign Currency',
  [C.EXP_INV_ESTATE]:  'Exp. on Investment Estate',
  [C.EXP_OTHER]:       'Other Expenditure',
  [C.INCOME]:          'Income Distributed',
  [C.INCOME_INSURED]:  'Income — Insured Persons',
  [C.INCOME_PENSION]:  'Income — Pension Companies',
  [C.TOTAL_REV_SIDE]:  'Grand Total (Revenue)',
  [C.REV_TOTAL]:       'Total Revenues',
  [C.REV_FROM_INV]:    'Revenues from Investments',
  [C.REV_DIVIDENDS]:   'Dividends',
  [C.REV_INTERESTS]:   'Interest Revenues',
  [C.REV_FIN_INST]:    'Financial Instruments',
  [C.REV_FOREIGN]:     'Foreign Currency Gains',
  [C.REV_INV_ESTATE]:  'Investment Estate Revenues',
  [C.REV_OTHER]:       'Other Revenues',
  [C.REV_COMPENSATION]:'Compensation from Pension Cos.',
  [C.NEG_RESULT]:      'Negative Result',
};

const LABEL_BG: Record<string, string> = {
  [C.TOTAL_EXP_SIDE]:  'Общо',
  [C.EXP_TOTAL]:       'Разходи общо',
  [C.EXP_ON_INV]:      'Разходи за инвестиции',
  [C.EXP_INTERESTS]:   'Разходи за лихви',
  [C.EXP_FIN_INST]:    'Разходи по фин. инструменти',
  [C.EXP_FOREIGN]:     'Разходи по чужда валута',
  [C.EXP_INV_ESTATE]:  'Разходи — инвест. имоти',
  [C.EXP_OTHER]:       'Други разходи',
  [C.INCOME]:          'Разпределен доход',
  [C.INCOME_INSURED]:  'Доход — осигурени лица',
  [C.INCOME_PENSION]:  'Доход — пенсионни дружества',
  [C.TOTAL_REV_SIDE]:  'Общо (приходна страна)',
  [C.REV_TOTAL]:       'Приходи общо',
  [C.REV_FROM_INV]:    'Приходи от инвестиции',
  [C.REV_DIVIDENDS]:   'Дивиденти',
  [C.REV_INTERESTS]:   'Приходи от лихви',
  [C.REV_FIN_INST]:    'Фин. инструменти',
  [C.REV_FOREIGN]:     'Чуждовалутни приходи',
  [C.REV_INV_ESTATE]:  'Приходи — инвест. имоти',
  [C.REV_OTHER]:       'Други приходи',
  [C.REV_COMPENSATION]:'Обезщетения от пенсионни дружества',
  [C.NEG_RESULT]:      'Отрицателен резултат',
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
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(0)}M`;
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

// ── Color palette ──────────────────────────────────────────────────────────────
const COLORS = {
  revenues:      '#3b82f6',
  expenditure:   '#ef4444',
  income:        '#10b981',
  dividends:     '#3b82f6',
  interests:     '#6366f1',
  finInst:       '#8b5cf6',
  foreign:       '#14b8a6',
  invEstate:     '#f59e0b',
  revOther:      '#94a3b8',
  insured:       '#10b981',
  pensionCo:     '#f97316',
  expInterests:  '#3b82f6',
  expFinInst:    '#6366f1',
  expForeign:    '#14b8a6',
  expInvEstate:  '#f59e0b',
  expOther:      '#94a3b8',
};

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════
export function PensionFundsIncomeDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const label = (code: string) => (isBg ? LABEL_BG[code] : LABEL_EN[code]) ?? code;

  // ── Build DataMap: year → code → value ────────────────────────────────────
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

  // ── KPI ───────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const yd = dataMap.get(latestYear);
    const rev = yd?.get(C.REV_TOTAL)  ?? null;
    const exp = yd?.get(C.EXP_TOTAL)  ?? null;
    const net = rev != null && exp != null ? rev - exp : null;
    return { revenues: rev, expenditure: exp, netIncome: net };
  }, [dataMap, latestYear]);

  // ── Table state ──────────────────────────────────────────────────────────
  const [indicatorFilter, setIndicatorFilter] = useState('all');
  const [yearFilter, setYearFilter]           = useState('all');
  const [sortKey, setSortKey]   = useState<'year' | 'value'>('year');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc');
  const [page, setPage]         = useState(0);
  const PAGE_SIZE = 12;

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
            ? 'Обобщен отчет за доходите на фондовете за допълнително пенсионно осигуряване'
            : 'Supplementary Pension Insurance Funds — Income Statement'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Приходи, разходи и разпределен доход | хиляди лв.`
            : `Annual data (${firstYear}–${latestYear}) | Revenues, expenditures and distributed income | Thousand BGN`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard
            label={isBg ? 'Приходи общо' : 'Total Revenues'}
            value={kpi.revenues}
            year={latestYear}
            color="text-blue-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Разходи общо' : 'Total Expenditure'}
            value={kpi.expenditure}
            year={latestYear}
            color="text-rose-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Нетен доход' : 'Net Income (Distributed)'}
            value={kpi.netIncome}
            year={latestYear}
            color={kpi.netIncome != null && kpi.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}
            isBg={isBg}
          />
        </div>

        {/* ── Chart A: Financial Balance — Revenues vs Expenditure time series ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Финансов баланс' : 'A. Financial Balance — Revenues vs Expenditure'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Приходи общо vs. Разходи общо · Нетен доход | хиляди лв.'
              : 'Total Revenues vs. Total Expenditure · Net distributed income | Thousand BGN'}
          </p>
          <FinancialBalanceChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart B: Revenue Composition — Stacked Bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Б. Структура на приходите от инвестиции' : 'B. Revenue Composition from Investments'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Дивиденти · Лихви · Фин. инструменти · Чужда валута · Инвест. имоти · Други | хиляди лв.'
              : 'Dividends · Interests · Financial Instruments · Foreign Currency · Investment Estate · Other | Thousand BGN'}
          </p>
          <RevenueCompositionChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart C: Income Distribution — Grouped Bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'В. Разпределение на дохода' : 'C. Income Distribution'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Осигурени лица vs. Пенсионни дружества | хиляди лв.'
              : 'Insured Persons vs. Pension Insurance Companies | Thousand BGN'}
          </p>
          <IncomeDistributionChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart D: Expenditure Composition Donut (latest year) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Г. Структура на разходите (${latestYear})`
              : `D. Expenditure Components (${latestYear})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Разбивка на разходите по вид инвестиционна операция | хиляди лв.'
              : 'Breakdown of investment expenditure by type | Thousand BGN'}
          </p>
          <ExpenditureDonutChart dataMap={dataMap} latestYear={latestYear} isBg={isBg} label={label} />
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
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[240px]"
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
// Chart A — Financial Balance: Total Revenues vs Total Expenditure (line + area + bar for net)
// ══════════════════════════════════════════════════════════════════════════════
function FinancialBalanceChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => ({
    revenues:    years.map(y => dataMap.get(y)?.get(C.REV_TOTAL)  ?? null),
    expenditure: years.map(y => dataMap.get(y)?.get(C.EXP_TOTAL)  ?? null),
    net:         years.map(y => {
      const r = dataMap.get(y)?.get(C.REV_TOTAL)  ?? null;
      const e = dataMap.get(y)?.get(C.EXP_TOTAL)  ?? null;
      return r != null && e != null ? r - e : null;
    }),
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
            const v = p.value as number;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:${p.seriesType === 'bar' ? '2px' : '50%'};background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtFull(v, isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [label(C.REV_TOTAL), label(C.EXP_TOTAL), isBg ? 'Нетен доход' : 'Net Income'],
        bottom: '2%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: true,
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
        makeLine(label(C.REV_TOTAL),  series.revenues,    COLORS.revenues,    'rgb(59,130,246)'),
        makeLine(label(C.EXP_TOTAL),  series.expenditure, COLORS.expenditure, 'rgb(239,68,68)'),
        {
          name: isBg ? 'Нетен доход' : 'Net Income',
          type: 'bar' as const,
          data: series.net,
          itemStyle: {
            color: (params: any) => {
              const v = params.value as number | null;
              if (v == null) return '#94a3b8';
              return v >= 0 ? '#10b981' : '#f43f5e';
            },
            borderRadius: [3, 3, 0, 0],
          },
          barMaxWidth: 24,
          emphasis: { focus: 'series' as const },
          z: 2,
        },
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
// Chart B — Revenue Composition: Stacked Bar (investment revenue sub-categories)
// ══════════════════════════════════════════════════════════════════════════════
const REV_LEAF_CODES = [
  C.REV_DIVIDENDS,
  C.REV_INTERESTS,
  C.REV_FIN_INST,
  C.REV_FOREIGN,
  C.REV_INV_ESTATE,
  C.REV_OTHER,
] as const;

const REV_COLORS: Record<string, string> = {
  [C.REV_DIVIDENDS]:  COLORS.dividends,
  [C.REV_INTERESTS]:  COLORS.interests,
  [C.REV_FIN_INST]:   COLORS.finInst,
  [C.REV_FOREIGN]:    COLORS.foreign,
  [C.REV_INV_ESTATE]: COLORS.invEstate,
  [C.REV_OTHER]:      COLORS.revOther,
};

function RevenueCompositionChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const barSeries = REV_LEAF_CODES.map(code => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'rev',
      data: years.map(y => {
        const v = dataMap.get(y)?.get(code);
        return v != null && v > 0 ? v : 0;
      }),
      itemStyle: { color: REV_COLORS[code] },
      emphasis: { focus: 'series' as const },
    }));

    const totalLine = {
      name: label(C.REV_FROM_INV),
      type: 'line' as const,
      data: years.map(y => dataMap.get(y)?.get(C.REV_FROM_INV) ?? null),
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
              <span style="width:8px;height:8px;border-radius:${p.seriesType === 'line' ? '50%' : '2px'};background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtFull(v, isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [...REV_LEAF_CODES.map(c => label(c)), label(C.REV_FROM_INV)],
        bottom: '2%',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 12, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '26%', top: '6%', containLabel: true },
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

  return <div ref={chartRef} style={{ width: '100%', height: '430px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Income Distribution: Grouped Bar (insured persons vs pension companies)
// ══════════════════════════════════════════════════════════════════════════════
function IncomeDistributionChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const insuredData  = years.map(y => dataMap.get(y)?.get(C.INCOME_INSURED)  ?? null);
    const pensionData  = years.map(y => dataMap.get(y)?.get(C.INCOME_PENSION)  ?? null);
    const totalIncome  = years.map(y => dataMap.get(y)?.get(C.INCOME)          ?? null);

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
              <span style="width:8px;height:8px;border-radius:${p.seriesType === 'line' ? '50%' : '2px'};background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtFull(v, isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [label(C.INCOME_INSURED), label(C.INCOME_PENSION), label(C.INCOME)],
        bottom: '2%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '16%', top: '6%', containLabel: true },
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
        {
          name: label(C.INCOME_INSURED),
          type: 'bar' as const,
          data: insuredData,
          itemStyle: { color: COLORS.insured, borderRadius: [3, 3, 0, 0] },
          emphasis: { focus: 'series' as const },
        },
        {
          name: label(C.INCOME_PENSION),
          type: 'bar' as const,
          data: pensionData,
          itemStyle: { color: COLORS.pensionCo, borderRadius: [3, 3, 0, 0] },
          emphasis: { focus: 'series' as const },
        },
        {
          name: label(C.INCOME),
          type: 'line' as const,
          data: totalIncome,
          itemStyle: { color: '#0f172a' },
          lineStyle: { width: 2, color: '#0f172a', type: 'dashed' as const },
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          connectNulls: true,
          z: 10,
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [dataMap, years, isBg, label]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart D — Expenditure Composition Donut (latest year)
// ══════════════════════════════════════════════════════════════════════════════
const EXP_LEAF_CODES = [
  C.EXP_INTERESTS,
  C.EXP_FIN_INST,
  C.EXP_FOREIGN,
  C.EXP_INV_ESTATE,
  C.EXP_OTHER,
] as const;

const EXP_COLORS: Record<string, string> = {
  [C.EXP_INTERESTS]:  COLORS.expInterests,
  [C.EXP_FIN_INST]:   COLORS.expFinInst,
  [C.EXP_FOREIGN]:    COLORS.expForeign,
  [C.EXP_INV_ESTATE]: COLORS.expInvEstate,
  [C.EXP_OTHER]:      COLORS.expOther,
};

function ExpenditureDonutChart({ dataMap, latestYear, isBg, label }: {
  dataMap: DataMap; latestYear: string; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const pieData = useMemo(() => {
    const yd = dataMap.get(latestYear);
    if (!yd) return [];
    return EXP_LEAF_CODES
      .map(code => {
        const v = yd.get(code);
        if (v == null || v <= 0) return null;
        return { name: label(code), value: v, itemStyle: { color: EXP_COLORS[code] } };
      })
      .filter(Boolean) as { name: string; value: number; itemStyle: { color: string } }[];
  }, [dataMap, latestYear, label]);

  useEffect(() => {
    if (!chartRef.current || !pieData.length) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        ...tooltipStyle(),
        formatter: (params: any) => {
          const v = params.value as number;
          const pct = params.percent as number;
          return `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params.name}</div>
            <div>${fmtFull(v, isBg)} <span style="color:#94a3b8;margin-left:6px">(${pct}%)</span></div>`;
        },
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 12, itemHeight: 12,
      },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['38%', '50%'],
        data: pieData,
        label: {
          show: true,
          formatter: (p: any) => `${p.percent?.toFixed(1)}%`,
          fontSize: 11,
          color: '#334155',
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.15)' },
        },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [pieData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}
