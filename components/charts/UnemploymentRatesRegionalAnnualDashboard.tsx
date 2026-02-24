'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

const REGION_COLORS: Record<string, string> = {
  BG: '#1e293b',
  BG31: '#ef4444',
  BG32: '#f59e0b',
  BG33: '#10b981',
  BG34: '#3b82f6',
  BG41: '#8b5cf6',
  BG42: '#ec4899',
};

function getRate(row: any): number | null {
  if (row.Rate == null || row.Rate === '' || row.Rate === '..' || row.Rate === 'null') return null;
  let raw = typeof row.Rate === 'string' ? row.Rate.replace(/[()]/g, '') : row.Rate;
  const v = typeof raw === 'number' ? raw : parseFloat(raw);
  return isNaN(v) ? null : v;
}

function nutsLevel(code: string): number {
  if (code === 'BG') return 0;
  if (code.length === 4) return 2;
  if (code.length === 5) return 3;
  return -1;
}

function sortYears(a: string, b: string): number {
  return parseInt(a) - parseInt(b);
}

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

export function UnemploymentRatesRegionalAnnualDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const { allYears, nuts2Regions, nuts3Districts } = useMemo(() => {
    const years = new Set<string>();
    const n2Map = new Map<string, string>();
    const n3Map = new Map<string, string>();

    data.forEach(d => {
      if (d.Year) years.add(d.Year);
      const code = d.NUTS_Code || '';
      const label = d.NUTS || code;
      if (nutsLevel(code) === 2 && !n2Map.has(code)) n2Map.set(code, label);
      if (nutsLevel(code) === 3 && !n3Map.has(code)) n3Map.set(code, label);
    });

    return {
      allYears: [...years].sort(sortYears),
      nuts2Regions: [...n2Map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
      nuts3Districts: [...n3Map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label })),
    };
  }, [data]);

  const latestYear = allYears[allYears.length - 1] || '';
  const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : '';

  const kpiData = useMemo(() => {
    if (!latestYear) return null;

    const find = (year: string, gender: string, nuts: string) =>
      data.find(d => d.Year === year && d.Gender_Code === gender && d.NUTS_Code === nuts);

    const totalRate = getRate(find(latestYear, '0', 'BG') || {});
    const maleRate = getRate(find(latestYear, '1', 'BG') || {});
    const femaleRate = getRate(find(latestYear, '2', 'BG') || {});

    const prevTotal = prevYear ? getRate(find(prevYear, '0', 'BG') || {}) : null;
    const yoyChange = totalRate != null && prevTotal != null ? totalRate - prevTotal : null;

    const genderGap = maleRate != null && femaleRate != null ? femaleRate - maleRate : null;

    // Find highest/lowest NUTS3 district
    let highestDistrict = { code: '', label: '', rate: -Infinity };
    let lowestDistrict = { code: '', label: '', rate: Infinity };
    nuts3Districts.forEach(d => {
      const row = find(latestYear, '0', d.code);
      const rate = row ? getRate(row) : null;
      if (rate != null) {
        if (rate > highestDistrict.rate) highestDistrict = { code: d.code, label: d.label, rate };
        if (rate < lowestDistrict.rate) lowestDistrict = { code: d.code, label: d.label, rate };
      }
    });

    return {
      latestYear, totalRate, maleRate, femaleRate, yoyChange, genderGap,
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

  const firstYear = allYears[0];

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg ? 'Безработица по пол, статистически райони и области' : 'Unemployment Rates by Sex, Regions & Districts'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear} – ${latestYear}) | Единица: %`
            : `Annual Data (${firstYear} – ${latestYear}) | Unit: %`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
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

        {/* Chart A: Temporal Trend — Multi-line by Sex, filterable by Geography */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Тенденции по пол' : 'A. Gender Trends Over Time'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Безработица (Общо, Мъже, Жени) — филтрирай по регион' : 'Unemployment rate (Total, Male, Female) — filter by region'}
          </p>
          <GenderTrendsChart data={data} allYears={allYears} nuts2Regions={nuts2Regions} locale={locale} />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Области — класация' : 'B. District Ranking'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Безработица по области (NUTS-3), Общо' : 'Unemployment by district (NUTS-3), Total — sorted'}
            </p>
            <DistrictBarChart data={data} allYears={allYears} nuts3Districts={nuts3Districts} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Полови различия по региони' : 'C. Gender Disparity by Region'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Мъже vs Жени по NUTS-2 региони' : 'Male vs Female by NUTS-2 region'}
            </p>
            <GenderDisparityChart data={data} allYears={allYears} nuts2Regions={nuts2Regions} locale={locale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Gender Trends (Line) — with region filter ──────────────────────────

function GenderTrendsChart({ data, allYears, nuts2Regions, locale }: {
  data: any[];
  allYears: string[];
  nuts2Regions: { code: string; label: string }[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [selectedRegion, setSelectedRegion] = useState<string>('BG');

  const seriesData = useMemo(() => {
    const totalByY: Record<string, number | null> = {};
    const maleByY: Record<string, number | null> = {};
    const femaleByY: Record<string, number | null> = {};

    data.forEach(row => {
      if (!row.Year || row.NUTS_Code !== selectedRegion) return;
      const val = getRate(row);
      if (row.Gender_Code === '0') totalByY[row.Year] = val;
      else if (row.Gender_Code === '1') maleByY[row.Year] = val;
      else if (row.Gender_Code === '2') femaleByY[row.Year] = val;
    });

    return {
      total: allYears.map(y => totalByY[y] ?? null),
      male: allYears.map(y => maleByY[y] ?? null),
      female: allYears.map(y => femaleByY[y] ?? null),
    };
  }, [data, allYears, selectedRegion]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
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
        data: [
          isBg ? '\u041e\u0431\u0449\u043e' : 'Total',
          isBg ? '\u041c\u044a\u0436\u0435' : 'Male',
          isBg ? '\u0416\u0435\u043d\u0438' : 'Female',
        ],
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
      series: [
        {
          name: isBg ? '\u041e\u0431\u0449\u043e' : 'Total',
          type: 'line',
          data: seriesData.total,
          itemStyle: { color: '#0f172a' },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          emphasis: { lineStyle: { width: 3.5 } },
        },
        {
          name: isBg ? '\u041c\u044a\u0436\u0435' : 'Male',
          type: 'line',
          data: seriesData.male,
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          emphasis: { lineStyle: { width: 3 } },
        },
        {
          name: isBg ? '\u0416\u0435\u043d\u0438' : 'Female',
          type: 'line',
          data: seriesData.female,
          itemStyle: { color: '#e11d48' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          emphasis: { lineStyle: { width: 3 } },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allYears, seriesData, isBg]);

  return (
    <div>
      <div className="mb-3">
        <Select
          value={selectedRegion}
          onChange={e => setSelectedRegion(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600 w-[220px]"
        >
          <option value="BG">{isBg ? '\u0411\u044a\u043b\u0433\u0430\u0440\u0438\u044f (Национално)' : 'Bulgaria (National)'}</option>
          {nuts2Regions.map(r => (
            <option key={r.code} value={r.code}>{r.label}</option>
          ))}
        </Select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
    </div>
  );
}

// ── Chart B: District Ranking — Sorted horizontal bar (NUTS-3, Total, latest year) ─

function DistrictBarChart({ data, allYears, nuts3Districts, locale }: {
  data: any[];
  allYears: string[];
  nuts3Districts: { code: string; label: string }[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    if (allYears.length > 0 && !selectedYear) {
      setSelectedYear(allYears[allYears.length - 1]);
    }
  }, [allYears, selectedYear]);

  const barData = useMemo((): { districts: { code: string; label: string; rate: number | null; parent: string }[]; nationalRate: number | null } => {
    const year = selectedYear || allYears[allYears.length - 1];
    if (!year) return { districts: [], nationalRate: null };

    const national = data.find(d => d.Year === year && d.NUTS_Code === 'BG' && d.Gender_Code === '0');
    const nationalRate = national ? getRate(national) : null;

    const districts = nuts3Districts.map(d => {
      const row = data.find(r => r.Year === year && r.NUTS_Code === d.code && r.Gender_Code === '0');
      const rate = row ? getRate(row) : null;
      const parent = d.code.substring(0, 4);
      return { code: d.code, label: d.label, rate, parent };
    }).filter(d => d.rate != null);

    districts.sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));

    return { districts, nationalRate };
  }, [data, allYears, nuts3Districts, selectedYear]);

  useEffect(() => {
    if (!chartRef.current || !barData.districts || barData.districts.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const reversed = [...barData.districts].reverse();
    const height = Math.max(400, reversed.length * 22 + 80);
    chartRef.current.style.height = `${height}px`;

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const val = p.value != null ? Number(p.value) : null;
          let tip = `<div style="font-weight:600;color:#0f172a">${p.name}</div>`;
          tip += `<div style="margin-top:4px">${isBg ? '\u0411\u0435\u0437\u0440\u0430\u0431\u043e\u0442\u0438\u0446\u0430' : 'Unemployment'}: <b>${val != null ? val.toFixed(1) + '%' : '\u2014'}</b></div>`;
          if (barData.nationalRate != null) {
            tip += `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${isBg ? '\u041d\u0430\u0446\u0438\u043e\u043d\u0430\u043b\u043d\u043e' : 'National'}: ${barData.nationalRate.toFixed(1)}%</div>`;
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
          markLine: barData.nationalRate != null ? {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#1e293b', type: 'dashed', width: 1.5 },
            label: {
              formatter: `${isBg ? '\u0411\u0413' : 'BG'}: ${barData.nationalRate.toFixed(1)}%`,
              fontSize: 10,
              color: '#1e293b',
            },
            data: [{ xAxis: barData.nationalRate }],
          } : undefined,
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg]);

  return (
    <div>
      <div className="mb-2">
        <Select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
        >
          {[...allYears].reverse().map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '400px', overflowY: 'auto' }} />
    </div>
  );
}

// ── Chart C: Gender Disparity — Grouped bar (NUTS-2, Male vs Female) ──────────

function GenderDisparityChart({ data, allYears, nuts2Regions, locale }: {
  data: any[];
  allYears: string[];
  nuts2Regions: { code: string; label: string }[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    if (allYears.length > 0 && !selectedYear) {
      setSelectedYear(allYears[allYears.length - 1]);
    }
  }, [allYears, selectedYear]);

  const barData = useMemo(() => {
    const year = selectedYear || allYears[allYears.length - 1];
    if (!year) return [];

    return nuts2Regions.map(region => {
      const findRate = (gCode: string) => {
        const row = data.find(d => d.Year === year && d.NUTS_Code === region.code && d.Gender_Code === gCode);
        return row ? getRate(row) : null;
      };

      return {
        code: region.code,
        label: region.label,
        male: findRate('1'),
        female: findRate('2'),
      };
    });
  }, [data, allYears, nuts2Regions, selectedYear]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value) : null;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val != null ? val.toFixed(1) + '%' : '\u2014'}</span>
            </div>`;
          });
          const m = params.find((p: any) => p.seriesName === (isBg ? '\u041c\u044a\u0436\u0435' : 'Male'))?.value;
          const f = params.find((p: any) => p.seriesName === (isBg ? '\u0416\u0435\u043d\u0438' : 'Female'))?.value;
          if (m != null && f != null) {
            const gap = f - m;
            tip += `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${isBg ? '\u0420\u0430\u0437\u043b\u0438\u043a\u0430' : 'Gap'}: ${gap > 0 ? '+' : ''}${gap.toFixed(1)}pp</div>`;
          }
          return tip;
        },
      },
      legend: {
        data: [isBg ? '\u041c\u044a\u0436\u0435' : 'Male', isBg ? '\u0416\u0435\u043d\u0438' : 'Female'],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '14%', top: '6%', containLabel: true },
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
          name: isBg ? '\u041c\u044a\u0436\u0435' : 'Male',
          type: 'bar',
          data: barData.map(d => d.male),
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
          barGap: '20%',
          label: {
            show: true,
            position: 'top',
            fontSize: 9,
            color: '#64748b',
            formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
          },
        },
        {
          name: isBg ? '\u0416\u0435\u043d\u0438' : 'Female',
          type: 'bar',
          data: barData.map(d => d.female),
          itemStyle: { color: '#e11d48', borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'top',
            fontSize: 9,
            color: '#64748b',
            formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
          },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg]);

  return (
    <div>
      <div className="mb-2">
        <Select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
        >
          {[...allYears].reverse().map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '380px' }} />
    </div>
  );
}
