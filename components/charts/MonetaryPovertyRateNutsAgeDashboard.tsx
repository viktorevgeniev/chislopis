'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// Macro-region parent for each district
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

// Age group constants
const AGE_CODES = ['0', '13', '3'] as const;
const AGE_EN: Record<string, string> = { '0': 'Total', '13': 'Under 65', '3': '65 and over' };
const AGE_BG: Record<string, string> = { '0': 'Общо', '13': 'Под 65 г.', '3': '65 и над' };
const AGE_COLORS: Record<string, string> = { '0': '#6366f1', '13': '#10b981', '3': '#f59e0b' };

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// Detect which column holds the numeric value (PovertyRate, Ratio, Rate, etc.)
function detectValueCol(data: any[]): string {
  const row = data[0];
  if (!row) return 'PovertyRate';
  const skip = new Set(['NUTS', 'NUTS_Code', 'SILC_Age', 'SILC_Age_Code', 'Year', '_revision']);
  for (const k of Object.keys(row)) {
    if (!skip.has(k) && (typeof row[k] === 'number' || (typeof row[k] === 'string' && !isNaN(parseFloat(row[k]))))) {
      return k;
    }
  }
  return 'PovertyRate';
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

export function MonetaryPovertyRateNutsAgeDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  const { allYears, latestYear, firstYear, valueCol } = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => { if (d.Year) years.add(String(d.Year)); });
    const sorted = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    return {
      allYears: sorted,
      latestYear: sorted[sorted.length - 1] ?? '',
      firstYear: sorted[0] ?? '',
      valueCol: detectValueCol(data),
    };
  }, [data]);

  // Build index: nutsCode → ageCode → year → value
  const index = useMemo(() => {
    const map = new Map<string, Map<string, Map<string, number>>>();
    for (const row of data) {
      const nutsCode: string = row.NUTS_Code ?? row.NUTS ?? '';
      const ageCode: string = String(row.SILC_Age_Code ?? '0');
      const year: string = String(row.Year ?? '');
      const val = getVal(row, valueCol);
      if (!nutsCode || !year || val == null) continue;
      if (!map.has(nutsCode)) map.set(nutsCode, new Map());
      const ageMap = map.get(nutsCode)!;
      if (!ageMap.has(ageCode)) ageMap.set(ageCode, new Map());
      ageMap.get(ageCode)!.set(year, val);
    }
    return map;
  }, [data, valueCol]);

  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const national = index.get('BG');
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const totalRate = national?.get('0')?.get(latestYear) ?? null;
    const prevRate = prevYear ? (national?.get('0')?.get(prevYear) ?? null) : null;
    const under65Rate = national?.get('13')?.get(latestYear) ?? null;
    const over65Rate = national?.get('3')?.get(latestYear) ?? null;
    const yoy = totalRate != null && prevRate != null ? totalRate - prevRate : null;

    // Find highest/lowest districts for latest year (Total age)
    const districts = Object.keys(DISTRICT_PARENT);
    let highest: { code: string; rate: number } | null = null;
    let lowest: { code: string; rate: number } | null = null;
    for (const code of districts) {
      const rate = index.get(code)?.get('0')?.get(latestYear) ?? null;
      if (rate == null) continue;
      if (!highest || rate > highest.rate) highest = { code, rate };
      if (!lowest || rate < lowest.rate) lowest = { code, rate };
    }

    return { totalRate, under65Rate, over65Rate, yoy, latestYear, highest, lowest };
  }, [index, latestYear, allYears]);

  if (!data || data.length === 0 || !kpi) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Парична бедност по региони и възрастови групи'
            : 'Monetary Poverty Rate by Region and Age Group'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Дял на лицата под прага на бедност по NUTS региони и възрастови групи (%)`
            : `Annual data (${firstYear}–${latestYear}) | Share of persons below poverty threshold by NUTS region and age group (%)`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Национален дял (%)' : 'National rate (%)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-indigo-600">
              {kpi.totalRate != null ? `${kpi.totalRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{isBg ? 'Общо население' : 'Total population'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.yoy != null && (
                <span className={`text-[10px] font-semibold ${kpi.yoy <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.yoy <= 0 ? '▼' : '▲'} {Math.abs(kpi.yoy).toFixed(1)}pp YoY
                </span>
              )}
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Под 65 / 65 и над' : 'Under 65 / 65 and over'}
            </p>
            <div className="flex items-end gap-3 mt-2">
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {kpi.under65Rate != null ? `${kpi.under65Rate.toFixed(1)}%` : '—'}
                </p>
                <p className="text-[11px] text-slate-400">{isBg ? 'Под 65 г.' : 'Under 65'}</p>
              </div>
              <span className="text-slate-300 text-xl mb-1">/</span>
              <div>
                <p className="text-2xl font-bold text-amber-500">
                  {kpi.over65Rate != null ? `${kpi.over65Rate.toFixed(1)}%` : '—'}
                </p>
                <p className="text-[11px] text-slate-400">{isBg ? '65 и над' : '65 and over'}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-засегнат район' : 'Highest poverty district'}
            </p>
            {kpi.highest ? (
              <>
                <p className="text-2xl font-bold mt-2 text-red-500">
                  {kpi.highest.rate.toFixed(1)}%
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {regionName(kpi.highest.code, isBg)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">{kpi.highest.code} · {kpi.latestYear}</p>
              </>
            ) : <p className="text-2xl font-bold mt-2 text-slate-400">—</p>}
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-нисък дял' : 'Lowest poverty district'}
            </p>
            {kpi.lowest ? (
              <>
                <p className="text-2xl font-bold mt-2 text-emerald-600">
                  {kpi.lowest.rate.toFixed(1)}%
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {regionName(kpi.lowest.code, isBg)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">{kpi.lowest.code} · {kpi.latestYear}</p>
              </>
            ) : <p className="text-2xl font-bold mt-2 text-slate-400">—</p>}
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="trends">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="trends">
              {isBg ? 'Динамика по възраст' : 'Age Trends'}
            </TabsTrigger>
            <TabsTrigger value="regional">
              {isBg ? 'Регионално сравнение' : 'Regional Comparison'}
            </TabsTrigger>
            <TabsTrigger value="volatility">
              {isBg ? 'Регионална волатилност' : 'Regional Volatility'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                {isBg
                  ? 'А. Динамика на паричната бедност по възрастови групи (национално ниво)'
                  : 'A. Monetary Poverty Rate Trends by Age Group (national level)'}
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                {isBg
                  ? `${firstYear}–${latestYear} | % от съответното население`
                  : `${firstYear}–${latestYear} | % of respective population`}
              </p>
              <AgeTrendChart index={index} allYears={allYears} isBg={isBg} />
            </div>
          </TabsContent>

          <TabsContent value="regional">
            <RegionalBarSection
              index={index}
              allYears={allYears}
              isBg={isBg}
              firstYear={firstYear}
              latestYear={latestYear}
            />
          </TabsContent>

          <TabsContent value="volatility">
            <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                {isBg
                  ? 'В. Регионална волатилност на паричната бедност'
                  : 'C. Regional Volatility in Monetary Poverty Rates'}
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                {isBg
                  ? `Стандартно отклонение за ${firstYear}–${latestYear} | По-голяма стойност = по-нестабилни нива на бедност`
                  : `Standard deviation over ${firstYear}–${latestYear} | Larger value = more volatile poverty levels`}
              </p>
              <VolatilityChart index={index} isBg={isBg} />
            </div>
          </TabsContent>
        </Tabs>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-line temporal trends by age group (national BG level)
// ══════════════════════════════════════════════════════════════════════════════

function AgeTrendChart({
  index,
  allYears,
  isBg,
}: {
  index: Map<string, Map<string, Map<string, number>>>;
  allYears: string[];
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => (
    AGE_CODES.map(code => ({
      code,
      label: isBg ? AGE_BG[code] : AGE_EN[code],
      color: AGE_COLORS[code],
      values: allYears.map(yr => index.get('BG')?.get(code)?.get(yr) ?? null),
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
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)}%</span>
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
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
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
        name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
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
        lineStyle: { width: s.code === '0' ? 3 : 2, color: s.color },
        smooth: true,
        symbol: 'circle',
        symbolSize: s.code === '0' ? 7 : 5,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Horizontal bar: regional comparison with year selector
// ══════════════════════════════════════════════════════════════════════════════

function RegionalBarSection({
  index,
  allYears,
  isBg,
  latestYear,
}: {
  index: Map<string, Map<string, Map<string, number>>>;
  allYears: string[];
  isBg: boolean;
  firstYear: string;
  latestYear: string;
}) {
  const [selectedYear, setSelectedYear] = useState(latestYear);

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg
            ? 'Б. Регионално сравнение — класация по дял на паричната бедност'
            : 'B. Regional Ranking — Monetary Poverty Rate'}
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">{isBg ? 'Година:' : 'Year:'}</label>
          <Select
            value={selectedYear || latestYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="text-xs py-1 px-2 h-8 w-24"
          >
            {[...allYears].reverse().map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isBg
          ? 'Дял под прага на парична бедност (%) по области (NUTS 3), сортирани низходящо'
          : 'Share below monetary poverty threshold (%) by district (NUTS 3), sorted descending'}
      </p>
      <RegionalBarChart index={index} year={selectedYear || latestYear} isBg={isBg} />
    </div>
  );
}

function RegionalBarChart({
  index,
  year,
  isBg,
}: {
  index: Map<string, Map<string, Map<string, number>>>;
  year: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    const districts = Object.keys(DISTRICT_PARENT);
    const rows: Array<{ code: string; label: string; rate: number; color: string }> = [];
    for (const code of districts) {
      const rate = index.get(code)?.get('0')?.get(year) ?? null;
      if (rate == null) continue;
      const parent = DISTRICT_PARENT[code] ?? 'BG31';
      rows.push({ code, label: regionName(code, isBg), rate, color: MACRO_COLORS[parent] });
    }
    return rows.sort((a, b) => b.rate - a.rate);
  }, [index, year, isBg]);

  const nationalRate = index.get('BG')?.get('0')?.get(year) ?? null;
  const chartHeight = Math.max(360, chartData.length * 28 + 60);

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const code = chartData[p.dataIndex]?.code ?? '';
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.name}</div>
            <div style="color:#64748b;font-size:11px;margin-bottom:2px">${code}</div>
            <div>${isBg ? 'Парична бедност' : 'Monetary poverty rate'}: <b>${p.value != null ? Number(p.value).toFixed(1) + '%' : '—'}</b></div>`;
        },
      },
      grid: { left: '1%', right: '14%', top: '4%', bottom: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? '% от населението' : '% of population',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
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
          data: chartData.map(d => ({
            value: d.rate,
            itemStyle: { color: d.color, borderRadius: [0, 4, 4, 0], opacity: 0.85 },
          })),
          barMaxWidth: 28,
          label: {
            show: true,
            position: 'right' as const,
            fontSize: 11,
            fontWeight: 'bold' as const,
            color: '#334155',
            formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
          },
          emphasis: { itemStyle: { opacity: 1 } },
          ...(nationalRate != null ? {
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { type: 'dashed', color: '#1e293b', width: 2 },
              label: {
                show: true,
                position: 'end',
                formatter: isBg
                  ? `Национален\n${nationalRate.toFixed(1)}%`
                  : `National\n${nationalRate.toFixed(1)}%`,
                fontSize: 10,
                color: '#1e293b',
                fontWeight: 'bold',
              },
              data: [{ xAxis: nationalRate }],
            },
          } : {}),
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, year, isBg, nationalRate]);

  return <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Regional volatility: std deviation per district across all years
// ══════════════════════════════════════════════════════════════════════════════

function VolatilityChart({
  index,
  isBg,
}: {
  index: Map<string, Map<string, Map<string, number>>>;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const volatilityData = useMemo(() => {
    const districts = Object.keys(DISTRICT_PARENT);
    const items: Array<{
      code: string;
      name: string;
      mean: number;
      stdDev: number;
      min: number;
      max: number;
    }> = [];

    for (const code of districts) {
      const yearMap = index.get(code)?.get('0');
      if (!yearMap) continue;
      const values = Array.from(yearMap.values());
      if (values.length < 2) continue;
      const n = values.length;
      const mean = values.reduce((s, v) => s + v, 0) / n;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
      const stdDev = Math.sqrt(variance);
      items.push({
        code,
        name: regionName(code, isBg),
        mean,
        stdDev,
        min: Math.min(...values),
        max: Math.max(...values),
      });
    }

    return items.sort((a, b) => b.stdDev - a.stdDev);
  }, [index, isBg]);

  const chartHeight = Math.max(360, volatilityData.length * 28 + 60);

  useEffect(() => {
    if (!chartRef.current || volatilityData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const item = volatilityData[p.dataIndex];
          if (!item) return '';
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${item.name}</div>
            <div style="color:#64748b;font-size:11px;margin-bottom:4px">${item.code}</div>
            <div>${isBg ? 'Ст. отклонение' : 'Std. deviation'}: <b>${item.stdDev.toFixed(2)}pp</b></div>
            <div>${isBg ? 'Средна стойност' : 'Mean'}: <b>${item.mean.toFixed(1)}%</b></div>
            <div>${isBg ? 'Диапазон' : 'Range'}: <b>${item.min.toFixed(1)}% – ${item.max.toFixed(1)}%</b></div>`;
        },
      },
      grid: { left: '1%', right: '14%', top: '4%', bottom: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? 'Стандартно отклонение (pp)' : 'Standard Deviation (pp)',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      yAxis: {
        type: 'category',
        data: volatilityData.map(i => i.name),
        axisLabel: { fontSize: 11, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        inverse: false,
      },
      series: [
        {
          type: 'bar' as const,
          data: volatilityData.map(i => ({
            value: parseFloat(i.stdDev.toFixed(2)),
            itemStyle: {
              color: i.stdDev > 2.5 ? '#f87171' : i.stdDev > 1.5 ? '#fb923c' : '#34d399',
              borderRadius: [0, 4, 4, 0],
              opacity: 0.88,
            },
          })),
          barMaxWidth: 28,
          label: {
            show: true,
            position: 'right' as const,
            fontSize: 11,
            fontWeight: 'bold' as const,
            color: '#334155',
            formatter: (p: any) => p.value != null ? Number(p.value).toFixed(2) + 'pp' : '',
          },
          emphasis: { itemStyle: { opacity: 1 } },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [volatilityData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />;
}
