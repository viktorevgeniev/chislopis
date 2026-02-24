'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Constants ─────────────────────────────────────────────────────────────────

// Standard poverty line is 60% of median (code "3")
const STANDARD_MEDIAN_CODE = '3';

const MEDIAN_COLORS: Record<string, string> = {
  '1': '#94a3b8', // 40%
  '2': '#60a5fa', // 50%
  '3': '#3b82f6', // 60% — standard EU line
  '4': '#1d4ed8', // 70%
};

const MEDIAN_SHORT_BG: Record<string, string> = {
  '1': '40% от медианата',
  '2': '50% от медианата',
  '3': '60% от медианата (стандарт)',
  '4': '70% от медианата',
};
const MEDIAN_SHORT_EN: Record<string, string> = {
  '1': '40% of median',
  '2': '50% of median',
  '3': '60% of median (standard)',
  '4': '70% of median',
};

const HHTYPE_COLORS: Record<string, string> = {
  '1': '#0ea5e9',  // single person
  '2': '#f59e0b',  // two adults + 2 children
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function nutsLevel(code: string): 'national' | 'nuts2' | 'nuts3' {
  if (code === 'BG') return 'national';
  if (code.length === 4) return 'nuts2';
  return 'nuts3';
}

function tooltipStyle(): Partial<EChartsOption['tooltip']> {
  return {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

function fmtVal(v: number, unit: string): string {
  return `${v.toLocaleString('bg-BG')} ${unit}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function PovertyThresholdDashboard({ data, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  // ── Catalog ───────────────────────────────────────────────────────────────────
  const { allYears, medianTypes, hhTypes, availableUnits } = useMemo(() => {
    const years = new Set<string>();
    const medianMap = new Map<string, string>(); // code → en label
    const hhMap = new Map<string, string>();      // code → en label
    const unitMap = new Map<string, string>();     // Units_Code → Units label

    data.forEach(d => {
      if (d.Year) years.add(String(d.Year));
      if (d.SILC_Median_Code && !medianMap.has(d.SILC_Median_Code))
        medianMap.set(d.SILC_Median_Code, d.SILC_Median || d.SILC_Median_Code);
      if (d.SILC_HHType_Code && !hhMap.has(d.SILC_HHType_Code))
        hhMap.set(d.SILC_HHType_Code, d.SILC_HHType || d.SILC_HHType_Code);
      if (d.Units_Code && !unitMap.has(d.Units_Code))
        unitMap.set(d.Units_Code, d.Units || d.Units_Code);
    });

    const sortedYears = [...years].sort();
    const sortedMedian = [...medianMap.entries()].sort((a, b) => +a[0] - +b[0]);
    const sortedHH = [...hhMap.entries()].sort((a, b) => +a[0] - +b[0]);

    // Only include units available at national level
    const nationalUnitCodes = new Set<string>();
    data.forEach(d => {
      if (d.NUTS_Code === 'BG' && d.Units_Code) nationalUnitCodes.add(d.Units_Code);
    });
    // Sort: BGN first, then Euro, then PPP
    const unitOrder = ['BGN_fig', 'euro', 'PPP_fig'];
    const sortedUnits = [...unitMap.entries()]
      .filter(([code]) => nationalUnitCodes.has(code))
      .sort((a, b) => unitOrder.indexOf(a[0]) - unitOrder.indexOf(b[0]));

    return {
      allYears: sortedYears,
      medianTypes: sortedMedian.map(([code, enLabel]) => ({
        code,
        enLabel,
        bgLabel: MEDIAN_SHORT_BG[code] || enLabel,
      })),
      hhTypes: sortedHH.map(([code, enLabel]) => ({
        code,
        enLabel,
        bgLabel: code === '1'
          ? (isBg ? 'Едно лице' : 'Single person')
          : (isBg ? 'Двама + 2 деца (<14 г.)' : 'Two adults + 2 children (<14 yrs)'),
      })),
      availableUnits: sortedUnits,
    };
  }, [data, isBg]);

  const latestYear = allYears[allYears.length - 1] || '';
  const firstYear  = allYears[0] || '';

  // ── Filters ───────────────────────────────────────────────────────────────────
  const defaultUnit = availableUnits.find(u => u[0] === 'BGN_fig')?.[0] ?? availableUnits[0]?.[0] ?? '';
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedHH, setSelectedHH] = useState('');
  const [selectedMedianForBar, setSelectedMedianForBar] = useState(STANDARD_MEDIAN_CODE);
  const [selectedHHForBar, setSelectedHHForBar] = useState('1');
  const [selectedUnitForGrouped, setSelectedUnitForGrouped] = useState('');

  // Init on first data load
  const [initialized, setInitialized] = useState(false);
  useMemo(() => {
    if (!initialized && availableUnits.length > 0) {
      setSelectedUnit(defaultUnit);
      setSelectedUnitForGrouped(defaultUnit);
      setInitialized(true);
    }
    if (!initialized && hhTypes.length > 0) {
      setSelectedHH(hhTypes[0]?.code ?? '1');
    }
  }, [availableUnits, hhTypes, defaultUnit, initialized]);

  const activeUnit = selectedUnit || defaultUnit;
  const activeHH = selectedHH || hhTypes[0]?.code || '1';
  const activeUnitForGrouped = selectedUnitForGrouped || defaultUnit;
  const activeUnitLabel = availableUnits.find(u => u[0] === activeUnit)?.[1] ?? activeUnit;
  const activeUnitForGroupedLabel = availableUnits.find(u => u[0] === activeUnitForGrouped)?.[1] ?? activeUnitForGrouped;

  // ── KPIs ──────────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    if (!latestYear || data.length === 0) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const getVal = (year: string, medCode: string, hhCode: string, unitCode: string) => {
      const row = data.find(d =>
        d.NUTS_Code === 'BG' &&
        d.Year === year &&
        d.SILC_Median_Code === medCode &&
        d.SILC_HHType_Code === hhCode &&
        d.Units_Code === unitCode
      );
      return row?.Threshold != null ? Number(row.Threshold) : null;
    };

    const bgnCode = 'BGN_fig';
    const singleLatest = getVal(latestYear, STANDARD_MEDIAN_CODE, '1', bgnCode);
    const coupleLatest = getVal(latestYear, STANDARD_MEDIAN_CODE, '2', bgnCode);
    const singleFirst  = getVal(firstYear, STANDARD_MEDIAN_CODE, '1', bgnCode);
    const prevSingle   = prevYear ? getVal(prevYear, STANDARD_MEDIAN_CODE, '1', bgnCode) : null;
    const yoy = singleLatest != null && prevSingle != null
      ? Math.round(((singleLatest - prevSingle) / prevSingle) * 100)
      : null;
    const totalGrowth = singleLatest != null && singleFirst != null && singleFirst > 0
      ? Math.round(((singleLatest - singleFirst) / singleFirst) * 100)
      : null;

    return { singleLatest, coupleLatest, yoy, totalGrowth, latestYear, firstYear, bgnCode };
  }, [data, latestYear, firstYear, allYears]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const hhLabel = (code: string) => {
    const t = hhTypes.find(h => h.code === code);
    return t ? (isBg ? t.bgLabel : t.enLabel) : code;
  };
  const medLabel = (code: string) =>
    isBg ? (MEDIAN_SHORT_BG[code] ?? code) : (MEDIAN_SHORT_EN[code] ?? code);

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg ? 'Линия на бедност' : 'At-Risk-of-Poverty Thresholds'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear} – ${latestYear}) | По домакинство и доходен праг`
            : `Annual data (${firstYear} – ${latestYear}) | By household type and income threshold`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Row ──────────────────────────────────────────────────────── */}
        {kpi && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white shadow-sm rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {isBg ? 'Едно лице (60%)' : 'Single person (60%)'}
              </p>
              <p className="text-3xl font-bold mt-2 text-blue-600">
                {kpi.singleLatest != null ? kpi.singleLatest.toLocaleString('bg-BG') : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">{isBg ? 'лв./год.' : 'BGN/year'}</p>
              <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
            </div>

            <div className="bg-white shadow-sm rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {isBg ? 'Двама + 2 деца (60%)' : 'Two adults + 2 children (60%)'}
              </p>
              <p className="text-3xl font-bold mt-2 text-amber-600">
                {kpi.coupleLatest != null ? kpi.coupleLatest.toLocaleString('bg-BG') : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">{isBg ? 'лв./год.' : 'BGN/year'}</p>
              <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
            </div>

            <div className="bg-white shadow-sm rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {isBg ? 'Промяна г/г' : 'Year-on-Year Change'}
              </p>
              <p className={`text-3xl font-bold mt-2 ${(kpi.yoy ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {kpi.yoy != null ? `${kpi.yoy > 0 ? '+' : ''}${kpi.yoy}%` : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isBg ? 'Едно лице, 60%, BGN' : 'Single person, 60%, BGN'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
            </div>

            <div className="bg-white shadow-sm rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {isBg ? `Ръст от ${kpi.firstYear}` : `Growth since ${kpi.firstYear}`}
              </p>
              <p className="text-3xl font-bold mt-2 text-violet-600">
                {kpi.totalGrowth != null ? `+${kpi.totalGrowth}%` : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isBg ? 'Едно лице, 60%, BGN' : 'Single person, 60%, BGN'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {kpi.firstYear} → {kpi.latestYear}
              </p>
            </div>
          </div>
        )}

        {/* ── Chart A — Temporal Trajectory ────────────────────────────────── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Динамика на линията на бедност — национално ниво'
              : 'A. Poverty Threshold Over Time — National Level'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Всеки праг (40–70%) е отделна линия; изберете валутата и типа домакинство'
              : 'Each income-level threshold (40–70%) is a separate line; filter by currency and household type'}
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Select
              value={activeUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
            >
              {availableUnits.map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </Select>
            <Select
              value={activeHH}
              onChange={e => setSelectedHH(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
            >
              {hhTypes.map(h => (
                <option key={h.code} value={h.code}>{isBg ? h.bgLabel : h.enLabel}</option>
              ))}
            </Select>
          </div>
          <TemporalLineChart
            data={data}
            allYears={allYears}
            medianTypes={medianTypes}
            hhCode={activeHH}
            unitCode={activeUnit}
            unitLabel={activeUnitLabel}
            locale={locale}
          />
        </div>

        {/* ── Chart B — Regional Disparity ──────────────────────────────────── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Регионални различия (NUTS-3 области) — ${latestYear}`
              : `B. Regional Economic Disparity (NUTS-3 districts) — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Само данни в BGN; изберете праг и тип домакинство'
              : 'BGN data only for district level; select income threshold and household type'}
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Select
              value={selectedMedianForBar}
              onChange={e => setSelectedMedianForBar(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
            >
              {medianTypes.map(m => (
                <option key={m.code} value={m.code}>{medLabel(m.code)}</option>
              ))}
            </Select>
            <Select
              value={selectedHHForBar}
              onChange={e => setSelectedHHForBar(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
            >
              {hhTypes.map(h => (
                <option key={h.code} value={h.code}>{isBg ? h.bgLabel : h.enLabel}</option>
              ))}
            </Select>
          </div>
          <RegionalBarChart
            data={data}
            latestYear={latestYear}
            medianCode={selectedMedianForBar}
            hhCode={selectedHHForBar}
            locale={locale}
          />
        </div>

        {/* ── Chart C — Socio-Economic Intersections ───────────────────────── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `В. Пресечна точка: домакинство × доходен праг — ${latestYear}`
              : `C. Socio-Economic Intersection: Household × Income Threshold — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Сравнение на двата типа домакинства за всяко ниво на дохода'
              : 'Both household types compared across all four income-level thresholds at national level'}
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Select
              value={activeUnitForGrouped}
              onChange={e => setSelectedUnitForGrouped(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
            >
              {availableUnits.map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </Select>
          </div>
          <GroupedBarChart
            data={data}
            latestYear={latestYear}
            medianTypes={medianTypes}
            hhTypes={hhTypes}
            unitCode={activeUnitForGrouped}
            unitLabel={activeUnitForGroupedLabel}
            locale={locale}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart A — Temporal Line Chart
// ═══════════════════════════════════════════════════════════════════════════════

function TemporalLineChart({ data, allYears, medianTypes, hhCode, unitCode, unitLabel, locale }: {
  data: any[];
  allYears: string[];
  medianTypes: Array<{ code: string; enLabel: string; bgLabel: string }>;
  hhCode: string;
  unitCode: string;
  unitLabel: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return medianTypes.map(m => {
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (
          d.NUTS_Code === 'BG' &&
          d.SILC_Median_Code === m.code &&
          d.SILC_HHType_Code === hhCode &&
          d.Units_Code === unitCode &&
          d.Year
        ) {
          const v = Number(d.Threshold);
          byYear[d.Year] = isNaN(v) ? null : v;
        }
      });
      return {
        code: m.code,
        label: isBg ? (MEDIAN_SHORT_BG[m.code] ?? m.enLabel) : (MEDIAN_SHORT_EN[m.code] ?? m.enLabel),
        color: MEDIAN_COLORS[m.code] || '#64748b',
        values: allYears.map(y => byYear[y] ?? null),
      };
    });
  }, [data, allYears, medianTypes, hhCode, unitCode, isBg]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          [...params]
            .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))
            .forEach((p: any) => {
              const v = p.value != null ? Number(p.value) : null;
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${v != null ? fmtVal(v, unitLabel) : '—'}</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 10, color: '#64748b' },
        itemWidth: 14,
        itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '12%', top: '4%', containLabel: true },
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
        name: unitLabel,
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: 2, color: s.color },
        smooth: false,
        symbol: 'circle',
        symbolSize: 5,
        connectNulls: true,
        emphasis: { lineStyle: { width: 3.5 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData, unitLabel]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart B — Regional Sorted Horizontal Bar Chart (NUTS-3)
// ═══════════════════════════════════════════════════════════════════════════════

function RegionalBarChart({ data, latestYear, medianCode, hhCode, locale }: {
  data: any[];
  latestYear: string;
  medianCode: string;
  hhCode: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const sorted = useMemo(() => {
    const items: Array<{ name: string; value: number; isNational: boolean }> = [];
    data.forEach(d => {
      if (
        d.Year !== latestYear ||
        d.SILC_Median_Code !== medianCode ||
        d.SILC_HHType_Code !== hhCode ||
        d.Units_Code !== 'BGN_fig' ||
        !d.NUTS_Code
      ) return;
      const level = nutsLevel(d.NUTS_Code);
      if (level !== 'nuts3') return;
      const v = Number(d.Threshold);
      if (!isNaN(v) && v > 0) {
        items.push({ name: isBg ? d.NUTS : d.NUTS, value: v, isNational: false });
      }
    });

    // Add national reference
    const natRow = data.find(d =>
      d.NUTS_Code === 'BG' &&
      d.Year === latestYear &&
      d.SILC_Median_Code === medianCode &&
      d.SILC_HHType_Code === hhCode &&
      d.Units_Code === 'BGN_fig'
    );
    if (natRow) {
      items.push({
        name: isBg ? 'Национално' : 'National avg.',
        value: Number(natRow.Threshold),
        isNational: true,
      });
    }

    items.sort((a, b) => b.value - a.value);
    return items;
  }, [data, latestYear, medianCode, hhCode, isBg]);

  // Reverse for ECharts horizontal bar (renders bottom→top)
  const reversed = useMemo(() => [...sorted].reverse(), [sorted]);

  const nationalValue = sorted.find(s => s.isNational)?.value ?? null;

  useEffect(() => {
    if (!chartRef.current || reversed.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          const p = params[0];
          const v = p.value != null ? Number(p.value) : null;
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.name}</div>
            <div>${isBg ? 'Линия на бедност' : 'Poverty threshold'}: <b>${v != null ? fmtVal(v, 'BGN') : '—'}</b></div>`;
        },
      },
      grid: { left: '1%', right: '11%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: 'BGN',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: reversed.map(d => d.name),
        axisLabel: { fontSize: 10, color: '#64748b', width: 120, overflow: 'truncate' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: reversed.map(d => ({
            value: d.value,
            itemStyle: {
              color: d.isNational ? '#0f172a' : '#3b82f6',
              borderRadius: [0, 4, 4, 0],
              opacity: d.isNational ? 1 : 0.8,
            },
          })),
          barMaxWidth: 20,
          label: {
            show: true,
            position: 'right',
            fontSize: 10,
            color: '#64748b',
            formatter: (p: any) => p.value != null
              ? `${Number(p.value).toLocaleString('bg-BG')}`
              : '',
          },
          markLine: nationalValue != null ? {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#0f172a', type: 'dashed', width: 1.5 },
            label: {
              show: true,
              position: 'end',
              formatter: isBg ? 'Национално' : 'National',
              fontSize: 9,
              color: '#0f172a',
            },
            data: [{ xAxis: nationalValue }],
          } : undefined,
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [reversed, nationalValue, isBg]);

  if (reversed.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-400">
        {isBg ? 'Няма данни за областите' : 'No district-level data available'}
      </div>
    );
  }

  return (
    <div ref={chartRef} style={{ width: '100%', height: `${Math.max(420, reversed.length * 26 + 60)}px` }} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart C — Grouped Bar: SILC_HHType × SILC_Median
// ═══════════════════════════════════════════════════════════════════════════════

function GroupedBarChart({ data, latestYear, medianTypes, hhTypes, unitCode, unitLabel, locale }: {
  data: any[];
  latestYear: string;
  medianTypes: Array<{ code: string; enLabel: string; bgLabel: string }>;
  hhTypes: Array<{ code: string; enLabel: string; bgLabel: string }>;
  unitCode: string;
  unitLabel: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return hhTypes.map(hh => {
      const values = medianTypes.map(m => {
        const row = data.find(d =>
          d.NUTS_Code === 'BG' &&
          d.Year === latestYear &&
          d.SILC_Median_Code === m.code &&
          d.SILC_HHType_Code === hh.code &&
          d.Units_Code === unitCode
        );
        const v = row?.Threshold != null ? Number(row.Threshold) : null;
        return v != null && !isNaN(v) ? v : null;
      });
      return {
        code: hh.code,
        label: isBg ? hh.bgLabel : hh.enLabel,
        color: HHTYPE_COLORS[hh.code] || '#64748b',
        values,
      };
    });
  }, [data, latestYear, medianTypes, hhTypes, unitCode, isBg]);

  const xLabels = useMemo(() =>
    medianTypes.map(m => isBg ? MEDIAN_SHORT_BG[m.code] ?? m.enLabel : MEDIAN_SHORT_EN[m.code] ?? m.enLabel),
    [medianTypes, isBg]
  );

  useEffect(() => {
    if (!chartRef.current || seriesData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const v = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${v != null ? fmtVal(v, unitLabel) : '—'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 12,
        itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '14%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLabel: {
          fontSize: 10,
          color: '#64748b',
          rotate: 10,
          width: 160,
          overflow: 'truncate',
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: unitLabel,
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'bar' as const,
        data: s.values.map(v => ({
          value: v,
          itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0] },
        })),
        barGap: '15%',
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          color: '#64748b',
          formatter: (p: any) => p.value != null
            ? Number(p.value) >= 1000
              ? `${(Number(p.value) / 1000).toFixed(1)}k`
              : String(p.value)
            : '',
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [seriesData, xLabels, unitLabel]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
