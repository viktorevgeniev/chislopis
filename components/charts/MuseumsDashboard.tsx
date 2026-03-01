'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── NUTS name dictionaries ─────────────────────────────────────────────────────
const NUTS_EN: Record<string, string> = {
  BG: 'Total for the country',
  BG3: 'North and South-East Bulgaria',
  BG4: 'South-West and Central South Bulgaria',
  BG31: 'Severozapaden',
  BG311: 'Vidin', BG312: 'Montana', BG313: 'Vratsa', BG314: 'Pleven', BG315: 'Lovech',
  BG32: 'Severen tsentralen',
  BG321: 'Veliko Tarnovo', BG322: 'Gabrovo', BG323: 'Ruse', BG324: 'Razgrad', BG325: 'Silistra',
  BG33: 'Severoiztochen',
  BG331: 'Varna', BG332: 'Dobrich', BG333: 'Shumen', BG334: 'Targovishte',
  BG34: 'Yugoiztochen',
  BG341: 'Burgas', BG342: 'Sliven', BG343: 'Yambol', BG344: 'Stara Zagora',
  BG41: 'Yugozapaden',
  BG411: 'Sofia-grad', BG412: 'Sofia', BG413: 'Blagoevgrad', BG414: 'Pernik', BG415: 'Kyustendil',
  BG42: 'Yuzhen tsentralen',
  BG421: 'Plovdiv', BG422: 'Haskovo', BG423: 'Pazardzhik', BG424: 'Smolyan', BG425: 'Kardzhali',
};

const NUTS_BG: Record<string, string> = {
  BG: 'Общо за страната',
  BG3: 'Северна и Югоизточна България',
  BG4: 'Югозападна и Южна централна България',
  BG31: 'Северозападен',
  BG311: 'Видин', BG312: 'Монтана', BG313: 'Враца', BG314: 'Плевен', BG315: 'Ловеч',
  BG32: 'Северен централен',
  BG321: 'Велико Търново', BG322: 'Габрово', BG323: 'Русе', BG324: 'Разград', BG325: 'Силистра',
  BG33: 'Североизточен',
  BG331: 'Варна', BG332: 'Добрич', BG333: 'Шумен', BG334: 'Търговище',
  BG34: 'Югоизточен',
  BG341: 'Бургас', BG342: 'Сливен', BG343: 'Ямбол', BG344: 'Стара Загора',
  BG41: 'Югозападен',
  BG411: 'София (столица)', BG412: 'София', BG413: 'Благоевград', BG414: 'Перник', BG415: 'Кюстендил',
  BG42: 'Южен централен',
  BG421: 'Пловдив', BG422: 'Хасково', BG423: 'Пазарджик', BG424: 'Смолян', BG425: 'Кърджали',
};

const NUTS3_CODES = [
  'BG311', 'BG312', 'BG313', 'BG314', 'BG315',
  'BG321', 'BG322', 'BG323', 'BG324', 'BG325',
  'BG331', 'BG332', 'BG333', 'BG334',
  'BG341', 'BG342', 'BG343', 'BG344',
  'BG411', 'BG412', 'BG413', 'BG414', 'BG415',
  'BG421', 'BG422', 'BG423', 'BG424', 'BG425',
];

// Muz_Measure codes
const MUZ = { MUSEUMS: '1', VISITS: '2', EXHIBITS: '3' } as const;

// ── Types ─────────────────────────────────────────────────────────────────────
// nutsCode → measureCode → year → value
type DataIndex = Map<string, Map<string, Map<string, number>>>;

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════

export function MuseumsDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  // Build 3-level index: nutsCode → measureCode → year → value
  const index = useMemo<DataIndex>(() => {
    const map: DataIndex = new Map();
    for (const row of data) {
      const nutsCode = String(row.NUTS_Code ?? row.NUTS ?? '');
      const measCode = String(row.Muz_Measure_Code ?? '');
      const year     = String(row.Year ?? '');
      const val      = getVal(row, 'Count');
      if (!nutsCode || !measCode || !year || val == null) continue;
      if (!map.has(nutsCode)) map.set(nutsCode, new Map());
      const byNuts = map.get(nutsCode)!;
      if (!byNuts.has(measCode)) byNuts.set(measCode, new Map());
      byNuts.get(measCode)!.set(year, val);
    }
    return map;
  }, [data]);

  const allYears = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) { if (row.Year) s.add(String(row.Year)); }
    return [...s].sort();
  }, [data]);

  const latestYear = allYears[allYears.length - 1] ?? '';
  const firstYear  = allYears[0] ?? '';

  const [yearFilter, setYearFilter] = useState<string>('');
  const selectedYear = yearFilter || latestYear;

  const nutsName = (code: string) => (isBg ? NUTS_BG[code] : NUTS_EN[code]) ?? code;

  // KPI: latest year, country total
  const kpi = useMemo(() => {
    const byBG = index.get('BG');
    const get = (meas: string) => byBG?.get(meas)?.get(latestYear) ?? null;
    return { museums: get(MUZ.MUSEUMS), visits: get(MUZ.VISITS), exhibits: get(MUZ.EXHIBITS) };
  }, [index, latestYear]);

  if (!data || data.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No data available</div>;
  }

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg ? 'Музеи — Експонати и Посещения' : 'Museums — Exhibits and Visits'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Музеи, посещения и експонати по области`
            : `Annual data (${firstYear}–${latestYear}) | Museums, visits and exhibits by districts`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-4 items-center bg-white shadow-sm rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">
              {isBg ? 'Година (карти Б и В):' : 'Year (charts B & C):'}
            </label>
            <Select value={selectedYear} onChange={e => setYearFilter(e.target.value)} className="text-xs h-8 w-24">
              {[...allYears].reverse().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Музеи' : 'Museums'}
            </p>
            <p className="text-2xl font-bold mt-2 text-indigo-600">
              {kpi.museums != null ? fmtNum(kpi.museums) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? `Общо за страната, ${latestYear}` : `Total for the country, ${latestYear}`}
            </p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Посещения' : 'Visits'}
            </p>
            <p className="text-2xl font-bold mt-2 text-emerald-600">
              {kpi.visits != null ? fmtNum(kpi.visits) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? `Общо за страната, ${latestYear}` : `Total for the country, ${latestYear}`}
            </p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Експонати' : 'Exhibits'}
            </p>
            <p className="text-2xl font-bold mt-2 text-amber-500">
              {kpi.exhibits != null ? fmtNum(kpi.exhibits) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? `Общо за страната, ${latestYear}` : `Total for the country, ${latestYear}`}
            </p>
          </div>
        </div>

        {/* ── Chart A: National time-series ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Национална динамика — Посещения, Експонати и Музеи' : 'A. National Trend — Visits, Exhibits and Museums'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Общо за страната | Посещения и Експонати (лява ос) · Музеи (дясна ос)'
              : 'Total for the country | Visits and Exhibits (left axis) · Museums (right axis)'}
          </p>
          <TrendLineChart index={index} years={allYears} isBg={isBg} />
        </div>

        {/* ── Chart B: Regional bar — visits by district ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Регионално разпределение — Посещения по области (${selectedYear})`
              : `B. Regional Distribution — Visits by Districts (${selectedYear})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Области (NUTS 3) | Низходящо' : 'Districts (NUTS 3) | Sorted descending'}
          </p>
          <RegionalBarChart index={index} year={selectedYear} isBg={isBg} nutsName={nutsName} />
        </div>

        {/* ── Chart C: Scatter — Museums vs Visits, size = Exhibits ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `В. Корелация — Брой Музеи vs. Посещения (${selectedYear})`
              : `C. Correlation — Number of Museums vs. Visits (${selectedYear})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'X-ос: Брой музеи | Y-ос: Посещения | Размер на точката: Брой експонати | Всяка точка = Област'
              : 'X-axis: Number of museums | Y-axis: Visits | Dot size: Exhibits stock | Each dot = District'}
          </p>
          <MuseumScatterChart index={index} year={selectedYear} isBg={isBg} nutsName={nutsName} />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-line time series: Visits + Exhibits (left Y) + Museums (right Y)
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ index, years, isBg }: {
  index: DataIndex;
  years: string[];
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    const byBG = index.get('BG');
    return {
      visits:   years.map(y => byBG?.get(MUZ.VISITS)?.get(y)   ?? null),
      exhibits: years.map(y => byBG?.get(MUZ.EXHIBITS)?.get(y) ?? null),
      museums:  years.map(y => byBG?.get(MUZ.MUSEUMS)?.get(y)  ?? null),
    };
  }, [index, years]);

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
              <span style="font-weight:600;margin-left:8px">${fmtNum(p.value)}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [
          isBg ? 'Посещения' : 'Visits',
          isBg ? 'Експонати' : 'Exhibits',
          isBg ? 'Музеи' : 'Museums',
        ],
        bottom: '5%',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '1%', bottom: '18%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: years,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: isBg ? 'Брой' : 'Count',
          nameTextStyle: { fontSize: 10, color: '#94a3b8' },
          axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtNum(v) },
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
          axisLine: { show: false },
          axisTick: { show: false },
          min: 0,
        },
        {
          type: 'value',
          name: isBg ? 'Музеи' : 'Museums',
          nameTextStyle: { fontSize: 10, color: '#a78bfa' },
          axisLabel: { fontSize: 10, color: '#a78bfa' },
          splitLine: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          min: 0,
        },
      ],
      series: [
        {
          name: isBg ? 'Посещения' : 'Visits',
          type: 'line',
          yAxisIndex: 0,
          data: seriesData.visits,
          itemStyle: { color: '#22c55e' },
          lineStyle: { width: 2.5, color: '#22c55e' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          connectNulls: true,
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(34,197,94,0.15)' },
                { offset: 1, color: 'rgba(34,197,94,0)' },
              ],
            },
          },
        },
        {
          name: isBg ? 'Експонати' : 'Exhibits',
          type: 'line',
          yAxisIndex: 0,
          data: seriesData.exhibits,
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 2.5, color: '#f59e0b' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          connectNulls: true,
        },
        {
          name: isBg ? 'Музеи' : 'Museums',
          type: 'line',
          yAxisIndex: 1,
          data: seriesData.museums,
          itemStyle: { color: '#818cf8' },
          lineStyle: { width: 2, color: '#818cf8', type: 'dashed' },
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
  }, [seriesData, years, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Horizontal bar: Visits by NUTS 3 district for a given year
// ══════════════════════════════════════════════════════════════════════════════

function RegionalBarChart({ index, year, isBg, nutsName }: {
  index: DataIndex;
  year: string;
  isBg: boolean;
  nutsName: (code: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    return NUTS3_CODES
      .map(code => ({
        code,
        name:     nutsName(code),
        visits:   index.get(code)?.get(MUZ.VISITS)?.get(year)   ?? 0,
        museums:  index.get(code)?.get(MUZ.MUSEUMS)?.get(year)  ?? 0,
        exhibits: index.get(code)?.get(MUZ.EXHIBITS)?.get(year) ?? 0,
      }))
      .filter(d => d.visits > 0)
      .sort((a, b) => b.visits - a.visits);
  }, [index, year, nutsName]);

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          const d = chartData[params[0].dataIndex];
          if (!d) return '';
          return `<div style="font-weight:600">${d.name}</div>
            <div style="color:#64748b;font-size:11px;margin-bottom:4px">${d.code}</div>
            <div>${isBg ? 'Посещения' : 'Visits'}: <b>${fmtNum(d.visits)}</b></div>
            <div>${isBg ? 'Музеи' : 'Museums'}: <b>${d.museums}</b></div>
            <div>${isBg ? 'Експонати' : 'Exhibits'}: <b>${fmtNum(d.exhibits)}</b></div>`;
        },
      },
      grid: { left: '1%', right: '12%', bottom: '4%', top: '4%', containLabel: true },
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
      },
      series: [
        {
          type: 'bar',
          data: chartData.map(d => ({
            value: d.visits,
            itemStyle: { color: '#22c55e', borderRadius: [0, 4, 4, 0], opacity: 0.85 },
          })),
          barMaxWidth: 22,
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
  }, [chartData, isBg]);

  const chartHeight = Math.max(320, chartData.length * 28 + 60);
  return <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Scatter: Museums (X) vs Visits (Y), size = Exhibits
// ══════════════════════════════════════════════════════════════════════════════

function MuseumScatterChart({ index, year, isBg, nutsName }: {
  index: DataIndex;
  year: string;
  isBg: boolean;
  nutsName: (code: string) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const scatterData = useMemo(() => {
    return NUTS3_CODES
      .map(code => ({
        code,
        name:     nutsName(code),
        museums:  index.get(code)?.get(MUZ.MUSEUMS)?.get(year)  ?? 0,
        visits:   index.get(code)?.get(MUZ.VISITS)?.get(year)   ?? 0,
        exhibits: index.get(code)?.get(MUZ.EXHIBITS)?.get(year) ?? 0,
      }))
      .filter(d => d.museums > 0 && d.visits > 0);
  }, [index, year, nutsName]);

  useEffect(() => {
    if (!chartRef.current || scatterData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const maxExhibits = Math.max(...scatterData.map(d => d.exhibits), 1);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        ...tooltipStyle(),
        formatter: (params: any) => {
          const d = scatterData[params.dataIndex];
          if (!d) return '';
          return `<div style="font-weight:600">${d.name}</div>
            <div style="color:#64748b;font-size:11px;margin-bottom:4px">${d.code}</div>
            <div>${isBg ? 'Музеи' : 'Museums'}: <b>${d.museums}</b></div>
            <div>${isBg ? 'Посещения' : 'Visits'}: <b>${fmtNum(d.visits)}</b></div>
            <div>${isBg ? 'Експонати' : 'Exhibits'}: <b>${fmtNum(d.exhibits)}</b></div>`;
        },
      },
      grid: { left: '1%', right: '5%', bottom: '12%', top: '8%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? 'Брой музеи' : 'Number of Museums',
        nameLocation: 'middle',
        nameGap: 32,
        nameTextStyle: { fontSize: 11, color: '#64748b' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'Посещения' : 'Visits',
        nameLocation: 'middle',
        nameGap: 64,
        nameTextStyle: { fontSize: 11, color: '#64748b' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtNum(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: [
        {
          type: 'scatter',
          data: scatterData.map(d => [d.museums, d.visits]),
          symbolSize: (_val: any, params: any) => {
            const d = scatterData[params.dataIndex];
            if (!d || maxExhibits === 0) return 12;
            return Math.max(10, Math.sqrt(d.exhibits / maxExhibits) * 52);
          },
          itemStyle: { color: '#6366f1', opacity: 0.72, borderColor: '#fff', borderWidth: 2 },
          emphasis: {
            itemStyle: { color: '#f97316', opacity: 1 },
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
