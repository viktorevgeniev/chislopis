'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── NUTS name dictionaries ─────────────────────────────────────────────────────

const NUTS_BG: Record<string, string> = {
  'BG': 'Общо за страната',
  'BG31': 'Северозападен', 'BG311': 'Видин', 'BG312': 'Монтана', 'BG313': 'Враца',
  'BG314': 'Плевен', 'BG315': 'Ловеч',
  'BG32': 'Северен централен', 'BG321': 'Велико Търново', 'BG322': 'Габрово',
  'BG323': 'Русе', 'BG324': 'Разград', 'BG325': 'Силистра',
  'BG33': 'Североизточен', 'BG331': 'Варна', 'BG332': 'Добрич',
  'BG333': 'Шумен', 'BG334': 'Търговище',
  'BG34': 'Югоизточен', 'BG341': 'Бургас', 'BG342': 'Сливен',
  'BG343': 'Ямбол', 'BG344': 'Стара Загора',
  'BG41': 'Югозападен', 'BG411': 'София (столица)', 'BG412': 'София',
  'BG413': 'Благоевград', 'BG414': 'Перник', 'BG415': 'Кюстендил',
  'BG42': 'Южен централен', 'BG421': 'Пловдив', 'BG422': 'Хасково',
  'BG423': 'Пазарджик', 'BG424': 'Смолян', 'BG425': 'Кърджали',
};

const NUTS_EN: Record<string, string> = {
  'BG': 'Total for the country',
  'BG31': 'Severozapaden', 'BG311': 'Vidin', 'BG312': 'Montana', 'BG313': 'Vratsa',
  'BG314': 'Pleven', 'BG315': 'Lovech',
  'BG32': 'Severen tsentralen', 'BG321': 'Veliko Tarnovo', 'BG322': 'Gabrovo',
  'BG323': 'Ruse', 'BG324': 'Razgrad', 'BG325': 'Silistra',
  'BG33': 'Severoiztochen', 'BG331': 'Varna', 'BG332': 'Dobrich',
  'BG333': 'Shumen', 'BG334': 'Targovishte',
  'BG34': 'Yugoiztochen', 'BG341': 'Burgas', 'BG342': 'Sliven',
  'BG343': 'Yambol', 'BG344': 'Stara Zagora',
  'BG41': 'Yugozapaden', 'BG411': 'Sofia-grad', 'BG412': 'Sofia',
  'BG413': 'Blagoevgrad', 'BG414': 'Pernik', 'BG415': 'Kyustendil',
  'BG42': 'Yuzhen tsentralen', 'BG421': 'Plovdiv', 'BG422': 'Haskovo',
  'BG423': 'Pazardzhik', 'BG424': 'Smolyan', 'BG425': 'Kardzhali',
};

const DISTRICT_PARENT: Record<string, string> = {
  'BG311': 'BG31', 'BG312': 'BG31', 'BG313': 'BG31', 'BG314': 'BG31', 'BG315': 'BG31',
  'BG321': 'BG32', 'BG322': 'BG32', 'BG323': 'BG32', 'BG324': 'BG32', 'BG325': 'BG32',
  'BG331': 'BG33', 'BG332': 'BG33', 'BG333': 'BG33', 'BG334': 'BG33',
  'BG341': 'BG34', 'BG342': 'BG34', 'BG343': 'BG34', 'BG344': 'BG34',
  'BG411': 'BG41', 'BG412': 'BG41', 'BG413': 'BG41', 'BG414': 'BG41', 'BG415': 'BG41',
  'BG421': 'BG42', 'BG422': 'BG42', 'BG423': 'BG42', 'BG424': 'BG42', 'BG425': 'BG42',
};

const MACRO_COLORS: Record<string, string> = {
  'BG': '#1e293b',
  'BG31': '#ef4444', 'BG32': '#f97316', 'BG33': '#eab308',
  'BG34': '#22c55e', 'BG41': '#3b82f6', 'BG42': '#a855f7',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function nutsLevel(code: string): 0 | 1 | 2 {
  if (code === 'BG') return 0;
  if (code.length === 4) return 1;
  return 2;
}

function regionName(code: string, isBg: boolean): string {
  return (isBg ? NUTS_BG[code] : NUTS_EN[code]) ?? code;
}

function getVal(row: any, col: string): number | null {
  if (!row) return null;
  const v = row[col];
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

/** Format value (in 1000 EUR) as millions or billions EUR */
function formatAmount(thEur: number, isBg: boolean): string {
  const mEur = thEur / 1000; // thousands → millions
  if (mEur >= 1000) {
    const bEur = mEur / 1000;
    return isBg ? `${bEur.toFixed(2)} млрд. EUR` : `${bEur.toFixed(2)}B EUR`;
  }
  return isBg ? `${mEur.toFixed(1)} млн. EUR` : `${mEur.toFixed(1)}M EUR`;
}

/** Short format for chart axis labels */
function formatShort(thEur: number, isBg: boolean): string {
  const mEur = thEur / 1000;
  if (mEur >= 1000) {
    return isBg ? `${(mEur / 1000).toFixed(1)} млрд.` : `${(mEur / 1000).toFixed(1)}B`;
  }
  return isBg ? `${mEur.toFixed(0)} млн.` : `${mEur.toFixed(0)}M`;
}

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════

export function FdiByRegionDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  // Build index: nutsCode → year → amount (1000 EUR)
  const index = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const row of data) {
      // NUTS_Code comes from localCsvLoader codelist mapping
      const code: string = row.NUTS_Code ?? row.NUTS ?? '';
      const year: string = String(row.Year ?? '');
      const amount = getVal(row, 'Amount');
      if (!code || !year || amount == null) continue;
      if (!map.has(code)) map.set(code, new Map());
      map.get(code)!.set(year, amount);
    }
    return map;
  }, [data]);

  const allYears = useMemo(() => {
    const yrs = new Set<string>();
    for (const row of data) { if (row.Year) yrs.add(String(row.Year)); }
    return [...yrs].sort((a, b) => parseInt(a) - parseInt(b));
  }, [data]);

  const latestYear = allYears[allYears.length - 1] ?? '';
  const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

  const [barYear, setBarYear] = useState<string>('');
  const selectedBarYear = barYear || latestYear;

  // KPI data
  const kpi = useMemo(() => {
    const nationalAmt = index.get('BG')?.get(latestYear) ?? null;
    const nationalPrev = prevYear ? (index.get('BG')?.get(prevYear) ?? null) : null;
    const yoyPct = nationalAmt != null && nationalPrev != null && nationalPrev !== 0
      ? ((nationalAmt - nationalPrev) / nationalPrev) * 100
      : null;

    const districts = Object.keys(DISTRICT_PARENT);
    let highest: { code: string; amount: number } | null = null;
    let lowest: { code: string; amount: number } | null = null;

    for (const code of districts) {
      const amount = index.get(code)?.get(latestYear) ?? null;
      if (amount == null) continue;
      if (!highest || amount > highest.amount) highest = { code, amount };
      if (!lowest || amount < lowest.amount) lowest = { code, amount };
    }

    return { nationalAmt, yoyPct, highest, lowest };
  }, [index, latestYear, prevYear]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const firstYear = allYears[0] ?? '';

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Преки чуждестранни инвестиции по региони и области'
            : 'Foreign Direct Investment by Statistical Regions and Districts'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | ПЧИ в нефинансовите предприятия по статистически райони и области, хил. EUR`
            : `Annual data (${firstYear}–${latestYear}) | FDI in non-financial enterprises by statistical regions and districts, thousand EUR`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Общо за страната' : 'National total'}
            </p>
            <p className="text-2xl font-bold mt-2 text-indigo-600 break-words">
              {kpi.nationalAmt != null ? formatAmount(kpi.nationalAmt, isBg) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Нефинансови предприятия' : 'Non-financial enterprises'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{latestYear}</span>
              {kpi.yoyPct != null && (
                <span className={`text-[10px] font-semibold ${kpi.yoyPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.yoyPct >= 0 ? '▲' : '▼'} {Math.abs(kpi.yoyPct).toFixed(1)}% YoY
                </span>
              )}
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-привлекателна област' : 'Top investment district'}
            </p>
            {kpi.highest ? (
              <>
                <p className="text-xl font-bold mt-2 text-emerald-600 break-words">
                  {formatAmount(kpi.highest.amount, isBg)}
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {regionName(kpi.highest.code, isBg)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {kpi.highest.code} · {latestYear}
                </p>
              </>
            ) : <p className="text-2xl font-bold mt-2 text-slate-400">—</p>}
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-малко инвестирана' : 'Lowest investment district'}
            </p>
            {kpi.lowest ? (
              <>
                <p className="text-xl font-bold mt-2 text-amber-500 break-words">
                  {formatAmount(kpi.lowest.amount, isBg)}
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {regionName(kpi.lowest.code, isBg)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {kpi.lowest.code} · {latestYear}
                </p>
              </>
            ) : <p className="text-2xl font-bold mt-2 text-slate-400">—</p>}
          </div>
        </div>

        {/* ── Chart A: Time-series lines (national + macro-regions) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Динамика на ПЧИ по статистически региони'
              : 'A. FDI Trend by Statistical Region'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | Национален показател и макрорегиони | млн./млрд. EUR`
              : `${firstYear}–${latestYear} | National indicator and macro-regions | M/B EUR`}
          </p>
          <TrendLineChart index={index} allYears={allYears} isBg={isBg} />
        </div>

        {/* ── Chart B: Regional comparison bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-slate-700">
              {isBg
                ? 'Б. ПЧИ по области — класация'
                : 'B. FDI by District — Ranking'}
            </h3>
            <Select
              value={selectedBarYear}
              onChange={e => setBarYear(e.target.value)}
              className="text-xs py-1 px-2 h-8 w-28"
            >
              {[...allYears].reverse().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${selectedBarYear} | Подредени по намаляваща стойност (само ниво NUTS 3)`
              : `${selectedBarYear} | Sorted by descending value (NUTS 3 districts only)`}
          </p>
          <RegionalBarChart index={index} year={selectedBarYear} isBg={isBg} />
        </div>

        {/* ── Data Table ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            {isBg ? 'В. Таблица с данни' : 'C. Data Table'}
          </h3>
          <DataTable index={index} allYears={allYears} isBg={isBg} latestYear={latestYear} />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-line: national + 6 macro-regions
// ══════════════════════════════════════════════════════════════════════════════

const MACRO_CODES = ['BG', 'BG31', 'BG32', 'BG33', 'BG34', 'BG41', 'BG42'] as const;

function TrendLineChart({ index, allYears, isBg }: {
  index: Map<string, Map<string, number>>;
  allYears: string[];
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => (
    MACRO_CODES.map(code => ({
      code,
      label: regionName(code, isBg),
      color: MACRO_COLORS[code],
      isNational: code === 'BG',
      values: allYears.map(yr => {
        const v = index.get(code)?.get(yr) ?? null;
        return v != null ? Math.round(v / 1000 * 10) / 10 : null; // convert to millions, 1 dp
      }),
    }))
  ), [index, allYears, isBg]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
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
              const mEur = Number(p.value);
              const display = mEur >= 1000
                ? (isBg ? `${(mEur / 1000).toFixed(2)} млрд. EUR` : `${(mEur / 1000).toFixed(2)}B EUR`)
                : (isBg ? `${mEur.toFixed(1)} млн. EUR` : `${mEur.toFixed(1)}M EUR`);
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${display}</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: seriesData.map(s => s.label),
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '22%', top: '6%', containLabel: true },
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
        name: isBg ? 'млн. EUR' : 'M EUR',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}B` : `${v.toFixed(0)}M`,
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
        lineStyle: {
          width: s.isNational ? 3.5 : 2,
          color: s.color,
        },
        smooth: true,
        symbol: 'circle',
        symbolSize: s.isNational ? 7 : 5,
        connectNulls: true,
        emphasis: { lineStyle: { width: s.isNational ? 5 : 3 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Horizontal bar: districts ranked for selected year
// ══════════════════════════════════════════════════════════════════════════════

function RegionalBarChart({ index, year, isBg }: {
  index: Map<string, Map<string, number>>;
  year: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    const districts = Object.keys(DISTRICT_PARENT);
    const rows: Array<{ code: string; label: string; amount: number; color: string }> = [];
    for (const code of districts) {
      const amount = index.get(code)?.get(year) ?? null;
      if (amount == null) continue;
      const parent = DISTRICT_PARENT[code] ?? 'BG31';
      rows.push({ code, label: regionName(code, isBg), amount, color: MACRO_COLORS[parent] });
    }
    return rows.sort((a, b) => b.amount - a.amount);
  }, [index, year, isBg]);

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const nationalAmt = index.get('BG')?.get(year) ?? null;
    const mValues = chartData.map(d => Math.round(d.amount / 1000 * 10) / 10);
    const nationalM = nationalAmt != null ? Math.round(nationalAmt / 1000 * 10) / 10 : null;

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const d = chartData[p.dataIndex];
          if (!d) return '';
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.name}</div>
            <div style="color:#64748b;font-size:11px;margin-bottom:4px">${d.code} · ${year}</div>
            <div>${isBg ? 'ПЧИ' : 'FDI'}: <b>${formatAmount(d.amount, isBg)}</b></div>`;
        },
      },
      grid: { left: '1%', right: '14%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? 'млн. EUR' : 'M EUR',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}B` : `${v.toFixed(0)}M`,
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      yAxis: {
        type: 'category',
        data: chartData.map(d => d.label),
        axisLabel: { fontSize: 11, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        inverse: false,
      },
      series: [
        {
          type: 'bar' as const,
          data: mValues.map((v, i) => ({
            value: v,
            itemStyle: { color: chartData[i].color, borderRadius: [0, 4, 4, 0], opacity: 0.85 },
          })),
          barMaxWidth: 28,
          label: {
            show: true,
            position: 'right' as const,
            fontSize: 10,
            fontWeight: 'bold' as const,
            color: '#334155',
            formatter: (p: any) => {
              if (p.value == null) return '';
              const mv = Number(p.value);
              return mv >= 1000
                ? (isBg ? `${(mv / 1000).toFixed(1)} млрд.` : `${(mv / 1000).toFixed(1)}B`)
                : (isBg ? `${mv.toFixed(0)} млн.` : `${mv.toFixed(0)}M`);
            },
          },
          emphasis: { itemStyle: { opacity: 1 } },
          ...(nationalM != null ? {
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { type: 'dashed', color: '#1e293b', width: 2 },
              label: {
                show: true,
                position: 'end',
                formatter: isBg
                  ? `Национален\n${formatShort(nationalAmt!, isBg)}`
                  : `National\n${formatShort(nationalAmt!, isBg)}`,
                fontSize: 9,
                color: '#1e293b',
                fontWeight: 'bold',
              },
              data: [{ xAxis: nationalM }],
            },
          } : {}),
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, year, index, isBg]);

  const chartHeight = Math.max(320, chartData.length * 28 + 60);
  return <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Data Table
// ══════════════════════════════════════════════════════════════════════════════

const LEVEL_OPTIONS_EN = [
  { value: 'all', label: 'All NUTS levels' },
  { value: '0', label: 'National (BG)' },
  { value: '1', label: 'Macro-regions (NUTS 2)' },
  { value: '2', label: 'Districts (NUTS 3)' },
];
const LEVEL_OPTIONS_BG = [
  { value: 'all', label: 'Всички нива' },
  { value: '0', label: 'Национално (BG)' },
  { value: '1', label: 'Макрорегиони (NUTS 2)' },
  { value: '2', label: 'Области (NUTS 3)' },
];

const NUTS_ORDER = [
  'BG',
  'BG31', 'BG311', 'BG312', 'BG313', 'BG314', 'BG315',
  'BG32', 'BG321', 'BG322', 'BG323', 'BG324', 'BG325',
  'BG33', 'BG331', 'BG332', 'BG333', 'BG334',
  'BG34', 'BG341', 'BG342', 'BG343', 'BG344',
  'BG41', 'BG411', 'BG412', 'BG413', 'BG414', 'BG415',
  'BG42', 'BG421', 'BG422', 'BG423', 'BG424', 'BG425',
];

function DataTable({ index, allYears, isBg, latestYear }: {
  index: Map<string, Map<string, number>>;
  allYears: string[];
  isBg: boolean;
  latestYear: string;
}) {
  const [yearFilter, setYearFilter] = useState<string>(latestYear);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const allCodes = useMemo(() => NUTS_ORDER.filter(c => index.has(c)), [index]);

  const rows = useMemo(() => {
    const result: Array<{ code: string; name: string; year: string; amount: number | null }> = [];
    const yearsToShow = yearFilter === 'all' ? [...allYears].reverse() : [yearFilter];
    const searchLower = search.toLowerCase();
    for (const yr of yearsToShow) {
      for (const code of allCodes) {
        const level = nutsLevel(code);
        if (levelFilter !== 'all' && String(level) !== levelFilter) continue;
        const amount = index.get(code)?.get(yr) ?? null;
        if (amount == null) continue;
        const name = regionName(code, isBg);
        if (searchLower && !name.toLowerCase().includes(searchLower) && !code.toLowerCase().includes(searchLower)) continue;
        result.push({ code, name, year: yr, amount });
      }
    }
    return result;
  }, [index, allYears, allCodes, yearFilter, levelFilter, isBg, search]);

  const levelOptions = isBg ? LEVEL_OPTIONS_BG : LEVEL_OPTIONS_EN;

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">
            {isBg ? 'Година:' : 'Year:'}
          </label>
          <Select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="text-xs py-1 px-2 h-8 w-24"
          >
            <option value="all">{isBg ? 'Всички' : 'All'}</option>
            {[...allYears].reverse().map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">
            {isBg ? 'Ниво:' : 'Level:'}
          </label>
          <Select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            className="text-xs py-1 px-2 h-8 w-44"
          >
            {levelOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={isBg ? 'Търси регион…' : 'Search region…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-xs py-1 px-2 h-8 w-36 border border-slate-200 rounded-md text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <span className="text-xs text-slate-400 self-center">
          {rows.length} {isBg ? 'записа' : 'records'}
        </span>
      </div>

      <div className="overflow-auto max-h-96 rounded-lg border border-slate-100">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100 whitespace-nowrap">
                {isBg ? 'Регион' : 'Region'}
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100">
                {isBg ? 'NUTS код' : 'NUTS code'}
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100">
                {isBg ? 'Година' : 'Year'}
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100 whitespace-nowrap">
                {isBg ? 'ПЧИ (хил. EUR)' : 'FDI (thousand EUR)'}
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100 whitespace-nowrap">
                {isBg ? 'Форматирано' : 'Formatted'}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const level = nutsLevel(row.code);
              const isNational = level === 0;
              const isMacro = level === 1;
              return (
                <tr
                  key={`${row.code}-${row.year}`}
                  className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isNational ? 'bg-indigo-50/40' : isMacro ? 'bg-slate-50/60' : ''}`}
                >
                  <td className={`px-3 py-2 text-slate-700 ${isNational ? 'font-bold' : isMacro ? 'font-semibold pl-4' : 'pl-6 text-slate-600'}`}>
                    {row.name}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-400">{row.code}</td>
                  <td className="px-3 py-2 text-slate-600">{row.year}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-slate-600">
                    {row.amount != null ? row.amount.toLocaleString('bg-BG', { maximumFractionDigits: 1 }) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800 whitespace-nowrap">
                    {row.amount != null ? formatAmount(row.amount, isBg) : '—'}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400 text-xs">
                  {isBg ? 'Няма записи' : 'No records found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
