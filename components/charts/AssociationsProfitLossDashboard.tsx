'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dataset } from '@/types/dataset';

// ── Indicator codes (P&L statement, NSI ID 521 – Associations & Foundations) ──
const C = {
  // Expenditure side
  TOTAL_EXP:   '3.1.2.1.1.1',       // TOTAL (expenditure side)
  EXPENDITURE: '3.1.2.1.1.1.1',     // Expenditure (sub-total)
  EXP_REGULAR: '3.1.2.1.1.1.1.1',   // Expenditure for regular activity
  EXP_ADMIN:   '3.1.2.1.1.1.1.2',   // Administrative expenditure
  FIN_COSTS:   '3.1.2.1.1.1.2',     // Financial costs
  EXT_EXP:     '3.1.2.1.1.1.3',     // Extraordinary expenditure
  LOSS_ECO:    '3.1.2.1.1.1.4',     // Loss from economic activity
  POS_RESULT:  '3.1.2.1.1.1.5',     // Positive result (profit – balancing item)
  // Revenue side
  TOTAL_REV:   '3.1.2.1.1.2',       // TOTAL (revenues side)
  REVENUES:    '3.1.2.1.1.2.1',     // Revenues (sub-total)
  REV_REGULAR: '3.1.2.1.1.2.1.0',   // Revenues from regular activity
  GRANTS_COND: '3.1.2.1.1.2.1.0.1', // Grants under condition
  GRANTS_UN:   '3.1.2.1.1.2.1.0.2', // Grants without condition
  MEMBERSHIP:  '3.1.2.1.1.2.1.0.3', // Membership fee
  OTHER_REV:   '3.1.2.1.1.2.1.0.4', // Other revenues
  FIN_REC:     '3.1.2.1.1.2.2',     // Financial receipts
  EXT_REC:     '3.1.2.1.1.2.3',     // Extraordinary receipts
  PROFIT_ECO:  '3.1.2.1.1.2.4',     // Profit from economic activity
  NEG_RESULT:  '3.1.2.1.1.2.5',     // Negative result (loss – balancing item)
} as const;

const LABEL_EN: Record<string, string> = {
  [C.TOTAL_EXP]:   'Total (Expenditure Side)',
  [C.EXPENDITURE]: 'Expenditure',
  [C.EXP_REGULAR]: 'Expenditure for Regular Activity',
  [C.EXP_ADMIN]:   'Administrative Expenditure',
  [C.FIN_COSTS]:   'Financial Costs',
  [C.EXT_EXP]:     'Extraordinary Expenditure',
  [C.LOSS_ECO]:    'Loss from Economic Activity',
  [C.POS_RESULT]:  'Positive Result (Profit)',
  [C.TOTAL_REV]:   'Total (Revenue Side)',
  [C.REVENUES]:    'Revenues',
  [C.REV_REGULAR]: 'Revenues from Regular Activity',
  [C.GRANTS_COND]: 'Grants under Condition',
  [C.GRANTS_UN]:   'Grants without Condition',
  [C.MEMBERSHIP]:  'Membership Fees',
  [C.OTHER_REV]:   'Other Revenues',
  [C.FIN_REC]:     'Financial Receipts',
  [C.EXT_REC]:     'Extraordinary Receipts',
  [C.PROFIT_ECO]:  'Profit from Economic Activity',
  [C.NEG_RESULT]:  'Negative Result (Loss)',
};

const LABEL_BG: Record<string, string> = {
  [C.TOTAL_EXP]:   'Общо (страна разходи)',
  [C.EXPENDITURE]: 'Разходи',
  [C.EXP_REGULAR]: 'Разходи за осъществяване на дейността',
  [C.EXP_ADMIN]:   'Административни разходи',
  [C.FIN_COSTS]:   'Финансови разходи',
  [C.EXT_EXP]:     'Извънредни разходи',
  [C.LOSS_ECO]:    'Загуба от стопанска дейност',
  [C.POS_RESULT]:  'Положителен финансов резултат',
  [C.TOTAL_REV]:   'Общо (страна приходи)',
  [C.REVENUES]:    'Приходи',
  [C.REV_REGULAR]: 'Приходи от осъществяване на дейността',
  [C.GRANTS_COND]: 'Субсидии с условия',
  [C.GRANTS_UN]:   'Субсидии без условия',
  [C.MEMBERSHIP]:  'Членски внос',
  [C.OTHER_REV]:   'Останали приходи',
  [C.FIN_REC]:     'Финансови приходи',
  [C.EXT_REC]:     'Извънредни приходи',
  [C.PROFIT_ECO]:  'Печалба от стопанска дейност',
  [C.NEG_RESULT]:  'Отрицателен финансов резултат',
};

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

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

const COLORS = {
  revenue:     '#22c55e',
  expenditure: '#ef4444',
  posResult:   '#3b82f6',
  negResult:   '#f59e0b',
  expRegular:  '#3b82f6',
  expAdmin:    '#8b5cf6',
  finCosts:    '#f59e0b',
  lossEco:     '#ef4444',
  grantsCond:  '#22c55e',
  grantsUn:    '#14b8a6',
  membership:  '#6366f1',
  otherRev:    '#f97316',
  finRec:      '#06b6d4',
  profitEco:   '#84cc16',
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({
  label, value, year, color, change, isBg,
}: {
  label: string;
  value: number | null;
  year: string;
  color: string;
  change?: number | null;
  isBg: boolean;
}) {
  const unit = isBg ? 'хил. лв.' : 'K BGN';
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {value != null ? fmtShort(value) : '—'}
      </p>
      <p className="text-xs text-slate-400 mt-1">{unit}, {year}</p>
      {change != null && (
        <p className={`text-xs mt-1 font-medium ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%{' '}
          {isBg ? 'спрямо миналата год.' : 'vs prev. year'}
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AssociationsProfitLossDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const lbl = (code: string) => (isBg ? LABEL_BG[code] : LABEL_EN[code]) ?? code;

  const overviewRef = useRef<HTMLDivElement>(null);
  const expRef      = useRef<HTMLDivElement>(null);
  const revRef      = useRef<HTMLDivElement>(null);

  // Build indicator → year → value map
  const dataMap = useMemo<DataMap>(() => {
    const m = new Map<string, Map<string, number | null>>();
    for (const row of data) {
      const code = String(row.Indicators_Code ?? row.Indicators ?? '');
      const year = String(row.Year ?? '');
      if (!code || !year) continue;
      if (!m.has(code)) m.set(code, new Map());
      m.get(code)!.set(year, getVal(row.Amount));
    }
    return m;
  }, [data]);

  const years = useMemo(() => {
    const s = new Set<string>();
    for (const [, ym] of dataMap) for (const y of ym.keys()) s.add(y);
    return [...s].sort();
  }, [dataMap]);

  const latestYear = years[years.length - 1] ?? '';
  const prevYear   = years[years.length - 2] ?? '';
  const firstYear  = years[0] ?? '';

  const get = (code: string, year: string): number | null =>
    dataMap.get(code)?.get(year) ?? null;

  // KPIs for latest year
  const kpi = useMemo(() => {
    const revCur  = safeVal(get(C.REVENUES, latestYear));
    const revPrev = safeVal(get(C.REVENUES, prevYear));
    const expCur  = safeVal(get(C.EXPENDITURE, latestYear));
    const expPrev = safeVal(get(C.EXPENDITURE, prevYear));
    const posCur  = safeVal(get(C.POS_RESULT, latestYear));
    const negCur  = safeVal(get(C.NEG_RESULT, latestYear));
    const posPrev = safeVal(get(C.POS_RESULT, prevYear));
    const negPrev = safeVal(get(C.NEG_RESULT, prevYear));
    const netCur  = posCur - negCur;
    const netPrev = posPrev - negPrev;

    const revChange = revPrev  > 0 ? ((revCur - revPrev) / revPrev * 100) : null;
    const expChange = expPrev  > 0 ? ((expCur - expPrev) / expPrev * 100) : null;
    const netChange = Math.abs(netPrev) > 0 ? ((netCur - netPrev) / Math.abs(netPrev) * 100) : null;

    return { revCur, expCur, netCur, revChange, expChange, netChange };
  }, [dataMap, latestYear, prevYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chart A: Revenue & Expenditure overview (line)
  useEffect(() => {
    if (!overviewRef.current || !years.length) return;
    const chart = echarts.init(overviewRef.current);

    const unit = isBg ? 'хил. лв.' : 'K BGN';
    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any) => {
          const yr = params[0]?.axisValue;
          let html = `<b>${yr}</b><br/>`;
          for (const p of params) {
            if (p.value == null) continue;
            html += `${p.marker}${p.seriesName}: <b>${fmtShort(p.value)}</b> ${unit}<br/>`;
          }
          return html;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#64748b', fontSize: 11 },
        icon: 'circle',
      },
      grid: { top: 20, right: 20, bottom: 60, left: 70 },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontSize: 11, rotate: 30 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => fmtShort(v) },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          name: lbl(C.REVENUES),
          type: 'line',
          data: years.map(y => get(C.REVENUES, y)),
          smooth: true,
          lineStyle: { color: COLORS.revenue, width: 2.5 },
          itemStyle: { color: COLORS.revenue },
          areaStyle: { color: COLORS.revenue + '18' },
          connectNulls: true,
        },
        {
          name: lbl(C.EXPENDITURE),
          type: 'line',
          data: years.map(y => get(C.EXPENDITURE, y)),
          smooth: true,
          lineStyle: { color: COLORS.expenditure, width: 2.5 },
          itemStyle: { color: COLORS.expenditure },
          areaStyle: { color: COLORS.expenditure + '18' },
          connectNulls: true,
        },
        {
          name: lbl(C.POS_RESULT),
          type: 'line',
          data: years.map(y => get(C.POS_RESULT, y)),
          smooth: true,
          lineStyle: { color: COLORS.posResult, width: 2, type: 'dashed' },
          itemStyle: { color: COLORS.posResult },
          connectNulls: true,
        },
        {
          name: lbl(C.NEG_RESULT),
          type: 'line',
          data: years.map(y => get(C.NEG_RESULT, y)),
          smooth: true,
          lineStyle: { color: COLORS.negResult, width: 2, type: 'dashed' },
          itemStyle: { color: COLORS.negResult },
          connectNulls: true,
        },
      ],
    };
    chart.setOption(option);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(overviewRef.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [dataMap, years, isBg]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chart B: Expenditure breakdown (stacked bar)
  useEffect(() => {
    if (!expRef.current || !years.length) return;
    const chart = echarts.init(expRef.current);

    const unit = isBg ? 'хил. лв.' : 'K BGN';
    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          const yr = params[0]?.axisValue;
          let html = `<b>${yr}</b><br/>`;
          for (const p of params) {
            if (p.value == null || p.value === 0) continue;
            html += `${p.marker}${p.seriesName}: <b>${fmtShort(p.value)}</b> ${unit}<br/>`;
          }
          return html;
        },
      },
      legend: {
        bottom: 0,
        type: 'scroll',
        textStyle: { color: '#64748b', fontSize: 10 },
      },
      grid: { top: 20, right: 20, bottom: 80, left: 70 },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontSize: 11, rotate: 30 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => fmtShort(v) },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          name: lbl(C.EXP_REGULAR),
          type: 'bar',
          stack: 'exp',
          data: years.map(y => get(C.EXP_REGULAR, y)),
          itemStyle: { color: COLORS.expRegular },
        },
        {
          name: lbl(C.EXP_ADMIN),
          type: 'bar',
          stack: 'exp',
          data: years.map(y => get(C.EXP_ADMIN, y)),
          itemStyle: { color: COLORS.expAdmin },
        },
        {
          name: lbl(C.FIN_COSTS),
          type: 'bar',
          stack: 'exp',
          data: years.map(y => get(C.FIN_COSTS, y)),
          itemStyle: { color: COLORS.finCosts },
        },
        {
          name: lbl(C.LOSS_ECO),
          type: 'bar',
          stack: 'exp',
          data: years.map(y => get(C.LOSS_ECO, y)),
          itemStyle: { color: COLORS.lossEco },
        },
      ],
    };
    chart.setOption(option);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(expRef.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [dataMap, years, isBg]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chart C: Revenue breakdown (stacked bar)
  useEffect(() => {
    if (!revRef.current || !years.length) return;
    const chart = echarts.init(revRef.current);

    const unit = isBg ? 'хил. лв.' : 'K BGN';
    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          const yr = params[0]?.axisValue;
          let html = `<b>${yr}</b><br/>`;
          for (const p of params) {
            if (p.value == null || p.value === 0) continue;
            html += `${p.marker}${p.seriesName}: <b>${fmtShort(p.value)}</b> ${unit}<br/>`;
          }
          return html;
        },
      },
      legend: {
        bottom: 0,
        type: 'scroll',
        textStyle: { color: '#64748b', fontSize: 10 },
      },
      grid: { top: 20, right: 20, bottom: 80, left: 70 },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontSize: 11, rotate: 30 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => fmtShort(v) },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          name: lbl(C.GRANTS_COND),
          type: 'bar',
          stack: 'rev',
          data: years.map(y => get(C.GRANTS_COND, y)),
          itemStyle: { color: COLORS.grantsCond },
        },
        {
          name: lbl(C.GRANTS_UN),
          type: 'bar',
          stack: 'rev',
          data: years.map(y => get(C.GRANTS_UN, y)),
          itemStyle: { color: COLORS.grantsUn },
        },
        {
          name: lbl(C.MEMBERSHIP),
          type: 'bar',
          stack: 'rev',
          data: years.map(y => get(C.MEMBERSHIP, y)),
          itemStyle: { color: COLORS.membership },
        },
        {
          name: lbl(C.OTHER_REV),
          type: 'bar',
          stack: 'rev',
          data: years.map(y => get(C.OTHER_REV, y)),
          itemStyle: { color: COLORS.otherRev },
        },
        {
          name: lbl(C.FIN_REC),
          type: 'bar',
          stack: 'rev',
          data: years.map(y => get(C.FIN_REC, y)),
          itemStyle: { color: COLORS.finRec },
        },
        {
          name: lbl(C.PROFIT_ECO),
          type: 'bar',
          stack: 'rev',
          data: years.map(y => get(C.PROFIT_ECO, y)),
          itemStyle: { color: COLORS.profitEco },
        },
      ],
    };
    chart.setOption(option);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(revRef.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [dataMap, years, isBg]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data?.length) {
    return <div className="py-8 text-center text-muted-foreground">No data available</div>;
  }

  const netColor = kpi.netCur >= 0 ? 'text-blue-600' : 'text-orange-600';

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Обобщен отчет за приходите и разходите на сдруженията и фондациите'
            : 'Associations & Foundations — Summarized Profit & Loss Statement'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | хиляди лв.`
            : `Annual data (${firstYear}–${latestYear}) | Thousand BGN`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard
            label={isBg ? 'Приходи' : 'Total Revenues'}
            value={kpi.revCur}
            year={latestYear}
            color="text-emerald-600"
            change={kpi.revChange}
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Разходи' : 'Total Expenditures'}
            value={kpi.expCur}
            year={latestYear}
            color="text-rose-600"
            change={kpi.expChange}
            isBg={isBg}
          />
          <KPICard
            label={isBg ? 'Нетен резултат' : 'Net Result'}
            value={kpi.netCur}
            year={latestYear}
            color={netColor}
            change={kpi.netChange}
            isBg={isBg}
          />
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="overview">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="overview">
              {isBg ? 'Общ преглед' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="expenditure">
              {isBg ? 'Разходи' : 'Expenditures'}
            </TabsTrigger>
            <TabsTrigger value="revenue">
              {isBg ? 'Приходи' : 'Revenues'}
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview line chart */}
          <TabsContent value="overview" className="mt-4">
            <div className="bg-white shadow-sm rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                {isBg ? 'А. Динамика на приходите и разходите' : 'A. Revenue & Expenditure Trends'}
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                {isBg
                  ? 'Приходи и разходи по оперативни компоненти; пунктирано — финансов резултат (хил. лв.)'
                  : 'Operational revenues vs expenditures; dashed — financial result (K BGN)'}
              </p>
              <div ref={overviewRef} style={{ height: 380 }} />
            </div>
          </TabsContent>

          {/* Tab 2: Expenditure breakdown */}
          <TabsContent value="expenditure" className="mt-4">
            <div className="bg-white shadow-sm rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                {isBg ? 'Б. Структура на разходите по години' : 'B. Expenditure Structure by Year'}
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                {isBg
                  ? 'Компоненти на разходите — наредени (хил. лв.)'
                  : 'Expenditure components stacked (K BGN)'}
              </p>
              <div ref={expRef} style={{ height: 400 }} />
            </div>
          </TabsContent>

          {/* Tab 3: Revenue breakdown */}
          <TabsContent value="revenue" className="mt-4">
            <div className="bg-white shadow-sm rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                {isBg ? 'В. Структура на приходите по години' : 'C. Revenue Structure by Year'}
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                {isBg
                  ? 'Компоненти на приходите — наредени (хил. лв.)'
                  : 'Revenue components stacked (K BGN)'}
              </p>
              <div ref={revRef} style={{ height: 400 }} />
            </div>
          </TabsContent>
        </Tabs>

      </CardContent>
    </Card>
  );
}
