'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Constants ──────────────────────────────────────────────────────────────────

// SILC_Agevs codes
const AGE_CODES = ['1', '5'] as const;
type AgeCode = typeof AGE_CODES[number];

const AGE_LABEL_EN: Record<AgeCode, string> = {
  '1': '65+ vs <65',
  '5': '60+ vs <60',
};
const AGE_LABEL_BG: Record<AgeCode, string> = {
  '1': '65+ спрямо <65',
  '5': '60+ спрямо <60',
};
const AGE_LABEL_FULL_EN: Record<AgeCode, string> = {
  '1': '65 years and over / less than 65 years',
  '5': '60 years and over / less than 60 years',
};
const AGE_LABEL_FULL_BG: Record<AgeCode, string> = {
  '1': '65 и над / под 65 години',
  '5': '60 и над / под 60 години',
};
const AGE_COLORS: Record<AgeCode, string> = {
  '1': '#6366f1',
  '5': '#f59e0b',
};

// GenderID codes
const GENDER_CODES = ['0', '1', '2'] as const;
type GenderCode = typeof GENDER_CODES[number];

const GENDER_LABEL_EN: Record<GenderCode, string> = { '0': 'Total', '1': 'Male', '2': 'Female' };
const GENDER_LABEL_BG: Record<GenderCode, string> = { '0': 'Общо', '1': 'Мъже', '2': 'Жени' };
const GENDER_COLORS: Record<GenderCode, string> = { '0': '#64748b', '1': '#3b82f6', '2': '#ec4899' };
const GENDER_DASH: Record<GenderCode, 'solid' | 'dashed' | 'dotted'> = {
  '0': 'dashed',
  '1': 'solid',
  '2': 'solid',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

function getVal(row: any): number | null {
  const v = row?.Ratio;
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) ? null : n;
}

function ratioFmt(v: number): string {
  return v.toFixed(2);
}

// ── Index type: ageCode → genderCode → year → value ──────────────────────────

type Index = Map<string, Map<string, Map<string, number>>>;

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════

export function RelativeMedianIncomeRatioDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  // Filter state for time-series chart (which age threshold to show)
  const [trendAgeFilter, setTrendAgeFilter] = useState<AgeCode | 'all'>('all');
  // Year selector for comparison bar chart
  const [selectedYear, setSelectedYear] = useState<string>('');

  const allYears = useMemo(() => {
    const yrs = new Set<string>();
    for (const row of data) { if (row.Year) yrs.add(String(row.Year)); }
    return [...yrs].sort((a, b) => parseInt(a) - parseInt(b));
  }, [data]);

  const latestYear = allYears[allYears.length - 1] ?? '';
  const firstYear = allYears[0] ?? '';

  // Set default selected year once we know the years
  const resolvedYear = selectedYear || latestYear;

  // Build index: SILC_Agevs_Code → Gender_Code → year → value
  const index = useMemo<Index>(() => {
    const m: Index = new Map();
    for (const row of data) {
      const age = String(row.SILC_Agevs_Code ?? '');
      const gender = String(row.Gender_Code ?? '');
      const yr = String(row.Year ?? '');
      const val = getVal(row);
      if (!age || !gender || !yr || val == null) continue;
      if (!m.has(age)) m.set(age, new Map());
      if (!m.get(age)!.has(gender)) m.get(age)!.set(gender, new Map());
      m.get(age)!.get(gender)!.set(yr, val);
    }
    return m;
  }, [data]);

  // KPI: Total gender (0), latest year, age threshold 1 (65+)
  const kpi = useMemo(() => {
    const val65 = index.get('1')?.get('0')?.get(latestYear) ?? null;
    const val60 = index.get('5')?.get('0')?.get(latestYear) ?? null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    const prev65 = prevYear ? (index.get('1')?.get('0')?.get(prevYear) ?? null) : null;
    const yoy65 = val65 != null && prev65 != null
      ? ((val65 - prev65) / prev65) * 100 : null;
    // Male vs Female gap for age threshold 1
    const maleVal = index.get('1')?.get('1')?.get(latestYear) ?? null;
    const femaleVal = index.get('1')?.get('2')?.get(latestYear) ?? null;
    const gap = maleVal != null && femaleVal != null ? maleVal - femaleVal : null;
    return { val65, val60, yoy65, maleVal, femaleVal, gap };
  }, [index, latestYear, allYears]);

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
        <div>
          <CardTitle className="text-xl font-semibold text-slate-900">
            {isBg
              ? 'Относителен медианен доход на възрастното население'
              : 'Relative Median Income Ratio of Elderly Population'}
          </CardTitle>
          <CardDescription className="text-slate-500 mt-1">
            {isBg
              ? `Годишни данни (${firstYear}–${latestYear}) | Съотношение на медианния доход на пенсионерите спрямо останалото население`
              : `Annual data (${firstYear}–${latestYear}) | Ratio of median income of elderly vs. non-elderly population`}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Коефициент 65+ (Общо)' : 'Ratio 65+ (Total)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-indigo-600">
              {kpi.val65 != null ? ratioFmt(kpi.val65) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? '65+ спрямо под 65 години' : '65 years+ vs. under 65'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{latestYear}</span>
              {kpi.yoy65 != null && (
                <span className={`text-[10px] font-semibold ${kpi.yoy65 >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.yoy65 >= 0 ? '▲' : '▼'} {Math.abs(kpi.yoy65).toFixed(1)}% YoY
                </span>
              )}
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Коефициент 60+ (Общо)' : 'Ratio 60+ (Total)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-amber-500">
              {kpi.val60 != null ? ratioFmt(kpi.val60) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? '60+ спрямо под 60 години' : '60 years+ vs. under 60'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{latestYear}</span>
              {kpi.val65 != null && kpi.val60 != null && (
                <span className="text-[10px] text-slate-400">
                  {isBg ? 'Δ от 65+:' : 'Δ from 65+:'} {(kpi.val60 - kpi.val65 >= 0 ? '+' : '') + (kpi.val60 - kpi.val65).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Разлика Мъже / Жени (65+)' : 'Male / Female Gap (65+)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-violet-600">
              {kpi.maleVal != null ? ratioFmt(kpi.maleVal) : '—'}
              <span className="text-base font-normal text-slate-400 mx-1">/</span>
              {kpi.femaleVal != null ? ratioFmt(kpi.femaleVal) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Мъже / Жени' : 'Male / Female'}
            </p>
            {kpi.gap != null && (
              <p className="text-[10px] text-slate-400 mt-1">
                {isBg ? 'Разлика:' : 'Gap:'}{' '}
                <span className={`font-semibold ${kpi.gap > 0 ? 'text-blue-500' : 'text-pink-500'}`}>
                  {kpi.gap > 0 ? '+' : ''}{kpi.gap.toFixed(2)}
                  {' '}({kpi.gap > 0 ? (isBg ? 'в полза на мъжете' : 'favour men') : (isBg ? 'в полза на жените' : 'favour women')})
                </span>
              </p>
            )}
          </div>
        </div>

        {/* ── Chart A: Multi-line time series ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {isBg
                  ? 'А. Динамика на коефициента по пол'
                  : 'A. Relative Median Income Ratio Trend by Sex'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBg
                  ? `${firstYear}–${latestYear} | Мъже, Жени и Общо`
                  : `${firstYear}–${latestYear} | Male, Female, and Total`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs text-slate-500 whitespace-nowrap">
                {isBg ? 'Прагова група:' : 'Age threshold:'}
              </label>
              <Select
                value={trendAgeFilter}
                onChange={e => setTrendAgeFilter(e.target.value as AgeCode | 'all')}
                className="text-xs py-1 px-2 h-8 w-36"
              >
                <option value="all">{isBg ? 'И двете' : 'Both'}</option>
                <option value="1">{isBg ? AGE_LABEL_BG['1'] : AGE_LABEL_EN['1']}</option>
                <option value="5">{isBg ? AGE_LABEL_BG['5'] : AGE_LABEL_EN['5']}</option>
              </Select>
            </div>
          </div>
          <TrendChart
            index={index}
            allYears={allYears}
            isBg={isBg}
            ageFilter={trendAgeFilter}
          />
        </div>

        {/* ── Chart B: Grouped bar — gender × age threshold for selected year ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {isBg
                  ? 'Б. Сравнение по пол и прагова група'
                  : 'B. Age-Threshold Comparison by Sex'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBg
                  ? 'Групирана стълбова диаграма: коефициентът по двата прага и пол'
                  : 'Grouped bar: ratio by both age thresholds and sex side-by-side'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs text-slate-500 whitespace-nowrap">
                {isBg ? 'Година:' : 'Year:'}
              </label>
              <Select
                value={resolvedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="text-xs py-1 px-2 h-8 w-24"
              >
                {allYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </Select>
            </div>
          </div>
          <ComparisonBarChart
            index={index}
            year={resolvedYear}
            isBg={isBg}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-line trend: Male / Female / Total, filterable by age threshold
// ══════════════════════════════════════════════════════════════════════════════

function TrendChart({ index, allYears, isBg, ageFilter }: {
  index: Index;
  allYears: string[];
  isBg: boolean;
  ageFilter: AgeCode | 'all';
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const activeCodes = ageFilter === 'all' ? AGE_CODES : ([ageFilter] as AgeCode[]);

  const series = useMemo(() => {
    const result: {
      name: string;
      color: string;
      dash: 'solid' | 'dashed' | 'dotted';
      values: (number | null)[];
      ageCode: AgeCode;
      genderCode: GenderCode;
    }[] = [];

    for (const age of activeCodes) {
      for (const gender of GENDER_CODES) {
        const ageLabel = isBg ? AGE_LABEL_BG[age] : AGE_LABEL_EN[age];
        const genderLabel = isBg ? GENDER_LABEL_BG[gender] : GENDER_LABEL_EN[gender];
        // When showing both age thresholds, prefix with age; otherwise just gender
        const name = ageFilter === 'all'
          ? `${genderLabel} (${ageLabel})`
          : genderLabel;
        const values = allYears.map(yr => index.get(age)?.get(gender)?.get(yr) ?? null);
        // Skip if all null
        if (values.every(v => v == null)) continue;
        result.push({
          name,
          color: ageFilter === 'all' ? blendColor(GENDER_COLORS[gender], AGE_COLORS[age]) : GENDER_COLORS[gender],
          dash: GENDER_DASH[gender],
          values,
          ageCode: age,
          genderCode: gender,
        });
      }
    }
    return result;
  }, [index, allYears, isBg, ageFilter, activeCodes]);

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
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(2)}</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: series.map(s => s.name),
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 20, itemHeight: 8,
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
        name: isBg ? 'Коефициент' : 'Ratio',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => v.toFixed(2) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: (v: { min: number }) => Math.floor((v.min - 0.05) * 20) / 20,
        max: (v: { max: number }) => Math.ceil((v.max + 0.05) * 20) / 20,
      },
      series: series.map(s => ({
        name: s.name,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: 2.5, color: s.color, type: s.dash },
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, series, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Grouped bar: X = gender categories, grouped bars = age thresholds
// ══════════════════════════════════════════════════════════════════════════════

function ComparisonBarChart({ index, year, isBg }: {
  index: Index;
  year: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    const genderLabels = GENDER_CODES.map(g => isBg ? GENDER_LABEL_BG[g] : GENDER_LABEL_EN[g]);
    return {
      genderLabels,
      series: AGE_CODES.map(age => ({
        name: isBg ? AGE_LABEL_FULL_BG[age] : AGE_LABEL_FULL_EN[age],
        shortName: isBg ? AGE_LABEL_BG[age] : AGE_LABEL_EN[age],
        color: AGE_COLORS[age],
        values: GENDER_CODES.map(g => index.get(age)?.get(g)?.get(year) ?? null),
      })),
    };
  }, [index, year, isBg]);

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
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue} — ${year}</div>`;
          params.forEach((p: any) => {
            if (p.value == null) return;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(2)}</span>
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
      grid: { left: '1%', right: '4%', bottom: '20%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: chartData.genderLabels,
        axisLabel: { fontSize: 12, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'Коефициент' : 'Ratio',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => v.toFixed(2) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: (v: { min: number }) => Math.floor((v.min - 0.05) * 20) / 20,
        max: (v: { max: number }) => Math.ceil((v.max + 0.05) * 20) / 20,
      },
      series: chartData.series.map(s => ({
        name: s.name,
        type: 'bar' as const,
        data: s.values.map(v => ({
          value: v,
          itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0] },
        })),
        barMaxWidth: 70,
        label: {
          show: true,
          position: 'top' as const,
          fontSize: 11,
          fontWeight: 600,
          color: '#334155',
          formatter: (p: any) => p.value != null ? Number(p.value).toFixed(2) : '',
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, isBg, year]);

  return <div ref={chartRef} style={{ width: '100%', height: '360px' }} />;
}

// ── Color blending utility for "both" mode ────────────────────────────────────

function blendColor(gender: string, age: string): string {
  // Use age color but tint slightly toward gender color
  const pairs: Record<string, Record<string, string>> = {
    '#64748b': { '#6366f1': '#8b8fc5', '#f59e0b': '#a89c6e' }, // Total
    '#3b82f6': { '#6366f1': '#5b75f8', '#f59e0b': '#8b9ecc' }, // Male
    '#ec4899': { '#6366f1': '#c767c8', '#f59e0b': '#d07e7e' }, // Female
  };
  return pairs[gender]?.[age] ?? age;
}
