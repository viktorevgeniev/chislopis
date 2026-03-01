'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import type { Dataset } from '@/types/dataset';

// ── Label dictionaries ─────────────────────────────────────────────────────────

interface NaceInfo { en: string; bg: string; color: string; }

const NACE_A21: Record<string, NaceInfo> = {
  '1': { en: 'Total (all NACE activities)', bg: 'Общо (всички икономически дейности)', color: '#64748b' },
  'A': { en: 'Agriculture, forestry & fishing', bg: 'Селско стопанство, горско стопанство и рибарство', color: '#84cc16' },
  'B': { en: 'Mining and quarrying', bg: 'Добивна промишленост', color: '#a16207' },
  'C': { en: 'Manufacturing', bg: 'Преработваща промишленост', color: '#f59e0b' },
  'D': { en: 'Electricity, gas & steam supply', bg: 'Производство и разпределение на електрическа и топлинна енергия', color: '#f97316' },
  'E': { en: 'Water supply & waste management', bg: 'Водоснабдяване, управление на отпадъци', color: '#22d3ee' },
  'F': { en: 'Construction', bg: 'Строителство', color: '#d97706' },
  'G': { en: 'Wholesale & retail trade', bg: 'Търговия; ремонт на автомобили и мотоциклети', color: '#10b981' },
  'H': { en: 'Transportation & storage', bg: 'Транспорт, складиране и пощи', color: '#0284c7' },
  'I': { en: 'Accommodation & food services', bg: 'Хотелиерство и ресторантьорство', color: '#f43f5e' },
  'J': { en: 'Information & communication', bg: 'Създаване и разпространение на информация; далекосъобщения', color: '#8b5cf6' },
  'L': { en: 'Real estate activities', bg: 'Операции с недвижими имоти', color: '#d97706' },
  'M': { en: 'Professional, scientific & technical', bg: 'Професионални дейности и научни изследвания', color: '#0891b2' },
  'N': { en: 'Administrative & support services', bg: 'Административни и спомагателни дейности', color: '#94a3b8' },
  'P': { en: 'Education', bg: 'Образование', color: '#fbbf24' },
  'Q': { en: 'Human health & social work', bg: 'Хуманна медицина и социална работа', color: '#ef4444' },
  'R': { en: 'Arts, entertainment & recreation', bg: 'Култура, спорт и развлечения', color: '#a78bfa' },
  'S': { en: 'Other service activities', bg: 'Други дейности', color: '#94a3b8' },
};

const SIZE_LABELS: Record<string, { en: string; bg: string; color: string }> = {
  '0': { en: 'Total',   bg: 'Общо',     color: '#64748b' },
  '1': { en: '0 – 9',  bg: '0 – 9',    color: '#60a5fa' },
  '4': { en: '10 – 49',bg: '10 – 49',  color: '#34d399' },
  '5': { en: '50 – 249',bg: '50 – 249', color: '#fbbf24' },
  '6': { en: '250 +',  bg: '250 +',    color: '#f87171' },
};

interface IndicatorMeta { en: string; bg: string; unit: 'num' | '1000BGN'; }
const INDICATOR_META: Record<string, IndicatorMeta> = {
  '3.1.1.03.1': { en: 'Enterprises',          bg: 'Предприятия',                 unit: 'num' },
  '3.1.1.03.2': { en: 'Persons employed',     bg: 'Заети лица',                  unit: 'num' },
  '3.1.1.03.3': { en: 'Tangible fixed assets',bg: 'Дълготрайни материални активи', unit: '1000BGN' },
  '3.1.1.03.4': { en: 'Revenues',             bg: 'Приходи от дейността',        unit: '1000BGN' },
  '3.1.1.03.5': { en: 'Expenditure',          bg: 'Разходи за дейността',        unit: '1000BGN' },
};

const SECTOR_ORDER = ['A','B','C','D','E','F','G','H','I','J','L','M','N','P','Q','R','S'];
const SIZE_ORDER   = ['1','4','5','6'];
const IND_ORDER    = ['3.1.1.03.1','3.1.1.03.2','3.1.1.03.3','3.1.1.03.4','3.1.1.03.5'];

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// key = `${naceCode}|${year}|${sizeCode}|${indCode}`
type DataMap = Map<string, number>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseValue(v: any): number | null {
  if (v == null || v === '' || v === '..' || v === 'null' || v === '-') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

function fmtNum(v: number | null, unit: 'num' | '1000BGN', isBg: boolean): string {
  if (v == null) return '—';
  if (unit === 'num') return v.toLocaleString('bg-BG', { maximumFractionDigits: 0 });
  const bn = v / 1_000_000;
  if (Math.abs(bn) >= 1) {
    return bn.toLocaleString('bg-BG', { maximumFractionDigits: 2 }) + (isBg ? ' млрд. лв.' : ' Bn BGN');
  }
  const mn = v / 1_000;
  return mn.toLocaleString('bg-BG', { maximumFractionDigits: 1 }) + (isBg ? ' млн. лв.' : ' Mn BGN');
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

export function BusinessIndicatorsByActivityDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  const { dataMap, allYears, latestYear, firstYear } = useMemo(() => {
    const map: DataMap = new Map();
    const yearSet = new Set<string>();

    for (const row of data) {
      const nace = String(row.NACE2008A21_Code ?? row.NACE2008A21 ?? '').trim();
      const year = String(row.Year ?? row.periods ?? '').trim();
      const size = String(row.SZCLS_EMPL_Code ?? row.SZCLS_EMPL ?? '').trim();
      const ind  = String(row.Indicators_Code ?? row.Indicators ?? '').trim();
      const val  = parseValue(row.Value ?? row.ValueColumn);

      if (!nace || !year || !size || !ind || val == null) continue;

      yearSet.add(year);
      const key = `${nace}|${year}|${size}|${ind}`;
      if (!map.has(key)) map.set(key, val);
    }

    const sorted = [...yearSet].sort((a, b) => +a - +b);
    return {
      dataMap: map,
      allYears: sorted,
      latestYear: sorted[sorted.length - 1] ?? '',
      firstYear: sorted[0] ?? '',
    };
  }, [data]);

  // KPI: latest year, NACE=1, size=0
  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const get = (ind: string) => dataMap.get(`1|${latestYear}|0|${ind}`) ?? null;
    const enterprises = get('3.1.1.03.1');
    const employed    = get('3.1.1.03.2');
    const revenues    = get('3.1.1.03.4');
    const prevYear    = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    const revPrev     = prevYear ? (dataMap.get(`1|${prevYear}|0|3.1.1.03.4`) ?? null) : null;
    const revenueYoy  = revenues != null && revPrev != null && revPrev > 0
      ? ((revenues - revPrev) / revPrev) * 100 : null;
    return { enterprises, employed, revenues, revenueYoy, prevYear };
  }, [dataMap, latestYear, allYears]);

  if (!data || data.length === 0) {
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
            ? 'Основни икономически показатели по размер и икономическа дейност'
            : 'Main Economic Indicators by Enterprise Size and Economic Activity'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | НКИД-2008 A21 | хил. лв.`
            : `Annual data (${firstYear}–${latestYear}) | NACE Rev.2 A21 | Thousand BGN`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        {kpi && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label={isBg ? `Предприятия (${latestYear})` : `Enterprises (${latestYear})`}
              value={kpi.enterprises != null ? kpi.enterprises.toLocaleString('bg-BG') : '—'}
              sub={isBg ? 'Общо нефинансови предприятия' : 'All non-financial enterprises'}
              accent="blue"
            />
            <KpiCard
              label={isBg ? `Заети лица (${latestYear})` : `Persons Employed (${latestYear})`}
              value={kpi.employed != null ? kpi.employed.toLocaleString('bg-BG') : '—'}
              sub={isBg ? 'Общо заети' : 'Total employed'}
              accent="green"
            />
            <KpiCard
              label={isBg ? `Приходи (${latestYear})` : `Revenues (${latestYear})`}
              value={fmtNum(kpi.revenues, '1000BGN', isBg)}
              sub={kpi.revenueYoy != null
                ? `${kpi.revenueYoy >= 0 ? '+' : ''}${kpi.revenueYoy.toFixed(1)}% vs ${kpi.prevYear}`
                : undefined}
              accent={kpi.revenueYoy == null ? 'amber' : kpi.revenueYoy >= 0 ? 'amber' : 'red'}
            />
            <KpiCard
              label={isBg ? 'Обхванати сектори' : 'Sectors Covered'}
              value={String(SECTOR_ORDER.length)}
              sub={isBg ? 'НКИД A21 (без K, O, T, U)' : 'NACE A21 (excl. K, O, T, U)'}
              accent="purple"
            />
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="trend">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="trend">{isBg ? 'Динамика' : 'Trend'}</TabsTrigger>
            <TabsTrigger value="sectors">{isBg ? 'По сектори' : 'By Sector'}</TabsTrigger>
            <TabsTrigger value="size">{isBg ? 'По размер' : 'By Size'}</TabsTrigger>
          </TabsList>

          <TabsContent value="trend">
            <TrendSection
              dataMap={dataMap}
              allYears={allYears}
              firstYear={firstYear}
              latestYear={latestYear}
              isBg={isBg}
            />
          </TabsContent>

          <TabsContent value="sectors">
            <SectorSection
              dataMap={dataMap}
              allYears={allYears}
              latestYear={latestYear}
              isBg={isBg}
            />
          </TabsContent>

          <TabsContent value="size">
            <SizeSection
              dataMap={dataMap}
              allYears={allYears}
              firstYear={firstYear}
              latestYear={latestYear}
              isBg={isBg}
            />
          </TabsContent>
        </Tabs>

      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

type Accent = 'blue' | 'green' | 'red' | 'amber' | 'purple';

const ACCENT_CLASSES: Record<Accent, { bg: string; text: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600' },
  red:    { bg: 'bg-red-50',    text: 'text-red-600' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
};

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: Accent }) {
  const cls = ACCENT_CLASSES[accent];
  return (
    <div className={`${cls.bg} rounded-xl p-4`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
      <p className={`text-lg font-bold mt-1 leading-snug ${cls.text} break-words`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab A — Trend: Indicator over years, filtered by sector + size
// ══════════════════════════════════════════════════════════════════════════════

function TrendSection({
  dataMap, allYears, firstYear, latestYear, isBg,
}: {
  dataMap: DataMap;
  allYears: string[];
  firstYear: string;
  latestYear: string;
  isBg: boolean;
}) {
  const [selNace, setSelNace] = useState('1');
  const [selSize, setSelSize] = useState('0');
  const [selInd,  setSelInd]  = useState('3.1.1.03.4');
  const chartRef = useRef<HTMLDivElement>(null);

  const indMeta = INDICATOR_META[selInd];
  const values  = useMemo(
    () => allYears.map(yr => dataMap.get(`${selNace}|${yr}|${selSize}|${selInd}`) ?? null),
    [dataMap, allYears, selNace, selSize, selInd],
  );

  const yoyChanges = useMemo(() => values.map((v, i) => {
    if (i === 0 || v == null || values[i - 1] == null) return null;
    return ((v - values[i - 1]!) / Math.abs(values[i - 1]!)) * 100;
  }), [values]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const color = NACE_A21[selNace]?.color ?? '#3b82f6';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params[0]) return '';
          const yr  = params[0].axisValue as string;
          const idx = allYears.indexOf(yr);
          const val = values[idx];
          const yoy = yoyChanges[idx];
          let tip = `<div style="font-weight:600;margin-bottom:6px;color:#0f172a">${yr}</div>`;
          tip += `<div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px"></span>`;
          tip += `${isBg ? indMeta?.bg : indMeta?.en}: <b>${fmtNum(val, indMeta?.unit ?? 'num', isBg)}</b></div>`;
          if (yoy != null) {
            const arrow = yoy >= 0 ? '▲' : '▼';
            const c = yoy >= 0 ? '#16a34a' : '#dc2626';
            tip += `<div style="color:${c};font-size:11px;margin-top:2px">${arrow} ${Math.abs(yoy).toFixed(1)}% YoY</div>`;
          }
          return tip;
        },
      },
      grid: { left: '2%', right: '4%', bottom: '8%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allYears,
        axisLabel: { fontSize: 11, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: indMeta?.unit === '1000BGN' ? (isBg ? 'хил. лв.' : 'Thous. BGN') : (isBg ? 'брой' : 'count'),
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => {
            if (indMeta?.unit === '1000BGN') {
              if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + (isBg ? ' млрд.' : ' Bn');
              if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + (isBg ? ' млн.' : ' Mn');
              return String(v);
            }
            if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
            if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + 'K';
            return String(v);
          },
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: [{
        name: isBg ? indMeta?.bg : indMeta?.en,
        type: 'line' as const,
        data: values,
        itemStyle: { color },
        lineStyle: { width: 3, color },
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        connectNulls: true,
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color + '44' },
              { offset: 1, color: color + '05' },
            ],
          },
        },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, values, yoyChanges, selNace, selInd, isBg, indMeta]);

  const validVals = values.filter((v): v is number => v != null);
  const maxVal = validVals.length ? Math.max(...validVals) : null;
  const minVal = validVals.length ? Math.min(...validVals) : null;

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            {isBg ? 'А. Динамика на показателя' : 'A. Indicator Trend Over Time'}
          </h3>
          <p className="text-xs text-slate-400">
            {isBg ? `${firstYear}–${latestYear} | Изберете показател, сектор и размер` : `${firstYear}–${latestYear} | Select indicator, sector and size class`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500 whitespace-nowrap">{isBg ? 'Показател:' : 'Indicator:'}</label>
            <Select value={selInd} onChange={e => setSelInd(e.target.value)} className="text-xs py-1 px-2 h-8 w-44">
              {IND_ORDER.map(code => (
                <option key={code} value={code}>{isBg ? INDICATOR_META[code].bg : INDICATOR_META[code].en}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500 whitespace-nowrap">{isBg ? 'Сектор:' : 'Sector:'}</label>
            <Select value={selNace} onChange={e => setSelNace(e.target.value)} className="text-xs py-1 px-2 h-8 w-36">
              {['1', ...SECTOR_ORDER].map(code => (
                <option key={code} value={code}>
                  {code === '1' ? (isBg ? 'Общо' : 'Total') : `${code} – ${(isBg ? NACE_A21[code]?.bg : NACE_A21[code]?.en)?.split(/[,;&]/)[0].trim()}`}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500 whitespace-nowrap">{isBg ? 'Размер:' : 'Size:'}</label>
            <Select value={selSize} onChange={e => setSelSize(e.target.value)} className="text-xs py-1 px-2 h-8 w-24">
              {Object.entries(SIZE_LABELS).map(([code, meta]) => (
                <option key={code} value={code}>{isBg ? meta.bg : meta.en}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div ref={chartRef} style={{ width: '100%', height: '360px' }} />

      <div className="flex flex-wrap gap-6 mt-3 text-xs text-slate-500">
        {maxVal != null && (
          <span>
            {isBg ? 'Максимум:' : 'Peak:'}{' '}
            <strong className="text-blue-600">
              {fmtNum(maxVal, indMeta?.unit ?? 'num', isBg)} ({allYears[values.findIndex(v => v === maxVal)]})
            </strong>
          </span>
        )}
        {minVal != null && (
          <span>
            {isBg ? 'Минимум:' : 'Lowest:'}{' '}
            <strong className="text-red-500">
              {fmtNum(minVal, indMeta?.unit ?? 'num', isBg)} ({allYears[values.findIndex(v => v === minVal)]})
            </strong>
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-slate-500 mb-2">{isBg ? 'Годишен ръст (%):' : 'Year-on-Year change (%):'}</p>
        <div className="flex flex-wrap gap-2">
          {allYears.map((yr, i) => {
            const yoy = yoyChanges[i];
            if (yoy == null) return null;
            const pos = yoy >= 0;
            return (
              <div key={yr} className={`rounded px-2 py-1 text-[11px] font-medium ${pos ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {yr}: {pos ? '+' : ''}{yoy.toFixed(1)}%
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab B — Sector Comparison: Horizontal bar for selected year + indicator
// ══════════════════════════════════════════════════════════════════════════════

function SectorSection({
  dataMap, allYears, latestYear, isBg,
}: {
  dataMap: DataMap;
  allYears: string[];
  latestYear: string;
  isBg: boolean;
}) {
  const [selYear, setSelYear] = useState(latestYear);
  const [selSize, setSelSize] = useState('0');
  const [selInd,  setSelInd]  = useState('3.1.1.03.4');
  const chartRef = useRef<HTMLDivElement>(null);

  const indMeta = INDICATOR_META[selInd];

  const sectorData = useMemo(() => {
    return SECTOR_ORDER.map(code => {
      const info = NACE_A21[code];
      const val  = dataMap.get(`${code}|${selYear}|${selSize}|${selInd}`) ?? null;
      return { code, label: isBg ? info.bg : info.en, color: info.color, value: val };
    })
      .filter(d => d.value != null && d.value > 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }, [dataMap, selYear, selSize, selInd, isBg]);

  useEffect(() => {
    if (!chartRef.current || sectorData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params[0]) return '';
          const p = params[0];
          return `<div style="font-weight:600;margin-bottom:4px;color:#0f172a;max-width:280px;white-space:normal">${p.name}</div>
            <div>
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-right:6px"></span>
              ${fmtNum(p.value as number, indMeta?.unit ?? 'num', isBg)}
            </div>`;
        },
      },
      grid: { left: '2%', right: '14%', bottom: '4%', top: '2%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10, color: '#94a3b8',
          formatter: (v: number) => {
            if (indMeta?.unit === '1000BGN') {
              if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + (isBg ? ' млрд.' : ' Bn');
              if (v >= 1_000) return (v / 1_000).toFixed(0) + (isBg ? ' млн.' : ' Mn');
            }
            if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
            if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
            return String(v);
          },
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      yAxis: {
        type: 'category',
        data: [...sectorData].reverse().map(d => d.label),
        axisLabel: { fontSize: 10.5, color: '#475569', width: 220, overflow: 'truncate' as const },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar' as const,
        data: [...sectorData].reverse().map(d => ({
          value: d.value,
          itemStyle: { color: d.color, borderRadius: [0, 4, 4, 0] as any },
        })),
        barMaxWidth: 22,
        label: {
          show: true,
          position: 'right' as const,
          formatter: (p: any) => fmtNum(p.value as number, indMeta?.unit ?? 'num', isBg),
          fontSize: 10,
          color: '#475569',
        },
        emphasis: { focus: 'self' as const },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [sectorData, isBg, indMeta]);

  const chartHeight = Math.max(360, sectorData.length * 32 + 60);
  const totalShown  = sectorData.reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            {isBg ? 'Б. Сравнение по икономически сектори' : 'B. Comparison by Economic Sector'}
          </h3>
          <p className="text-xs text-slate-400">
            {isBg ? 'Стойности по НКИД A21 за избрана година и размер' : 'Values by NACE A21 for selected year and size class'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Показател:' : 'Indicator:'}</label>
            <Select value={selInd} onChange={e => setSelInd(e.target.value)} className="text-xs py-1 px-2 h-8 w-44">
              {IND_ORDER.map(code => (
                <option key={code} value={code}>{isBg ? INDICATOR_META[code].bg : INDICATOR_META[code].en}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Година:' : 'Year:'}</label>
            <Select value={selYear || latestYear} onChange={e => setSelYear(e.target.value)} className="text-xs py-1 px-2 h-8 w-24">
              {[...allYears].reverse().map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Размер:' : 'Size:'}</label>
            <Select value={selSize} onChange={e => setSelSize(e.target.value)} className="text-xs py-1 px-2 h-8 w-24">
              {Object.entries(SIZE_LABELS).map(([code, meta]) => (
                <option key={code} value={code}>{isBg ? meta.bg : meta.en}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />

      {sectorData.length > 0 && totalShown > 0 && (
        <div className="mt-5">
          <p className="text-xs font-medium text-slate-500 mb-2">
            {isBg ? `Дял от общата сума (${selYear}):` : `Share of total (${selYear}):`}
          </p>
          <div className="space-y-1.5">
            {sectorData.slice(0, 10).map(d => {
              const pct = ((d.value ?? 0) / totalShown) * 100;
              return (
                <div key={d.code} className="flex items-center gap-2">
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block', flexShrink: 0 }} />
                  <span className="text-xs text-slate-600 w-52 truncate">{d.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: d.color }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-24 text-right">
                    {fmtNum(d.value, indMeta?.unit ?? 'num', isBg)}
                  </span>
                  <span className="text-[11px] text-slate-400 w-10 text-right">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab C — Size Distribution: Stacked bar chart across years
// ══════════════════════════════════════════════════════════════════════════════

function SizeSection({
  dataMap, allYears, firstYear, latestYear, isBg,
}: {
  dataMap: DataMap;
  allYears: string[];
  firstYear: string;
  latestYear: string;
  isBg: boolean;
}) {
  const [selNace,   setSelNace]   = useState('1');
  const [selInd,    setSelInd]    = useState('3.1.1.03.2');
  const [chartMode, setChartMode] = useState<'stacked' | 'pie'>('stacked');
  const [selYear,   setSelYear]   = useState(latestYear);
  const stackRef = useRef<HTMLDivElement>(null);
  const pieRef   = useRef<HTMLDivElement>(null);

  const indMeta = INDICATOR_META[selInd];

  // Series per size class (excludes total=0) across all years
  const stackedSeries = useMemo(
    () => SIZE_ORDER.map(sizeCode => {
      const meta = SIZE_LABELS[sizeCode];
      return {
        sizeCode,
        label: isBg ? meta.bg : meta.en,
        color: meta.color,
        values: allYears.map(yr => dataMap.get(`${selNace}|${yr}|${sizeCode}|${selInd}`) ?? null),
      };
    }),
    [dataMap, allYears, selNace, selInd, isBg],
  );

  // Pie data for a single year (excludes total=0)
  const pieData = useMemo(
    () => SIZE_ORDER.map(sizeCode => {
      const meta = SIZE_LABELS[sizeCode];
      const val  = dataMap.get(`${selNace}|${selYear}|${sizeCode}|${selInd}`) ?? null;
      return { name: isBg ? meta.bg : meta.en, value: val, color: meta.color };
    }).filter(d => d.value != null && d.value > 0),
    [dataMap, selNace, selYear, selInd, isBg],
  );

  // Stacked bar chart
  useEffect(() => {
    if (chartMode !== 'stacked' || !stackRef.current || allYears.length === 0) return;
    const chart = echarts.init(stackRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params[0]) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            if (p.value == null) return;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${fmtNum(p.value as number, indMeta?.unit ?? 'num', isBg)}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: stackedSeries.map(s => s.label),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14,
        itemHeight: 8,
      },
      grid: { left: '2%', right: '3%', bottom: '15%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
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
          formatter: (v: number) => {
            if (indMeta?.unit === '1000BGN') {
              if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + (isBg ? ' млрд.' : ' Bn');
              if (v >= 1_000) return (v / 1_000).toFixed(0) + (isBg ? ' млн.' : ' Mn');
            }
            if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
            if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
            return String(v);
          },
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: stackedSeries.map(s => ({
        name: s.label,
        type: 'bar' as const,
        stack: 'size',
        data: s.values,
        itemStyle: { color: s.color },
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartMode, allYears, stackedSeries, isBg, indMeta]);

  // Pie chart
  useEffect(() => {
    if (chartMode !== 'pie' || !pieRef.current || pieData.length === 0) return;
    const chart = echarts.init(pieRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        ...tooltipStyle(),
        formatter: (p: any) => {
          return `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${p.name}</div>
            <div>${fmtNum(p.value as number, indMeta?.unit ?? 'num', isBg)} (${(p.percent as number).toFixed(1)}%)</div>`;
        },
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      series: [{
        type: 'pie' as const,
        radius: ['35%', '65%'],
        center: ['40%', '50%'],
        data: pieData.map(d => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: d.color },
        })),
        label: {
          show: true,
          formatter: (p: any) => `${(p.percent as number).toFixed(1)}%`,
          fontSize: 11,
          color: '#475569',
        },
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.15)' } },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartMode, pieData, isBg, indMeta]);

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            {isBg ? 'В. Разпределение по размер на предприятията' : 'C. Distribution by Enterprise Size'}
          </h3>
          <p className="text-xs text-slate-400">
            {isBg
              ? `${firstYear}–${latestYear} | Съставни класове размер (без „Общо")`
              : `${firstYear}–${latestYear} | Size class breakdown (excl. Total)`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Показател:' : 'Indicator:'}</label>
            <Select value={selInd} onChange={e => setSelInd(e.target.value)} className="text-xs py-1 px-2 h-8 w-44">
              {IND_ORDER.map(code => (
                <option key={code} value={code}>{isBg ? INDICATOR_META[code].bg : INDICATOR_META[code].en}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Сектор:' : 'Sector:'}</label>
            <Select value={selNace} onChange={e => setSelNace(e.target.value)} className="text-xs py-1 px-2 h-8 w-36">
              {['1', ...SECTOR_ORDER].map(code => (
                <option key={code} value={code}>
                  {code === '1' ? (isBg ? 'Общо' : 'Total') : `${code} – ${(isBg ? NACE_A21[code]?.bg : NACE_A21[code]?.en)?.split(/[,;&]/)[0].trim()}`}
                </option>
              ))}
            </Select>
          </div>
          {/* mode toggle */}
          <div className="flex gap-1 rounded-lg overflow-hidden border border-slate-200">
            {(['stacked', 'pie'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${chartMode === mode ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                {mode === 'stacked'
                  ? (isBg ? 'Ленти' : 'Stacked')
                  : (isBg ? 'Пай' : 'Pie')}
              </button>
            ))}
          </div>
          {chartMode === 'pie' && (
            <div className="flex items-center gap-1">
              <label className="text-xs text-slate-500">{isBg ? 'Година:' : 'Year:'}</label>
              <Select value={selYear || latestYear} onChange={e => setSelYear(e.target.value)} className="text-xs py-1 px-2 h-8 w-24">
                {[...allYears].reverse().map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </div>

      {chartMode === 'stacked' ? (
        <div ref={stackRef} style={{ width: '100%', height: '420px' }} />
      ) : (
        <div ref={pieRef} style={{ width: '100%', height: '380px' }} />
      )}

      {/* Size class legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100">
        {SIZE_ORDER.map(code => {
          const meta = SIZE_LABELS[code];
          return (
            <div key={code} className="flex items-center gap-1.5">
              <span style={{ width: 10, height: 10, borderRadius: 2, background: meta.color, display: 'inline-block' }} />
              <span className="text-xs text-slate-500">{isBg ? meta.bg : meta.en} {isBg ? 'заети' : 'employed'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
