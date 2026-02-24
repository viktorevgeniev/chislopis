'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Colour palette for the three education levels ─────────────────────────────

const EDU_COLORS: Record<string, string> = {
  '1': '#dc2626', // low education — red (highest poverty risk)
  '2': '#f59e0b', // secondary      — amber
  '3': '#16a34a', // tertiary        — green (lowest poverty risk)
};

// Short legend labels (keep them readable inside the chart)
const EDU_SHORT: Record<string, { en: string; bg: string }> = {
  '1': { en: 'Low (0-2)', bg: 'Ниско (0-2)' },
  '2': { en: 'Secondary (3-4)', bg: 'Средно (3-4)' },
  '3': { en: 'Tertiary (5-6)', bg: 'Висше (5-6)' },
};

function getRate(row: any): number | null {
  if (row == null) return null;
  const v = row.Rate;
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const raw = typeof v === 'string' ? v.replace(/[()]/g, '') : v;
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  return isNaN(n) ? null : n;
}

function tooltipBase() {
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
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

export function InWorkPovertyByEducationDashboard({ data, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  // ── Derive catalogs ──────────────────────────────────────────────────────────
  const { allYears, eduLevels } = useMemo(() => {
    const years = new Set<string>();
    const eduMap = new Map<string, string>();

    data.forEach(d => {
      if (d.Year) years.add(String(d.Year));
      const code = d.SILC_Edu_Code != null ? String(d.SILC_Edu_Code) : null;
      if (code && !eduMap.has(code)) eduMap.set(code, d.SILC_Edu || code);
    });

    const sortedYears = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    const sortedEdu = [...eduMap.entries()]
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([code, label]) => ({ code, label }));

    return { allYears: sortedYears, eduLevels: sortedEdu };
  }, [data]);

  const latestYear = allYears[allYears.length - 1] ?? '';
  const firstYear = allYears[0] ?? '';

  // ── Per-level latest values for KPI cards ───────────────────────────────────
  const kpiValues = useMemo(() => {
    if (!latestYear) return [];
    return eduLevels.map(edu => {
      const row = data.find(d => String(d.Year) === latestYear && String(d.SILC_Edu_Code) === edu.code);
      return { code: edu.code, label: edu.label, rate: getRate(row) };
    });
  }, [data, eduLevels, latestYear]);

  // ── Spread (highest − lowest among latest year) ──────────────────────────────
  const spread = useMemo(() => {
    const rates = kpiValues.map(k => k.rate).filter((r): r is number => r != null);
    if (rates.length < 2) return null;
    return Math.max(...rates) - Math.min(...rates);
  }, [kpiValues]);

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
            ? 'Работещи бедни по образователно равнище'
            : 'In-Work Poverty Rate by Educational Attainment'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear} – ${latestYear}) | Единица: % от съвкупността`
            : `Annual data (${firstYear} – ${latestYear}) | Unit: % of population`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiValues.map(k => (
            <div key={k.code} className="bg-white shadow-sm rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-tight">
                {isBg ? EDU_SHORT[k.code]?.bg : EDU_SHORT[k.code]?.en}
              </p>
              <p
                className="text-3xl font-bold mt-2"
                style={{ color: EDU_COLORS[k.code] ?? '#64748b' }}
              >
                {k.rate != null ? `${k.rate.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">{latestYear}</p>
            </div>
          ))}
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Разлив (нис. − вис.)' : 'Spread (low − high)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">
              {spread != null ? `${spread.toFixed(1)}pp` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isBg ? 'Разлика между ниско и висше образование' : 'Gap between low and tertiary education'}
            </p>
          </div>
        </div>

        {/* ── Chart A: Multi-series Line — trend by education level ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Времева динамика по образователно равнище' : 'A. Poverty Rate Trend by Education Level'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Относителен дял на работещите бедни (%) по три образователни нива — многогодишна тенденция'
              : 'In-work poverty rate (%) by three education levels — multi-year trend'}
          </p>
          <TrendLineChart
            data={data}
            allYears={allYears}
            eduLevels={eduLevels}
            locale={locale}
          />
        </div>

        {/* ── Chart B: Bar — snapshot for latest year ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Моментна снимка — ${latestYear}`
              : `B. Snapshot Comparison — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Сравнение на дела на работещите бедни по образователно равнище за последната налична година'
              : 'In-work poverty rate by educational attainment for the most recent available year'}
          </p>
          <SnapshotBarChart
            data={data}
            eduLevels={eduLevels}
            latestYear={latestYear}
            locale={locale}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-series Line (trend by education level)
// ═══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ data, allYears, eduLevels, locale }: {
  data: any[];
  allYears: string[];
  eduLevels: { code: string; label: string }[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return eduLevels.map(edu => {
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (String(d.SILC_Edu_Code) !== edu.code) return;
        if (d.Year) byYear[String(d.Year)] = getRate(d);
      });
      return {
        code: edu.code,
        label: isBg ? EDU_SHORT[edu.code]?.bg : EDU_SHORT[edu.code]?.en,
        color: EDU_COLORS[edu.code] ?? '#64748b',
        values: allYears.map(y => byYear[y] ?? null),
      };
    });
  }, [data, allYears, eduLevels, isBg]);

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
              <span style="font-weight:600">${val != null ? val.toFixed(1) + '%' : '—'}</span>
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
      grid: { left: '1%', right: '3%', bottom: '14%', top: '6%', containLabel: true },
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
        lineStyle: { width: 2.5, color: s.color },
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        emphasis: { lineStyle: { width: 4 } },
        label: {
          show: false,
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart B — Snapshot Bar Chart (latest year, X = education level)
// ═══════════════════════════════════════════════════════════════════════════════

function SnapshotBarChart({ data, eduLevels, latestYear, locale }: {
  data: any[];
  eduLevels: { code: string; label: string }[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const barData = useMemo(() => {
    if (!latestYear) return [];
    return eduLevels.map(edu => {
      const row = data.find(d => String(d.Year) === latestYear && String(d.SILC_Edu_Code) === edu.code);
      return {
        code: edu.code,
        label: isBg ? EDU_SHORT[edu.code]?.bg : EDU_SHORT[edu.code]?.en,
        rate: getRate(row),
      };
    });
  }, [data, eduLevels, latestYear, isBg]);

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
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${p.name}</div>
            <div>${isBg ? 'Работещи бедни' : 'In-work poverty rate'}: <b>${val != null ? val.toFixed(1) + '%' : '—'}</b></div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px">${latestYear}</div>`;
        },
      },
      grid: { left: '1%', right: '5%', bottom: '4%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: barData.map(d => d.label),
        axisLabel: {
          fontSize: 11,
          color: '#64748b',
          interval: 0,
          overflow: 'truncate',
          width: 120,
        },
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
          type: 'bar' as const,
          data: barData.map(d => ({
            value: d.rate,
            itemStyle: {
              color: EDU_COLORS[d.code] ?? '#64748b',
              borderRadius: [6, 6, 0, 0],
            },
          })),
          barMaxWidth: 80,
          label: {
            show: true,
            position: 'top',
            fontSize: 12,
            fontWeight: 600,
            color: '#334155',
            formatter: (p: any) => p.value != null ? `${Number(p.value).toFixed(1)}%` : '',
          },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [barData, latestYear, isBg]);

  if (barData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[320px] text-sm text-slate-400">
        {isBg ? 'Няма данни за избраната година' : 'No data for selected year'}
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}
