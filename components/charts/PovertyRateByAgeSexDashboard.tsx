'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Shared constants ──────────────────────────────────────────────────────────

// SILC_Median threshold code → short label for legends
const THRESHOLD_LABELS: Record<string, { en: string; bg: string; color: string }> = {
  '1': { en: '40% median', bg: '40% медиана', color: '#7c3aed' },
  '2': { en: '50% median', bg: '50% медиана', color: '#0891b2' },
  '3': { en: '60% median', bg: '60% медиана', color: '#059669' },
  '4': { en: '70% median', bg: '70% медиана', color: '#d97706' },
};

const GENDER_COLORS: Record<string, string> = {
  '0': '#0f172a',
  '1': '#3b82f6',
  '2': '#e11d48',
};

const REGION_COLORS: Record<string, string> = {
  BG: '#1e293b',
  BG31: '#7c3aed',
  BG32: '#0891b2',
  BG33: '#059669',
  BG34: '#d97706',
  BG41: '#dc2626',
  BG42: '#db2777',
};

function getRate(row: any): number | null {
  if (row == null) return null;
  const v = row.Rate;
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const raw = typeof v === 'string' ? v.replace(/[()]/g, '') : v;
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  return isNaN(n) ? null : n;
}

function nutsLevel(code: string): number {
  if (code === 'BG') return 0;
  if (code.length === 4) return 2;
  if (code.length === 5) return 3;
  return -1;
}

function tooltipBase(): Partial<EChartsOption['tooltip']> {
  return {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function PovertyRateByAgeSexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  // ── Derive dimensional catalogs ──────────────────────────────────────────────
  const { allYears, ageGroups, genderOptions, thresholds, nuts2Regions } = useMemo(() => {
    const years = new Set<string>();
    const ageMap = new Map<string, string>();
    const genderMap = new Map<string, string>();
    const thresholdMap = new Map<string, string>();
    const n2Map = new Map<string, string>();

    data.forEach(d => {
      if (d.Year) years.add(d.Year);

      const ac = d.SILC_Age_Code || '';
      if (ac && !ageMap.has(ac)) ageMap.set(ac, d.SILC_Age || ac);

      const gc = d.Gender_Code || '';
      if (gc && !genderMap.has(gc)) genderMap.set(gc, d.Gender || gc);

      const tc = d.SILC_Median_Code || '';
      if (tc && !thresholdMap.has(tc)) thresholdMap.set(tc, d.SILC_Median || tc);

      const nc = d.NUTS_Code || '';
      if (nutsLevel(nc) === 2 && !n2Map.has(nc)) n2Map.set(nc, d.NUTS || nc);
    });

    return {
      allYears: [...years].sort((a, b) => parseInt(a) - parseInt(b)),
      ageGroups: [...ageMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
      genderOptions: [...genderMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
      thresholds: [...thresholdMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
      nuts2Regions: [...n2Map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
    };
  }, [data]);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedThreshold, setSelectedThreshold] = useState('3'); // default: 60% median (standard poverty line)
  const [selectedGender, setSelectedGender] = useState('0');

  const latestYear = allYears[allYears.length - 1] || '';
  const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : '';
  const firstYear = allYears[0] || '';

  useEffect(() => {
    if (allYears.length > 0 && !selectedYear) setSelectedYear(latestYear);
  }, [allYears, selectedYear, latestYear]);

  const activeYear = selectedYear || latestYear;

  // ── KPI cards (national, total, 60%-threshold, all ages) ────────────────────
  const kpiData = useMemo(() => {
    if (!latestYear) return null;

    const find = (year: string, threshold: string, gender: string, age: string) =>
      data.find(d =>
        d.Year === year && d.NUTS_Code === 'BG' &&
        d.SILC_Median_Code === threshold && d.Gender_Code === gender && d.SILC_Age_Code === age
      );

    const totalRate = getRate(find(latestYear, '3', '0', '0'));
    const maleRate  = getRate(find(latestYear, '3', '1', '0'));
    const femaleRate = getRate(find(latestYear, '3', '2', '0'));
    const prevTotal  = prevYear ? getRate(find(prevYear, '3', '0', '0')) : null;
    const yoyChange  = totalRate != null && prevTotal != null ? totalRate - prevTotal : null;
    const genderGap  = maleRate != null && femaleRate != null ? femaleRate - maleRate : null;

    const childRate   = getRate(find(latestYear, '3', '0', '1'));
    const workingRate = getRate(find(latestYear, '3', '0', '2'));
    const elderlyRate = getRate(find(latestYear, '3', '0', '3'));

    return { latestYear, totalRate, maleRate, femaleRate, yoyChange, genderGap, childRate, workingRate, elderlyRate };
  }, [data, latestYear, prevYear]);

  if (!data || data.length === 0 || !kpiData) {
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
            ? 'Относителен дял на бедните по възраст и пол'
            : 'At-Risk-of-Poverty Rate by Age and Sex'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear} – ${latestYear}) | Единица: % от населението`
            : `Annual Data (${firstYear} – ${latestYear}) | Unit: % of population`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Национално (60%)' : 'National Rate (60%)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">
              {kpiData.totalRate != null ? `${kpiData.totalRate.toFixed(1)}%` : '\u2014'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-400">{kpiData.latestYear}</p>
              {kpiData.yoyChange != null && (
                <span className={`text-xs font-semibold ${kpiData.yoyChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpiData.yoyChange <= 0 ? '\u25bc' : '\u25b2'} {Math.abs(kpiData.yoyChange).toFixed(1)}pp {isBg ? 'г/г' : 'YoY'}
                </span>
              )}
            </div>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Мъже / Жени (60%)' : 'Male / Female (60%)'}
            </p>
            <p className="text-2xl font-bold mt-2">
              <span className="text-blue-600">{kpiData.maleRate != null ? kpiData.maleRate.toFixed(1) : '\u2014'}</span>
              <span className="text-slate-300"> / </span>
              <span className="text-rose-600">{kpiData.femaleRate != null ? kpiData.femaleRate.toFixed(1) : '\u2014'}</span>
              <span className="text-sm text-slate-400">%</span>
            </p>
            {kpiData.genderGap != null && (
              <p className="text-xs text-slate-400 mt-1">
                {isBg ? 'Разлика' : 'Gap'}: {kpiData.genderGap > 0 ? '+' : ''}{kpiData.genderGap.toFixed(1)}pp
              </p>
            )}
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Деца / Раб. Въз. / 65+' : 'Children / Working / 65+'}
            </p>
            <div className="flex gap-3 mt-2">
              <div>
                <p className="text-lg font-bold text-amber-600">
                  {kpiData.childRate != null ? `${kpiData.childRate.toFixed(1)}%` : '\u2014'}
                </p>
                <p className="text-[10px] text-slate-400">0-17</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-600">
                  {kpiData.workingRate != null ? `${kpiData.workingRate.toFixed(1)}%` : '\u2014'}
                </p>
                <p className="text-[10px] text-slate-400">18-64</p>
              </div>
              <div>
                <p className="text-lg font-bold text-violet-600">
                  {kpiData.elderlyRate != null ? `${kpiData.elderlyRate.toFixed(1)}%` : '\u2014'}
                </p>
                <p className="text-[10px] text-slate-400">65+</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Прагове на бедност' : 'Income Thresholds'}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {thresholds.map(t => (
                <span key={t.code}
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: THRESHOLD_LABELS[t.code]?.color + '20', color: THRESHOLD_LABELS[t.code]?.color }}
                >
                  {isBg ? THRESHOLD_LABELS[t.code]?.bg : THRESHOLD_LABELS[t.code]?.en}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3 bg-white shadow-sm rounded-xl px-4 py-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {isBg ? 'Филтри' : 'Filters'}
          </span>
          <Select
            value={activeYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
          >
            {[...allYears].reverse().map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          <Select
            value={selectedThreshold}
            onChange={e => setSelectedThreshold(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
          >
            {thresholds.map(t => (
              <option key={t.code} value={t.code}>
                {isBg ? THRESHOLD_LABELS[t.code]?.bg : THRESHOLD_LABELS[t.code]?.en}
              </option>
            ))}
          </Select>
          <Select
            value={selectedGender}
            onChange={e => setSelectedGender(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
          >
            {genderOptions.map(g => (
              <option key={g.code} value={g.code}>{g.label}</option>
            ))}
          </Select>
        </div>

        {/* ── Chart A: Poverty Trend by Income Threshold (Line) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Времева динамика по праг на бедност' : 'A. Poverty Trend by Income Threshold'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Относителен дял на бедните (% от нас.) по четирите прага — България, всички възрасти, избран пол'
              : 'Poverty rate (% of pop.) across all four thresholds — Bulgaria, all ages, selected gender'}
          </p>
          <ThresholdTrendChart
            data={data}
            allYears={allYears}
            thresholds={thresholds}
            selectedGender={selectedGender}
            locale={locale}
          />
        </div>

        {/* ── Charts B & C side by side ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart B: Demographic Grouped Bar (Age × Gender) */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Демографски профил' : 'B. Demographic Breakdown'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg
                ? 'Дял по възраст и пол — национален, избран праг и година'
                : 'Rate by age group and gender — national, selected threshold & year'}
            </p>
            <DemographicBarChart
              data={data}
              ageGroups={ageGroups}
              genderOptions={genderOptions}
              activeYear={activeYear}
              selectedThreshold={selectedThreshold}
              locale={locale}
            />
          </div>

          {/* Chart C: Regional Horizontal Bar (NUTS-2) */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Регионален разрез (NUTS-2)' : 'C. Regional Breakdown (NUTS-2)'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg
                ? 'Относителен дял на бедните по макрорегиони — избрана година, праг и пол'
                : 'Poverty rate by macro-regions — selected year, threshold & gender'}
            </p>
            <RegionalBarChart
              data={data}
              nuts2Regions={nuts2Regions}
              activeYear={activeYear}
              selectedThreshold={selectedThreshold}
              selectedGender={selectedGender}
              locale={locale}
            />
          </div>
        </div>

        {/* ── Chart D: Threshold Comparison for Selected Year (Grouped Bar) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Г. Сравнение на прагове по пол и възраст' : 'D. Threshold Comparison by Gender & Age'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `Всички четири прага за ${activeYear} — по пол (общо ниво). Показва сензитивността спрямо дефиницията.`
              : `All four thresholds for ${activeYear} — by gender (all ages). Shows sensitivity to the poverty definition.`}
          </p>
          <ThresholdComparisonChart
            data={data}
            thresholds={thresholds}
            genderOptions={genderOptions}
            activeYear={activeYear}
            locale={locale}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart A — Poverty Trend by Income Threshold (Multi-Line)
// Shows four threshold lines over years for NUTS=BG, SILC_Age=0, selected gender
// ═══════════════════════════════════════════════════════════════════════════════

function ThresholdTrendChart({ data, allYears, thresholds, selectedGender, locale }: {
  data: any[];
  allYears: string[];
  thresholds: { code: string; label: string }[];
  selectedGender: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return thresholds.map(t => {
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (d.NUTS_Code !== 'BG' || d.SILC_Age_Code !== '0' || d.Gender_Code !== selectedGender) return;
        if (d.SILC_Median_Code !== t.code) return;
        if (d.Year) byYear[d.Year] = getRate(d);
      });
      return {
        code: t.code,
        label: isBg ? THRESHOLD_LABELS[t.code]?.bg : THRESHOLD_LABELS[t.code]?.en,
        color: THRESHOLD_LABELS[t.code]?.color || '#64748b',
        values: allYears.map(y => byYear[y] ?? null),
      };
    });
  }, [data, allYears, thresholds, selectedGender, isBg]);

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
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? val.toFixed(1) + '%' : '\u2014'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: seriesData.map(s => s.label),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '12%', top: '6%', containLabel: true },
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
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: s.code === '3' ? 2.5 : 1.8 },
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        emphasis: { lineStyle: { width: 3.5 } },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart B — Demographic Grouped Bar (Age Group × Gender)
// NUTS=BG, selected threshold & year; X=age groups, groups=genders
// ═══════════════════════════════════════════════════════════════════════════════

function DemographicBarChart({ data, ageGroups, genderOptions, activeYear, selectedThreshold, locale }: {
  data: any[];
  ageGroups: { code: string; label: string }[];
  genderOptions: { code: string; label: string }[];
  activeYear: string;
  selectedThreshold: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const ageSubgroups = useMemo(() => ageGroups.filter(a => a.code !== '0'), [ageGroups]);
  const genderSubgroups = useMemo(() => genderOptions.filter(g => g.code !== '0'), [genderOptions]);

  const seriesData = useMemo(() => {
    if (!activeYear) return [];
    return genderSubgroups.map(g => ({
      code: g.code,
      label: g.label,
      values: ageSubgroups.map(ag => {
        const row = data.find(d =>
          d.Year === activeYear && d.NUTS_Code === 'BG' &&
          d.SILC_Median_Code === selectedThreshold &&
          d.Gender_Code === g.code && d.SILC_Age_Code === ag.code
        );
        return getRate(row || null);
      }),
    }));
  }, [data, ageSubgroups, genderSubgroups, activeYear, selectedThreshold]);

  useEffect(() => {
    if (!chartRef.current || seriesData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].name}</div>`;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? val.toFixed(1) + '%' : '\u2014'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: genderSubgroups.map(g => g.label),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ageSubgroups.map(a => a.label),
        axisLabel: { fontSize: 10, color: '#64748b' },
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
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'bar' as const,
        data: s.values.map(v => ({
          value: v,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
        })),
        itemStyle: { color: GENDER_COLORS[s.code] || '#64748b' },
        barMaxWidth: 40,
        label: {
          show: true,
          position: 'top',
          fontSize: 9,
          color: '#64748b',
          formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [seriesData, ageSubgroups, genderSubgroups]);

  if (seriesData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[380px] text-sm text-slate-400">
        {isBg ? 'Няма данни за избраната година' : 'No data for selected year'}
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart C — Regional Horizontal Bar (NUTS-2)
// Sorted descending; national reference line
// ═══════════════════════════════════════════════════════════════════════════════

function RegionalBarChart({ data, nuts2Regions, activeYear, selectedThreshold, selectedGender, locale }: {
  data: any[];
  nuts2Regions: { code: string; label: string }[];
  activeYear: string;
  selectedThreshold: string;
  selectedGender: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { sorted, nationalRate } = useMemo(() => {
    if (!activeYear) return { sorted: [] as { code: string; label: string; rate: number }[], nationalRate: null as number | null };

    const natRow = data.find(d =>
      d.Year === activeYear && d.NUTS_Code === 'BG' &&
      d.SILC_Median_Code === selectedThreshold && d.Gender_Code === selectedGender && d.SILC_Age_Code === '0'
    );
    const national = natRow ? getRate(natRow) : null;

    const rows = nuts2Regions.map(r => {
      const row = data.find(d =>
        d.Year === activeYear && d.NUTS_Code === r.code &&
        d.SILC_Median_Code === selectedThreshold && d.Gender_Code === selectedGender && d.SILC_Age_Code === '0'
      );
      return { code: r.code, label: r.label, rate: getRate(row || null)! };
    }).filter(r => r.rate != null);

    rows.sort((a, b) => b.rate - a.rate);
    return { sorted: rows, nationalRate: national };
  }, [data, nuts2Regions, activeYear, selectedThreshold, selectedGender]);

  useEffect(() => {
    if (!chartRef.current || sorted.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const reversed = [...sorted].reverse();

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const val = p.value != null ? Number(p.value) : null;
          let tip = `<div style="font-weight:600;color:#0f172a">${p.name}</div>`;
          tip += `<div style="margin-top:4px">${isBg ? 'Бедност' : 'Poverty rate'}: <b>${val != null ? val.toFixed(1) + '%' : '\u2014'}</b></div>`;
          if (nationalRate != null) {
            tip += `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${isBg ? 'Национално' : 'National'}: ${nationalRate.toFixed(1)}%</div>`;
          }
          return tip;
        },
      },
      grid: { left: '1%', right: '8%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: reversed.map(d => d.label),
        axisLabel: { fontSize: 10, color: '#64748b' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: reversed.map(d => ({
            value: d.rate,
            itemStyle: {
              color: REGION_COLORS[d.code] || '#64748b',
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: 22,
          label: {
            show: true,
            position: 'right',
            fontSize: 10,
            color: '#64748b',
            formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
          },
          markLine: nationalRate != null ? {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#1e293b', type: 'dashed', width: 1.5 },
            label: {
              formatter: `${isBg ? 'БГ' : 'BG'}: ${nationalRate.toFixed(1)}%`,
              fontSize: 10,
              color: '#1e293b',
            },
            data: [{ xAxis: nationalRate }],
          } : undefined,
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [sorted, nationalRate, isBg]);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-[380px] text-sm text-slate-400">
        {isBg ? 'Няма данни за избраната година/праг' : 'No data for selected year/threshold'}
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart D — Threshold Comparison (Grouped Bar)
// X = thresholds, groups = genders; NUTS=BG, SILC_Age=0, selected year
// ═══════════════════════════════════════════════════════════════════════════════

function ThresholdComparisonChart({ data, thresholds, genderOptions, activeYear, locale }: {
  data: any[];
  thresholds: { code: string; label: string }[];
  genderOptions: { code: string; label: string }[];
  activeYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    if (!activeYear) return [];
    return genderOptions.map(g => ({
      code: g.code,
      label: g.label,
      values: thresholds.map(t => {
        const row = data.find(d =>
          d.Year === activeYear && d.NUTS_Code === 'BG' &&
          d.SILC_Median_Code === t.code &&
          d.Gender_Code === g.code && d.SILC_Age_Code === '0'
        );
        return getRate(row || null);
      }),
    }));
  }, [data, thresholds, genderOptions, activeYear]);

  const thresholdLabels = useMemo(() =>
    thresholds.map(t => isBg ? THRESHOLD_LABELS[t.code]?.bg : THRESHOLD_LABELS[t.code]?.en),
    [thresholds, isBg]
  );

  useEffect(() => {
    if (!chartRef.current || seriesData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].name}</div>`;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? val.toFixed(1) + '%' : '\u2014'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: genderOptions.map(g => g.label),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: thresholdLabels,
        axisLabel: { fontSize: 10, color: '#64748b' },
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
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'bar' as const,
        data: s.values.map(v => ({
          value: v,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
        })),
        itemStyle: { color: GENDER_COLORS[s.code] || '#64748b' },
        barMaxWidth: 44,
        label: {
          show: true,
          position: 'top',
          fontSize: 9,
          color: '#64748b',
          formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [seriesData, thresholdLabels]);

  if (seriesData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[320px] text-sm text-slate-400">
        {isBg ? 'Няма данни за избраната година' : 'No data for selected year'}
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}
