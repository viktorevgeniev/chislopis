'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Indicator codes (Balance Sheet, NSI ID 772 – Associations & Foundations) ─
const C = {
  // ASSETS side
  TOTAL_ASSETS:   '3.1.2.1.3.1',       // TOTAL ASSETS
  ASSETS_TOP:     '3.1.2.1.3.1.0',     // Assets (sub-total, usually empty)
  SUBSCRIBED:     '3.1.2.1.3.1.1',     // Subscribed but unpaid capital
  NC_ASSETS:      '3.1.2.1.3.1.2',     // Non-current (fixed) assets
  INTANGIBLE:     '3.1.2.1.3.1.2.1',   // Intangible assets
  TANGIBLE:       '3.1.2.1.3.1.2.2',   // Tangible fixed assets
  LT_FINANCIAL:   '3.1.2.1.3.1.2.3',   // Long-term financial assets
  DEFERRED_TAX:   '3.1.2.1.3.1.2.4',   // Deferred taxes
  C_ASSETS:       '3.1.2.1.3.1.3',     // Current (short-term) assets
  STOCKS:         '3.1.2.1.3.1.3.1',   // Stocks
  RECEIVABLES:    '3.1.2.1.3.1.3.2',   // Receivables
  INVESTMENTS:    '3.1.2.1.3.1.3.3',   // Investments
  CASH:           '3.1.2.1.3.1.3.4',   // Cash
  PREPAYMENTS:    '3.1.2.1.3.1.4',     // Prepayments
  // LIABILITIES side
  TOTAL_LIAB:     '3.1.2.1.3.2',       // TOTAL LIABILITIES
  EQUITY:         '3.1.2.1.3.2.1',     // Equity
  PROVISIONS:     '3.1.2.1.3.2.2',     // Provisions and similar liabilities
  LIABILITIES:    '3.1.2.1.3.2.3',     // Liabilities
  FINANCING:      '3.1.2.1.3.2.4',     // Financing and accruals
} as const;

const LABEL_EN: Record<string, string> = {
  [C.TOTAL_ASSETS]: 'Total Assets',
  [C.ASSETS_TOP]:   'Assets',
  [C.SUBSCRIBED]:   'Subscribed but Unpaid Capital',
  [C.NC_ASSETS]:    'Non-current (Fixed) Assets',
  [C.INTANGIBLE]:   'Intangible Assets',
  [C.TANGIBLE]:     'Tangible Fixed Assets',
  [C.LT_FINANCIAL]: 'Long-term Financial Assets',
  [C.DEFERRED_TAX]: 'Deferred Taxes',
  [C.C_ASSETS]:     'Current (Short-term) Assets',
  [C.STOCKS]:       'Stocks',
  [C.RECEIVABLES]:  'Receivables',
  [C.INVESTMENTS]:  'Investments',
  [C.CASH]:         'Cash',
  [C.PREPAYMENTS]:  'Prepayments',
  [C.TOTAL_LIAB]:   'Total Liabilities',
  [C.EQUITY]:       'Equity',
  [C.PROVISIONS]:   'Provisions & Similar Liabilities',
  [C.LIABILITIES]:  'Liabilities',
  [C.FINANCING]:    'Financing & Accruals',
};

const LABEL_BG: Record<string, string> = {
  [C.TOTAL_ASSETS]: 'Сума на актива',
  [C.ASSETS_TOP]:   'Активи',
  [C.SUBSCRIBED]:   'Записан, но невнесен капитал',
  [C.NC_ASSETS]:    'Нетекущи (дълготрайни) активи',
  [C.INTANGIBLE]:   'Нематериални активи',
  [C.TANGIBLE]:     'Материални дълготрайни активи',
  [C.LT_FINANCIAL]: 'Дългосрочни финансови активи',
  [C.DEFERRED_TAX]: 'Отсрочени данъци',
  [C.C_ASSETS]:     'Текущи (краткотрайни) активи',
  [C.STOCKS]:       'Материални запаси',
  [C.RECEIVABLES]:  'Вземания',
  [C.INVESTMENTS]:  'Инвестиции',
  [C.CASH]:         'Парични средства',
  [C.PREPAYMENTS]:  'Разходи за бъдещи периоди',
  [C.TOTAL_LIAB]:   'Сума на пасива',
  [C.EQUITY]:       'Собствен капитал',
  [C.PROVISIONS]:   'Провизии и подобни задължения',
  [C.LIABILITIES]:  'Задължения',
  [C.FINANCING]:    'Финансиране и начислени разходи',
};

// ── Types ─────────────────────────────────────────────────────────────────────
type DataMap = Map<string, Map<string, number | null>>;

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getVal(v: any): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const s = String(v).trim();
  if (!s || s === '..' || s === '-' || s === '.' || s === '#' || s === 'null') return null;
  const n = parseFloat(s.replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

function safeVal(v: number | null | undefined): number {
  return v ?? 0;
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
  totalAssets:  '#3b82f6',
  totalLiab:    '#8b5cf6',
  ncAssets:     '#0ea5e9',
  cAssets:      '#38bdf8',
  subscribed:   '#e0f2fe',
  prepayments:  '#bae6fd',
  equity:       '#10b981',
  provisions:   '#f59e0b',
  liabilities:  '#ef4444',
  financing:    '#f97316',
  intangible:   '#6366f1',
  tangible:     '#0284c7',
  ltFinancial:  '#0369a1',
  deferredTax:  '#7dd3fc',
  stocks:       '#34d399',
  receivables:  '#6ee7b7',
  investments:  '#a7f3d0',
  cash:         '#059669',
};

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════
export function AssociationsBalanceDashboard({ data, locale = 'en' }: Props) {
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
    return {
      totalAssets: yd?.get(C.TOTAL_ASSETS) ?? null,
      equity:      yd?.get(C.EQUITY)       ?? null,
      cAssets:     yd?.get(C.C_ASSETS)     ?? null,
      liabilities: yd?.get(C.LIABILITIES)  ?? null,
    };
  }, [dataMap, latestYear]);

  // ── Snapshot year selector (for Charts C & D) ─────────────────────────────
  const [selectedYear, setSelectedYear] = useState(latestYear);
  const [yearInit, setYearInit] = useState(false);
  useMemo(() => {
    if (!yearInit && latestYear) { setSelectedYear(latestYear); setYearInit(true); }
  }, [latestYear, yearInit]);

  // ── Table state ────────────────────────────────────────────────────────────
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

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Обобщен баланс на сдруженията и фондациите'
            : 'Associations & Foundations — Summarized Balance Sheet'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Активи и пасиви | хиляди лв.`
            : `Annual data (${firstYear}–${latestYear}) | Assets and liabilities | Thousand BGN`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <KPICard
            label={isBg ? 'Сума на актива' : 'Total Assets'}
            value={kpi.totalAssets}
            year={latestYear}
            color="text-blue-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Текущи активи' : 'Current Assets'}
            value={kpi.cAssets}
            year={latestYear}
            color="text-sky-500"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Собствен капитал' : 'Equity'}
            value={kpi.equity}
            year={latestYear}
            color="text-emerald-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Задължения' : 'Liabilities'}
            value={kpi.liabilities}
            year={latestYear}
            color="text-rose-600"
            isBg={isBg}
          />
        </div>

        {/* ── Chart A: Macro Balance — Line ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Макро баланс' : 'A. Macro Balance'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Сума на актива · Сума на пасива — динамика по години | хиляди лв.'
              : 'Total Assets · Total Liabilities — annual trajectory | Thousand BGN'}
          </p>
          <MacroBalanceChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart B: Asset Composition — Stacked Bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Б. Структура на актива' : 'B. Asset Composition'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Нетекущи активи · Текущи активи · Записан невнесен капитал · Разходи за бъд. периоди — стекирано | хиляди лв.'
              : 'Non-current Assets · Current Assets · Subscribed Unpaid Capital · Prepayments — stacked | Thousand BGN'}
          </p>
          <AssetCompositionChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart C: Liability Structure — Stacked Bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'В. Структура на пасива' : 'C. Liability Structure'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Собствен капитал · Провизии · Задължения · Финансиране и начислени разходи — стекирано | хиляди лв.'
              : 'Equity · Provisions · Liabilities · Financing & Accruals — stacked | Thousand BGN'}
          </p>
          <LiabilityStructureChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart D & E: Year Snapshot (donut charts) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-0.5">
                {isBg ? 'Г. Детайлна разбивка за избрана година' : 'D. Year Snapshot — Detailed Breakdown'}
              </h3>
              <p className="text-xs text-slate-400">
                {isBg
                  ? 'Разпределение на дълготрайните активи · Разпределение на текущите активи | хиляди лв.'
                  : 'Distribution of non-current assets · Distribution of current assets | Thousand BGN'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 text-center mb-2">
                {isBg ? 'Нетекущи активи' : 'Non-current Assets'}
              </p>
              <NcAssetsDonutChart dataMap={dataMap} year={selectedYear} isBg={isBg} label={label} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 text-center mb-2">
                {isBg ? 'Текущи активи' : 'Current Assets'}
              </p>
              <CurrentAssetsDonutChart dataMap={dataMap} year={selectedYear} isBg={isBg} label={label} />
            </div>
          </div>
        </div>

        {/* ── Chart F: Liquidity Trend ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Д. Ликвидностни показатели' : 'E. Liquidity Tracking'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Парични средства · Вземания · Материални запаси · Инвестиции — динамика | хиляди лв.'
              : 'Cash · Receivables · Stocks · Investments — annual trend | Thousand BGN'}
          </p>
          <LiquidityChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Interactive Data Table ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            {isBg ? 'Е. Подробни данни' : 'F. Detailed Data Table'}
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
// Chart A — Macro Balance: Total Assets vs Total Liabilities (line)
// ══════════════════════════════════════════════════════════════════════════════
function MacroBalanceChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const makeLine = (
      name: string,
      code: string,
      color: string,
      rgb: string,
      dashed = false,
    ) => ({
      name,
      type: 'line' as const,
      data: years.map(y => dataMap.get(y)?.get(code) ?? null),
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
            { offset: 0, color: `rgba(${rgb},0.12)` },
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
        data: [label(C.TOTAL_ASSETS), label(C.TOTAL_LIAB)],
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
        makeLine(label(C.TOTAL_ASSETS), C.TOTAL_ASSETS, COLORS.totalAssets, '59,130,246'),
        makeLine(label(C.TOTAL_LIAB),   C.TOTAL_LIAB,   COLORS.totalLiab,   '139,92,246', true),
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
// Chart B — Asset Composition: Stacked Bar
// ══════════════════════════════════════════════════════════════════════════════
function AssetCompositionChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const bands = [
      { code: C.NC_ASSETS,   color: COLORS.ncAssets },
      { code: C.C_ASSETS,    color: COLORS.cAssets },
      { code: C.SUBSCRIBED,  color: COLORS.subscribed },
      { code: C.PREPAYMENTS, color: COLORS.prepayments },
    ];

    const barSeries = bands.map(({ code, color }) => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'assets',
      data: years.map(y => safeVal(dataMap.get(y)?.get(code))),
      itemStyle: { color },
      emphasis: { focus: 'series' as const },
    }));

    const totalLine = {
      name: label(C.TOTAL_ASSETS),
      type: 'line' as const,
      data: years.map(y => dataMap.get(y)?.get(C.TOTAL_ASSETS) ?? null),
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
        data: [label(C.NC_ASSETS), label(C.C_ASSETS), label(C.SUBSCRIBED), label(C.PREPAYMENTS), label(C.TOTAL_ASSETS)],
        bottom: '2%',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 12, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '18%', top: '6%', containLabel: true },
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

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Liability Structure: Stacked Bar
// ══════════════════════════════════════════════════════════════════════════════
function LiabilityStructureChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const bands = [
      { code: C.EQUITY,      color: COLORS.equity },
      { code: C.PROVISIONS,  color: COLORS.provisions },
      { code: C.LIABILITIES, color: COLORS.liabilities },
      { code: C.FINANCING,   color: COLORS.financing },
    ];

    const barSeries = bands.map(({ code, color }) => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'liab',
      data: years.map(y => safeVal(dataMap.get(y)?.get(code))),
      itemStyle: { color },
      emphasis: { focus: 'series' as const },
    }));

    const totalLine = {
      name: label(C.TOTAL_LIAB),
      type: 'line' as const,
      data: years.map(y => dataMap.get(y)?.get(C.TOTAL_LIAB) ?? null),
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
        data: [label(C.EQUITY), label(C.PROVISIONS), label(C.LIABILITIES), label(C.FINANCING), label(C.TOTAL_LIAB)],
        bottom: '2%',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 12, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '18%', top: '6%', containLabel: true },
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

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart D — Non-current Assets Donut for selected year
// ══════════════════════════════════════════════════════════════════════════════
function NcAssetsDonutChart({ dataMap, year, isBg, label }: {
  dataMap: DataMap; year: string; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const pieData = useMemo(() => {
    const yd = dataMap.get(year);
    if (!yd) return [];
    const items = [
      { code: C.INTANGIBLE,   color: COLORS.intangible },
      { code: C.TANGIBLE,     color: COLORS.tangible },
      { code: C.LT_FINANCIAL, color: COLORS.ltFinancial },
      { code: C.DEFERRED_TAX, color: COLORS.deferredTax },
    ];
    return items
      .map(({ code, color }) => ({ name: label(code), value: yd.get(code) ?? null, itemStyle: { color } }))
      .filter(d => d.value != null && d.value > 0) as { name: string; value: number; itemStyle: { color: string } }[];
  }, [dataMap, year, label]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    if (!pieData.length) {
      chart.setOption({});
      return;
    }

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        ...tooltipStyle(),
        formatter: (p: any) => {
          const pct = ((p.value / pieData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(1);
          return `<div style="font-weight:600;margin-bottom:2px;color:#0f172a">${p.name}</div>
            <div style="color:${p.color};font-weight:600">${fmtFull(p.value, isBg)}</div>
            <div style="color:#94a3b8;font-size:11px">${pct}%</div>`;
        },
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 10, itemHeight: 10,
      },
      series: [{
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['38%', '50%'],
        data: pieData,
        label: {
          show: true,
          formatter: (p: any) => {
            const pct = ((p.value / pieData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(0);
            return `${pct}%`;
          },
          fontSize: 10,
          color: '#334155',
        },
        labelLine: { length: 6, length2: 8 },
        emphasis: {
          itemStyle: { shadowBlur: 8, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.1)' },
          label: { show: true, fontSize: 11, fontWeight: 'bold' },
        },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [pieData, isBg]);

  if (!pieData.length) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        {isBg ? 'Няма данни' : 'No data'}
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: '260px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart E — Current Assets Donut for selected year
// ══════════════════════════════════════════════════════════════════════════════
function CurrentAssetsDonutChart({ dataMap, year, isBg, label }: {
  dataMap: DataMap; year: string; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const pieData = useMemo(() => {
    const yd = dataMap.get(year);
    if (!yd) return [];
    const items = [
      { code: C.STOCKS,      color: COLORS.stocks },
      { code: C.RECEIVABLES, color: COLORS.receivables },
      { code: C.INVESTMENTS, color: COLORS.investments },
      { code: C.CASH,        color: COLORS.cash },
    ];
    return items
      .map(({ code, color }) => ({ name: label(code), value: yd.get(code) ?? null, itemStyle: { color } }))
      .filter(d => d.value != null && d.value > 0) as { name: string; value: number; itemStyle: { color: string } }[];
  }, [dataMap, year, label]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    if (!pieData.length) {
      chart.setOption({});
      return;
    }

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        ...tooltipStyle(),
        formatter: (p: any) => {
          const pct = ((p.value / pieData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(1);
          return `<div style="font-weight:600;margin-bottom:2px;color:#0f172a">${p.name}</div>
            <div style="color:${p.color};font-weight:600">${fmtFull(p.value, isBg)}</div>
            <div style="color:#94a3b8;font-size:11px">${pct}%</div>`;
        },
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 10, itemHeight: 10,
      },
      series: [{
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['38%', '50%'],
        data: pieData,
        label: {
          show: true,
          formatter: (p: any) => {
            const pct = ((p.value / pieData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(0);
            return `${pct}%`;
          },
          fontSize: 10,
          color: '#334155',
        },
        labelLine: { length: 6, length2: 8 },
        emphasis: {
          itemStyle: { shadowBlur: 8, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.1)' },
          label: { show: true, fontSize: 11, fontWeight: 'bold' },
        },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [pieData, isBg]);

  if (!pieData.length) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        {isBg ? 'Няма данни' : 'No data'}
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: '260px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart F — Liquidity Tracking: Cash, Receivables, Stocks, Investments (line)
// ══════════════════════════════════════════════════════════════════════════════
function LiquidityChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const series = [
      { code: C.CASH,        color: COLORS.cash,        rgb: '5,150,105' },
      { code: C.RECEIVABLES, color: COLORS.receivables,  rgb: '110,231,183' },
      { code: C.STOCKS,      color: COLORS.stocks,       rgb: '52,211,153' },
      { code: C.INVESTMENTS, color: COLORS.investments,  rgb: '167,243,208' },
    ].map(({ code, color, rgb }) => ({
      name: label(code),
      type: 'line' as const,
      data: years.map(y => dataMap.get(y)?.get(code) ?? null),
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      connectNulls: true,
      itemStyle: { color },
      lineStyle: { width: 2, color },
      areaStyle: {
        color: {
          type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: `rgba(${rgb},0.10)` },
            { offset: 1, color: `rgba(${rgb},0)` },
          ],
        },
      },
    }));

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
        data: [label(C.CASH), label(C.RECEIVABLES), label(C.STOCKS), label(C.INVESTMENTS)],
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
      series,
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [dataMap, years, isBg, label]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
