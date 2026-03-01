'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── NUTS name dictionary (English) ─────────────────────────────────────────────
const NUTS_EN: Record<string, string> = {
  'BG': 'Total for the country',
  'BG3': 'North and South-East Bulgaria',
  'BG4': 'South-West and Central South Bulgaria',
  'BG31': 'Severozapaden',
  'BG311': 'Vidin', 'BG312': 'Montana', 'BG313': 'Vratsa', 'BG314': 'Pleven', 'BG315': 'Lovech',
  'BG32': 'Severen tsentralen',
  'BG321': 'Veliko Tarnovo', 'BG322': 'Gabrovo', 'BG323': 'Ruse', 'BG324': 'Razgrad', 'BG325': 'Silistra',
  'BG33': 'Severoiztochen',
  'BG331': 'Varna', 'BG332': 'Dobrich', 'BG333': 'Shumen', 'BG334': 'Targovishte',
  'BG34': 'Yugoiztochen',
  'BG341': 'Burgas', 'BG342': 'Sliven', 'BG343': 'Yambol', 'BG344': 'Stara Zagora',
  'BG41': 'Yugozapaden',
  'BG411': 'Sofia-grad', 'BG412': 'Sofia', 'BG413': 'Blagoevgrad', 'BG414': 'Pernik', 'BG415': 'Kyustendil',
  'BG42': 'Yuzhen tsentralen',
  'BG421': 'Plovdiv', 'BG422': 'Haskovo', 'BG423': 'Pazardzhik', 'BG424': 'Smolyan', 'BG425': 'Kardzhali',
};

// ── NUTS 3 district codes ordered by region ───────────────────────────────────
const NUTS3_CODES = [
  'BG311', 'BG312', 'BG313', 'BG314', 'BG315',
  'BG321', 'BG322', 'BG323', 'BG324', 'BG325',
  'BG331', 'BG332', 'BG333', 'BG334',
  'BG341', 'BG342', 'BG343', 'BG344',
  'BG411', 'BG412', 'BG413', 'BG414', 'BG415',
  'BG421', 'BG422', 'BG423', 'BG424', 'BG425',
];

// ── Indicator code constants ──────────────────────────────────────────────────
const IND = {
  ARRIVALS_TOTAL:    '3.5.2.1',
  ARRIVALS_BG:       '3.5.2.1.1',
  ARRIVALS_FOREIGN:  '3.5.2.1.2',
  NIGHTS_TOTAL:      '3.5.2.2',
  NIGHTS_BG:         '3.5.2.2.1',
  NIGHTS_FOREIGN:    '3.5.2.2.2',
  REVENUE_TOTAL:     '3.5.2.3',
  REVENUE_BG:        '3.5.2.3.1',
  REVENUE_FOREIGN:   '3.5.2.3.2',
  BED_PLACES:        '3.5.2.4',
  ESTABLISHMENTS:    '3.5.2.5',
  BED_NIGHTS_AVAIL:  '3.5.2.6',
} as const;

// ── Period parsing helpers ────────────────────────────────────────────────────
const ROMAN_TO_NUM: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6,
  'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12,
};
const MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parsePeriod(period: string): { year: number; month: number; display: string } {
  const year = parseInt(period.slice(0, 4), 10);
  const monthStr = period.slice(4);
  const month = ROMAN_TO_NUM[monthStr] ?? 0;
  const display = month > 0 ? `${MONTH_SHORT[month]} ${year}` : period;
  return { year, month, display };
}

function sortPeriods(periods: string[]): string[] {
  return [...periods].sort((a, b) => {
    const pa = parsePeriod(a);
    const pb = parsePeriod(b);
    return pa.year !== pb.year ? pa.year - pb.year : pa.month - pb.month;
  });
}

// ── Utility helpers ───────────────────────────────────────────────────────────
function getVal(row: any, col: string): number | null {
  const v = row?.[col];
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) || n === 0 ? null : n;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function fmtBGN(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B BGN`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M BGN`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K BGN`;
  return `${n} BGN`;
}

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────
// nutsCode → indicatorCode → period → value
type DataIndex = Map<string, Map<string, Map<string, number>>>;

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════

export function AccommodationEstablishmentsDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  // Build three-level index: nuts → indicator → period → value
  const index = useMemo<DataIndex>(() => {
    const map: DataIndex = new Map();
    for (const row of data) {
      const nutsCode  = String(row.NUTS_Code ?? row.NUTS ?? '');
      const indCode   = String(row.Indicators_Code ?? '');
      const period    = String(row.Year ?? '');
      const val       = getVal(row, 'Count');
      if (!nutsCode || !indCode || !period || val == null) continue;
      if (!map.has(nutsCode)) map.set(nutsCode, new Map());
      const byNuts = map.get(nutsCode)!;
      if (!byNuts.has(indCode)) byNuts.set(indCode, new Map());
      byNuts.get(indCode)!.set(period, val);
    }
    return map;
  }, [data]);

  const allPeriods = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) { if (row.Year) s.add(String(row.Year)); }
    return sortPeriods([...s]);
  }, [data]);

  const allYears = useMemo(() => {
    const s = new Set<number>();
    for (const p of allPeriods) s.add(parsePeriod(p).year);
    return [...s].sort((a, b) => a - b);
  }, [allPeriods]);

  const latestYear = allYears[allYears.length - 1] ?? 0;
  const firstYear  = allYears[0] ?? 0;

  // All NUTS codes in data, sorted hierarchically
  const allNutsCodes = useMemo(() => {
    const present = new Set<string>();
    for (const row of data) { if (row.NUTS_Code) present.add(String(row.NUTS_Code)); }
    const ordered = ['BG', 'BG3', 'BG4',
      'BG31', 'BG32', 'BG33', 'BG34', 'BG41', 'BG42',
      ...NUTS3_CODES,
    ];
    return ordered.filter(c => present.has(c));
  }, [data]);

  // ── Filters ──
  const [yearFilter, setYearFilter]     = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('BG');
  const [volumeMetric, setVolumeMetric] = useState<'arrivals' | 'nights'>('arrivals');

  const filteredPeriods = useMemo(() => {
    if (yearFilter === 'all') return allPeriods;
    const y = parseInt(yearFilter, 10);
    return allPeriods.filter(p => parsePeriod(p).year === y);
  }, [allPeriods, yearFilter]);

  // ── KPI: sum over the latest year, for country total (BG) ──
  const kpi = useMemo(() => {
    const kpiPeriods = allPeriods.filter(p => parsePeriod(p).year === latestYear);
    const sum = (indCode: string, nuts = 'BG') => {
      const byInd = index.get(nuts)?.get(indCode);
      if (!byInd) return null;
      const total = kpiPeriods.reduce((acc, p) => acc + (byInd.get(p) ?? 0), 0);
      return total > 0 ? total : null;
    };
    return {
      revenue:        sum(IND.REVENUE_TOTAL),
      arrivals:       sum(IND.ARRIVALS_TOTAL),
      bedNightsAvail: sum(IND.BED_NIGHTS_AVAIL),
    };
  }, [index, allPeriods, latestYear]);

  const nutsName = (code: string) => NUTS_EN[code] ?? code;

  if (!data || data.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No data available</div>;
  }

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg ? 'Места за настаняване — Активност' : 'Accommodation Establishments Activity'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Месечни данни (${firstYear}–${latestYear}) | Пристигания, нощувки, приходи и капацитет по региони`
            : `Monthly data (${firstYear}–${latestYear}) | Arrivals, nights, revenue and capacity by region`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-4 items-center bg-white shadow-sm rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">
              {isBg ? 'Година:' : 'Year:'}
            </label>
            <Select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="text-xs h-8 w-28">
              <option value="all">{isBg ? 'Всички' : 'All years'}</option>
              {[...allYears].reverse().map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">
              {isBg ? 'Регион:' : 'Region:'}
            </label>
            <Select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="text-xs h-8 w-52">
              {allNutsCodes.map(c => (
                <option key={c} value={c}>{nutsName(c)} ({c})</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">
              {isBg ? 'Обемен показател:' : 'Volume metric:'}
            </label>
            <Select
              value={volumeMetric}
              onChange={e => setVolumeMetric(e.target.value as 'arrivals' | 'nights')}
              className="text-xs h-8 w-36"
            >
              <option value="arrivals">{isBg ? 'Пристигания' : 'Arrivals'}</option>
              <option value="nights">{isBg ? 'Нощувки' : 'Nights Spent'}</option>
            </Select>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Общ приход' : 'Total Revenue'}
            </p>
            <p className="text-2xl font-bold mt-2 text-indigo-600 break-words">
              {kpi.revenue != null ? fmtBGN(kpi.revenue) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? `Настаняване, ${latestYear}` : `Accommodation, ${latestYear}`}
            </p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Общо пристигания' : 'Total Arrivals'}
            </p>
            <p className="text-2xl font-bold mt-2 text-emerald-600 break-words">
              {kpi.arrivals != null ? fmtNum(kpi.arrivals) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? `За цялата страна, ${latestYear}` : `Nationwide, ${latestYear}`}
            </p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Налични легло-нощувки' : 'Available Bed-Nights'}
            </p>
            <p className="text-2xl font-bold mt-2 text-amber-500 break-words">
              {kpi.bedNightsAvail != null ? fmtNum(kpi.bedNightsAvail) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? `Капацитет, ${latestYear}` : `Capacity, ${latestYear}`}
            </p>
          </div>
        </div>

        {/* ── Chart A: Dual-axis trend ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Динамика — Нощувки vs. Приходи' : 'A. Trend — Nights Spent vs. Revenue'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {nutsName(regionFilter)} | {isBg ? 'Двойна ос Y: Брой (ляво) vs. BGN (дясно)' : 'Dual Y-axis: Number (left) vs. BGN (right)'}
          </p>
          <TrendLineChart index={index} periods={filteredPeriods} nutsCode={regionFilter} isBg={isBg} />
        </div>

        {/* ── Chart B: Demographic composition ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'Б. Демографски състав — Българи vs. Чужденци'
              : 'B. Demographic Composition — Bulgarians vs. Foreigners'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {nutsName(regionFilter)} |{' '}
            {isBg
              ? `${volumeMetric === 'arrivals' ? 'Пристигания' : 'Нощувки'} и приходи по произход`
              : `${volumeMetric === 'arrivals' ? 'Arrivals' : 'Nights Spent'} & Revenue by visitor origin`}
          </p>
          <DemographicBarChart
            index={index}
            periods={filteredPeriods}
            nutsCode={regionFilter}
            volumeMetric={volumeMetric}
            isBg={isBg}
          />
        </div>

        {/* ── Chart C: Regional distribution ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `В. Регионално разпределение — ${volumeMetric === 'arrivals' ? 'Пристигания' : 'Нощувки'}`
              : `C. Regional Distribution — ${volumeMetric === 'arrivals' ? 'Arrivals' : 'Nights Spent'}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `Области (NUTS 3) | Сума за ${yearFilter === 'all' ? 'всички години' : yearFilter} | Низходящо'`
              : `Districts (NUTS 3) | Sum over ${yearFilter === 'all' ? 'all years' : yearFilter} | Sorted descending`}
          </p>
          <RegionalBarChart
            index={index}
            periods={filteredPeriods}
            volumeMetric={volumeMetric}
            selectedNuts={regionFilter}
            isBg={isBg}
          />
        </div>

        {/* ── Chart D: Scatter — Bed-places vs Revenue ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'Г. Капацитет vs. Приход — Ефективност по области'
              : 'D. Capacity vs. Revenue — District Efficiency'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `X-ос: Леглова база | Y-ос: Приходи (BGN) | Всяка точка = област | Сума за ${yearFilter === 'all' ? 'всички години' : yearFilter}`
              : `X-axis: Bed-places | Y-axis: Revenue (BGN) | Each dot = district | Sum over ${yearFilter === 'all' ? 'all years' : yearFilter}`}
          </p>
          <CapacityRevenueScatter index={index} periods={filteredPeriods} isBg={isBg} />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Dual-axis line: Nights Spent vs. Revenue
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ index, periods, nutsCode, isBg }: {
  index: DataIndex;
  periods: string[];
  nutsCode: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    const byNuts = index.get(nutsCode);
    const labels  = periods.map(p => parsePeriod(p).display);
    const nights  = periods.map(p => byNuts?.get(IND.NIGHTS_TOTAL)?.get(p) ?? null);
    const revenue = periods.map(p => byNuts?.get(IND.REVENUE_TOTAL)?.get(p) ?? null);
    return { labels, nights, revenue };
  }, [index, periods, nutsCode]);

  useEffect(() => {
    if (!chartRef.current || periods.length === 0) return;
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
            const formatted = p.seriesIndex === 0 ? fmtNum(p.value) : fmtBGN(p.value);
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${formatted}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Нощувки' : 'Nights Spent', isBg ? 'Приходи' : 'Revenue'],
        bottom: '5%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '1%', bottom: '22%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: seriesData.labels,
        axisLabel: { fontSize: 10, color: '#94a3b8', rotate: 40, interval: Math.max(0, Math.floor(periods.length / 20)) },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: isBg ? 'Нощувки' : 'Nights',
          nameTextStyle: { fontSize: 10, color: '#3b82f6' },
          axisLabel: { fontSize: 10, color: '#3b82f6', formatter: (v: number) => fmtNum(v) },
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
          axisLine: { show: false },
          axisTick: { show: false },
          min: 0,
        },
        {
          type: 'value',
          name: isBg ? 'BGN' : 'Revenue',
          nameTextStyle: { fontSize: 10, color: '#f97316' },
          axisLabel: {
            fontSize: 10, color: '#f97316',
            formatter: (v: number) => fmtBGN(v).replace(' BGN', ''),
          },
          splitLine: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          min: 0,
        },
      ],
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100, height: 20, bottom: '12%' },
      ],
      series: [
        {
          name: isBg ? 'Нощувки' : 'Nights Spent',
          type: 'line',
          yAxisIndex: 0,
          data: seriesData.nights,
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 2.5, color: '#3b82f6' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          connectNulls: true,
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59,130,246,0.18)' },
                { offset: 1, color: 'rgba(59,130,246,0)' },
              ],
            },
          },
        },
        {
          name: isBg ? 'Приходи' : 'Revenue',
          type: 'line',
          yAxisIndex: 1,
          data: seriesData.revenue,
          itemStyle: { color: '#f97316' },
          lineStyle: { width: 2.5, color: '#f97316' },
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
  }, [seriesData, periods, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Stacked bar + line overlay: Bulgarians vs Foreigners
// ══════════════════════════════════════════════════════════════════════════════

function DemographicBarChart({ index, periods, nutsCode, volumeMetric, isBg }: {
  index: DataIndex;
  periods: string[];
  nutsCode: string;
  volumeMetric: 'arrivals' | 'nights';
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    const byNuts    = index.get(nutsCode);
    const bgCode    = volumeMetric === 'arrivals' ? IND.ARRIVALS_BG    : IND.NIGHTS_BG;
    const foreignCode = volumeMetric === 'arrivals' ? IND.ARRIVALS_FOREIGN : IND.NIGHTS_FOREIGN;
    const labels    = periods.map(p => parsePeriod(p).display);
    const bgVol     = periods.map(p => byNuts?.get(bgCode)?.get(p) ?? null);
    const foreignVol = periods.map(p => byNuts?.get(foreignCode)?.get(p) ?? null);
    const revBg     = periods.map(p => byNuts?.get(IND.REVENUE_BG)?.get(p) ?? null);
    const revForeign = periods.map(p => byNuts?.get(IND.REVENUE_FOREIGN)?.get(p) ?? null);
    return { labels, bgVol, foreignVol, revBg, revForeign };
  }, [index, periods, nutsCode, volumeMetric]);

  const metricLabel = isBg
    ? (volumeMetric === 'arrivals' ? 'Пристигания' : 'Нощувки')
    : (volumeMetric === 'arrivals' ? 'Arrivals' : 'Nights Spent');

  useEffect(() => {
    if (!chartRef.current || periods.length === 0) return;
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
            const isRevenue = p.seriesIndex >= 2;
            const formatted = isRevenue ? fmtBGN(p.value) : fmtNum(p.value);
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:2px;background:${p.color};display:inline-block"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${formatted}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        bottom: '5%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 12, itemHeight: 8,
      },
      grid: { left: '1%', right: '1%', bottom: '22%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: seriesData.labels,
        axisLabel: { fontSize: 10, color: '#94a3b8', rotate: 40, interval: Math.max(0, Math.floor(periods.length / 20)) },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: metricLabel,
          nameTextStyle: { fontSize: 10, color: '#94a3b8' },
          axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtNum(v) },
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
          axisLine: { show: false },
          axisTick: { show: false },
          min: 0,
        },
        {
          type: 'value',
          name: isBg ? 'Приходи' : 'Revenue',
          nameTextStyle: { fontSize: 10, color: '#94a3b8' },
          axisLabel: {
            fontSize: 10, color: '#94a3b8',
            formatter: (v: number) => fmtBGN(v).replace(' BGN', ''),
          },
          splitLine: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          min: 0,
        },
      ],
      dataZoom: [{ type: 'inside', start: 0, end: 100 }],
      series: [
        {
          name: isBg ? `Българи — ${metricLabel}` : `Bulgarians — ${metricLabel}`,
          type: 'bar',
          stack: 'volume',
          yAxisIndex: 0,
          data: seriesData.bgVol,
          itemStyle: { color: '#6366f1' },
          barMaxWidth: 32,
        },
        {
          name: isBg ? `Чужденци — ${metricLabel}` : `Foreigners — ${metricLabel}`,
          type: 'bar',
          stack: 'volume',
          yAxisIndex: 0,
          data: seriesData.foreignVol,
          itemStyle: { color: '#22c55e' },
          barMaxWidth: 32,
        },
        {
          name: isBg ? 'Приход — Българи' : 'Revenue — Bulgarians',
          type: 'line',
          yAxisIndex: 1,
          data: seriesData.revBg,
          itemStyle: { color: '#818cf8' },
          lineStyle: { width: 2, color: '#818cf8', type: 'dashed' },
          smooth: true,
          symbol: 'none',
          connectNulls: true,
        },
        {
          name: isBg ? 'Приход — Чужденци' : 'Revenue — Foreigners',
          type: 'line',
          yAxisIndex: 1,
          data: seriesData.revForeign,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2, color: '#10b981', type: 'dashed' },
          smooth: true,
          symbol: 'none',
          connectNulls: true,
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [seriesData, periods, metricLabel, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Horizontal bar: Regional distribution (NUTS 3 districts)
// ══════════════════════════════════════════════════════════════════════════════

function RegionalBarChart({ index, periods, volumeMetric, selectedNuts, isBg }: {
  index: DataIndex;
  periods: string[];
  volumeMetric: 'arrivals' | 'nights';
  selectedNuts: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    const indCode = volumeMetric === 'arrivals' ? IND.ARRIVALS_TOTAL : IND.NIGHTS_TOTAL;
    return NUTS3_CODES
      .filter(code => index.has(code))
      .map(code => {
        const byInd = index.get(code)?.get(indCode);
        const total = byInd
          ? periods.reduce((acc, p) => acc + (byInd.get(p) ?? 0), 0)
          : 0;
        return { code, name: NUTS_EN[code] ?? code, total };
      })
      .filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [index, periods, volumeMetric]);

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const metricLabel = isBg
      ? (volumeMetric === 'arrivals' ? 'Пристигания' : 'Нощувки')
      : (volumeMetric === 'arrivals' ? 'Arrivals' : 'Nights');

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          const p = params[0];
          const d = chartData[p.dataIndex];
          if (!d) return '';
          return `<div style="font-weight:600">${d.name}</div>
            <div style="color:#64748b;font-size:11px;margin-bottom:4px">${d.code}</div>
            <div>${metricLabel}: <b>${fmtNum(d.total)}</b></div>`;
        },
      },
      grid: { left: '1%', right: '14%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtNum(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      yAxis: {
        type: 'category',
        data: chartData.map(d => d.name),
        axisLabel: { fontSize: 11, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        inverse: false,
      },
      series: [
        {
          type: 'bar',
          data: chartData.map(d => ({
            value: d.total,
            itemStyle: {
              color: d.code === selectedNuts ? '#f97316' : '#3b82f6',
              borderRadius: [0, 4, 4, 0],
              opacity: d.code === selectedNuts ? 1 : 0.8,
            },
          })),
          barMaxWidth: 26,
          label: {
            show: true,
            position: 'right',
            fontSize: 10,
            fontWeight: 'bold',
            color: '#334155',
            formatter: (p: any) => fmtNum(p.value),
          },
          emphasis: { itemStyle: { opacity: 1 } },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, selectedNuts, isBg, volumeMetric]);

  const chartHeight = Math.max(320, chartData.length * 28 + 60);
  return <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart D — Scatter: Bed-places vs Revenue per district
// ══════════════════════════════════════════════════════════════════════════════

function CapacityRevenueScatter({ index, periods, isBg }: {
  index: DataIndex;
  periods: string[];
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const scatterData = useMemo(() => {
    return NUTS3_CODES
      .filter(code => index.has(code))
      .map(code => {
        const byNuts  = index.get(code)!;
        const beds    = periods.reduce((acc, p) => acc + (byNuts.get(IND.BED_PLACES)?.get(p) ?? 0), 0);
        const revenue = periods.reduce((acc, p) => acc + (byNuts.get(IND.REVENUE_TOTAL)?.get(p) ?? 0), 0);
        return { code, name: NUTS_EN[code] ?? code, beds, revenue };
      })
      .filter(d => d.beds > 0 && d.revenue > 0);
  }, [index, periods]);

  useEffect(() => {
    if (!chartRef.current || scatterData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        ...tooltipStyle(),
        formatter: (params: any) => {
          const d = scatterData[params.dataIndex];
          if (!d) return '';
          return `<div style="font-weight:600">${d.name}</div>
            <div style="color:#64748b;font-size:11px;margin-bottom:4px">${d.code}</div>
            <div>${isBg ? 'Леглова база' : 'Bed-places'}: <b>${fmtNum(d.beds)}</b></div>
            <div>${isBg ? 'Приходи' : 'Revenue'}: <b>${fmtBGN(d.revenue)}</b></div>`;
        },
      },
      grid: { left: '1%', right: '5%', bottom: '12%', top: '8%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? 'Леглова база (сума)' : 'Bed-places (sum)',
        nameLocation: 'middle',
        nameGap: 32,
        nameTextStyle: { fontSize: 11, color: '#64748b' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtNum(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'Приходи (BGN)' : 'Revenue (BGN)',
        nameLocation: 'middle',
        nameGap: 64,
        nameTextStyle: { fontSize: 11, color: '#64748b' },
        axisLabel: {
          fontSize: 10, color: '#94a3b8',
          formatter: (v: number) => fmtBGN(v).replace(' BGN', ''),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: [
        {
          type: 'scatter',
          data: scatterData.map(d => [d.beds, d.revenue]),
          symbolSize: 16,
          itemStyle: { color: '#6366f1', opacity: 0.72, borderColor: '#fff', borderWidth: 2 },
          emphasis: {
            itemStyle: { color: '#f97316', opacity: 1, borderWidth: 2 },
            label: {
              show: true,
              position: 'top',
              fontSize: 11,
              fontWeight: 'bold',
              color: '#1e293b',
              formatter: (params: any) => scatterData[params.dataIndex]?.name ?? '',
            },
          },
          label: {
            show: true,
            position: 'top',
            fontSize: 9,
            color: '#64748b',
            formatter: (params: any) => scatterData[params.dataIndex]?.code ?? '',
          },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [scatterData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '440px' }} />;
}
