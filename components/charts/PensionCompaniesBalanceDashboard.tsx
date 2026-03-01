'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Indicator codes (Balance Sheet, NSI ID 1200 – Pension Insurance Companies) ─
const C = {
  // Assets
  TOTAL_ASSETS:  '3.1.2.4.3.1',
  NON_CURR:      '3.1.2.4.3.1.1',
  NC_TANGIBLE:   '3.1.2.4.3.1.1.1',
  NC_INTANGIBLE: '3.1.2.4.3.1.1.2',
  NC_FINANCIAL:  '3.1.2.4.3.1.1.3',
  NC_INVESTMENT: '3.1.2.4.3.1.1.4',
  NC_OTHER:      '3.1.2.4.3.1.1.5',
  ROU:           '3.1.2.4.3.1.2',
  CAP_COSTS:     '3.1.2.4.3.1.3',
  CURR:          '3.1.2.4.3.1.4',
  C_RECEIVABLES: '3.1.2.4.3.1.4.2',
  C_FINANCIAL:   '3.1.2.4.3.1.4.3',
  C_CASH:        '3.1.2.4.3.1.4.4',
  // Liabilities & Equity
  TOTAL_LIAB:    '3.1.2.4.3.2',
  EQUITY:        '3.1.2.4.3.2.1',
  EQ_CAPITAL:    '3.1.2.4.3.2.1.1',
  EQ_RESERVES:   '3.1.2.4.3.2.1.2',
  EQ_RESULT:     '3.1.2.4.3.2.1.3',
  SPEC_RESERVES: '3.1.2.4.3.2.2',
  SR_PENSION:    '3.1.2.4.3.2.2.1',
  SR_LIFETIME:   '3.1.2.4.3.2.2.2',
  SR_GROSS:      '3.1.2.4.3.2.2.3',
  SR_MIN:        '3.1.2.4.3.2.2.4',
  NC_LIAB:       '3.1.2.4.3.2.3',
  C_LIAB:        '3.1.2.4.3.2.4',
} as const;

const LABEL_EN: Record<string, string> = {
  [C.TOTAL_ASSETS]:  'Total Assets',
  [C.NON_CURR]:      'Non-current Assets',
  [C.NC_TANGIBLE]:   'NC Tangible Assets',
  [C.NC_INTANGIBLE]: 'NC Intangible Assets',
  [C.NC_FINANCIAL]:  'NC Financial Assets',
  [C.NC_INVESTMENT]: 'Investment Property',
  [C.NC_OTHER]:      'Other NC Assets',
  [C.ROU]:           'Right-of-use Assets',
  [C.CAP_COSTS]:     'Capitalized Costs',
  [C.CURR]:          'Current Assets',
  [C.C_RECEIVABLES]: 'Current Receivables',
  [C.C_FINANCIAL]:   'Current Financial Assets',
  [C.C_CASH]:        'Cash & Equivalents',
  [C.TOTAL_LIAB]:    'Total Liabilities & Equity',
  [C.EQUITY]:        'Equity',
  [C.EQ_CAPITAL]:    'Capital',
  [C.EQ_RESERVES]:   'Equity Reserves',
  [C.EQ_RESULT]:     'Financial Result',
  [C.SPEC_RESERVES]: 'Special Reserves',
  [C.SR_PENSION]:    'Pension Reserve',
  [C.SR_LIFETIME]:   'Lifetime Pension Reserve',
  [C.SR_GROSS]:      'Gross Instalment Reserve',
  [C.SR_MIN]:        'Min Profitability Reserve',
  [C.NC_LIAB]:       'Non-current Liabilities',
  [C.C_LIAB]:        'Current Liabilities',
};

const LABEL_BG: Record<string, string> = {
  [C.TOTAL_ASSETS]:  'Активи общо',
  [C.NON_CURR]:      'Дълготрайни активи',
  [C.NC_TANGIBLE]:   'ДМА',
  [C.NC_INTANGIBLE]: 'ДНА',
  [C.NC_FINANCIAL]:  'Дълготрайни финансови активи',
  [C.NC_INVESTMENT]: 'Инвестиционни имоти',
  [C.NC_OTHER]:      'Други дълготрайни активи',
  [C.ROU]:           'Активи с право на ползване',
  [C.CAP_COSTS]:     'Капитализирани разходи',
  [C.CURR]:          'Краткотрайни активи',
  [C.C_RECEIVABLES]: 'Краткосрочни вземания',
  [C.C_FINANCIAL]:   'Краткосрочни финансови активи',
  [C.C_CASH]:        'Парични средства',
  [C.TOTAL_LIAB]:    'Пасиви общо',
  [C.EQUITY]:        'Собствен капитал',
  [C.EQ_CAPITAL]:    'Капитал',
  [C.EQ_RESERVES]:   'Резерви',
  [C.EQ_RESULT]:     'Финансов резултат',
  [C.SPEC_RESERVES]: 'Специални резерви',
  [C.SR_PENSION]:    'Пенсионни резерви',
  [C.SR_LIFETIME]:   'Резерв за пожизнени пенсии',
  [C.SR_GROSS]:      'Резерв за брутни вноски',
  [C.SR_MIN]:        'Резерв за мин. доходност',
  [C.NC_LIAB]:       'Дългосрочни задължения',
  [C.C_LIAB]:        'Краткосрочни задължения',
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
  totalAssets: '#3b82f6',
  nonCurr:     '#8b5cf6',
  curr:        '#06b6d4',
  tangible:    '#f97316',
  intangible:  '#eab308',
  financial:   '#10b981',
  investment:  '#f43f5e',
  otherNC:     '#94a3b8',
  equity:      '#3b82f6',
  specRes:     '#8b5cf6',
  ncLiab:      '#ef4444',
  cLiab:       '#f97316',
};

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════
export function PensionCompaniesBalanceDashboard({ data, locale = 'en' }: Props) {
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
    return {
      totalAssets:  yd?.get(C.TOTAL_ASSETS)  ?? null,
      equity:       yd?.get(C.EQUITY)         ?? null,
      specReserves: yd?.get(C.SPEC_RESERVES)  ?? null,
    };
  }, [dataMap, latestYear]);

  // ── Table state ──────────────────────────────────────────────────────────────
  const [indicatorFilter, setIndicatorFilter] = useState('all');
  const [yearFilter,      setYearFilter]      = useState('all');
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

  // ── Unique codes for filter dropdown ────────────────────────────────────────
  const uniqueIndicators = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of allTableRows) {
      if (!seen.has(row.code)) seen.set(row.code, row.label);
    }
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [allTableRows]);

  // ── Filtered & sorted rows ───────────────────────────────────────────────────
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
            ? 'Обобщен баланс на пенсионноосигурителните дружества'
            : 'Summarized Balance Sheet — Pension Insurance Companies'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Активи и пасиви | хиляди лв.`
            : `Annual data (${firstYear}–${latestYear}) | Assets and liabilities | Thousand BGN`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard
            label={isBg ? 'Активи общо' : 'Total Assets'}
            value={kpi.totalAssets}
            year={latestYear}
            color="text-blue-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Собствен капитал' : 'Equity'}
            value={kpi.equity}
            year={latestYear}
            color="text-violet-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Специални резерви' : 'Special Reserves'}
            value={kpi.specReserves}
            year={latestYear}
            color="text-emerald-600"
            isBg={isBg}
          />
        </div>

        {/* ── Chart A: Macro Trend (Multi-Line) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Динамика на активите' : 'A. Total Assets Growth Trend'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Активи общо · Дълготрайни активи · Краткотрайни активи | хиляди лв.'
              : 'Total Assets · Non-current Assets · Current Assets | Thousand BGN'}
          </p>
          <MacroTrendChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart B: NC Asset Breakdown (Stacked Bar) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Б. Структура на дълготрайните активи' : 'B. Non-current Asset Composition'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'ДМА · ДНА · Финансови · Инвестиционни имоти · Други | хиляди лв.'
              : 'Tangible · Intangible · Financial · Investment Property · Other | Thousand BGN'}
          </p>
          <NCAssetBreakdownChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart C: Balance Structure (Stacked Bar) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'В. Структура на пасивите' : 'C. Liabilities & Equity Structure'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Собствен капитал · Специални резерви · Дългосрочни · Краткосрочни задължения | хиляди лв.'
              : 'Equity · Special Reserves · Non-current Liabilities · Current Liabilities | Thousand BGN'}
          </p>
          <BalanceStructureChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Interactive Data Table ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            {isBg ? 'Г. Подробни данни' : 'D. Detailed Data Table'}
          </h3>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {isBg ? 'Показател' : 'Indicator'}
              </label>
              <select
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[200px]"
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

          {/* Table */}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                {isBg
                  ? `${filteredRows.length} реда · Страница ${page + 1} от ${totalPages}`
                  : `${filteredRows.length} rows · Page ${page + 1} of ${totalPages}`}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  «
                </button>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                  const p = start + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-2 py-1 text-xs rounded border ${
                        p === page
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ›
                </button>
                <button
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                  className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  »
                </button>
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
  label: string;
  value: number | null | undefined;
  year: string;
  color: string;
  isBg: boolean;
}) {
  return (
    <div className="bg-white shadow-sm rounded-xl p-5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${color}`}>
        {value != null ? fmtFull(value, isBg) : '—'}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        {isBg ? `${year} г.` : `Year ${year}`}
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Macro Trend: Total Assets, Non-current, Current (multi-line)
// ══════════════════════════════════════════════════════════════════════════════
function MacroTrendChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => {
    const get = (code: string) => years.map(y => dataMap.get(y)?.get(code) ?? null);
    return {
      total:   get(C.TOTAL_ASSETS),
      nonCurr: get(C.NON_CURR),
      curr:    get(C.CURR),
    };
  }, [dataMap, years]);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const makeLine = (
      name: string,
      data: (number | null)[],
      color: string,
      opts?: Partial<any>,
    ) => ({
      name,
      type: 'line' as const,
      data,
      itemStyle: { color },
      lineStyle: { width: 2, color, ...(opts?.lineStyle ?? {}) },
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      connectNulls: true,
      ...opts,
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
        data: [label(C.TOTAL_ASSETS), label(C.NON_CURR), label(C.CURR)],
        bottom: '2%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '18%', top: '6%', containLabel: true },
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
        {
          ...makeLine(label(C.TOTAL_ASSETS), series.total, COLORS.totalAssets),
          lineStyle: { width: 2.5, color: COLORS.totalAssets },
          symbolSize: 6,
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59,130,246,0.12)' },
                { offset: 1, color: 'rgba(59,130,246,0)' },
              ],
            },
          },
        },
        makeLine(label(C.NON_CURR), series.nonCurr, COLORS.nonCurr, { lineStyle: { type: 'dashed' } }),
        makeLine(label(C.CURR),     series.curr,    COLORS.curr,    { lineStyle: { type: 'dotted' } }),
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [series, years, isBg, label]);

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Non-current Asset Breakdown (Stacked Bar)
// ══════════════════════════════════════════════════════════════════════════════
const NC_BREAKDOWN_CODES = [
  C.NC_TANGIBLE,
  C.NC_INTANGIBLE,
  C.NC_FINANCIAL,
  C.NC_INVESTMENT,
  C.NC_OTHER,
] as const;

const NC_BREAKDOWN_COLORS: Record<string, string> = {
  [C.NC_TANGIBLE]:   COLORS.tangible,
  [C.NC_INTANGIBLE]: COLORS.intangible,
  [C.NC_FINANCIAL]:  COLORS.financial,
  [C.NC_INVESTMENT]: COLORS.investment,
  [C.NC_OTHER]:      COLORS.otherNC,
};

function NCAssetBreakdownChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const barSeries = NC_BREAKDOWN_CODES.map(code => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'nc',
      data: years.map(y => {
        const v = dataMap.get(y)?.get(code);
        return v != null ? Math.max(0, v) : null;
      }),
      itemStyle: { color: NC_BREAKDOWN_COLORS[code] },
      emphasis: { focus: 'series' as const },
    }));

    // Overlay line: total non-current assets
    const totalLine = {
      name: label(C.NON_CURR),
      type: 'line' as const,
      data: years.map(y => dataMap.get(y)?.get(C.NON_CURR) ?? null),
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
        data: [...NC_BREAKDOWN_CODES.map(label), label(C.NON_CURR)],
        bottom: '2%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
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

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Balance Structure: Equity + Special Reserves + Liabilities (Stacked Bar)
// ══════════════════════════════════════════════════════════════════════════════
const LIAB_CODES = [C.EQUITY, C.SPEC_RESERVES, C.NC_LIAB, C.C_LIAB] as const;

const LIAB_COLORS: Record<string, string> = {
  [C.EQUITY]:        COLORS.equity,
  [C.SPEC_RESERVES]: COLORS.specRes,
  [C.NC_LIAB]:       COLORS.ncLiab,
  [C.C_LIAB]:        COLORS.cLiab,
};

function BalanceStructureChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !years.length) return;
    const chart = echarts.init(chartRef.current);

    const barSeries = LIAB_CODES.map(code => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'liab',
      data: years.map(y => {
        const v = dataMap.get(y)?.get(code);
        return v != null ? Math.max(0, v) : null;
      }),
      itemStyle: { color: LIAB_COLORS[code], borderRadius: code === C.C_LIAB ? [3, 3, 0, 0] : undefined },
      emphasis: { focus: 'series' as const },
    }));

    // Overlay total assets line
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
              <span style="width:8px;height:8px;border-radius:2px;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtFull(Math.abs(v), isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [...LIAB_CODES.map(label), label(C.TOTAL_ASSETS)],
        bottom: '2%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
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

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}
