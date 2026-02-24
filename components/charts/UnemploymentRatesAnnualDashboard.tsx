'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// Non-overlapping 10-year age buckets (exclude aggregates: 0, 15-29, 15-64, 20-64)
const AGE_BUCKETS = ['15 - 24', '25 - 34', '35 - 44', '45 - 54', '55 - 64', '65+'];
const AGE_COLORS: Record<string, string> = {
  '15 - 24': '#ef4444',
  '25 - 34': '#f97316',
  '35 - 44': '#eab308',
  '45 - 54': '#22c55e',
  '55 - 64': '#3b82f6',
  '65+': '#8b5cf6',
};
const SHORT_AGE: Record<string, string> = {
  '15 - 24': '15-24', '25 - 34': '25-34', '35 - 44': '35-44',
  '45 - 54': '45-54', '55 - 64': '55-64', '65+': '65+',
};

function getRate(row: any): number | null {
  if (row.Rate == null || row.Rate === '' || row.Rate === '..' || row.Rate === 'null') return null;
  // Handle parenthesized values like "(2.2)" indicating low reliability
  let raw = typeof row.Rate === 'string' ? row.Rate.replace(/[()]/g, '') : row.Rate;
  const v = typeof raw === 'number' ? raw : parseFloat(raw);
  return isNaN(v) ? null : v;
}

function sortYears(a: string, b: string): number {
  return parseInt(a) - parseInt(b);
}

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function UnemploymentRatesAnnualDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const allYears = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => { if (d.Year) years.add(d.Year); });
    return [...years].sort(sortYears);
  }, [data]);

  const find = (year: string, gender: string, age: string) =>
    data.find(d => d.Year === year && d.Gender_Code === gender && d.Age10_LFS_Code === age);

  const kpiData = useMemo(() => {
    if (allYears.length === 0) return null;
    const latestYear = allYears[allYears.length - 1];
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const totalRate = getRate(find(latestYear, '0', '0') || {});
    const maleRate = getRate(find(latestYear, '1', '0') || {});
    const femaleRate = getRate(find(latestYear, '2', '0') || {});
    const youthRate = getRate(find(latestYear, '0', '15 - 24') || {});

    const prevTotal = prevYear ? getRate(find(prevYear, '0', '0') || {}) : null;
    const yoyChange = totalRate != null && prevTotal != null ? totalRate - prevTotal : null;

    const genderGap = femaleRate != null && maleRate != null ? femaleRate - maleRate : null;

    return { latestYear, totalRate, maleRate, femaleRate, youthRate, yoyChange, genderGap };
  }, [data, allYears]);

  if (!data || data.length === 0 || !kpiData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const firstYear = allYears[0];
  const lastYear = allYears[allYears.length - 1];

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg ? 'Коефициенти на безработица по пол и 10-годишни възрастови групи' : 'Unemployment Rates by Sex & 10-Year Age Groups'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear} – ${lastYear}) | Единица: %`
            : `Annual Data (${firstYear} – ${lastYear}) | Unit: %`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <KpiCard
            title={isBg ? 'Общо' : 'Total Rate'}
            value={kpiData.totalRate}
            subtitle={kpiData.latestYear}
            accentColor="text-slate-900"
            locale={locale}
            yoyChange={kpiData.yoyChange}
          />
          <KpiCard
            title={isBg ? 'Младежи (15-24)' : 'Youth (15-24)'}
            value={kpiData.youthRate}
            subtitle={kpiData.latestYear}
            accentColor="text-red-600"
            locale={locale}
            badge={kpiData.totalRate != null && kpiData.youthRate != null
              ? `${(kpiData.youthRate / kpiData.totalRate).toFixed(1)}x ${isBg ? 'от общо' : 'of total'}`
              : undefined}
          />
          <KpiCard
            title={isBg ? 'Мъже' : 'Male'}
            value={kpiData.maleRate}
            subtitle={kpiData.latestYear}
            accentColor="text-blue-600"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Жени' : 'Female'}
            value={kpiData.femaleRate}
            subtitle={kpiData.latestYear}
            accentColor="text-rose-600"
            locale={locale}
            badge={kpiData.genderGap != null
              ? `${kpiData.genderGap > 0 ? '+' : ''}${kpiData.genderGap.toFixed(1)}pp ${isBg ? 'разлика' : 'gap'}`
              : undefined}
          />
        </div>

        {/* Chart A: Gender Trend Lines (Total, Male, Female — AgeGroup == Total) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Тенденции по пол' : 'A. Gender Trends'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Годишен коефициент на безработица — Общо, Мъже, Жени' : 'Annual unemployment rate — Total, Male, Female'}
          </p>
          <GenderTrendsChart data={data} allYears={allYears} locale={locale} />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Безработица по възраст и пол' : 'B. Rate by Age & Gender'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Мъже vs Жени по 10-годишни възрастови групи' : 'Male vs Female by 10-year age bands'}
            </p>
            <AgeGenderBarChart data={data} allYears={allYears} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Топлинна карта — Възраст × Година' : 'C. Heatmap — Age × Year'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Коефициент на безработица (Общо) по възраст и година' : 'Unemployment rate (Total) by age group and year'}
            </p>
            <AgeYearHeatmap data={data} allYears={allYears} locale={locale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ title, value, subtitle, accentColor, locale, badge, yoyChange }: {
  title: string;
  value: number | null;
  subtitle: string;
  accentColor: string;
  locale?: 'bg' | 'en';
  badge?: string;
  yoyChange?: number | null;
}) {
  const isBg = locale === 'bg';
  return (
    <div className="bg-white shadow-sm rounded-xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</p>
        {badge && (
          <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{badge}</span>
        )}
      </div>
      <p className={`text-3xl font-bold mt-2 ${accentColor}`}>
        {value != null ? `${value.toFixed(1)}%` : '—'}
      </p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <p className="text-xs text-slate-400">{subtitle}</p>
        {yoyChange != null && (
          <span className={`text-xs font-semibold ${yoyChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {yoyChange <= 0 ? '\u25bc' : '\u25b2'} {Math.abs(yoyChange).toFixed(1)}pp {isBg ? 'г/г' : 'YoY'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Chart A: Gender Trends (Line Chart) — Total, Male, Female ──────────────────

function GenderTrendsChart({ data, allYears, locale }: {
  data: any[];
  allYears: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const totalByY: Record<string, number | null> = {};
    const maleByY: Record<string, number | null> = {};
    const femaleByY: Record<string, number | null> = {};

    data.forEach(row => {
      if (!row.Year || row.Age10_LFS_Code !== '0') return;
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
  }, [data, allYears]);

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
          const maleVal = params.find((p: any) => p.seriesName === (isBg ? '\u041c\u044a\u0436\u0435' : 'Male'))?.value;
          const femaleVal = params.find((p: any) => p.seriesName === (isBg ? '\u0416\u0435\u043d\u0438' : 'Female'))?.value;
          if (maleVal != null && femaleVal != null) {
            const gap = femaleVal - maleVal;
            tip += `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${isBg ? '\u0420\u0430\u0437\u043b\u0438\u043a\u0430 \u043f\u043e \u043f\u043e\u043b' : 'Gender gap'}: ${gap > 0 ? '+' : ''}${gap.toFixed(1)}pp</div>`;
          }
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

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ── Chart B: Grouped Bar Chart — Age × Gender for selected year ─────────────────

function AgeGenderBarChart({ data, allYears, locale }: {
  data: any[];
  allYears: string[];
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
    return AGE_BUCKETS.map(age => {
      const maleRow = data.find(d => d.Year === year && d.Gender_Code === '1' && d.Age10_LFS_Code === age);
      const femaleRow = data.find(d => d.Year === year && d.Gender_Code === '2' && d.Age10_LFS_Code === age);
      return {
        age: SHORT_AGE[age] || age,
        male: maleRow ? getRate(maleRow) : null,
        female: femaleRow ? getRate(femaleRow) : null,
      };
    });
  }, [data, allYears, selectedYear]);

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
        data: barData.map(d => d.age),
        axisLabel: { fontSize: 11, color: '#64748b' },
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
            fontSize: 10,
            color: '#64748b',
            formatter: (p: any) => p.value != null ? p.value.toFixed(1) + '%' : '',
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
            fontSize: 10,
            color: '#64748b',
            formatter: (p: any) => p.value != null ? p.value.toFixed(1) + '%' : '',
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
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300"
        >
          {[...allYears].reverse().map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '350px' }} />
    </div>
  );
}

// ── Chart C: Heatmap — Age Group × Year (Total gender) ─────────────────────────

function AgeYearHeatmap({ data, allYears, locale }: {
  data: any[];
  allYears: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { heatmapData, maxVal } = useMemo(() => {
    const result: [number, number, number | null][] = [];
    let max = 0;

    allYears.forEach((year, xIdx) => {
      AGE_BUCKETS.forEach((age, yIdx) => {
        const row = data.find(d => d.Year === year && d.Gender_Code === '0' && d.Age10_LFS_Code === age);
        const val = row ? getRate(row) : null;
        result.push([xIdx, yIdx, val]);
        if (val != null && val > max) max = val;
      });
    });

    return { heatmapData: result, maxVal: max };
  }, [data, allYears]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        position: 'top',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          const [xIdx, yIdx, val] = params.data;
          const year = allYears[xIdx];
          const age = SHORT_AGE[AGE_BUCKETS[yIdx]] || AGE_BUCKETS[yIdx];
          return `<div style="font-weight:600;color:#0f172a">${year} | ${age}</div>
            <div style="margin-top:4px">${isBg ? '\u0411\u0435\u0437\u0440\u0430\u0431\u043e\u0442\u0438\u0446\u0430' : 'Unemployment'}: <b>${val != null ? val.toFixed(1) + '%' : '\u2014'}</b></div>`;
        },
      },
      grid: { left: '1%', right: '6%', bottom: '12%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: allYears,
        axisLabel: { fontSize: 10, color: '#94a3b8', interval: 1 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        splitArea: { show: true },
      },
      yAxis: {
        type: 'category',
        data: AGE_BUCKETS.map(a => SHORT_AGE[a] || a),
        axisLabel: { fontSize: 11, color: '#64748b' },
        axisLine: { show: false },
        axisTick: { show: false },
        splitArea: { show: true },
      },
      visualMap: {
        min: 0,
        max: Math.ceil(maxVal),
        calculable: true,
        orient: 'vertical',
        right: 0,
        top: 'center',
        itemHeight: 140,
        textStyle: { fontSize: 10, color: '#94a3b8' },
        inRange: {
          color: ['#f0fdf4', '#bbf7d0', '#86efac', '#fde68a', '#fbbf24', '#f97316', '#ef4444', '#b91c1c'],
        },
        formatter: (value: any) => Number(value).toFixed(0) + '%',
      },
      series: [{
        type: 'heatmap',
        data: heatmapData.map(([x, y, v]) => [x, y, v ?? '-']),
        label: {
          show: allYears.length <= 15,
          fontSize: 9,
          color: '#334155',
          formatter: (p: any) => {
            const val = p.data[2];
            return val != null && val !== '-' ? Number(val).toFixed(1) : '';
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
          },
        },
      }],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allYears, heatmapData, maxVal, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '350px' }} />;
}
