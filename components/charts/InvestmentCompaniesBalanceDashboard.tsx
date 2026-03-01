'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Indicator codes (Balance Sheet, NSI ID 434 – Investment Companies) ──────
const C = {
  // ASSETS
  TOTAL_ASSETS:        '3.1.2.5.3.1',
  NC_ASSETS:           '3.1.2.5.3.1.1',    // Non-current assets
  NC_FIN_ASSETS:       '3.1.2.5.3.1.1.1',  // Non-current financial assets
  NC_NON_FIN_ASSETS:   '3.1.2.5.3.1.1.2',  // Non-current non-financial assets
  C_ASSETS:            '3.1.2.5.3.1.2',    // Current assets
  CASH:                '3.1.2.5.3.1.2.1',  // Cash
  INV_TRADING:         '3.1.2.5.3.1.2.2',  // Investments for trading
  NON_FIN_ASSETS:      '3.1.2.5.3.1.2.3',  // Non-financial assets (current)
  PREPAYMENTS:         '3.1.2.5.3.1.2.4',  // Prepayments
  FOREIGN_ASSETS:      '3.1.2.5.3.1.3',    // Foreign assets received
  CLIENT_FIN_INST:     '3.1.2.5.3.1.3.1',  // Financial instruments of clients
  CLIENT_CASH:         '3.1.2.5.3.1.3.2',  // Cash of clients
  // LIABILITIES
  TOTAL_LIAB:          '3.1.2.5.3.2',
  EQUITY:              '3.1.2.5.3.2.1',    // Equity
  CAPITAL:             '3.1.2.5.3.2.1.1',  // Capital
  RESERVES:            '3.1.2.5.3.2.1.2',  // Reserves
  REVALUATION:         '3.1.2.5.3.2.1.3',  // Revaluation
  FIN_RESULT:          '3.1.2.5.3.2.1.4',  // Financial result
  NC_LIAB:             '3.1.2.5.3.2.2',    // Non-current liabilities
  C_LIAB:              '3.1.2.5.3.2.3',    // Current liabilities
  C_LIAB_OWN:          '3.1.2.5.3.2.3.1',  // Current liabilities (own)
  C_LIAB_FOREIGN:      '3.1.2.5.3.2.3.2',  // Liabilities on received foreign assets
  ACCRUALS:            '3.1.2.5.3.2.4',    // Accruals
} as const;

const LABEL_EN: Record<string, string> = {
  [C.TOTAL_ASSETS]:      'Total Assets',
  [C.NC_ASSETS]:         'Non-current Assets',
  [C.NC_FIN_ASSETS]:     'Non-current Financial Assets',
  [C.NC_NON_FIN_ASSETS]: 'Non-current Non-financial Assets',
  [C.C_ASSETS]:          'Current Assets',
  [C.CASH]:              'Cash',
  [C.INV_TRADING]:       'Investments for Trading',
  [C.NON_FIN_ASSETS]:    'Non-financial Assets (Current)',
  [C.PREPAYMENTS]:       'Prepayments',
  [C.FOREIGN_ASSETS]:    'Foreign Assets Received',
  [C.CLIENT_FIN_INST]:   'Financial Instruments of Clients',
  [C.CLIENT_CASH]:       'Cash of Clients',
  [C.TOTAL_LIAB]:        'Total Liabilities',
  [C.EQUITY]:            'Equity',
  [C.CAPITAL]:           'Capital',
  [C.RESERVES]:          'Reserves',
  [C.REVALUATION]:       'Revaluation',
  [C.FIN_RESULT]:        'Financial Result',
  [C.NC_LIAB]:           'Non-current Liabilities',
  [C.C_LIAB]:            'Current Liabilities',
  [C.C_LIAB_OWN]:        'Current Liabilities (Own)',
  [C.C_LIAB_FOREIGN]:    'Liab. on Foreign Assets',
  [C.ACCRUALS]:          'Accruals',
};

const LABEL_BG: Record<string, string> = {
  [C.TOTAL_ASSETS]:      'Сума на актива',
  [C.NC_ASSETS]:         'Нетекущи активи',
  [C.NC_FIN_ASSETS]:     'Нетекущи финансови активи',
  [C.NC_NON_FIN_ASSETS]: 'Нетекущи нефинансови активи',
  [C.C_ASSETS]:          'Текущи активи',
  [C.CASH]:              'Парични средства',
  [C.INV_TRADING]:       'Инвестиции за търговия',
  [C.NON_FIN_ASSETS]:    'Нефинансови активи (текущи)',
  [C.PREPAYMENTS]:       'Аванси',
  [C.FOREIGN_ASSETS]:    'Получени чужди активи',
  [C.CLIENT_FIN_INST]:   'Фин. инструменти на клиенти',
  [C.CLIENT_CASH]:       'Парични средства на клиенти',
  [C.TOTAL_LIAB]:        'Сума на пасива',
  [C.EQUITY]:            'Собствен капитал',
  [C.CAPITAL]:           'Капитал',
  [C.RESERVES]:          'Резерви',
  [C.REVALUATION]:       'Преоценка',
  [C.FIN_RESULT]:        'Финансов резултат',
  [C.NC_LIAB]:           'Нетекущи задължения',
  [C.C_LIAB]:            'Текущи задължения',
  [C.C_LIAB_OWN]:        'Текущи задължения (собствени)',
  [C.C_LIAB_FOREIGN]:    'Задълж. по чужди активи',
  [C.ACCRUALS]:          'Начисления',
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

// ── Color palette ─────────────────────────────────────────────────────────────
const COLORS = {
  totalAssets:   '#3b82f6',
  totalLiab:     '#ef4444',
  ncAssets:      '#6366f1',
  cAssets:       '#10b981',
  foreignAssets: '#f59e0b',
  equity:        '#3b82f6',
  ncLiab:        '#8b5cf6',
  cLiab:         '#f97316',
  accruals:      '#94a3b8',
};

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════
export function InvestmentCompaniesBalanceDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const label = (code: string) => (isBg ? LABEL_BG[code] : LABEL_EN[code]) ?? code;

  // ── Build DataMap: year → code → value ─────────────────────────────────────
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

  // ── KPI ────────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const yd = dataMap.get(latestYear);
    const assets = yd?.get(C.TOTAL_ASSETS) ?? null;
    const liab   = yd?.get(C.TOTAL_LIAB)   ?? null;
    const equity = yd?.get(C.EQUITY)        ?? null;
    return { assets, liab, equity };
  }, [dataMap, latestYear]);

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
            ? 'Обобщен баланс на инвестиционните дружества'
            : 'Investment Companies — Summarized Balance Sheet'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Активи, пасиви и собствен капитал | хиляди лв.`
            : `Annual data (${firstYear}–${latestYear}) | Assets, liabilities and equity | Thousand BGN`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard
            label={isBg ? 'Сума на актива' : 'Total Assets'}
            value={kpi.assets}
            year={latestYear}
            color="text-blue-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Сума на пасива' : 'Total Liabilities'}
            value={kpi.liab}
            year={latestYear}
            color="text-rose-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Собствен капитал' : 'Equity'}
            value={kpi.equity}
            year={latestYear}
            color="text-indigo-600"
            isBg={isBg}
          />
        </div>

        {/* ── Chart A: Total Assets vs Total Liabilities — Line ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Баланс — Активи и Пасиви' : 'A. Balance Sheet — Assets vs Liabilities'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Сума на актива vs. Сума на пасива · динамика по години | хиляди лв.'
              : 'Total Assets vs. Total Liabilities · annual trajectory | Thousand BGN'}
          </p>
          <AssetsLiabilitiesLineChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart B: Asset Composition — Stacked Bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Б. Структура на активите' : 'B. Asset Composition'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Нетекущи · Текущи · Получени чужди активи | хиляди лв.'
              : 'Non-current · Current · Foreign Assets Received | Thousand BGN'}
          </p>
          <AssetCompositionChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart C: Liability Structure Donut (latest year) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `В. Структура на пасива (${latestYear})`
              : `C. Liability Structure (${latestYear})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Собствен капитал · Нетекущи задължения · Текущи задължения · Начисления | хиляди лв.'
              : 'Equity · Non-current Liabilities · Current Liabilities · Accruals | Thousand BGN'}
          </p>
          <LiabilityDonutChart dataMap={dataMap} latestYear={latestYear} isBg={isBg} label={label} />
        </div>

        {/* ── Chart D: Equity Components over time ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Г. Компоненти на собствения капитал' : 'D. Equity Components Over Time'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Капитал · Резерви · Преоценка · Финансов резултат | хиляди лв.'
              : 'Capital · Reserves · Revaluation · Financial Result | Thousand BGN'}
          </p>
          <EquityComponentsChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
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
// Chart A — Total Assets vs Total Liabilities (multi-line with area)
// ══════════════════════════════════════════════════════════════════════════════
function AssetsLiabilitiesLineChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => ({
    assets: years.map(y => dataMap.get(y)?.get(C.TOTAL_ASSETS) ?? null),
    liab:   years.map(y => dataMap.get(y)?.get(C.TOTAL_LIAB)   ?? null),
    equity: years.map(y => dataMap.get(y)?.get(C.EQUITY)        ?? null),
  }), [dataMap, years]);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const makeLine = (name: string, data: (number | null)[], color: string, areaRgb: string) => ({
      name,
      type: 'line' as const,
      data,
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      connectNulls: true,
      itemStyle: { color },
      lineStyle: { width: 2.5, color },
      areaStyle: {
        color: {
          type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: `rgba(${areaRgb},0.10)` },
            { offset: 1, color: `rgba(${areaRgb},0)` },
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
        data: [label(C.TOTAL_ASSETS), label(C.TOTAL_LIAB), label(C.EQUITY)],
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
        makeLine(label(C.TOTAL_ASSETS), series.assets, COLORS.totalAssets, '59,130,246'),
        makeLine(label(C.TOTAL_LIAB),   series.liab,   COLORS.totalLiab,   '239,68,68'),
        makeLine(label(C.EQUITY),       series.equity,  COLORS.equity,      '99,102,241'),
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
// Chart B — Asset Composition: Stacked Bar (NC + Current + Foreign)
// ══════════════════════════════════════════════════════════════════════════════
function AssetCompositionChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const assetBands = [
      { code: C.NC_ASSETS,      color: COLORS.ncAssets },
      { code: C.C_ASSETS,       color: COLORS.cAssets },
      { code: C.FOREIGN_ASSETS, color: COLORS.foreignAssets },
    ];

    const barSeries = assetBands.map(({ code, color }) => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'assets',
      data: years.map(y => {
        const v = dataMap.get(y)?.get(code);
        return v != null && v > 0 ? v : 0;
      }),
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
        data: [label(C.NC_ASSETS), label(C.C_ASSETS), label(C.FOREIGN_ASSETS), label(C.TOTAL_ASSETS)],
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
// Chart C — Liability Structure Donut (latest year)
// ══════════════════════════════════════════════════════════════════════════════
const LIAB_SLICE_CODES = [
  { code: C.EQUITY,   color: COLORS.equity },
  { code: C.NC_LIAB,  color: COLORS.ncLiab },
  { code: C.C_LIAB,   color: COLORS.cLiab },
  { code: C.ACCRUALS, color: COLORS.accruals },
] as const;

function LiabilityDonutChart({ dataMap, latestYear, isBg, label }: {
  dataMap: DataMap; latestYear: string; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const pieData = useMemo(() => {
    const yd = dataMap.get(latestYear);
    if (!yd) return [];
    return LIAB_SLICE_CODES
      .map(({ code, color }) => {
        const v = yd.get(code);
        if (v == null || v <= 0) return null;
        return { name: label(code), value: v, itemStyle: { color } };
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

// ══════════════════════════════════════════════════════════════════════════════
// Chart D — Equity Components: Stacked Bar (Capital + Reserves + Revaluation + Financial Result)
// ══════════════════════════════════════════════════════════════════════════════
const EQUITY_BANDS = [
  { code: C.CAPITAL,     color: '#3b82f6' },
  { code: C.RESERVES,    color: '#10b981' },
  { code: C.REVALUATION, color: '#f59e0b' },
  { code: C.FIN_RESULT,  color: '#f43f5e' },
] as const;

function EquityComponentsChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const barSeries = EQUITY_BANDS.map(({ code, color }) => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'equity',
      data: years.map(y => dataMap.get(y)?.get(code) ?? null),
      itemStyle: { color },
      emphasis: { focus: 'series' as const },
    }));

    const totalLine = {
      name: label(C.EQUITY),
      type: 'line' as const,
      data: years.map(y => dataMap.get(y)?.get(C.EQUITY) ?? null),
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
        data: [...EQUITY_BANDS.map(b => label(b.code)), label(C.EQUITY)],
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
