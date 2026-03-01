'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import type { Dataset } from '@/types/dataset';

// ── Types ──────────────────────────────────────────────────────────────────────

// measure → expCode → residence → year → value
type DataIndex = Map<string, Map<string, Map<string, Map<string, number>>>>;

interface CatDef {
  code: string;
  en: string;
  bg: string;
  color: string;
}

// ── Expenditure category definitions (HBS_OR codes from codelists) ─────────────

const TOP_CATS: CatDef[] = [
  { code: '11',  en: 'Total Expenditure',                bg: 'Общи разходи',                          color: '#0ea5e9' },
  { code: '111', en: 'Consumer Total Expenditure',       bg: 'Потребителски разходи общо',             color: '#10b981' },
  { code: '112', en: 'Taxes',                            bg: 'Данъци',                                color: '#f59e0b' },
  { code: '113', en: 'Social Insurance Contributions',   bg: 'Социални осигуровки',                   color: '#8b5cf6' },
  { code: '114', en: 'Transfers to Other Households',    bg: 'Трансфери към домакинства',             color: '#ef4444' },
  { code: '115', en: 'Other Expenditure',                bg: 'Други разходи',                         color: '#64748b' },
  { code: '12',  en: 'Saving Deposits',                  bg: 'Спестявания',                           color: '#06b6d4' },
  { code: '13',  en: 'Debt Paid & Loans Granted',        bg: 'Изплатени задължения и кредити',        color: '#ec4899' },
];

const CONSUMER_CATS: CatDef[] = [
  { code: '11101', en: 'Foods & Non-Alcoholic Beverages',  bg: 'Храни и безалкохолни напитки',         color: '#22c55e' },
  { code: '11102', en: 'Alcoholic Beverages & Tobacco',    bg: 'Алкохолни напитки и тютюн',            color: '#eab308' },
  { code: '11103', en: 'Clothing & Footwear',              bg: 'Облекло и обувки',                     color: '#3b82f6' },
  { code: '11104', en: 'Housing, Water & Energy',          bg: 'Жилище, вода, ел. и газ',              color: '#f97316' },
  { code: '11105', en: 'Furnishing & Maintenance',         bg: 'Обзавеждане и поддръжка',              color: '#14b8a6' },
  { code: '11106', en: 'Health',                           bg: 'Здравеопазване',                       color: '#ef4444' },
  { code: '11107', en: 'Transport',                        bg: 'Транспорт',                            color: '#6366f1' },
  { code: '11108', en: 'Communication',                    bg: 'Съобщения',                            color: '#84cc16' },
  { code: '11109', en: 'Recreation, Culture & Education',  bg: 'Отдих, култура и образование',         color: '#a855f7' },
  { code: '11110', en: 'Miscellaneous Goods & Services',   bg: 'Разни стоки и услуги',                 color: '#f43f5e' },
];

const CAT_MAP: Record<string, CatDef> = Object.fromEntries(
  [...TOP_CATS, ...CONSUMER_CATS].map(c => [c.code, c])
);

// Key categories for Urban vs Rural comparison
const HIGHLIGHT_CATS: CatDef[] = [
  CAT_MAP['11101'], // Food
  CAT_MAP['11104'], // Housing & energy
  CAT_MAP['11106'], // Health
  CAT_MAP['11107'], // Transport
  CAT_MAP['11109'], // Recreation
  CAT_MAP['11102'], // Alcohol & tobacco
];

const RESIDENCE_EN: Record<string, string>     = { '0': 'Total',  '1': 'Urban',   '2': 'Rural' };
const RESIDENCE_BG: Record<string, string>     = { '0': 'Общо',   '1': 'Градско', '2': 'Селско' };
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
    const expCode = String(row.HBS_OR_Code ?? row.HBS_OR ?? '');
    const res     = String(row.Residence_Code ?? '');
    const yr      = String(row.Year ?? '');
    const val     = parseValue(row.Amount ?? row.ValueColumn);
    if (!measure || !expCode || !res || !yr || val == null) continue;
    if (!idx.has(measure)) idx.set(measure, new Map());
    const mMap = idx.get(measure)!;
    if (!mMap.has(expCode)) mMap.set(expCode, new Map());
    const cMap = mMap.get(expCode)!;
    if (!cMap.has(res)) cMap.set(res, new Map());
    cMap.get(res)!.set(yr, val);
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

export function MonetaryExpenditureResidenceDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  const { allYears, latestYear, firstYear, idx } = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => { if (d.Year) years.add(String(d.Year)); });
    const sorted = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    return {
      allYears: sorted,
      latestYear: sorted[sorted.length - 1] ?? '',
      firstYear:  sorted[0] ?? '',
      idx: buildIndex(data),
    };
  }, [data]);

  const get = (measure: string, expCode: string, res: string, yr: string): number | null =>
    idx.get(measure)?.get(expCode)?.get(res)?.get(yr) ?? null;

  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    // '11' = Total expenditure
    const total = get('1', '11', '0', latestYear);
    const urban = get('1', '11', '1', latestYear);
    const rural = get('1', '11', '2', latestYear);
    const totalPrev = prevYear ? get('1', '11', '0', prevYear) : null;
    const yoy = total != null && totalPrev != null && totalPrev > 0
      ? ((total - totalPrev) / totalPrev) * 100 : null;
    const urbanRuralRatio = urban != null && rural != null && rural > 0 ? urban / rural : null;
    // '11101' = Food share in structure %
    const foodShare = get('3', '11101', '0', latestYear);
    return { total, urban, rural, yoy, urbanRuralRatio, foodShare };
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
            ? 'Разходи на домакинствата по групи и местоживеене'
            : 'Household Expenditure by Group and Residence'}
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
              label={isBg ? 'Общи разходи (ср./домакинство)' : 'Total Expenditure (avg/household)'}
              value={fmtNum(kpi.total) + currency}
              sub={kpi.yoy != null
                ? `${kpi.yoy >= 0 ? '▲' : '▼'} ${Math.abs(kpi.yoy).toFixed(1)}% YoY`
                : undefined}
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
              sub={kpi.foodShare != null
                ? (isBg
                    ? `Храни: ${fmtNum(kpi.foodShare, 1)}% от разходите`
                    : `Food: ${fmtNum(kpi.foodShare, 1)}% of spending`)
                : (isBg ? 'Градските домакинства харчат повече' : 'Urban households spend more')}
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
            <TabsTrigger value="structure">{isBg ? 'Структура' : 'Structure'}</TabsTrigger>
            <TabsTrigger value="comparison">{isBg ? 'Градско / Селско' : 'Urban vs Rural'}</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsSection idx={idx} allYears={allYears} firstYear={firstYear} latestYear={latestYear} isBg={isBg} />
          </TabsContent>

          <TabsContent value="structure">
            <StructureSection idx={idx} allYears={allYears} latestYear={latestYear} isBg={isBg} />
          </TabsContent>

          <TabsContent value="comparison">
            <ComparisonSection idx={idx} allYears={allYears} latestYear={latestYear} isBg={isBg} />
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
// Tab A — Multi-line Time Series: Expenditure Trends by Residence
// ══════════════════════════════════════════════════════════════════════════════

function TrendsSection({
  idx, allYears, firstYear, latestYear, isBg,
}: {
  idx: DataIndex; allYears: string[]; firstYear: string; latestYear: string; isBg: boolean;
}) {
  const [measureCode, setMeasureCode] = useState('1');
  const [catCode, setCatCode]         = useState('11');

  const catLabel     = isBg ? (CAT_MAP[catCode]?.bg ?? catCode) : (CAT_MAP[catCode]?.en ?? catCode);
  const measureLabel = isBg ? MEASURE_BG[measureCode] : MEASURE_EN[measureCode];

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg ? 'А. Динамика на разходите по години' : 'A. Expenditure Trends Over Years'}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Категория:' : 'Category:'}</label>
            <Select value={catCode} onChange={e => setCatCode(e.target.value)} className="text-xs py-1 px-2 h-8 w-52">
              <optgroup label={isBg ? 'Главни групи' : 'Top-level'}>
                {TOP_CATS.map(c => (
                  <option key={c.code} value={c.code}>{isBg ? c.bg : c.en}</option>
                ))}
              </optgroup>
              <optgroup label={isBg ? 'Потребителски подгрупи' : 'Consumer sub-categories'}>
                {CONSUMER_CATS.map(c => (
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
  const chartRef   = useRef<HTMLDivElement>(null);
  const isBGN      = measureCode !== '3';
  const unitSuffix = isBGN ? (isBg ? ' лв.' : ' BGN') : '%';

  const seriesData = useMemo(() => (
    ['0', '1', '2'].map(res => ({
      res,
      label:  isBg ? RESIDENCE_BG[res] : RESIDENCE_EN[res],
      color:  RESIDENCE_COLORS[res],
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
// Tab B — 100% Stacked Bar: Consumer Expenditure Structure (%)
// ══════════════════════════════════════════════════════════════════════════════

function StructureSection({
  idx, allYears, latestYear, isBg,
}: {
  idx: DataIndex; allYears: string[]; latestYear: string; isBg: boolean;
}) {
  const [residenceCode, setResidenceCode] = useState('0');
  const [viewMode, setViewMode]           = useState<'stacked-time' | 'grouped-year'>('stacked-time');
  const [compareYear, setCompareYear]     = useState(latestYear);

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg ? 'Б. Структура на потребителските разходи (%)' : 'B. Consumer Expenditure Structure (%)'}
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
              ? `Дял (%) на всяка подгрупа в потребителските разходи | ${RESIDENCE_BG[residenceCode]}`
              : `Share (%) of each sub-category in consumer expenditure | ${RESIDENCE_EN[residenceCode]}`)
          : (isBg
              ? `Сравнение по местоживеене | Структура % | ${compareYear || latestYear}`
              : `Comparison by residence | Structure % | ${compareYear || latestYear}`)}
      </p>
      {viewMode === 'stacked-time'
        ? <StackedTimeChart idx={idx} allYears={allYears} residenceCode={residenceCode} isBg={isBg} />
        : <GroupedYearChart idx={idx} year={compareYear || latestYear} isBg={isBg} />}
      <StructureTable idx={idx} year={compareYear || latestYear} isBg={isBg} />
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
    CONSUMER_CATS.map(c => ({
      code:   c.code,
      label:  isBg ? c.bg : c.en,
      color:  c.color,
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
      grid: { left: '1%', right: '3%', bottom: '22%', top: '6%', containLabel: true },
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
        stack: 'expenditure',
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

function GroupedYearChart({ idx, year, isBg }: { idx: DataIndex; year: string; isBg: boolean }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => ({
    categories: CONSUMER_CATS.map(c => isBg ? c.bg : c.en),
    series: ['0', '1', '2'].map(res => ({
      name:   isBg ? RESIDENCE_BG[res] : RESIDENCE_EN[res],
      color:  RESIDENCE_COLORS[res],
      values: CONSUMER_CATS.map(c => idx.get('3')?.get(c.code)?.get(res)?.get(year) ?? null),
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

function StructureTable({ idx, year, isBg }: { idx: DataIndex; year: string; isBg: boolean }) {
  const rows = useMemo(() => (
    CONSUMER_CATS.map(c => ({
      code:  c.code,
      label: isBg ? c.bg : c.en,
      color: c.color,
      total: idx.get('3')?.get(c.code)?.get('0')?.get(year) ?? null,
      urban: idx.get('3')?.get(c.code)?.get('1')?.get(year) ?? null,
      rural: idx.get('3')?.get(c.code)?.get('2')?.get(year) ?? null,
    }))
      .filter(r => r.total != null)
      .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
  ), [idx, year, isBg]);

  if (rows.length === 0) return null;

  return (
    <div className="mt-5 overflow-x-auto">
      <p className="text-xs font-medium text-slate-500 mb-2">
        {isBg ? `Разпределение по подгрупи за ${year} (%):` : `Breakdown by sub-category for ${year} (%):`}
      </p>
      <table className="w-full text-xs text-slate-600 border-collapse">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase">
            <th className="text-left py-1.5 pr-3 font-medium">{isBg ? 'Категория' : 'Category'}</th>
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
// Tab C — Grouped Bar: Urban vs Rural Key Category Comparison
// ══════════════════════════════════════════════════════════════════════════════

function ComparisonSection({
  idx, allYears, latestYear, isBg,
}: {
  idx: DataIndex; allYears: string[]; latestYear: string; isBg: boolean;
}) {
  const [measureCode, setMeasureCode]   = useState('1');
  const [selectedYear, setSelectedYear] = useState(latestYear);

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg ? 'В. Градско срещу Селско по ключови категории' : 'C. Urban vs Rural by Key Categories'}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Мерна единица:' : 'Measure:'}</label>
            <Select value={measureCode} onChange={e => setMeasureCode(e.target.value)} className="text-xs py-1 px-2 h-8 w-48">
              {['1', '2'].map(m => (
                <option key={m} value={m}>{isBg ? MEASURE_BG[m] : MEASURE_EN[m]}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Година:' : 'Year:'}</label>
            <Select value={selectedYear || latestYear} onChange={e => setSelectedYear(e.target.value)} className="text-xs py-1 px-2 h-8 w-24">
              {[...allYears].reverse().map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isBg
          ? `Сравнение Градско/Селско | ${MEASURE_BG[measureCode]} | ${selectedYear || latestYear}`
          : `Urban/Rural comparison | ${MEASURE_EN[measureCode]} | ${selectedYear || latestYear}`}
      </p>
      <ComparisonBarChart idx={idx} year={selectedYear || latestYear} measureCode={measureCode} isBg={isBg} />
      <MeasuresTrendChart idx={idx} allYears={allYears} measureCode={measureCode} isBg={isBg} />
    </div>
  );
}

function ComparisonBarChart({
  idx, year, measureCode, isBg,
}: {
  idx: DataIndex; year: string; measureCode: string; isBg: boolean;
}) {
  const chartRef   = useRef<HTMLDivElement>(null);
  const isBGN      = measureCode !== '3';
  const unitSuffix = isBGN ? (isBg ? ' лв.' : ' BGN') : '%';

  const chartData = useMemo(() => ({
    categories: HIGHLIGHT_CATS.map(c => isBg ? c.bg : c.en),
    urban: HIGHLIGHT_CATS.map(c => idx.get(measureCode)?.get(c.code)?.get('1')?.get(year) ?? null),
    rural: HIGHLIGHT_CATS.map(c => idx.get(measureCode)?.get(c.code)?.get('2')?.get(year) ?? null),
  }), [idx, year, measureCode, isBg]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const urbanLabel = isBg ? RESIDENCE_BG['1'] : RESIDENCE_EN['1'];
    const ruralLabel = isBg ? RESIDENCE_BG['2'] : RESIDENCE_EN['2'];

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
              <span style="font-weight:600;margin-left:8px">${fmtNum(p.value, isBGN ? 0 : 1)}${unitSuffix}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [urbanLabel, ruralLabel],
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
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => fmtNum(v, 0) + (isBGN ? '' : '%'),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: [
        {
          name: urbanLabel,
          type: 'bar' as const,
          data: chartData.urban.map(v => ({
            value: v,
            itemStyle: { color: RESIDENCE_COLORS['1'], borderRadius: v != null ? [4, 4, 0, 0] as any : 0 },
          })),
          barMaxWidth: 36,
          emphasis: { focus: 'series' as const },
        },
        {
          name: ruralLabel,
          type: 'bar' as const,
          data: chartData.rural.map(v => ({
            value: v,
            itemStyle: { color: RESIDENCE_COLORS['2'], borderRadius: v != null ? [4, 4, 0, 0] as any : 0 },
          })),
          barMaxWidth: 36,
          emphasis: { focus: 'series' as const },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, isBg, isBGN, unitSuffix]);

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}

function MeasuresTrendChart({
  idx, allYears, measureCode, isBg,
}: {
  idx: DataIndex; allYears: string[]; measureCode: string; isBg: boolean;
}) {
  const chartRef   = useRef<HTMLDivElement>(null);
  const isBGN      = measureCode !== '3';
  const unitSuffix = isBGN ? (isBg ? ' лв.' : ' BGN') : '%';

  const seriesData = useMemo(() => (
    ['0', '1', '2'].map(res => ({
      label:  isBg ? RESIDENCE_BG[res] : RESIDENCE_EN[res],
      color:  RESIDENCE_COLORS[res],
      // '11' = Total expenditure
      values: allYears.map(yr => idx.get(measureCode)?.get('11')?.get(res)?.get(yr) ?? null),
    }))
  ), [idx, allYears, measureCode, isBg]);

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
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => fmtNum(v, 0) + (isBGN ? '' : '%'),
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
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData, unitSuffix, isBGN]);

  return (
    <>
      <p className="text-xs font-medium text-slate-500 mt-5 mb-2">
        {isBg
          ? `Динамика: Общи разходи по местоживеене | ${MEASURE_BG[measureCode]}`
          : `Trend: Total Expenditure by Residence | ${MEASURE_EN[measureCode]}`}
      </p>
      <div ref={chartRef} style={{ width: '100%', height: '340px' }} />
    </>
  );
}
