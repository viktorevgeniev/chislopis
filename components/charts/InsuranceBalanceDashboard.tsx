'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Indicator codes ────────────────────────────────────────────────────────────
const C = {
  INTANGIBLE:       '3.1.2.3.3.1',
  TANGIBLE:         '3.1.2.3.3.2',
  RIGHT_OF_USE:     '3.1.2.3.3.3',
  INVESTMENTS:      '3.1.2.3.3.4',
  INSURANCE_ASSETS: '3.1.2.3.3.5',
  RECEIVABLES:      '3.1.2.3.3.6',
  CASH:             '3.1.2.3.3.7',
  OTHER_ASSETS:     '3.1.2.3.3.8',
  TOTAL_ASSETS:     '3.1.2.3.3.9',
  SUBORDINATED:     '3.1.2.3.3.10',
  INSURANCE_LIAB:   '3.1.2.3.3.11',
  FINANCIAL_LIAB:   '3.1.2.3.3.12',
  OTHER_LIAB:       '3.1.2.3.3.13',
  OTHER_LIAB_NES:   '3.1.2.3.3.14',
  TOTAL_LIAB:       '3.1.2.3.3.15',
  LOANS:            '3.1.2.3.5.16',
  CAPITAL:          '3.1.2.3.5.17',
  PROVISIONS:       '3.1.2.3.5.18',
} as const;

const LABEL_EN: Record<string, string> = {
  [C.INTANGIBLE]:       'Intangible Assets',
  [C.TANGIBLE]:         'Tangible Assets',
  [C.RIGHT_OF_USE]:     'Right-of-Use',
  [C.INVESTMENTS]:      'Investments',
  [C.INSURANCE_ASSETS]: 'Insurance/Reinsurance Assets',
  [C.RECEIVABLES]:      'Receivables',
  [C.CASH]:             'Cash & Equivalents',
  [C.OTHER_ASSETS]:     'Other Assets',
  [C.TOTAL_ASSETS]:     'Total Assets',
  [C.SUBORDINATED]:     'Subordinated Liabilities',
  [C.INSURANCE_LIAB]:   'Insurance Liabilities',
  [C.FINANCIAL_LIAB]:   'Financial Liabilities',
  [C.OTHER_LIAB]:       'Other Liabilities',
  [C.OTHER_LIAB_NES]:   'Other Liabilities (NES)',
  [C.TOTAL_LIAB]:       'Total Liabilities',
  [C.LOANS]:            'Loans & Mortgages',
  [C.CAPITAL]:          'Capital & Reserves',
  [C.PROVISIONS]:       'Other Provisions',
};

const LABEL_BG: Record<string, string> = {
  [C.INTANGIBLE]:       'Нематериални активи',
  [C.TANGIBLE]:         'Материални активи',
  [C.RIGHT_OF_USE]:     'Право на ползване',
  [C.INVESTMENTS]:      'Инвестиции',
  [C.INSURANCE_ASSETS]: 'Активи по застрах. договори',
  [C.RECEIVABLES]:      'Вземания',
  [C.CASH]:             'Парични средства',
  [C.OTHER_ASSETS]:     'Други активи',
  [C.TOTAL_ASSETS]:     'Общо активи',
  [C.SUBORDINATED]:     'Подчинени задължения',
  [C.INSURANCE_LIAB]:   'Застрах. пасиви',
  [C.FINANCIAL_LIAB]:   'Финансови пасиви',
  [C.OTHER_LIAB]:       'Други пасиви',
  [C.OTHER_LIAB_NES]:   'Други пасиви (н.к.д.)',
  [C.TOTAL_LIAB]:       'Общо пасиви',
  [C.LOANS]:            'Заеми и ипотеки',
  [C.CAPITAL]:          'Капитал и резерви',
  [C.PROVISIONS]:       'Провизии',
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

// Values are in Thousand BGN
function fmtShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}B`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}M`;
  return `${n.toFixed(0)}K`;
}

function fmtFull(n: number, isBg: boolean): string {
  const unit = isBg ? 'хил. лв.' : 'K BGN';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}B ${isBg ? 'лв.' : 'BGN'}`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}M ${isBg ? 'лв.' : 'BGN'}`;
  return `${n.toLocaleString()} ${unit}`;
}

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ── Asset & liability component definitions ────────────────────────────────────
const ASSET_COMPONENTS = [
  C.TANGIBLE, C.CASH, C.INVESTMENTS, C.INSURANCE_ASSETS,
  C.RECEIVABLES, C.RIGHT_OF_USE, C.INTANGIBLE, C.OTHER_ASSETS,
];
const ASSET_COLORS: Record<string, string> = {
  [C.TANGIBLE]:         '#3b82f6',
  [C.CASH]:             '#06b6d4',
  [C.INVESTMENTS]:      '#6366f1',
  [C.INSURANCE_ASSETS]: '#8b5cf6',
  [C.RECEIVABLES]:      '#a78bfa',
  [C.RIGHT_OF_USE]:     '#e879f9',
  [C.INTANGIBLE]:       '#c084fc',
  [C.OTHER_ASSETS]:     '#94a3b8',
};

const LIAB_COMPONENTS = [
  C.SUBORDINATED, C.INSURANCE_LIAB, C.LOANS, C.FINANCIAL_LIAB, C.OTHER_LIAB,
];
const LIAB_COLORS: Record<string, string> = {
  [C.SUBORDINATED]:   '#f97316',
  [C.INSURANCE_LIAB]: '#ef4444',
  [C.LOANS]:          '#fb923c',
  [C.FINANCIAL_LIAB]: '#fbbf24',
  [C.OTHER_LIAB]:     '#94a3b8',
};

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════
export function InsuranceBalanceDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const label = (code: string) => (isBg ? LABEL_BG[code] : LABEL_EN[code]) ?? code;

  // Build data map: year → code → value
  const dataMap = useMemo<DataMap>(() => {
    const map: DataMap = new Map();
    for (const row of data) {
      const year = String(row.Year ?? '');
      const code = String(row.Indicators_Code ?? '');
      const val  = getVal(row.Amount);
      if (!year || !code) continue;
      if (!map.has(year)) map.set(year, new Map());
      map.get(year)!.set(code, val);
    }
    return map;
  }, [data]);

  const allYears = useMemo(() => [...dataMap.keys()].sort(), [dataMap]);
  const latestYear = allYears[allYears.length - 1] ?? '';
  const firstYear  = allYears[0] ?? '';

  const kpi = useMemo(() => {
    const yd = dataMap.get(latestYear);
    return {
      totalLiab:    yd?.get(C.TOTAL_LIAB)     ?? null,
      subordinated: yd?.get(C.SUBORDINATED)    ?? null,
      insLiab:      yd?.get(C.INSURANCE_LIAB)  ?? null,
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
            ? 'Финансово състояние на застрахователните дружества'
            : 'Statement of Financial Position — Insurance Companies'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Активи и Пасиви | хиляди лв.`
            : `Annual data (${firstYear}–${latestYear}) | Assets & Liabilities | Thousand BGN`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard
            label={isBg ? 'Общо пасиви' : 'Total Liabilities'}
            value={kpi.totalLiab}
            year={latestYear}
            color="text-indigo-600"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Подчинени задължения' : 'Subordinated Liabilities'}
            value={kpi.subordinated}
            year={latestYear}
            color="text-orange-500"
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Застрахователни пасиви' : 'Insurance Liabilities'}
            value={kpi.insLiab}
            year={latestYear}
            color="text-rose-500"
            isBg={isBg}
          />
        </div>

        {/* ── Chart A: Macro Trend ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Макро тенденции — Ръст на баланса'
              : 'A. Macro Trends — Balance Sheet Growth'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Общо пасиви (≈ общо активи) и основни компоненти по години | хиляди лв.'
              : 'Total liabilities (≈ total assets) and primary components over time | Thousand BGN'}
          </p>
          <TrendChart dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart B: Liability structure stacked bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'Б. Структура на пасивите — по години'
              : 'B. Liability Structure — by Year'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Разбивка: Подчинени задължения · Застрах. пасиви · Заеми · Финансови · Други'
              : 'Breakdown: Subordinated · Insurance · Loans & Mortgages · Financial · Other'}
          </p>
          <LiabilityStackedBar dataMap={dataMap} years={allYears} isBg={isBg} label={label} />
        </div>

        {/* ── Chart C: Asset composition donut ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `В. Структура на активите (${latestYear})`
              : `C. Asset Composition (${latestYear})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Разпределение по категории активи за последната налична година'
              : 'Distribution by asset category for the latest available year'}
          </p>
          <AssetDonut dataMap={dataMap} year={latestYear} isBg={isBg} label={label} />
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
// Chart A — Multi-series trend: Total Liabilities + Subordinated + Insurance
// ══════════════════════════════════════════════════════════════════════════════
function TrendChart({ dataMap, years, isBg, label }: {
  dataMap: DataMap;
  years: string[];
  isBg: boolean;
  label: (code: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => {
    const get = (code: string) => years.map(y => dataMap.get(y)?.get(code) ?? null);
    return {
      totalLiab:    get(C.TOTAL_LIAB),
      subordinated: get(C.SUBORDINATED),
      insLiab:      get(C.INSURANCE_LIAB),
      loans:        get(C.LOANS),
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
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtFull(p.value, isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [label(C.TOTAL_LIAB), label(C.SUBORDINATED), label(C.INSURANCE_LIAB), label(C.LOANS)],
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
          name: label(C.TOTAL_LIAB),
          type: 'line',
          data: series.totalLiab,
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 2.5, color: '#6366f1' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          connectNulls: true,
          areaStyle: {
            color: {
              type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(99,102,241,0.18)' },
                { offset: 1, color: 'rgba(99,102,241,0)' },
              ],
            },
          },
        },
        {
          name: label(C.SUBORDINATED),
          type: 'line',
          data: series.subordinated,
          itemStyle: { color: '#f97316' },
          lineStyle: { width: 2, color: '#f97316' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          connectNulls: true,
        },
        {
          name: label(C.INSURANCE_LIAB),
          type: 'line',
          data: series.insLiab,
          itemStyle: { color: '#ef4444' },
          lineStyle: { width: 2, color: '#ef4444' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          connectNulls: true,
        },
        {
          name: label(C.LOANS),
          type: 'line',
          data: series.loans,
          itemStyle: { color: '#fb923c' },
          lineStyle: { width: 2, color: '#fb923c', type: 'dashed' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          connectNulls: true,
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
// Chart B — Stacked Bar: Liability composition by year
// ══════════════════════════════════════════════════════════════════════════════
function LiabilityStackedBar({ dataMap, years, isBg, label }: {
  dataMap: DataMap;
  years: string[];
  isBg: boolean;
  label: (code: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const barSeries = LIAB_COMPONENTS.map(code => ({
      name: label(code),
      type: 'bar' as const,
      stack: 'total',
      data: years.map(y => dataMap.get(y)?.get(code) ?? 0),
      itemStyle: { color: LIAB_COLORS[code] },
      emphasis: { focus: 'series' as const },
    }));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          for (const p of params) {
            const v = p.value as number;
            if (!v) continue;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:2px;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtFull(v, isBg)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: LIAB_COMPONENTS.map(label),
        bottom: '2%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '2%', bottom: '20%', top: '6%', containLabel: true },
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
      series: barSeries,
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [dataMap, years, isBg, label]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Donut: Asset composition for latest year
// ══════════════════════════════════════════════════════════════════════════════
function AssetDonut({ dataMap, year, isBg, label }: {
  dataMap: DataMap;
  year: string;
  isBg: boolean;
  label: (code: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const pieData = useMemo(() => {
    const yd = dataMap.get(year);
    if (!yd) return [];
    return ASSET_COMPONENTS
      .map(code => ({
        name: label(code),
        value: yd.get(code) ?? 0,
        itemStyle: { color: ASSET_COLORS[code] },
      }))
      .filter(d => (d.value as number) > 0);
  }, [dataMap, year, label]);

  useEffect(() => {
    if (!chartRef.current || pieData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        ...tooltipStyle(),
        formatter: (params: any) => {
          const val = params.value as number;
          return `<div style="font-weight:600;margin-bottom:4px">${params.name}</div>
            <div>${isBg ? 'Стойност' : 'Value'}: <b>${fmtFull(val, isBg)}</b></div>
            <div>${isBg ? 'Дял' : 'Share'}: <b>${params.percent}%</b></div>`;
        },
      },
      legend: {
        orient: 'vertical',
        right: '4%',
        top: 'middle',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 12, itemHeight: 12,
      },
      series: [
        {
          type: 'pie',
          radius: ['38%', '68%'],
          center: ['35%', '50%'],
          data: pieData,
          label: {
            show: true,
            formatter: (params: any) => `${params.percent}%`,
            fontSize: 10,
            color: '#334155',
          },
          labelLine: { length: 8, length2: 8 },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0,0,0,0.2)',
            },
          },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [pieData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}
