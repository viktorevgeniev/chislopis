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

const AGE_LABELS_EN: Record<string, string> = {
  '0': 'Total', '1': '0–17 years', '2': '18–64 years', '3': '65+ years',
};
const AGE_LABELS_BG: Record<string, string> = {
  '0': 'Общо', '1': '0–17 години', '2': '18–64 години', '3': '65+ години',
};
const AGE_COLORS: Record<string, string> = {
  '0': '#6366f1', '1': '#f59e0b', '2': '#3b82f6', '3': '#10b981',
};

const NUTS2_CODES = ['BG31', 'BG32', 'BG33', 'BG34', 'BG41', 'BG42'];
const NUTS2_LABELS_EN: Record<string, string> = {
  'BG31': 'Severozapaden', 'BG32': 'Severen tsentralen',
  'BG33': 'Severoiztochen', 'BG34': 'Yugoiztochen',
  'BG41': 'Yugozapaden', 'BG42': 'Yuzhen tsentralen',
};
const NUTS2_LABELS_BG: Record<string, string> = {
  'BG31': 'Северозападен', 'BG32': 'Северен централен',
  'BG33': 'Североизточен', 'BG34': 'Югоизточен',
  'BG41': 'Югозападен', 'BG42': 'Южен централен',
};
const NUTS2_COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#f97316'];

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

type TrendSlice = 'gender' | 'age';

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

export function RiskPovertyExclusionAgeSexDashboard({ data, locale = 'en' }: Props) {
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

    const findNational = (yr: string) =>
      data.find(d =>
        String(d.NUTS_Code) === 'BG' &&
        String(d.Gender_Code) === '0' &&
        String(d.SILC_Age_Code) === '0' &&
        String(d.Units_Code) === 'perc_pop_fig' &&
        String(d.Year) === yr
      );

    const latest = findNational(latestYear);
    const prev = prevYear ? findNational(prevYear) : null;
    const latestRate = getVal(latest, 'Rate');
    const prevRate = getVal(prev, 'Rate');
    const yoy = latestRate != null && prevRate != null ? latestRate - prevRate : null;

    const highestAge = ['1', '2', '3'].reduce<{ code: string; rate: number | null }>(
      (best, code) => {
        const row = data.find(d =>
          String(d.NUTS_Code) === 'BG' && String(d.Gender_Code) === '0' &&
          String(d.SILC_Age_Code) === code && String(d.Units_Code) === 'perc_pop_fig' &&
          String(d.Year) === latestYear
        );
        const rate = getVal(row, 'Rate');
        return (rate ?? -Infinity) > (best.rate ?? -Infinity) ? { code, rate } : best;
      },
      { code: '1', rate: null }
    );

    const highestRegion = NUTS2_CODES.reduce<{ code: string; rate: number | null }>(
      (best, code) => {
        const row = data.find(d =>
          String(d.NUTS_Code) === code && String(d.Gender_Code) === '0' &&
          String(d.SILC_Age_Code) === '0' && String(d.Units_Code) === 'perc_pop_fig' &&
          String(d.Year) === latestYear
        );
        const rate = getVal(row, 'Rate');
        return (rate ?? -Infinity) > (best.rate ?? -Infinity) ? { code, rate } : best;
      },
      { code: NUTS2_CODES[0], rate: null }
    );

    return { latestRate, yoy, latestYear, highestAge, highestRegion };
  }, [data, allYears, latestYear]);

  if (!data || data.length === 0 || !kpi) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const highestAgeLabel = isBg
    ? (AGE_LABELS_BG[kpi.highestAge.code] ?? kpi.highestAge.code)
    : (AGE_LABELS_EN[kpi.highestAge.code] ?? kpi.highestAge.code);
  const highestRegionLabel = isBg
    ? (NUTS2_LABELS_BG[kpi.highestRegion.code] ?? kpi.highestRegion.code)
    : (NUTS2_LABELS_EN[kpi.highestRegion.code] ?? kpi.highestRegion.code);

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Лица в риск от бедност или социално изключване по възраст и пол'
            : 'People at Risk of Poverty or Social Exclusion by Age and Sex'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Комбиниран индикатор AROPE`
            : `Annual data (${firstYear}–${latestYear}) | Combined AROPE indicator`}
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
              {isBg ? 'В риск от бедност или изключване' : 'At-risk of poverty or exclusion'}
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
              {isBg ? 'Най-застрашена възрастова група' : 'Highest-risk age group'}
            </p>
            <p className="text-3xl font-bold mt-2 text-amber-500">
              {kpi.highestAge.rate != null ? `${kpi.highestAge.rate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{highestAgeLabel}</p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Най-засегнат регион' : 'Highest-risk region'}
            </p>
            <p className="text-3xl font-bold mt-2 text-rose-600">
              {kpi.highestRegion.rate != null ? `${kpi.highestRegion.rate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{highestRegionLabel}</p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>
        </div>

        {/* ── Chart A: Trend Line ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {isBg
                  ? 'А. Динамика на риска от бедност (национално ниво)'
                  : 'A. Poverty Risk Trend (National Level)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isBg
                  ? `${firstYear}–${latestYear} | % от населението`
                  : `${firstYear}–${latestYear} | % of population`}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setTrendSlice('gender')}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  trendSlice === 'gender'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {isBg ? 'По пол' : 'By sex'}
              </button>
              <button
                onClick={() => setTrendSlice('age')}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  trendSlice === 'age'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {isBg ? 'По възраст' : 'By age'}
              </button>
            </div>
          </div>
          <TrendLineChart data={data} allYears={allYears} slice={trendSlice} locale={locale} />
        </div>

        {/* ── Chart B: Regional Bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Регионален дял на риска — ${latestYear}`
              : `B. Regional Poverty Risk Rate — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Дял на лицата в риск от бедност или социално изключване по статистически райони'
              : 'Share of people at risk of poverty or social exclusion by statistical region'}
          </p>
          <RegionalBarChart data={data} latestYear={latestYear} locale={locale} />
        </div>

        {/* ── Chart C: Stacked Age Bar ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `В. Брой лица в риск по възрастови групи и региони — ${latestYear}`
              : `C. At-Risk Population by Age Group and Region — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Абсолютни стойности (хиляди лица) по статистически район и възрастова група'
              : 'Absolute values (thousands of persons) by statistical region and age group'}
          </p>
          <StackedAgeBarChart data={data} latestYear={latestYear} locale={locale} />
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
    const codes = slice === 'gender' ? ['0', '1', '2'] : ['0', '1', '2', '3'];
    return codes.map(code => {
      const label = slice === 'gender'
        ? (isBg ? GENDER_LABELS_BG[code] : GENDER_LABELS_EN[code])
        : (isBg ? AGE_LABELS_BG[code] : AGE_LABELS_EN[code]);
      const color = slice === 'gender' ? GENDER_COLORS[code] : AGE_COLORS[code];
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (
          String(d.NUTS_Code) !== 'BG' ||
          String(d.Units_Code) !== 'perc_pop_fig' ||
          !d.Year
        ) return;
        if (slice === 'gender') {
          if (String(d.Gender_Code) !== code || String(d.SILC_Age_Code) !== '0') return;
        } else {
          if (String(d.Gender_Code) !== '0' || String(d.SILC_Age_Code) !== code) return;
        }
        byYear[String(d.Year)] = getVal(d, 'Rate');
      });
      return { label, color, values: allYears.map(y => byYear[y] ?? null) };
    });
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
// Chart B — Horizontal Bar (Regional snapshot, latest year)
// ══════════════════════════════════════════════════════════════════════════════

function RegionalBarChart({ data, latestYear, locale }: {
  data: any[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { categories, values, colors } = useMemo(() => {
    const items = NUTS2_CODES.map((code, i) => {
      const row = data.find(d =>
        String(d.NUTS_Code) === code &&
        String(d.Gender_Code) === '0' &&
        String(d.SILC_Age_Code) === '0' &&
        String(d.Units_Code) === 'perc_pop_fig' &&
        String(d.Year) === latestYear
      );
      return {
        label: isBg ? (NUTS2_LABELS_BG[code] ?? code) : (NUTS2_LABELS_EN[code] ?? code),
        value: getVal(row, 'Rate'),
        color: NUTS2_COLORS[i],
      };
    }).sort((a, b) => (a.value ?? 0) - (b.value ?? 0));

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
            <div>${isBg ? 'Дял в риск' : 'At-risk rate'}: <b>${p.value != null ? Number(p.value).toFixed(1) + '%' : '—'}</b></div>`;
        },
      },
      grid: { left: '2%', right: '10%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? '% от населението' : '% of population',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        max: (v: { max: number }) => Math.ceil(v.max * 1.15),
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
// Chart C — Stacked Bar (absolute numbers by age group × NUTS2 region)
// ══════════════════════════════════════════════════════════════════════════════

function StackedAgeBarChart({ data, latestYear, locale }: {
  data: any[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const AGE_STACK_CODES = ['1', '2', '3'];

  const { regions, seriesData } = useMemo(() => {
    const regionLabels = NUTS2_CODES.map(code =>
      isBg ? (NUTS2_LABELS_BG[code] ?? code) : (NUTS2_LABELS_EN[code] ?? code)
    );
    const series = AGE_STACK_CODES.map(ageCode => ({
      label: isBg ? AGE_LABELS_BG[ageCode] : AGE_LABELS_EN[ageCode],
      color: AGE_COLORS[ageCode],
      values: NUTS2_CODES.map(nutsCode => {
        const row = data.find(d =>
          String(d.NUTS_Code) === nutsCode &&
          String(d.Gender_Code) === '0' &&
          String(d.SILC_Age_Code) === ageCode &&
          String(d.Units_Code) === '1000cp' &&
          String(d.Year) === latestYear
        );
        return getVal(row, 'Rate');
      }),
    }));
    return { regions: regionLabels, seriesData: series };
  }, [data, latestYear, isBg]);

  useEffect(() => {
    if (!chartRef.current || regions.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0]?.axisValue}</div>`;
          let total = 0;
          params.forEach((p: any) => {
            if (p.value != null) {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:10px;height:10px;background:${p.color};border-radius:2px"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)}k</span>
              </div>`;
              total += Number(p.value);
            }
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:4px;padding-top:4px;font-weight:600">
            ${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)}k
          </div>`;
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
        data: regions,
        axisLabel: { fontSize: 11, color: '#475569', interval: 0, overflow: 'truncate' as const, width: 90 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'хил. лица' : 'thousands',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'bar' as const,
        stack: 'age',
        data: s.values,
        itemStyle: { color: s.color, opacity: 0.9 },
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [regions, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
