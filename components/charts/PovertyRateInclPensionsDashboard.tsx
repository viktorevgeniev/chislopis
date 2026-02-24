'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── Shared constants ──────────────────────────────────────────────────────────

const REGION_COLORS: Record<string, string> = {
  BG: '#1e293b',
  BG31: '#7c3aed',
  BG32: '#0891b2',
  BG33: '#059669',
  BG34: '#d97706',
  BG41: '#dc2626',
  BG42: '#db2777',
};

const GENDER_COLORS: Record<string, string> = {
  '0': '#0f172a',
  '1': '#3b82f6',
  '2': '#e11d48',
};

function getRate(row: any): number | null {
  if (row.Rate == null || row.Rate === '' || row.Rate === '..' || row.Rate === 'null') return null;
  const raw = typeof row.Rate === 'string' ? row.Rate.replace(/[()]/g, '') : row.Rate;
  const v = typeof raw === 'number' ? raw : parseFloat(raw);
  return isNaN(v) ? null : v;
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

export function PovertyRateInclPensionsDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  // ── Derive dimensional catalogs from data ──
  const { allYears, ageGroups, genderOptions, nuts2Regions, nuts3Districts } = useMemo(() => {
    const years = new Set<string>();
    const ageMap = new Map<string, string>();
    const genderMap = new Map<string, string>();
    const n2Map = new Map<string, string>();
    const n3Map = new Map<string, string>();

    data.forEach(d => {
      if (d.Year) years.add(d.Year);

      const ageCode = d.SILC_Age_Code || '';
      if (ageCode && !ageMap.has(ageCode)) ageMap.set(ageCode, d.SILC_Age || ageCode);

      const gCode = d.Gender_Code || '';
      if (gCode && !genderMap.has(gCode)) genderMap.set(gCode, d.Gender || gCode);

      const nutsCode = d.NUTS_Code || '';
      const nutsLabel = d.NUTS || nutsCode;
      if (nutsLevel(nutsCode) === 2 && !n2Map.has(nutsCode)) n2Map.set(nutsCode, nutsLabel);
      if (nutsLevel(nutsCode) === 3 && !n3Map.has(nutsCode)) n3Map.set(nutsCode, nutsLabel);
    });

    return {
      allYears: [...years].sort((a, b) => parseInt(a) - parseInt(b)),
      ageGroups: [...ageMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
      genderOptions: [...genderMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
      nuts2Regions: [...n2Map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
      nuts3Districts: [...n3Map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
    };
  }, [data]);

  // ── Global filters ──
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedGender, setSelectedGender] = useState('0');

  useEffect(() => {
    if (allYears.length > 0 && !selectedYear) {
      setSelectedYear(allYears[allYears.length - 1]);
    }
  }, [allYears, selectedYear]);

  const latestYear = allYears[allYears.length - 1] || '';
  const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : '';
  const firstYear = allYears[0] || '';
  const activeYear = selectedYear || latestYear;

  // ── KPI data (always uses latest year, total gender, total age, national) ──
  const kpiData = useMemo(() => {
    if (!latestYear) return null;

    const find = (year: string, gender: string, age: string, nuts: string) =>
      data.find(d => d.Year === year && d.Gender_Code === gender && d.SILC_Age_Code === age && d.NUTS_Code === nuts);

    const totalRate = getRate(find(latestYear, '0', '0', 'BG') || {});
    const maleRate = getRate(find(latestYear, '1', '0', 'BG') || {});
    const femaleRate = getRate(find(latestYear, '2', '0', 'BG') || {});
    const prevTotal = prevYear ? getRate(find(prevYear, '0', '0', 'BG') || {}) : null;
    const yoyChange = totalRate != null && prevTotal != null ? totalRate - prevTotal : null;
    const genderGap = maleRate != null && femaleRate != null ? femaleRate - maleRate : null;

    const childRate = getRate(find(latestYear, '0', '1', 'BG') || {});
    const workingRate = getRate(find(latestYear, '0', '2', 'BG') || {});
    const elderlyRate = getRate(find(latestYear, '0', '3', 'BG') || {});

    let highestDistrict = { code: '', label: '', rate: -Infinity };
    let lowestDistrict = { code: '', label: '', rate: Infinity };
    nuts3Districts.forEach(d => {
      const row = find(latestYear, '0', '0', d.code);
      const rate = row ? getRate(row) : null;
      if (rate != null) {
        if (rate > highestDistrict.rate) highestDistrict = { code: d.code, label: d.label, rate };
        if (rate < lowestDistrict.rate) lowestDistrict = { code: d.code, label: d.label, rate };
      }
    });

    return {
      latestYear, totalRate, maleRate, femaleRate, yoyChange, genderGap,
      childRate, workingRate, elderlyRate,
      highestDistrict: highestDistrict.rate > -Infinity ? highestDistrict : null,
      lowestDistrict: lowestDistrict.rate < Infinity ? lowestDistrict : null,
    };
  }, [data, latestYear, prevYear, nuts3Districts]);

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
            ? 'Относителен дял на бедните преди социални трансфери (с пенсии)'
            : 'At-Risk-of-Poverty Rate Before Social Transfers (Incl. Pensions)'}
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
              {isBg ? 'Национално' : 'National Rate'}
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
              {isBg ? 'Мъже / Жени' : 'Male / Female'}
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
          {kpiData.highestDistrict && (
            <div className="bg-white shadow-sm rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {isBg ? 'Най-висока' : 'Highest District'}
              </p>
              <p className="text-3xl font-bold mt-2 text-red-600">{kpiData.highestDistrict.rate.toFixed(1)}%</p>
              <p className="text-xs text-slate-400 mt-1">{kpiData.highestDistrict.label}</p>
            </div>
          )}
          {kpiData.lowestDistrict && (
            <div className="bg-white shadow-sm rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {isBg ? 'Най-ниска' : 'Lowest District'}
              </p>
              <p className="text-3xl font-bold mt-2 text-emerald-600">{kpiData.lowestDistrict.rate.toFixed(1)}%</p>
              <p className="text-xs text-slate-400 mt-1">{kpiData.lowestDistrict.label}</p>
            </div>
          )}
        </div>

        {/* ── Age group summary cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4 border-l-4 border-amber-400">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Деца (0-17)' : 'Children (0-17)'}
            </p>
            <p className="text-2xl font-bold mt-1 text-amber-600">
              {kpiData.childRate != null ? `${kpiData.childRate.toFixed(1)}%` : '\u2014'}
            </p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4 border-l-4 border-blue-400">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Работоспособни (18-64)' : 'Working Age (18-64)'}
            </p>
            <p className="text-2xl font-bold mt-1 text-blue-600">
              {kpiData.workingRate != null ? `${kpiData.workingRate.toFixed(1)}%` : '\u2014'}
            </p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4 border-l-4 border-violet-400">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Възрастни (65+)' : 'Elderly (65+)'}
            </p>
            <p className="text-2xl font-bold mt-1 text-violet-600">
              {kpiData.elderlyRate != null ? `${kpiData.elderlyRate.toFixed(1)}%` : '\u2014'}
            </p>
          </div>
        </div>

        {/* ── Global filter bar ── */}
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
            value={selectedGender}
            onChange={e => setSelectedGender(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
          >
            {genderOptions.map(g => (
              <option key={g.code} value={g.code}>{g.label}</option>
            ))}
          </Select>
        </div>

        {/* ── Chart A: National Trend by Gender (Line) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Национални тенденции по пол' : 'A. National Gender Trends Over Time'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Бедност (Общо, Мъже, Жени) — NUTS = България, Всички възрасти'
              : 'Poverty rate (Total, Male, Female) — NUTS = Bulgaria, All ages'}
          </p>
          <NationalGenderTrendChart data={data} allYears={allYears} genderOptions={genderOptions} locale={locale} />
        </div>

        {/* ── Charts B & C side by side ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart B: Regional Breakdown (grouped bar, NUTS-2) */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Регионален разрез' : 'B. Regional Breakdown'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg
                ? 'Бедност по NUTS-2 региони — групирана лента'
                : 'Poverty by NUTS-2 macro-regions — grouped bar'}
            </p>
            <RegionalBarChart
              data={data}
              nuts2Regions={nuts2Regions}
              activeYear={activeYear}
              selectedGender={selectedGender}
              locale={locale}
            />
          </div>

          {/* Chart C: Demographic Grouped Bar (Age × Gender) */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Демографски профил' : 'C. Demographic Breakdown'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg
                ? 'Бедност по възраст и пол — групирана лента'
                : 'Poverty by age group and gender — grouped bar'}
            </p>
            <DemographicBarChart
              data={data}
              ageGroups={ageGroups}
              genderOptions={genderOptions}
              activeYear={activeYear}
              locale={locale}
            />
          </div>
        </div>

        {/* ── Chart D: District Ranking (horizontal bar, NUTS-3) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Г. Области — класация' : 'D. District Ranking'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Бедност по области (NUTS-3) — сортирано низходящо'
              : 'Poverty rate by district (NUTS-3) — sorted descending'}
          </p>
          <DistrictRankingChart
            data={data}
            nuts3Districts={nuts3Districts}
            activeYear={activeYear}
            selectedGender={selectedGender}
            locale={locale}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart A — National Gender Trend (Multi-Line)
// Shows Total / Male / Female poverty rate over time at NUTS=BG, SILC_Age=0
// ═══════════════════════════════════════════════════════════════════════════════

function NationalGenderTrendChart({ data, allYears, genderOptions, locale }: {
  data: any[];
  allYears: string[];
  genderOptions: { code: string; label: string }[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const result: Record<string, (number | null)[]> = {};
    genderOptions.forEach(g => {
      const byYear: Record<string, number | null> = {};
      data.forEach(row => {
        if (row.NUTS_Code !== 'BG' || row.SILC_Age_Code !== '0' || row.Gender_Code !== g.code) return;
        if (row.Year) byYear[row.Year] = getRate(row);
      });
      result[g.code] = allYears.map(y => byYear[y] ?? null);
    });
    return result;
  }, [data, allYears, genderOptions]);

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
        data: genderOptions.map(g => g.label),
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
      series: genderOptions.map(g => ({
        name: g.label,
        type: 'line' as const,
        data: seriesData[g.code] || [],
        itemStyle: { color: GENDER_COLORS[g.code] || '#64748b' },
        lineStyle: { width: g.code === '0' ? 2.5 : 2 },
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
  }, [allYears, genderOptions, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart B — Regional Breakdown (Grouped Bar, NUTS-2)
// Responds to global Year and Gender filters
// ═══════════════════════════════════════════════════════════════════════════════

function RegionalBarChart({ data, nuts2Regions, activeYear, selectedGender, locale }: {
  data: any[];
  nuts2Regions: { code: string; label: string }[];
  activeYear: string;
  selectedGender: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const barData = useMemo(() => {
    if (!activeYear) return [];
    return nuts2Regions.map(region => {
      const row = data.find(d =>
        d.Year === activeYear && d.NUTS_Code === region.code &&
        d.Gender_Code === selectedGender && d.SILC_Age_Code === '0'
      );
      return { code: region.code, label: region.label, rate: row ? getRate(row) : null };
    });
  }, [data, nuts2Regions, activeYear, selectedGender]);

  const nationalRate = useMemo(() => {
    const row = data.find(d =>
      d.Year === activeYear && d.NUTS_Code === 'BG' &&
      d.Gender_Code === selectedGender && d.SILC_Age_Code === '0'
    );
    return row ? getRate(row) : null;
  }, [data, activeYear, selectedGender]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

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
          tip += `<div style="margin-top:4px">${isBg ? 'Бедност' : 'Poverty'}: <b>${val != null ? val.toFixed(1) + '%' : '\u2014'}</b></div>`;
          if (nationalRate != null) {
            tip += `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${isBg ? 'Национално' : 'National'}: ${nationalRate.toFixed(1)}%</div>`;
          }
          return tip;
        },
      },
      grid: { left: '1%', right: '3%', bottom: '14%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: barData.map(d => d.label),
        axisLabel: { fontSize: 10, color: '#64748b', rotate: 20 },
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
      series: [
        {
          type: 'bar',
          data: barData.map(d => ({
            value: d.rate,
            itemStyle: {
              color: REGION_COLORS[d.code] || '#64748b',
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barMaxWidth: 48,
          label: {
            show: true,
            position: 'top',
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
            data: [{ yAxis: nationalRate }],
          } : undefined,
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [barData, nationalRate, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart C — Demographic Grouped Bar (Age Group × Gender)
// Shows poverty rate broken down by age group, sub-grouped by gender
// Responds to global Year filter; shows national (BG) data
// ═══════════════════════════════════════════════════════════════════════════════

function DemographicBarChart({ data, ageGroups, genderOptions, activeYear, locale }: {
  data: any[];
  ageGroups: { code: string; label: string }[];
  genderOptions: { code: string; label: string }[];
  activeYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  // Non-total age groups and non-total genders
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
          d.Gender_Code === g.code && d.SILC_Age_Code === ag.code
        );
        return row ? getRate(row) : null;
      }),
    }));
  }, [data, ageSubgroups, genderSubgroups, activeYear]);

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
        barMaxWidth: 36,
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
  }, [seriesData, ageSubgroups, genderSubgroups, isBg]);

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
// Chart D — District Ranking (Horizontal Bar, NUTS-3)
// Sorted descending; national average markline
// Responds to global Year and Gender filters
// ═══════════════════════════════════════════════════════════════════════════════

function DistrictRankingChart({ data, nuts3Districts, activeYear, selectedGender, locale }: {
  data: any[];
  nuts3Districts: { code: string; label: string }[];
  activeYear: string;
  selectedGender: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { districts, nationalRate } = useMemo(() => {
    if (!activeYear) return { districts: [] as { code: string; label: string; rate: number; parent: string }[], nationalRate: null as number | null };

    const natRow = data.find(d =>
      d.Year === activeYear && d.NUTS_Code === 'BG' &&
      d.Gender_Code === selectedGender && d.SILC_Age_Code === '0'
    );
    const nationalRate = natRow ? getRate(natRow) : null;

    const districts = nuts3Districts
      .map(d => {
        const row = data.find(r =>
          r.Year === activeYear && r.NUTS_Code === d.code &&
          r.Gender_Code === selectedGender && r.SILC_Age_Code === '0'
        );
        const rate = row ? getRate(row) : null;
        return { code: d.code, label: d.label, rate: rate!, parent: d.code.substring(0, 4) };
      })
      .filter(d => d.rate != null);

    districts.sort((a, b) => b.rate - a.rate);
    return { districts, nationalRate };
  }, [data, nuts3Districts, activeYear, selectedGender]);

  useEffect(() => {
    if (!chartRef.current || districts.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const reversed = [...districts].reverse();
    const height = Math.max(400, reversed.length * 22 + 80);
    chartRef.current.style.height = `${height}px`;

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
      grid: { left: '1%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
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
              color: REGION_COLORS[d.parent] || '#64748b',
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: 14,
          label: {
            show: true,
            position: 'right',
            fontSize: 9,
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
  }, [districts, nationalRate, isBg]);

  if (districts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-sm text-slate-400">
        {isBg ? 'Няма данни за избраната година' : 'No data for selected year'}
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: '400px', overflowY: 'auto' }} />;
}
