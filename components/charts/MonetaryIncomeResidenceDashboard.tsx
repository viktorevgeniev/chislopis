'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import type { Dataset } from '@/types/dataset';

// ── Types ──────────────────────────────────────────────────────────────────────

// measure → pdCode → residence → year → value
type DataIndex = Map<string, Map<string, Map<string, Map<string, number>>>>;

interface CatDef {
  code: string;
  en: string;
  bg: string;
  color: string;
}

// ── Income category definitions ────────────────────────────────────────────────

const TOP_CATS: CatDef[] = [
  { code: '1',  en: 'Total Monetary Income',        bg: 'Общо парични доходи',              color: '#0ea5e9' },
  { code: '11', en: 'Monetary Gross Income',         bg: 'Брутен паричен доход',             color: '#10b981' },
  { code: '12', en: 'Receipts from Sales',           bg: 'Постъпления от продажби',          color: '#f59e0b' },
  { code: '13', en: 'Miscellaneous',                 bg: 'Разни',                            color: '#64748b' },
];

const DETAIL_CATS: CatDef[] = [
  { code: '111', en: 'Wages & Salaries',             bg: 'Заплати',                          color: '#3b82f6' },
  { code: '112', en: 'Other Earnings',               bg: 'Други трудови доходи',             color: '#8b5cf6' },
  { code: '113', en: 'Self-employment Income',       bg: 'Самонаети доходи',                 color: '#f97316' },
  { code: '114', en: 'Property Income',              bg: 'Доходи от собственост',            color: '#14b8a6' },
  { code: '115', en: 'Pensions',                     bg: 'Пенсии',                           color: '#ef4444' },
  { code: '116', en: 'Unemployment Benefits',        bg: 'Обезщетения за безработица',       color: '#6366f1' },
  { code: '117', en: 'Family Allowances',            bg: 'Семейни помощи',                   color: '#ec4899' },
  { code: '118', en: 'Other Social Benefits',        bg: 'Други социални помощи',            color: '#94a3b8' },
  { code: '119', en: 'Transfers from Households',   bg: 'Трансфери от домакинства',         color: '#84cc16' },
];

const CAT_MAP: Record<string, CatDef> = Object.fromEntries(
  [...TOP_CATS, ...DETAIL_CATS].map(c => [c.code, c])
);

const RESIDENCE_EN: Record<string, string> = { '0': 'Total', '1': 'Urban', '2': 'Rural' };
const RESIDENCE_BG: Record<string, string> = { '0': 'Общо', '1': 'Градско', '2': 'Селско' };
const RESIDENCE_COLORS: Record<string, string> = { '0': '#0ea5e9', '1': '#3b82f6', '2': '#10b981' };

const MEASURE_EN: Record<string, string> = {
  '1': 'Avg per Household (BGN)',
  '2': 'Avg per Capita (BGN)',
  '3': 'Structure (%)',
};
const MEASURE_BG: Record<string, string> = {
  '1': 'Средно на домакинство (лв.)',
  '2': 'Средно на лице (лв.)',
  '3': 'Структура (%)',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseValue(v: any): number | null {
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

function buildIndex(data: any[]): DataIndex {
  const idx: DataIndex = new Map();
  for (const row of data) {
    const measure = String(row.HBS_Meassure_Code ?? row.HBS_Meassure ?? '');
    const pdCode  = String(row.HBS_PD_Code ?? row.HBS_PD ?? '');
    const res     = String(row.Residence_Code ?? '');
    const yr      = String(row.Year ?? '');
    const val     = parseValue(row.Amount ?? row.ValueColumn);
    if (!measure || !pdCode || !res || !yr || val == null) continue;
    if (!idx.has(measure)) idx.set(measure, new Map());
    const mMap = idx.get(measure)!;
    if (!mMap.has(pdCode)) mMap.set(pdCode, new Map());
    const pdMap = mMap.get(pdCode)!;
    if (!pdMap.has(res)) pdMap.set(res, new Map());
    pdMap.get(res)!.set(yr, val);
  }
  return idx;
}

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

function fmtNum(v: number | null, decimals = 0): string {
  return v != null ? v.toLocaleString('bg-BG', { maximumFractionDigits: decimals }) : '—';
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

export function MonetaryIncomeResidenceDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  const { allYears, latestYear, firstYear, idx } = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => { if (d.Year) years.add(String(d.Year)); });
    const sorted = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    return {
      allYears: sorted,
      latestYear: sorted[sorted.length - 1] ?? '',
      firstYear: sorted[0] ?? '',
      idx: buildIndex(data),
    };
  }, [data]);

  const get = (measure: string, pdCode: string, res: string, yr: string): number | null =>
    idx.get(measure)?.get(pdCode)?.get(res)?.get(yr) ?? null;

  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    const total = get('1', '1', '0', latestYear);
    const urban = get('1', '1', '1', latestYear);
    const rural = get('1', '1', '2', latestYear);
    const totalPrev = prevYear ? get('1', '1', '0', prevYear) : null;
    const yoy = total != null && totalPrev != null && totalPrev > 0
      ? ((total - totalPrev) / totalPrev) * 100 : null;
    const urbanRuralRatio = urban != null && rural != null && rural > 0 ? urban / rural : null;
    const wagesShare = (() => {
      const wages = get('3', '111', '0', latestYear);
      return wages != null ? wages : null;
    })();
    return { total, urban, rural, yoy, urbanRuralRatio, wagesShare };
  }, [idx, latestYear, allYears]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const currency = isBg ? ' лв.' : ' BGN';

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Парични доходи на домакинствата по местоживеене'
            : 'Household Monetary Income by Residence'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | По местоживеене: Общо, Градско, Селско | Три мерки: ср. на домакинство, ср. на лице, структура %`
            : `Annual data (${firstYear}–${latestYear}) | By residence: Total, Urban, Rural | Three measures: per household, per capita, structure %`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        {kpi && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label={isBg ? 'Общо доходи (ср./домакинство)' : 'Total Income (avg/household)'}
              value={fmtNum(kpi.total) + currency}
              sub={kpi.yoy != null ? `${kpi.yoy >= 0 ? '▲' : '▼'} ${Math.abs(kpi.yoy).toFixed(1)}% YoY` : undefined}
              subColor={kpi.yoy != null ? (kpi.yoy >= 0 ? 'text-emerald-600' : 'text-red-500') : undefined}
              year={latestYear}
              accent="sky"
            />
            <KpiCard
              label={isBg ? 'Градско (ср./домакинство)' : 'Urban (avg/household)'}
              value={fmtNum(kpi.urban) + currency}
              year={latestYear}
              accent="blue"
            />
            <KpiCard
              label={isBg ? 'Селско (ср./домакинство)' : 'Rural (avg/household)'}
              value={fmtNum(kpi.rural) + currency}
              year={latestYear}
              accent="green"
            />
            <KpiCard
              label={isBg ? 'Коефициент Градско / Селско' : 'Urban / Rural Ratio'}
              value={kpi.urbanRuralRatio != null ? kpi.urbanRuralRatio.toFixed(2) + '×' : '—'}
              sub={isBg ? 'Градските домакинства печелят повече' : 'Urban households earn more'}
              subColor="text-slate-400"
              year={latestYear}
              accent="amber"
            />
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="trends">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="trends">{isBg ? 'Динамика' : 'Trends'}</TabsTrigger>
            <TabsTrigger value="composition">{isBg ? 'Структура' : 'Composition'}</TabsTrigger>
            <TabsTrigger value="measures">{isBg ? 'Домакинство / Лице' : 'Household vs Capita'}</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsSection idx={idx} allYears={allYears} firstYear={firstYear} latestYear={latestYear} isBg={isBg} />
          </TabsContent>

          <TabsContent value="composition">
            <CompositionSection idx={idx} allYears={allYears} latestYear={latestYear} isBg={isBg} />
          </TabsContent>

          <TabsContent value="measures">
            <MeasuresSection idx={idx} allYears={allYears} latestYear={latestYear} isBg={isBg} />
          </TabsContent>
        </Tabs>

      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

type Accent = 'sky' | 'blue' | 'green' | 'amber';

const ACCENT: Record<Accent, { bg: string; text: string }> = {
  sky:   { bg: 'bg-sky-50',     text: 'text-sky-700' },
  blue:  { bg: 'bg-blue-50',    text: 'text-blue-700' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  amber: { bg: 'bg-amber-50',   text: 'text-amber-700' },
};

function KpiCard({
  label, value, sub, subColor, year, accent,
}: {
  label: string; value: string; sub?: string; subColor?: string;
  year: string; accent: Accent;
}) {
  const cls = ACCENT[accent];
  return (
    <div className={`${cls.bg} rounded-xl p-4`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${cls.text}`}>{value}</p>
      {sub && <p className={`text-[11px] font-semibold mt-1 ${subColor ?? 'text-slate-400'}`}>{sub}</p>}
      <p className="text-[10px] text-slate-400 mt-1">{year}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab A — Time-Series Line Chart: Income Trends Over Years
// ══════════════════════════════════════════════════════════════════════════════

function TrendsSection({
  idx, allYears, firstYear, latestYear, isBg,
}: {
  idx: DataIndex; allYears: string[]; firstYear: string; latestYear: string; isBg: boolean;
}) {
  const [measureCode, setMeasureCode] = useState('1');
  const [catCode, setCatCode] = useState('1');

  const catLabel = isBg ? (CAT_MAP[catCode]?.bg ?? catCode) : (CAT_MAP[catCode]?.en ?? catCode);
  const measureLabel = isBg ? MEASURE_BG[measureCode] : MEASURE_EN[measureCode];

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg ? 'А. Динамика на доходите по години' : 'A. Income Trends Over Years'}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Категория:' : 'Category:'}</label>
            <Select value={catCode} onChange={e => setCatCode(e.target.value)} className="text-xs py-1 px-2 h-8 w-52">
              <optgroup label={isBg ? 'Основни групи' : 'Top-level'}>
                {TOP_CATS.map(c => (
                  <option key={c.code} value={c.code}>{isBg ? c.bg : c.en}</option>
                ))}
              </optgroup>
              <optgroup label={isBg ? 'Детайлни източници' : 'Detailed sources (gross income)'}>
                {DETAIL_CATS.map(c => (
                  <option key={c.code} value={c.code}>{isBg ? c.bg : c.en}</option>
                ))}
              </optgroup>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Мерна единица:' : 'Measure:'}</label>
            <Select value={measureCode} onChange={e => setMeasureCode(e.target.value)} className="text-xs py-1 px-2 h-8 w-48">
              {['1', '2', '3'].map(m => (
                <option key={m} value={m}>{isBg ? MEASURE_BG[m] : MEASURE_EN[m]}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isBg
          ? `${firstYear}–${latestYear} | ${measureLabel} | ${catLabel} | Сравнение по местоживеене`
          : `${firstYear}–${latestYear} | ${measureLabel} | ${catLabel} | Comparison by residence`}
      </p>
      <TrendsChart idx={idx} allYears={allYears} catCode={catCode} measureCode={measureCode} isBg={isBg} />
    </div>
  );
}

function TrendsChart({
  idx, allYears, catCode, measureCode, isBg,
}: {
  idx: DataIndex; allYears: string[]; catCode: string; measureCode: string; isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBGN = measureCode !== '3';
  const unitSuffix = isBGN ? (isBg ? ' лв.' : ' BGN') : '%';

  const seriesData = useMemo(() => (
    ['0', '1', '2'].map(res => ({
      res,
      label: isBg ? RESIDENCE_BG[res] : RESIDENCE_EN[res],
      color: RESIDENCE_COLORS[res],
      values: allYears.map(yr => idx.get(measureCode)?.get(catCode)?.get(res)?.get(yr) ?? null),
    }))
  ), [idx, allYears, catCode, measureCode, isBg]);

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
                <span style="font-weight:600;margin-left:8px">${fmtNum(p.value, isBGN ? 0 : 1)}${unitSuffix}</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: seriesData.map(s => s.label),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '14%', top: '6%', containLabel: true },
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
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => fmtNum(v, 0) + unitSuffix,
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
        lineStyle: { width: 2.5, color: s.color },
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: s.color + '22' },
              { offset: 1, color: s.color + '04' },
            ],
          },
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData, unitSuffix, isBGN]);

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab B — Stacked Bar: Income Composition by Source (Structure %)
// ══════════════════════════════════════════════════════════════════════════════

function CompositionSection({
  idx, allYears, latestYear, isBg,
}: {
  idx: DataIndex; allYears: string[]; latestYear: string; isBg: boolean;
}) {
  const [residenceCode, setResidenceCode] = useState('0');
  const [viewMode, setViewMode] = useState<'stacked-time' | 'grouped-year'>('stacked-time');
  const [compareYear, setCompareYear] = useState(allYears[0] ?? '');

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg ? 'Б. Структура на доходите по източници (%)' : 'B. Income Source Composition (%)'}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Вид:' : 'View:'}</label>
            <Select value={viewMode} onChange={e => setViewMode(e.target.value as any)} className="text-xs py-1 px-2 h-8 w-44">
              <option value="stacked-time">{isBg ? 'Динамика по години' : 'Stacked over time'}</option>
              <option value="grouped-year">{isBg ? 'Сравнение за година' : 'Cross-residence for year'}</option>
            </Select>
          </div>
          {viewMode === 'stacked-time' && (
            <div className="flex items-center gap-1">
              <label className="text-xs text-slate-500">{isBg ? 'Местоживеене:' : 'Residence:'}</label>
              <Select value={residenceCode} onChange={e => setResidenceCode(e.target.value)} className="text-xs py-1 px-2 h-8 w-28">
                {(['0', '1', '2'] as const).map(c => (
                  <option key={c} value={c}>{isBg ? RESIDENCE_BG[c] : RESIDENCE_EN[c]}</option>
                ))}
              </Select>
            </div>
          )}
          {viewMode === 'grouped-year' && (
            <div className="flex items-center gap-1">
              <label className="text-xs text-slate-500">{isBg ? 'Година:' : 'Year:'}</label>
              <Select value={compareYear || latestYear} onChange={e => setCompareYear(e.target.value)} className="text-xs py-1 px-2 h-8 w-24">
                {[...allYears].reverse().map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {viewMode === 'stacked-time'
          ? (isBg
              ? `Дял (%) на всеки доходен източник от брутния паричен доход | ${RESIDENCE_BG[residenceCode]}`
              : `Share (%) of each income source from gross monetary income | ${RESIDENCE_EN[residenceCode]}`)
          : (isBg
              ? `Сравнение по местоживеене | Структура % | ${compareYear || latestYear}`
              : `Comparison by residence | Structure % | ${compareYear || latestYear}`)}
      </p>
      {viewMode === 'stacked-time'
        ? <StackedTimeChart idx={idx} allYears={allYears} residenceCode={residenceCode} isBg={isBg} />
        : <GroupedYearChart idx={idx} year={compareYear || latestYear} isBg={isBg} />}
      <CompositionTable idx={idx} year={compareYear || latestYear} viewMode={viewMode} residenceCode={residenceCode} isBg={isBg} />
    </div>
  );
}

function StackedTimeChart({
  idx, allYears, residenceCode, isBg,
}: {
  idx: DataIndex; allYears: string[]; residenceCode: string; isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => (
    DETAIL_CATS.map(c => ({
      code: c.code,
      label: isBg ? c.bg : c.en,
      color: c.color,
      values: allYears.map(yr => idx.get('3')?.get(c.code)?.get(residenceCode)?.get(yr) ?? null),
    }))
  ), [idx, allYears, residenceCode, isBg]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          [...params]
            .filter((p: any) => p.value != null && p.value > 0)
            .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
            .forEach((p: any) => {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${fmtNum(p.value, 1)}%</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: seriesData.map(s => s.label),
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 12, itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '20%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: allYears,
        axisLabel: { fontSize: 11, color: '#94a3b8', rotate: 30 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'bar' as const,
        stack: 'income',
        data: s.values.map(v => ({ value: v, itemStyle: { color: s.color } })),
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}

function GroupedYearChart({
  idx, year, isBg,
}: {
  idx: DataIndex; year: string; isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => ({
    categories: DETAIL_CATS.map(c => isBg ? c.bg : c.en),
    series: ['0', '1', '2'].map(res => ({
      name: isBg ? RESIDENCE_BG[res] : RESIDENCE_EN[res],
      color: RESIDENCE_COLORS[res],
      values: DETAIL_CATS.map(c => idx.get('3')?.get(c.code)?.get(res)?.get(year) ?? null),
    })),
  }), [idx, year, isBg]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            if (p.value == null) return;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtNum(p.value, 1)}%</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: chartData.series.map(s => s.name),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '2%', right: '4%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: chartData.categories,
        axisLabel: { fontSize: 10, color: '#475569', rotate: 35, interval: 0 },
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
      series: chartData.series.map(s => ({
        name: s.name,
        type: 'bar' as const,
        data: s.values.map(v => ({
          value: v,
          itemStyle: { color: s.color, borderRadius: v != null ? [3, 3, 0, 0] as any : 0 },
        })),
        barMaxWidth: 32,
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData]);

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}

function CompositionTable({
  idx, year, viewMode, residenceCode, isBg,
}: {
  idx: DataIndex; year: string; viewMode: string; residenceCode: string; isBg: boolean;
}) {
  const rows = useMemo(() => (
    DETAIL_CATS.map(c => ({
      code: c.code,
      label: isBg ? c.bg : c.en,
      color: c.color,
      total: idx.get('3')?.get(c.code)?.get('0')?.get(year) ?? null,
      urban: idx.get('3')?.get(c.code)?.get('1')?.get(year) ?? null,
      rural: idx.get('3')?.get(c.code)?.get('2')?.get(year) ?? null,
    })).filter(r => r.total != null)
      .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
  ), [idx, year, isBg]);

  if (rows.length === 0) return null;

  return (
    <div className="mt-5 overflow-x-auto">
      <p className="text-xs font-medium text-slate-500 mb-2">
        {isBg ? `Разпределение по източници за ${year} (%):` : `Breakdown by source for ${year} (%):`}
      </p>
      <table className="w-full text-xs text-slate-600 border-collapse">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase">
            <th className="text-left py-1.5 pr-3 font-medium">{isBg ? 'Източник' : 'Source'}</th>
            <th className="text-right py-1.5 pr-3 font-medium">{isBg ? 'Общо' : 'Total'}</th>
            <th className="text-right py-1.5 pr-3 font-medium">{isBg ? 'Градско' : 'Urban'}</th>
            <th className="text-right py-1.5 font-medium">{isBg ? 'Селско' : 'Rural'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.code} className="border-b border-slate-50 hover:bg-slate-50">
              <td className="py-1.5 pr-3 flex items-center gap-2">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color, display: 'inline-block', flexShrink: 0 }} />
                {r.label}
              </td>
              <td className="text-right py-1.5 pr-3 font-medium text-sky-600">{fmtNum(r.total, 1)}%</td>
              <td className="text-right py-1.5 pr-3 font-medium text-blue-600">{fmtNum(r.urban, 1)}%</td>
              <td className="text-right py-1.5 font-medium text-emerald-600">{fmtNum(r.rural, 1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab C — Side-by-Side: Per Household vs Per Capita Over Time
// ══════════════════════════════════════════════════════════════════════════════

function MeasuresSection({
  idx, allYears, latestYear, isBg,
}: {
  idx: DataIndex; allYears: string[]; latestYear: string; isBg: boolean;
}) {
  const [residenceCode, setResidenceCode] = useState('0');

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg ? 'В. Средно на домакинство срещу средно на лице (лв.)' : 'C. Avg per Household vs Avg per Capita (BGN)'}
        </h3>
        <div className="flex items-center gap-1">
          <label className="text-xs text-slate-500">{isBg ? 'Местоживеене:' : 'Residence:'}</label>
          <Select value={residenceCode} onChange={e => setResidenceCode(e.target.value)} className="text-xs py-1 px-2 h-8 w-28">
            {(['0', '1', '2'] as const).map(c => (
              <option key={c} value={c}>{isBg ? RESIDENCE_BG[c] : RESIDENCE_EN[c]}</option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isBg
          ? `Сравнение на двете мерки за основни източници на доход | ${RESIDENCE_BG[residenceCode]}`
          : `Comparing both measures across main income sources | ${RESIDENCE_EN[residenceCode]}`}
      </p>
      <MeasuresBarChart idx={idx} latestYear={latestYear} residenceCode={residenceCode} isBg={isBg} />
      <MeasuresTrendChart idx={idx} allYears={allYears} residenceCode={residenceCode} isBg={isBg} />
    </div>
  );
}

function MeasuresBarChart({
  idx, latestYear, residenceCode, isBg,
}: {
  idx: DataIndex; latestYear: string; residenceCode: string; isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    const cats = [...TOP_CATS.slice(0, 2), ...DETAIL_CATS.slice(0, 5)];
    return cats
      .map(c => ({
        label: isBg ? c.bg : c.en,
        color: c.color,
        perHousehold: idx.get('1')?.get(c.code)?.get(residenceCode)?.get(latestYear) ?? null,
        perCapita:    idx.get('2')?.get(c.code)?.get(residenceCode)?.get(latestYear) ?? null,
      }))
      .filter(d => d.perHousehold != null || d.perCapita != null);
  }, [idx, latestYear, residenceCode, isBg]);

  const m1Label = isBg ? MEASURE_BG['1'] : MEASURE_EN['1'];
  const m2Label = isBg ? MEASURE_BG['2'] : MEASURE_EN['2'];
  const currency = isBg ? ' лв.' : ' BGN';

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
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            if (p.value == null) return;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtNum(p.value)}${currency}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [m1Label, m2Label],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '2%', right: '4%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: chartData.map(d => d.label),
        axisLabel: { fontSize: 10, color: '#475569', rotate: 35, interval: 0 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtNum(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: [
        {
          name: m1Label,
          type: 'bar' as const,
          data: chartData.map(d => ({
            value: d.perHousehold,
            itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] as any },
          })),
          barMaxWidth: 30,
          emphasis: { focus: 'series' as const },
        },
        {
          name: m2Label,
          type: 'bar' as const,
          data: chartData.map(d => ({
            value: d.perCapita,
            itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] as any },
          })),
          barMaxWidth: 30,
          emphasis: { focus: 'series' as const },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, m1Label, m2Label, currency]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

function MeasuresTrendChart({
  idx, allYears, residenceCode, isBg,
}: {
  idx: DataIndex; allYears: string[]; residenceCode: string; isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const currency = isBg ? ' лв.' : ' BGN';
  const m1Label = isBg ? MEASURE_BG['1'] : MEASURE_EN['1'];
  const m2Label = isBg ? MEASURE_BG['2'] : MEASURE_EN['2'];

  const seriesData = useMemo(() => [
    {
      label: m1Label,
      color: '#3b82f6',
      values: allYears.map(yr => idx.get('1')?.get('1')?.get(residenceCode)?.get(yr) ?? null),
    },
    {
      label: m2Label,
      color: '#10b981',
      values: allYears.map(yr => idx.get('2')?.get('1')?.get(residenceCode)?.get(yr) ?? null),
    },
  ], [idx, allYears, residenceCode, m1Label, m2Label]);

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
          params.filter((p: any) => p.value != null).forEach((p: any) => {
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtNum(p.value)}${currency}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: seriesData.map(s => s.label),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '16%', top: '10%', containLabel: true },
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
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtNum(v) },
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
        lineStyle: { width: 2.5, color: s.color },
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData, currency]);

  return (
    <>
      <p className="text-xs font-medium text-slate-500 mt-5 mb-2">
        {isBg
          ? `Динамика: Средно на домакинство срещу средно на лице — Общо парични доходи | ${RESIDENCE_BG[residenceCode]}`
          : `Trend: Avg per Household vs Avg per Capita — Total Monetary Income | ${RESIDENCE_EN[residenceCode]}`}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '340px' }} />
    </>
  );
}
