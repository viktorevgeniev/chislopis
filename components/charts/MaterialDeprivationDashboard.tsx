'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Static label maps ─────────────────────────────────────────────────────────

const GENDER_LABELS_EN: Record<string, string> = {
  '0': 'Total', '1': 'Male', '2': 'Female',
};
const GENDER_LABELS_BG: Record<string, string> = {
  '0': 'Общо', '1': 'Мъже', '2': 'Жени',
};
const GENDER_COLORS: Record<string, string> = {
  '0': '#6366f1', '1': '#3b82f6', '2': '#ec4899',
};

// Main age groups (broad)
const AGE_MAIN_CODES = ['1', '2', '3'];
const AGE_MAIN_LABELS_EN: Record<string, string> = {
  '1': '0–17 years', '2': '18–64 years', '3': '65+ years',
};
const AGE_MAIN_LABELS_BG: Record<string, string> = {
  '1': '0–17 години', '2': '18–64 години', '3': '65+ години',
};

// Child sub-groups
const AGE_CHILD_CODES = ['6', '7', '8'];
const AGE_CHILD_LABELS_EN: Record<string, string> = {
  '6': '0–5 years', '7': '6–11 years', '8': '12–17 years',
};
const AGE_CHILD_LABELS_BG: Record<string, string> = {
  '6': '0–5 години', '7': '6–11 години', '8': '12–17 години',
};

// All age codes including Total
const AGE_ALL_LABELS_EN: Record<string, string> = {
  '0': 'Total', ...AGE_MAIN_LABELS_EN, ...AGE_CHILD_LABELS_EN,
};
const AGE_ALL_LABELS_BG: Record<string, string> = {
  '0': 'Общо', ...AGE_MAIN_LABELS_BG, ...AGE_CHILD_LABELS_BG,
};

const AGE_COLORS: Record<string, string> = {
  '0': '#6366f1',
  '1': '#f59e0b',
  '2': '#3b82f6',
  '3': '#10b981',
  '6': '#f97316',
  '7': '#a855f7',
  '8': '#ef4444',
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

function getVal(row: any, col: string): number | null {
  const v = row?.[col];
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

type TrendSlice = 'gender' | 'age-main' | 'age-child';

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

export function MaterialDeprivationDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const [trendSlice, setTrendSlice] = useState<TrendSlice>('gender');

  const { allYears, latestYear } = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => { if (d.Year) years.add(String(d.Year)); });
    const sorted = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    return { allYears: sorted, latestYear: sorted[sorted.length - 1] ?? '' };
  }, [data]);

  const firstYear = allYears[0] ?? '';

  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const findNational = (yr: string, genderCode = '0', ageCode = '0') =>
      data.find(d =>
        String(d.NUTS_Code ?? d.NUTS ?? 'BG') === 'BG' &&
        String(d.Gender_Code ?? d.GenderID) === genderCode &&
        String(d.SILC_Age_Code ?? d.SILC_Age) === ageCode &&
        String(d.Year) === yr
      );

    const latest = findNational(latestYear);
    const prev = prevYear ? findNational(prevYear) : null;
    const latestRate = getVal(latest, 'Rate');
    const prevRate = getVal(prev, 'Rate');
    const yoy = latestRate != null && prevRate != null ? latestRate - prevRate : null;

    // Find highest-risk main age group
    const highestAge = AGE_MAIN_CODES.reduce<{ code: string; rate: number | null }>(
      (best, code) => {
        const row = findNational(latestYear, '0', code);
        const rate = getVal(row, 'Rate');
        return (rate ?? -Infinity) > (best.rate ?? -Infinity) ? { code, rate } : best;
      },
      { code: '1', rate: null }
    );

    // Gender gap: female rate minus male rate
    const maleRow = findNational(latestYear, '1', '0');
    const femaleRow = findNational(latestYear, '2', '0');
    const maleRate = getVal(maleRow, 'Rate');
    const femaleRate = getVal(femaleRow, 'Rate');
    const genderGap = maleRate != null && femaleRate != null ? femaleRate - maleRate : null;

    return { latestRate, yoy, latestYear, highestAge, genderGap, maleRate, femaleRate };
  }, [data, allYears, latestYear]);

  if (!data || data.length === 0 || !kpi) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const highestAgeLabel = isBg
    ? (AGE_MAIN_LABELS_BG[kpi.highestAge.code] ?? kpi.highestAge.code)
    : (AGE_MAIN_LABELS_EN[kpi.highestAge.code] ?? kpi.highestAge.code);

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Материални лишения по възраст и пол'
            : 'Material Deprivation Rate by Age and Sex'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Дял на материално лишените лица (% от населението)`
            : `Annual data (${firstYear}–${latestYear}) | Share of materially deprived persons (% of population)`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Национален дял (%)' : 'National rate (%)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-indigo-600">
              {kpi.latestRate != null ? `${kpi.latestRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Лица с материални лишения' : 'Persons in material deprivation'}
            </p>
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
              {isBg ? 'Най-засегната възрастова група' : 'Highest-risk age group'}
            </p>
            <p className="text-3xl font-bold mt-2 text-amber-500">
              {kpi.highestAge.rate != null ? `${kpi.highestAge.rate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{highestAgeLabel}</p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Полова разлика (жени − мъже)' : 'Gender gap (female − male)'}
            </p>
            <p className={`text-3xl font-bold mt-2 ${(kpi.genderGap ?? 0) >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
              {kpi.genderGap != null
                ? `${kpi.genderGap >= 0 ? '+' : ''}${kpi.genderGap.toFixed(1)}pp`
                : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg
                ? `Мъже: ${kpi.maleRate?.toFixed(1) ?? '—'}% / Жени: ${kpi.femaleRate?.toFixed(1) ?? '—'}%`
                : `Male: ${kpi.maleRate?.toFixed(1) ?? '—'}% / Female: ${kpi.femaleRate?.toFixed(1) ?? '—'}%`}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>
        </div>

        {/* ── Chart A: Trend Line ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {isBg
                  ? 'А. Динамика на материалните лишения (национално ниво)'
                  : 'A. Material Deprivation Trend (National Level)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isBg
                  ? `${firstYear}–${latestYear} | % от съответното население`
                  : `${firstYear}–${latestYear} | % of respective population`}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {(['gender', 'age-main', 'age-child'] as TrendSlice[]).map(s => (
                <button
                  key={s}
                  onClick={() => setTrendSlice(s)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    trendSlice === s
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {s === 'gender'
                    ? (isBg ? 'По пол' : 'By sex')
                    : s === 'age-main'
                    ? (isBg ? 'По възраст' : 'By age')
                    : (isBg ? 'Деца' : 'Children')}
                </button>
              ))}
            </div>
          </div>
          <TrendLineChart data={data} allYears={allYears} slice={trendSlice} locale={locale} />
        </div>

        {/* ── Chart B: Age breakdown bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Дял на материалните лишения по възрастови групи — ${latestYear}`
              : `B. Material Deprivation Rate by Age Group — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Сравнение на дяловете по основни и детайлни възрастови категории (общо за двата пола)'
              : 'Comparison across main and detailed age categories (both sexes combined)'}
          </p>
          <AgeBreakdownChart data={data} latestYear={latestYear} locale={locale} />
        </div>

        {/* ── Chart C: Grouped Bar (demographics) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `В. Материални лишения по пол и възрастова група — ${latestYear}`
              : `C. Material Deprivation by Sex and Age Group — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Групирани стойности по пол за всяка възрастова група'
              : 'Grouped values by sex for each age group'}
          </p>
          <GroupedDemographicsChart data={data} latestYear={latestYear} locale={locale} />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-Series Trend Line
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ data, allYears, slice, locale }: {
  data: any[];
  allYears: string[];
  slice: TrendSlice;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const findRow = (yr: string, genderCode: string, ageCode: string) =>
      data.find(d =>
        String(d.NUTS_Code ?? d.NUTS ?? 'BG') === 'BG' &&
        String(d.Gender_Code ?? d.GenderID) === genderCode &&
        String(d.SILC_Age_Code ?? d.SILC_Age) === ageCode &&
        String(d.Year) === yr
      );

    if (slice === 'gender') {
      return ['0', '1', '2'].map(code => ({
        label: isBg ? GENDER_LABELS_BG[code] : GENDER_LABELS_EN[code],
        color: GENDER_COLORS[code],
        values: allYears.map(yr => getVal(findRow(yr, code, '0'), 'Rate')),
      }));
    }

    if (slice === 'age-main') {
      return ['0', ...AGE_MAIN_CODES].map(code => ({
        label: isBg ? AGE_ALL_LABELS_BG[code] : AGE_ALL_LABELS_EN[code],
        color: AGE_COLORS[code],
        values: allYears.map(yr => getVal(findRow(yr, '0', code), 'Rate')),
      }));
    }

    // age-child
    return AGE_CHILD_CODES.map(code => ({
      label: isBg ? AGE_CHILD_LABELS_BG[code] : AGE_CHILD_LABELS_EN[code],
      color: AGE_COLORS[code],
      values: allYears.map(yr => getVal(findRow(yr, '0', code), 'Rate')),
    }));
  }, [data, allYears, slice, isBg]);

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
      grid: { left: '1%', right: '3%', bottom: '18%', top: '4%', containLabel: true },
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
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Horizontal Bar (age group breakdown, latest year)
// ══════════════════════════════════════════════════════════════════════════════

function AgeBreakdownChart({ data, latestYear, locale }: {
  data: any[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const AGE_ORDERED = ['1', '6', '7', '8', '2', '3'];

  const { categories, values, colors } = useMemo(() => {
    const items = AGE_ORDERED.map(code => {
      const row = data.find(d =>
        String(d.NUTS_Code ?? d.NUTS ?? 'BG') === 'BG' &&
        String(d.Gender_Code ?? d.GenderID) === '0' &&
        String(d.SILC_Age_Code ?? d.SILC_Age) === code &&
        String(d.Year) === latestYear
      );
      return {
        label: isBg ? AGE_ALL_LABELS_BG[code] : AGE_ALL_LABELS_EN[code],
        value: getVal(row, 'Rate'),
        color: AGE_COLORS[code],
      };
    }).filter(item => item.value != null);

    return {
      categories: items.map(i => i.label),
      values: items.map(i => i.value),
      colors: items.map(i => i.color),
    };
  }, [data, latestYear, isBg]);

  useEffect(() => {
    if (!chartRef.current || categories.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.axisValue}</div>
            <div>${isBg ? 'Дял с материални лишения' : 'Material deprivation rate'}: <b>${p.value != null ? Number(p.value).toFixed(1) + '%' : '—'}</b></div>`;
        },
      },
      grid: { left: '2%', right: '12%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? '% от групата' : '% of group',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        max: (v: { max: number }) => Math.ceil(v.max * 1.12),
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: { fontSize: 12, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i], borderRadius: [0, 6, 6, 0], opacity: 0.9 },
        })),
        barMaxWidth: 52,
        label: {
          show: true,
          position: 'right' as const,
          fontSize: 13,
          fontWeight: 'bold' as const,
          color: '#334155',
          formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
        },
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [categories, values, colors, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Grouped Bar (sex × main age groups)
// ══════════════════════════════════════════════════════════════════════════════

function GroupedDemographicsChart({ data, latestYear, locale }: {
  data: any[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { ageLabels, seriesData } = useMemo(() => {
    const labels = AGE_MAIN_CODES.map(code =>
      isBg ? AGE_MAIN_LABELS_BG[code] : AGE_MAIN_LABELS_EN[code]
    );

    const series = ['0', '1', '2'].map(gCode => ({
      label: isBg ? GENDER_LABELS_BG[gCode] : GENDER_LABELS_EN[gCode],
      color: GENDER_COLORS[gCode],
      values: AGE_MAIN_CODES.map(aCode => {
        const row = data.find(d =>
          String(d.NUTS_Code ?? d.NUTS ?? 'BG') === 'BG' &&
          String(d.Gender_Code ?? d.GenderID) === gCode &&
          String(d.SILC_Age_Code ?? d.SILC_Age) === aCode &&
          String(d.Year) === latestYear
        );
        return getVal(row, 'Rate');
      }),
    }));

    return { ageLabels: labels, seriesData: series };
  }, [data, latestYear, isBg]);

  useEffect(() => {
    if (!chartRef.current || ageLabels.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0]?.axisValue}</div>`;
          params
            .filter((p: any) => p.value != null)
            .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
            .forEach((p: any) => {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:10px;height:10px;background:${p.color};border-radius:2px"></span>
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
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 12, itemHeight: 10,
      },
      grid: { left: '1%', right: '2%', bottom: '18%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ageLabels,
        axisLabel: { fontSize: 11, color: '#475569', interval: 0 },
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
        type: 'bar' as const,
        data: s.values.map(v => ({
          value: v,
          itemStyle: { opacity: 0.9 },
        })),
        itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 60,
        label: {
          show: true,
          position: 'top' as const,
          fontSize: 11,
          fontWeight: 'bold' as const,
          color: '#334155',
          formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
        },
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [ageLabels, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
