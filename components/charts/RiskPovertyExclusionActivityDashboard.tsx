'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Label maps ────────────────────────────────────────────────────────────────

const ACTIVITY_LABELS_EN: Record<string, string> = {
  '1': 'Employment',
  '2': 'Non-employment',
  '3': 'Unemployment',
  '4': 'Retired',
  '5': 'Inactive (Other)',
};

const ACTIVITY_LABELS_BG: Record<string, string> = {
  '1': 'Заетост',
  '2': 'Незаетост',
  '3': 'Безработица',
  '4': 'Пенсионери',
  '5': 'Неактивни (Друго)',
};

const ACTIVITY_COLORS: Record<string, string> = {
  '1': '#10b981', // Employment → emerald
  '2': '#3b82f6', // Non-employment → blue
  '3': '#ef4444', // Unemployment → red
  '4': '#f59e0b', // Retired → amber
  '5': '#8b5cf6', // Inactive (Other) → violet
};

// SILC_Age: 2=18-64 yrs, 3=65+ yrs, 9=18+ yrs
const AGE_LABELS_EN: Record<string, string> = {
  '2': '18–64 years',
  '3': '65+ years',
  '9': '18+ years (Total)',
};

const AGE_LABELS_BG: Record<string, string> = {
  '2': '18–64 години',
  '3': '65+ години',
  '9': '18+ години (Общо)',
};

// Age X-axis ordering for the bar chart
const AGE_ORDER = ['2', '3', '9'];

const GENDER_LABELS_EN: Record<string, string> = {
  '0': 'Total', '1': 'Male', '2': 'Female',
};
const GENDER_LABELS_BG: Record<string, string> = {
  '0': 'Общо', '1': 'Мъже', '2': 'Жени',
};
const GENDER_COLORS: Record<string, string> = {
  '0': '#64748b',
  '1': '#3b82f6',
  '2': '#e11d48',
};

// ── Helper ────────────────────────────────────────────────────────────────────

function getVal(row: any, col: string): number | null {
  const v = row?.[col];
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
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

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

export function RiskPovertyExclusionActivityDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  // Derive available years
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

  // Selected activity code for bar chart filter (default: all — show Total line)
  const [selectedActivity, setSelectedActivity] = useState<string>('1');

  // ── KPI cards: latest year, Total gender (0), 18+ age (9) ──────────────────
  const kpi = useMemo(() => {
    if (!latestYear) return null;

    const findRate = (actCode: string) => {
      const row = data.find(d =>
        String(d.SILC_Activity_Code) === actCode &&
        String(d.SILC_Age_Code) === '9' &&
        String(d.Gender_Code) === '0' &&
        String(d.Year) === latestYear
      );
      return getVal(row, 'Rate');
    };

    return {
      employment:   findRate('1'),
      nonEmployment: findRate('2'),
      unemployment: findRate('3'),
      retired:      findRate('4'),
      inactive:     findRate('5'),
      latestYear,
    };
  }, [data, latestYear]);

  if (!data || data.length === 0 || !kpi) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const actLabel = (code: string) =>
    isBg ? (ACTIVITY_LABELS_BG[code] ?? code) : (ACTIVITY_LABELS_EN[code] ?? code);

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Лица в риск от бедност или социално изключване по икономическа активност'
            : 'People at Risk of Poverty or Social Exclusion by Activity Status'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Комбиниран индикатор AROPE | 18+ години`
            : `Annual data (${firstYear}–${latestYear}) | Combined AROPE indicator | 18+ years`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(['1','2','3','4','5'] as const).map(code => {
            const val = kpi[code === '1' ? 'employment'
              : code === '2' ? 'nonEmployment'
              : code === '3' ? 'unemployment'
              : code === '4' ? 'retired'
              : 'inactive'];
            return (
              <div key={code} className="bg-white shadow-sm rounded-xl p-4">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide leading-tight">
                  {actLabel(code)}
                </p>
                <p className="text-2xl font-bold mt-2" style={{ color: ACTIVITY_COLORS[code] }}>
                  {val != null ? `${val.toFixed(1)}%` : '—'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
              </div>
            );
          })}
        </div>

        {/* ── Chart A: Time-series by activity ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? 'А. Динамика на риска по икономическа активност'
              : 'A. Poverty Risk Trend by Economic Activity Status'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | Общо (18+) | % от населението`
              : `${firstYear}–${latestYear} | Total (18+) | % of population`}
          </p>
          <ActivityTrendChart
            data={data}
            allYears={allYears}
            locale={locale}
          />
        </div>

        {/* ── Chart B: Grouped bar — demographic breakdown (latest year) ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-700">
              {isBg
                ? `Б. Демографски профил — ${latestYear}`
                : `B. Demographic Breakdown — ${latestYear}`}
            </h3>
            {/* Activity filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">
                {isBg ? 'Активност:' : 'Activity:'}
              </span>
              {(['1','2','3','4','5'] as const).map(code => (
                <button
                  key={code}
                  onClick={() => setSelectedActivity(code)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedActivity === code
                      ? 'text-white border-transparent'
                      : 'text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                  style={selectedActivity === code ? { backgroundColor: ACTIVITY_COLORS[code] } : {}}
                >
                  {actLabel(code)}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Риск от бедност по възрастова група и пол (Мъже vs. Жени)'
              : 'Poverty risk by age group and sex (Male vs. Female)'}
          </p>
          <DemographicBarChart
            data={data}
            latestYear={latestYear}
            activityCode={selectedActivity}
            locale={locale}
          />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Time-Series Line Chart: trend by activity status
// Gender = Total (0), Age = 18+ (9)
// ══════════════════════════════════════════════════════════════════════════════

function ActivityTrendChart({ data, allYears, locale }: {
  data: any[];
  allYears: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const activityCodes = ['1', '2', '3', '4', '5'];
    return activityCodes.map(code => {
      const label = isBg ? (ACTIVITY_LABELS_BG[code] ?? code) : (ACTIVITY_LABELS_EN[code] ?? code);
      const color = ACTIVITY_COLORS[code];
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (String(d.SILC_Activity_Code) !== code) return;
        if (String(d.SILC_Age_Code) !== '9') return; // 18+ (Total age)
        if (String(d.Gender_Code) !== '0') return;   // Total gender
        if (!d.Year) return;
        byYear[String(d.Year)] = getVal(d, 'Rate');
      });
      return { label, color, values: allYears.map(y => byYear[y] ?? null) };
    });
  }, [data, allYears, isBg]);

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

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Grouped Bar Chart: SILC_Age on X, grouped by Gender (Male/Female)
// Filtered by selected activity status and latest year
// ══════════════════════════════════════════════════════════════════════════════

function DemographicBarChart({ data, latestYear, activityCode, locale }: {
  data: any[];
  latestYear: string;
  activityCode: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { categories, seriesMale, seriesFemale } = useMemo(() => {
    const cats = AGE_ORDER.map(ageCode =>
      isBg ? (AGE_LABELS_BG[ageCode] ?? ageCode) : (AGE_LABELS_EN[ageCode] ?? ageCode)
    );

    const maleVals = AGE_ORDER.map(ageCode => {
      const row = data.find(d =>
        String(d.SILC_Activity_Code) === activityCode &&
        String(d.SILC_Age_Code) === ageCode &&
        String(d.Gender_Code) === '1' &&
        String(d.Year) === latestYear
      );
      return getVal(row, 'Rate');
    });

    const femaleVals = AGE_ORDER.map(ageCode => {
      const row = data.find(d =>
        String(d.SILC_Activity_Code) === activityCode &&
        String(d.SILC_Age_Code) === ageCode &&
        String(d.Gender_Code) === '2' &&
        String(d.Year) === latestYear
      );
      return getVal(row, 'Rate');
    });

    return { categories: cats, seriesMale: maleVals, seriesFemale: femaleVals };
  }, [data, latestYear, activityCode, isBg]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const maleLbl = isBg ? GENDER_LABELS_BG['1'] : GENDER_LABELS_EN['1'];
    const femaleLbl = isBg ? GENDER_LABELS_BG['2'] : GENDER_LABELS_EN['2'];

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            if (p.value != null) {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:10px;height:10px;background:${p.color};border-radius:2px"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)}%</span>
              </div>`;
            }
          });
          return tip;
        },
      },
      legend: {
        data: [maleLbl, femaleLbl],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 12, itemHeight: 10,
      },
      grid: { left: '1%', right: '3%', bottom: '14%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { fontSize: 11, color: '#475569' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? '% от население' : '% of population',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: [
        {
          name: maleLbl,
          type: 'bar' as const,
          data: seriesMale.map(v => ({
            value: v,
            itemStyle: { color: GENDER_COLORS['1'], borderRadius: [4, 4, 0, 0], opacity: 0.85 },
          })),
          barMaxWidth: 60,
          label: {
            show: true,
            position: 'top' as const,
            fontSize: 11,
            fontWeight: 'bold' as const,
            color: '#475569',
            formatter: (p: any) => p.value != null ? `${Number(p.value).toFixed(1)}%` : '',
          },
          emphasis: { focus: 'series' as const },
        },
        {
          name: femaleLbl,
          type: 'bar' as const,
          data: seriesFemale.map(v => ({
            value: v,
            itemStyle: { color: GENDER_COLORS['2'], borderRadius: [4, 4, 0, 0], opacity: 0.85 },
          })),
          barMaxWidth: 60,
          label: {
            show: true,
            position: 'top' as const,
            fontSize: 11,
            fontWeight: 'bold' as const,
            color: '#475569',
            formatter: (p: any) => p.value != null ? `${Number(p.value).toFixed(1)}%` : '',
          },
          emphasis: { focus: 'series' as const },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [categories, seriesMale, seriesFemale, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '340px' }} />;
}
