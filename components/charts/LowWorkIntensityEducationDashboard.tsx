'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Dimension constants ────────────────────────────────────────────────────────
// SILC_Edu codes (from codelists CSV):
//   "1" → (0-2) Pre-primary, primary and lower secondary education
//   "2" → (3-4) Upper secondary and post-secondary and non-tertiary education
//   "3" → (5-6) First and second stage tertiary education
// GenderID codes: "0"=Total, "1"=Male, "2"=Female

const EDU_ORDER = ['1', '2', '3'] as const;

const EDU_LABELS_EN: Record<string, string> = {
  '1': 'Pre-primary / Primary (0–2)',
  '2': 'Upper Secondary (3–4)',
  '3': 'Tertiary (5–6)',
};
const EDU_LABELS_BG: Record<string, string> = {
  '1': 'Основно и по-ниско (0–2)',
  '2': 'Средно и постсредно (3–4)',
  '3': 'Висше (5–6)',
};

// Red → amber → emerald: higher education = lower rate = better
const EDU_COLORS: Record<string, string> = {
  '1': '#ef4444', // red    — lowest education, highest rate
  '2': '#f59e0b', // amber  — middle
  '3': '#10b981', // emerald — tertiary, lowest rate
};

const GENDER_ORDER = ['0', '1', '2'] as const;
const GENDER_LABELS_EN: Record<string, string> = { '0': 'Total', '1': 'Male', '2': 'Female' };
const GENDER_LABELS_BG: Record<string, string> = { '0': 'Общо', '1': 'Мъже', '2': 'Жени' };
const GENDER_COLORS: Record<string, string> = {
  '0': '#64748b',
  '1': '#3b82f6',
  '2': '#ec4899',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRate(row: any): number | null {
  if (!row) return null;
  const v = row.Rate ?? row.ValueColumn ?? row.value;
  if (v == null || v === '' || v === '.' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

function eduLabel(code: string, isBg: boolean): string {
  return isBg ? (EDU_LABELS_BG[code] ?? code) : (EDU_LABELS_EN[code] ?? code);
}
function genderLabel(code: string, isBg: boolean): string {
  return isBg ? (GENDER_LABELS_BG[code] ?? code) : (GENDER_LABELS_EN[code] ?? code);
}

function tooltipBase() {
  return {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export function LowWorkIntensityEducationDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const [selectedGender, setSelectedGender] = useState<string>('0');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const { allYears, latestYear, firstYear } = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => { if (d.Year) years.add(String(d.Year)); });
    const sorted = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    return {
      allYears: sorted,
      latestYear: sorted[sorted.length - 1] ?? '',
      firstYear: sorted[0] ?? '',
    };
  }, [data]);

  React.useEffect(() => {
    if (latestYear && !selectedYear) setSelectedYear(latestYear);
  }, [latestYear, selectedYear]);

  // KPI — latest year, Total gender (code=0), per education level
  const kpis = useMemo(() => {
    if (!latestYear) return [];
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    return EDU_ORDER.map(eduCode => {
      const row = data.find(d =>
        String(d.SILC_Edu_Code) === eduCode &&
        String(d.Gender_Code) === '0' &&
        String(d.Year) === latestYear
      );
      const prevRow = prevYear
        ? data.find(d =>
            String(d.SILC_Edu_Code) === eduCode &&
            String(d.Gender_Code) === '0' &&
            String(d.Year) === prevYear
          )
        : null;
      const rate = getRate(row);
      const prevRate = getRate(prevRow);
      return {
        eduCode,
        label: eduLabel(eduCode, isBg),
        rate,
        change: rate != null && prevRate != null ? rate - prevRate : null,
        prevYear,
        color: EDU_COLORS[eduCode] ?? '#94a3b8',
      };
    });
  }, [data, allYears, latestYear, isBg]);

  // Education gap: difference between lowest and highest education in latest year
  const eduGap = useMemo(() => {
    const low = kpis.find(k => k.eduCode === '1')?.rate;
    const high = kpis.find(k => k.eduCode === '3')?.rate;
    if (low == null || high == null) return null;
    return (low - high).toFixed(1);
  }, [kpis]);

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
            ? 'Лица в домакинства с нисък интензитет на работа по образование'
            : 'People in Households with Low Work Intensity — by Education'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | % от съответната образователна група население`
            : `Annual data (${firstYear}–${latestYear}) | % of corresponding population group`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {kpis.map(k => (
            <div
              key={k.eduCode}
              className="bg-white shadow-sm rounded-xl p-5"
              style={{ borderLeft: `4px solid ${k.color}` }}
            >
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-4">
                {k.label}
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: k.color }}>
                {k.rate != null ? `${k.rate.toFixed(1)}%` : '—'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {k.change != null && (
                  <span className={`text-xs font-semibold ${k.change <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {k.change <= 0 ? '▼' : '▲'} {Math.abs(k.change).toFixed(1)} pp
                  </span>
                )}
                {k.prevYear && (
                  <span className="text-xs text-slate-400">
                    {isBg ? 'от ' : 'vs '}{k.prevYear}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {latestYear} | {isBg ? 'Общо (двата пола)' : 'Total (both sexes)'}
              </p>
            </div>
          ))}
        </div>

        {/* Education gap insight callout */}
        {eduGap != null && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-red-600">
              {isBg ? 'Образователна разлика:' : 'Education gap:'}
            </span>{' '}
            {isBg
              ? `В ${latestYear} лицата с начално или основно образование са с ${eduGap} пр. пункта по-засегнати от тези с висше образование — ясна обратна корелация между образованието и ниския трудов интензитет.`
              : `In ${latestYear}, people with pre-primary/primary education face a rate ${eduGap} percentage points higher than those with tertiary education — a clear inverse correlation between education level and low work intensity.`}
          </div>
        )}

        {/* ── Chart A: Multi-line time-series trend by education level ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {isBg
                  ? 'А. Историческа тенденция по ниво на образование'
                  : 'A. Trend by Education Level Over Time'}
              </h3>
              <p className="text-xs text-slate-400">
                {isBg
                  ? `${firstYear}–${latestYear} | % от съответната образователна група`
                  : `${firstYear}–${latestYear} | % of corresponding education group`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{isBg ? 'Пол:' : 'Sex:'}</span>
              <select
                value={selectedGender}
                onChange={e => setSelectedGender(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white"
              >
                {GENDER_ORDER.map(g => (
                  <option key={g} value={g}>{genderLabel(g, isBg)}</option>
                ))}
              </select>
            </div>
          </div>
          <TrendByEducationChart
            data={data}
            allYears={allYears}
            genderCode={selectedGender}
            locale={locale}
          />
        </div>

        {/* ── Chart B: Grouped bar — Male vs Female by education level ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {isBg
                  ? `Б. Сравнение по пол и образование — ${selectedYear}`
                  : `B. Gender Breakdown by Education Level — ${selectedYear}`}
              </h3>
              <p className="text-xs text-slate-400">
                {isBg
                  ? 'Мъже срещу Жени по образователен клас'
                  : 'Male vs Female across education tiers'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{isBg ? 'Година:' : 'Year:'}</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white"
              >
                {allYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <GenderByEducationBarChart
            data={data}
            year={selectedYear}
            locale={locale}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-line trend: 3 lines (one per education level), gender selectable
// ══════════════════════════════════════════════════════════════════════════════

function TrendByEducationChart({ data, allYears, genderCode, locale }: {
  data: any[];
  allYears: string[];
  genderCode: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return EDU_ORDER.map(eduCode => {
      const label = eduLabel(eduCode, isBg);
      const color = EDU_COLORS[eduCode] ?? '#94a3b8';
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (String(d.SILC_Edu_Code) !== eduCode) return;
        if (String(d.Gender_Code) !== genderCode) return;
        if (!d.Year) return;
        byYear[String(d.Year)] = getRate(d);
      });
      return { label, color, values: allYears.map(y => byYear[y] ?? null) };
    });
  }, [data, allYears, genderCode, isBg]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipBase(),
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
      grid: { left: '1%', right: '3%', bottom: '15%', top: '4%', containLabel: true },
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
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => `${v}%` },
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
        symbolSize: 7,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Grouped bar: education levels on x-axis, Male / Female as series
// ══════════════════════════════════════════════════════════════════════════════

function GenderByEducationBarChart({ data, year, locale }: {
  data: any[];
  year: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { categories, series } = useMemo(() => {
    const cats = EDU_ORDER.map(c => eduLabel(c, isBg));
    // Show Male (1) and Female (2) — exclude Total for a cleaner gender comparison
    const genderSeries = (['1', '2'] as const).map(gCode => {
      const label = genderLabel(gCode, isBg);
      const color = GENDER_COLORS[gCode] ?? '#94a3b8';
      const values = EDU_ORDER.map(eduCode => {
        const row = data.find(d =>
          String(d.SILC_Edu_Code) === eduCode &&
          String(d.Gender_Code) === gCode &&
          String(d.Year) === year
        );
        return getRate(row);
      });
      return { name: label, color, values };
    });
    return { categories: cats, series: genderSeries };
  }, [data, year, isBg]);

  useEffect(() => {
    if (!chartRef.current || !year) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          [...params]
            .filter((p: any) => p.value != null)
            .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
            .forEach((p: any) => {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)}%</span>
              </div>`;
            });
          return tip;
        },
      },
      legend: {
        data: series.map(s => s.name),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '1%', right: '3%', bottom: '15%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          fontSize: 11,
          color: '#475569',
          interval: 0,
          width: 120,
          overflow: 'break' as const,
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: series.map(s => ({
        name: s.name,
        type: 'bar' as const,
        data: s.values.map(v => ({
          value: v,
          itemStyle: {
            color: s.color,
            borderRadius: [4, 4, 0, 0] as [number, number, number, number],
            opacity: v == null ? 0 : 0.85,
          },
        })),
        barMaxWidth: 56,
        label: {
          show: true,
          position: 'top' as const,
          fontSize: 11,
          fontWeight: 'bold' as const,
          color: '#334155',
          formatter: (p: any) => p.value != null ? `${Number(p.value).toFixed(1)}%` : '',
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [categories, series, year]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}
