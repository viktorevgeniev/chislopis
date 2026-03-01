'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Indicator codes (Profit & Loss statement, NSI ID 1050) ─────────────────────
// Section 3.1.2.3.1.1 — Non-life technical account
// Section 3.1.2.3.1.2 — Life technical account
// Section 3.1.2.3.1.3 — Non-technical account (overall P&L summary)
const C = {
  // Non-life technical account
  NL_PREMIUMS_NET:   '3.1.2.3.1.1.1',     // Earned premiums, net of reinsurance
  NL_GROSS_PREMIUMS: '3.1.2.3.1.1.1.1',   // Gross premiums written
  NL_INV_INCOME:     '3.1.2.3.1.1.2',     // Allocated investment income
  NL_OTHER_INC:      '3.1.2.3.1.1.3',     // Other technical income (net)
  NL_CLAIMS:         '3.1.2.3.1.1.4',     // Claims incurred (net)
  NL_PROV_CHANGE:    '3.1.2.3.1.1.5',     // Changes in other technical provisions (net)
  NL_BONUSES:        '3.1.2.3.1.1.6',     // Bonuses and rebates (net)
  NL_OPEX:           '3.1.2.3.1.1.7',     // Net operating expenses
  NL_OTHER_CHG:      '3.1.2.3.1.1.8',     // Other technical charges (net)
  NL_RESULT:         '3.1.2.3.1.1.10',    // Technical result — non-life
  // Life technical account
  L_PREMIUMS_NET:    '3.1.2.3.1.2.1',     // Earned premiums, net
  L_GROSS_PREMIUMS:  '3.1.2.3.1.2.1.1',   // Gross premiums written
  L_INV_INCOME:      '3.1.2.3.1.2.2',     // Investment income (life)
  L_CLAIMS:          '3.1.2.3.1.2.5',     // Claims incurred (net) — life
  L_PROV_CHANGE:     '3.1.2.3.1.2.6',     // Changes in life insurance provisions
  L_OPEX:            '3.1.2.3.1.2.8',     // Net operating expenses — life
  L_RESULT:          '3.1.2.3.1.2.13',    // Technical result — life
  // Non-technical account
  NT_NL_RESULT:      '3.1.2.3.1.3.1',     // Non-life technical result (transfer)
  NT_L_RESULT:       '3.1.2.3.1.3.2',     // Life technical result (transfer)
  NT_INV_INCOME:     '3.1.2.3.1.3.3',     // Total investment income (non-technical)
  NT_INV_CHG:        '3.1.2.3.1.3.5',     // Investment charges (non-technical)
  NT_OTHER_INC:      '3.1.2.3.1.3.7',     // Other income
  NT_OTHER_CHG:      '3.1.2.3.1.3.8',     // Other charges
  NT_PROFIT_BEFORE:  '3.1.2.3.1.3.9',     // Profit/Loss before tax
  NT_TAX:            '3.1.2.3.1.3.10',    // Tax
} as const;

const LABEL_EN: Record<string, string> = {
  [C.NL_PREMIUMS_NET]:   'Net Earned Premiums (Non-life)',
  [C.NL_GROSS_PREMIUMS]: 'Gross Premiums Written (Non-life)',
  [C.NL_INV_INCOME]:     'Allocated Investment Income (Non-life)',
  [C.NL_OTHER_INC]:      'Other Technical Income (Non-life)',
  [C.NL_CLAIMS]:         'Claims Incurred (Non-life)',
  [C.NL_PROV_CHANGE]:    'Change in Provisions (Non-life)',
  [C.NL_BONUSES]:        'Bonuses & Rebates (Non-life)',
  [C.NL_OPEX]:           'Net Operating Expenses (Non-life)',
  [C.NL_OTHER_CHG]:      'Other Technical Charges (Non-life)',
  [C.NL_RESULT]:         'Technical Result — Non-life',
  [C.L_PREMIUMS_NET]:    'Net Earned Premiums (Life)',
  [C.L_GROSS_PREMIUMS]:  'Gross Premiums Written (Life)',
  [C.L_INV_INCOME]:      'Investment Income (Life)',
  [C.L_CLAIMS]:          'Claims Incurred (Life)',
  [C.L_PROV_CHANGE]:     'Change in Life Provisions',
  [C.L_OPEX]:            'Net Operating Expenses (Life)',
  [C.L_RESULT]:          'Technical Result — Life',
  [C.NT_NL_RESULT]:      'Non-life Technical Result',
  [C.NT_L_RESULT]:       'Life Technical Result',
  [C.NT_INV_INCOME]:     'Investment Income (Non-technical)',
  [C.NT_INV_CHG]:        'Investment Charges',
  [C.NT_OTHER_INC]:      'Other Income',
  [C.NT_OTHER_CHG]:      'Other Charges',
  [C.NT_PROFIT_BEFORE]:  'Profit / Loss Before Tax',
  [C.NT_TAX]:            'Income Tax',
};

const LABEL_BG: Record<string, string> = {
  [C.NL_PREMIUMS_NET]:   'Спечелени премии нето (общо застраховане)',
  [C.NL_GROSS_PREMIUMS]: 'Брутни записани премии (общо застраховане)',
  [C.NL_INV_INCOME]:     'Инвестиционни приходи (общо застраховане)',
  [C.NL_OTHER_INC]:      'Други технически приходи (нето)',
  [C.NL_CLAIMS]:         'Претенции нето (общо застраховане)',
  [C.NL_PROV_CHANGE]:    'Изменение в провизиите (нето)',
  [C.NL_BONUSES]:        'Бонуси и отстъпки (нето)',
  [C.NL_OPEX]:           'Нетни оперативни разходи (общо застраховане)',
  [C.NL_OTHER_CHG]:      'Други технически такси (нето)',
  [C.NL_RESULT]:         'Технически резултат — общо застраховане',
  [C.L_PREMIUMS_NET]:    'Спечелени премии нето (животозастраховане)',
  [C.L_GROSS_PREMIUMS]:  'Брутни записани премии (животозастраховане)',
  [C.L_INV_INCOME]:      'Инвестиционни приходи (животозастраховане)',
  [C.L_CLAIMS]:          'Претенции нето (животозастраховане)',
  [C.L_PROV_CHANGE]:     'Изменение в животозастрахователните резерви',
  [C.L_OPEX]:            'Нетни оперативни разходи (животозастраховане)',
  [C.L_RESULT]:          'Технически резултат — животозастраховане',
  [C.NT_NL_RESULT]:      'Технически резултат — общо застраховане',
  [C.NT_L_RESULT]:       'Технически резултат — животозастраховане',
  [C.NT_INV_INCOME]:     'Инвестиционни приходи (нетехнически)',
  [C.NT_INV_CHG]:        'Инвестиционни разходи',
  [C.NT_OTHER_INC]:      'Други приходи',
  [C.NT_OTHER_CHG]:      'Други разходи',
  [C.NT_PROFIT_BEFORE]:  'Печалба / загуба преди данъци',
  [C.NT_TAX]:            'Данък върху дохода',
};

// ── Types ─────────────────────────────────────────────────────────────────────
type DataMap = Map<string, Map<string, number | null>>; // year → code → value

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
  if (!s || s === '..' || s === '-' || s === 'null' || s === 'undefined') return null;
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
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}M ${isBg ? 'лв.' : 'BGN'}`;
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

// ── Color palettes ─────────────────────────────────────────────────────────────
const NL_COLORS = {
  premiums:  '#3b82f6',
  claims:    '#ef4444',
  opex:      '#f97316',
  result:    '#10b981',
  inv:       '#8b5cf6',
};
const L_COLORS = {
  premiums:  '#06b6d4',
  claims:    '#f43f5e',
  opex:      '#fb923c',
  result:    '#22c55e',
  prov:      '#a78bfa',
};

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════
export function InsuranceProfitLossDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const label = (code: string) => (isBg ? LABEL_BG[code] : LABEL_EN[code]) ?? code;

  // Build data map: year → code → value
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

  const kpi = useMemo(() => {
    const yd = dataMap.get(latestYear);
    return {
      profitBefore: yd?.get(C.NT_PROFIT_BEFORE) ?? null,
      nlResult:     yd?.get(C.NL_RESULT)         ?? null,
      lResult:      yd?.get(C.L_RESULT)           ?? null,
    };
  }, [dataMap, latestYear]);

  if (!data || data.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No data available</div>;
  }

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Отчет за печалбата или загубата — Застрахователни дружества'
            : 'Statement of Profit or Loss — Insurance Companies'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Общо и животозастраховане | хиляди лв.`
            : `Annual data (${firstYear}–${latestYear}) | Non-life & Life insurance | Thousand BGN`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard
            label={isBg ? 'Печалба/загуба преди данъци' : 'Profit/Loss Before Tax'}
            value={kpi.profitBefore}
            year={latestYear}
            color={kpi.profitBefore != null && kpi.profitBefore >= 0 ? 'text-emerald-600' : 'text-rose-600'}
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Технически резултат — общо застраховане' : 'Technical Result — Non-life'}
            value={kpi.nlResult}
            year={latestYear}
            color={kpi.nlResult != null && kpi.nlResult >= 0 ? 'text-blue-600' : 'text-rose-500'}
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Технически резултат — животозастраховане' : 'Technical Result — Life'}
            value={kpi.lResult}
            year={latestYear}
            color={kpi.lResult != null && kpi.lResult >= 0 ? 'text-cyan-600' : 'text-rose-500'}
            isBg={isBg}
          />
        </div>

        {/* ── Chart A: Non-life technical account trend ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Технически отчет — общо застраховане'
              : 'A. Non-life Technical Account'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Спечелени премии · Претенции · Оперативни разходи · Технически резултат | хиляди лв.'
              : 'Net earned premiums · Claims incurred · Net operating expenses · Technical result | Thousand BGN'}
          </p>
          <NonLifeTrendChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart B: Life technical account trend ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'Б. Технически отчет — животозастраховане'
              : 'B. Life Technical Account'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Спечелени премии · Претенции · Изменение в резервите · Технически резултат | хиляди лв.'
              : 'Net earned premiums · Claims incurred · Change in provisions · Technical result | Thousand BGN'}
          </p>
          <LifeTrendChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart C: Profit composition (non-technical account) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'В. Формиране на печалбата/загубата преди данъци'
              : 'C. Profit / Loss Before Tax — Component Breakdown'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Нетехнически отчет: резултати от двата бранша + инвестиционни приходи/разходи + други | хиляди лв.'
              : 'Non-technical account: segment results + investment income/charges + other items | Thousand BGN'}
          </p>
          <ProfitCompositionChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart D: Gross premiums written comparison ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'Г. Брутни записани премии — общо vs животозастраховане'
              : 'D. Gross Premiums Written — Non-life vs Life'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Съпоставка на размера на пазара по двата бранша | хиляди лв.'
              : 'Market size comparison between the two segments | Thousand BGN'}
          </p>
          <PremiumsComparisonChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

      </CardContent>
    </Card>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
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
// Chart A — Non-life technical account: premiums, claims, opex, result
// ══════════════════════════════════════════════════════════════════════════════
function NonLifeTrendChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => {
    const get = (code: string) => years.map(y => dataMap.get(y)?.get(code) ?? null);
    return {
      premiums: get(C.NL_PREMIUMS_NET),
      claims:   get(C.NL_CLAIMS),
      opex:     get(C.NL_OPEX),
      result:   get(C.NL_RESULT),
    };
  }, [dataMap, years]);

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const makeSeries = (name: string, data: (number | null)[], color: string, opts?: any) => ({
      name,
      type: 'line' as const,
      data,
      itemStyle: { color },
      lineStyle: { width: 2, color, ...opts?.lineStyle },
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
            const v = p.value as number;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px;color:${v < 0 ? '#ef4444' : 'inherit'}">${fmtFull(v, isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [label(C.NL_PREMIUMS_NET), label(C.NL_CLAIMS), label(C.NL_OPEX), label(C.NL_RESULT)],
        bottom: '2%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '18%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: years,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
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
          ...makeSeries(label(C.NL_PREMIUMS_NET), series.premiums, NL_COLORS.premiums),
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59,130,246,0.15)' },
                { offset: 1, color: 'rgba(59,130,246,0)' },
              ],
            },
          },
        },
        makeSeries(label(C.NL_CLAIMS), series.claims, NL_COLORS.claims),
        makeSeries(label(C.NL_OPEX), series.opex, NL_COLORS.opex, { lineStyle: { type: 'dashed' } }),
        {
          ...makeSeries(label(C.NL_RESULT), series.result, NL_COLORS.result),
          lineStyle: { width: 2.5, color: NL_COLORS.result },
          symbolSize: 6,
        },
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
// Chart B — Life technical account: premiums, claims, provisions, result
// ══════════════════════════════════════════════════════════════════════════════
function LifeTrendChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => {
    const get = (code: string) => years.map(y => dataMap.get(y)?.get(code) ?? null);
    return {
      premiums: get(C.L_PREMIUMS_NET),
      claims:   get(C.L_CLAIMS),
      prov:     get(C.L_PROV_CHANGE),
      result:   get(C.L_RESULT),
    };
  }, [dataMap, years]);

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
    const chart = echarts.init(chartRef.current);

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
              <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px;color:${v < 0 ? '#ef4444' : 'inherit'}">${fmtFull(v, isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [label(C.L_PREMIUMS_NET), label(C.L_CLAIMS), label(C.L_PROV_CHANGE), label(C.L_RESULT)],
        bottom: '2%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '18%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: years,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
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
          name: label(C.L_PREMIUMS_NET),
          type: 'line',
          data: series.premiums,
          itemStyle: { color: L_COLORS.premiums },
          lineStyle: { width: 2, color: L_COLORS.premiums },
          smooth: true, symbol: 'circle', symbolSize: 5, connectNulls: true,
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(6,182,212,0.15)' },
                { offset: 1, color: 'rgba(6,182,212,0)' },
              ],
            },
          },
        },
        {
          name: label(C.L_CLAIMS),
          type: 'line',
          data: series.claims,
          itemStyle: { color: L_COLORS.claims },
          lineStyle: { width: 2, color: L_COLORS.claims },
          smooth: true, symbol: 'circle', symbolSize: 5, connectNulls: true,
        },
        {
          name: label(C.L_PROV_CHANGE),
          type: 'line',
          data: series.prov,
          itemStyle: { color: L_COLORS.prov },
          lineStyle: { width: 2, color: L_COLORS.prov, type: 'dashed' },
          smooth: true, symbol: 'circle', symbolSize: 4, connectNulls: true,
        },
        {
          name: label(C.L_RESULT),
          type: 'line',
          data: series.result,
          itemStyle: { color: L_COLORS.result },
          lineStyle: { width: 2.5, color: L_COLORS.result },
          smooth: true, symbol: 'circle', symbolSize: 6, connectNulls: true,
        },
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
// Chart C — Non-technical account: profit/loss composition (stacked bar)
// ══════════════════════════════════════════════════════════════════════════════
const NT_INCOME_CODES  = [C.NT_NL_RESULT, C.NT_L_RESULT, C.NT_INV_INCOME, C.NT_OTHER_INC] as const;
const NT_EXPENSE_CODES = [C.NT_INV_CHG, C.NT_OTHER_CHG] as const;

const NT_COLORS: Record<string, string> = {
  [C.NT_NL_RESULT]:  '#3b82f6',
  [C.NT_L_RESULT]:   '#06b6d4',
  [C.NT_INV_INCOME]: '#8b5cf6',
  [C.NT_OTHER_INC]:  '#10b981',
  [C.NT_INV_CHG]:    '#f97316',
  [C.NT_OTHER_CHG]:  '#ef4444',
};

function ProfitCompositionChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const incomeSeries = NT_INCOME_CODES.map(code => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'income',
      data: years.map(y => {
        const v = dataMap.get(y)?.get(code);
        return v != null ? Math.max(0, v) : null;
      }),
      itemStyle: { color: NT_COLORS[code] },
      emphasis: { focus: 'series' as const },
    }));

    const expenseSeries = NT_EXPENSE_CODES.map(code => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'expense',
      data: years.map(y => {
        const v = dataMap.get(y)?.get(code);
        return v != null ? -Math.abs(v) : null;
      }),
      itemStyle: { color: NT_COLORS[code] },
      emphasis: { focus: 'series' as const },
    }));

    const profitLine = {
      name: label(C.NT_PROFIT_BEFORE),
      type: 'line' as const,
      data: years.map(y => dataMap.get(y)?.get(C.NT_PROFIT_BEFORE) ?? null),
      itemStyle: { color: '#0f172a' },
      lineStyle: { width: 2.5, color: '#0f172a' },
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      connectNulls: true,
      z: 10,
    };

    const legendData = [
      ...NT_INCOME_CODES.map(label),
      ...NT_EXPENSE_CODES.map(label),
      label(C.NT_PROFIT_BEFORE),
    ];

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
              <span style="font-weight:600;margin-left:8px;color:${v < 0 ? '#ef4444' : 'inherit'}">${fmtFull(Math.abs(v), isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: legendData,
        bottom: '2%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '22%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { fontSize: 10, color: '#94a3b8', rotate: years.length > 12 ? 30 : 0 },
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
      series: [...incomeSeries, ...expenseSeries, profitLine],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [dataMap, years, isBg, label]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart D — Gross premiums written comparison: Non-life vs Life (grouped bar)
// ══════════════════════════════════════════════════════════════════════════════
function PremiumsComparisonChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap; years: string[]; isBg: boolean; label: (c: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
    const chart = echarts.init(chartRef.current);

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
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:2px;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtFull(p.value as number, isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [label(C.NL_GROSS_PREMIUMS), label(C.L_GROSS_PREMIUMS)],
        bottom: '2%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '16%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { fontSize: 10, color: '#94a3b8', rotate: years.length > 12 ? 30 : 0 },
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
          name: label(C.NL_GROSS_PREMIUMS),
          type: 'bar',
          data: years.map(y => dataMap.get(y)?.get(C.NL_GROSS_PREMIUMS) ?? null),
          itemStyle: { color: NL_COLORS.premiums, borderRadius: [3, 3, 0, 0] },
          emphasis: { focus: 'series' },
        },
        {
          name: label(C.L_GROSS_PREMIUMS),
          type: 'bar',
          data: years.map(y => dataMap.get(y)?.get(C.L_GROSS_PREMIUMS) ?? null),
          itemStyle: { color: L_COLORS.premiums, borderRadius: [3, 3, 0, 0] },
          emphasis: { focus: 'series' },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [dataMap, years, isBg, label]);

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}
