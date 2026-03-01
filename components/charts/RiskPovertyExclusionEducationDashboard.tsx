'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Colour palette — traffic-light: red (low edu) → amber → green (high edu) ─

const EDU_COLORS: Record<string, string> = {
  '1': '#dc2626', // low education  — red   (highest poverty risk)
  '2': '#f59e0b', // secondary      — amber
  '3': '#16a34a', // tertiary       — green  (lowest poverty risk)
};

const EDU_LABELS_EN: Record<string, string> = {
  '1': 'Low (0-2)',
  '2': 'Secondary (3-4)',
  '3': 'Tertiary (5-6)',
};
const EDU_LABELS_BG: Record<string, string> = {
  '1': 'Ниско (0-2)',
  '2': 'Средно (3-4)',
  '3': 'Висше (5-6)',
};

const EDU_FULL_EN: Record<string, string> = {
  '1': 'Pre-primary, primary & lower secondary (ISCED 0-2)',
  '2': 'Upper secondary & post-secondary non-tertiary (ISCED 3-4)',
  '3': 'First & second stage tertiary (ISCED 5-6)',
};
const EDU_FULL_BG: Record<string, string> = {
  '1': 'Начално и основно образование (ISCED 0-2)',
  '2': 'Средно образование (ISCED 3-4)',
  '3': 'Висше образование (ISCED 5-6)',
};

// SILC_Age codes present in the dataset
const AGE_OPTIONS_EN: Record<string, string> = {
  '2': '18–64 years',
  '9': '18 years and over',
};
const AGE_OPTIONS_BG: Record<string, string> = {
  '2': '18–64 години',
  '9': '18 и повече години',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

export function RiskPovertyExclusionEducationDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';
  const [selectedAge, setSelectedAge] = useState<string>('9');

  // ── Derive catalog data ───────────────────────────────────────────────────
  const { allYears, latestYear, firstYear, availableAgeCodes } = useMemo(() => {
    const years = new Set<string>();
    const ages = new Set<string>();
    data.forEach(d => {
      if (d.Year) years.add(String(d.Year));
      if (d.SILC_Age_Code != null) ages.add(String(d.SILC_Age_Code));
    });
    const sorted = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    return {
      allYears: sorted,
      latestYear: sorted[sorted.length - 1] ?? '',
      firstYear: sorted[0] ?? '',
      availableAgeCodes: [...ages].sort(),
    };
  }, [data]);

  // Ensure selectedAge is valid
  const activeAge = availableAgeCodes.includes(selectedAge)
    ? selectedAge
    : availableAgeCodes[0] ?? '9';

  // ── KPI: gap between low and high education in the latest year ────────────
  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const findRate = (eduCode: string, ageCode: string, year: string) =>
      data.find(d =>
        String(d.SILC_Edu_Code) === eduCode &&
        String(d.SILC_Age_Code) === ageCode &&
        String(d.Year) === year
      );

    const lowLatest  = getVal(findRate('1', '9', latestYear), 'Rate');
    const highLatest = getVal(findRate('3', '9', latestYear), 'Rate');
    const lowPrev    = prevYear ? getVal(findRate('1', '9', prevYear), 'Rate') : null;
    const highPrev   = prevYear ? getVal(findRate('3', '9', prevYear), 'Rate') : null;

    const gap = lowLatest != null && highLatest != null ? lowLatest - highLatest : null;
    const gapPrev = lowPrev != null && highPrev != null ? lowPrev - highPrev : null;
    const gapChange = gap != null && gapPrev != null ? gap - gapPrev : null;

    return { lowLatest, highLatest, gap, gapChange, latestYear };
  }, [data, allYears, latestYear]);

  if (!data || data.length === 0 || !kpi) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const ageLabel = isBg
    ? (AGE_OPTIONS_BG[activeAge] ?? activeAge)
    : (AGE_OPTIONS_EN[activeAge] ?? activeAge);

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg
            ? 'Лица в риск от бедност или социално изключване по образование (18+)'
            : 'People at Risk of Poverty or Social Exclusion by Education (18+)'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | Комбиниран индикатор AROPE`
            : `Annual data (${firstYear}–${latestYear}) | Combined AROPE indicator`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Нисковалифицирани (18+)' : 'Low-educated (18+)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-red-600">
              {kpi.lowLatest != null ? `${kpi.lowLatest.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Риск от бедност, ISCED 0-2' : 'At-risk rate, ISCED 0-2'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Висшисти (18+)' : 'Tertiary-educated (18+)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-emerald-600">
              {kpi.highLatest != null ? `${kpi.highLatest.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Риск от бедност, ISCED 5-6' : 'At-risk rate, ISCED 5-6'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{kpi.latestYear}</p>
          </div>

          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Образователна разлика' : 'Education gap'}
            </p>
            <p className="text-3xl font-bold mt-2 text-indigo-600">
              {kpi.gap != null ? `${kpi.gap.toFixed(1)}pp` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBg ? 'Нисковалифицирани минус висшисти' : 'Low-educated minus tertiary'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400">{kpi.latestYear}</span>
              {kpi.gapChange != null && (
                <span className={`text-[10px] font-semibold ${kpi.gapChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.gapChange <= 0 ? '▼' : '▲'} {Math.abs(kpi.gapChange).toFixed(1)}pp YoY
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Age group selector ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 font-medium">
            {isBg ? 'Възрастова група:' : 'Age group:'}
          </span>
          {availableAgeCodes.map(code => (
            <button
              key={code}
              onClick={() => setSelectedAge(code)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                activeAge === code
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              {isBg ? (AGE_OPTIONS_BG[code] ?? code) : (AGE_OPTIONS_EN[code] ?? code)}
            </button>
          ))}
        </div>

        {/* ── Chart A: Multi-line trend by education level ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `А. Динамика на риска от бедност по образование — ${ageLabel}`
              : `A. Poverty Risk Trend by Education Level — ${ageLabel}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? `${firstYear}–${latestYear} | % от населението в риск от бедност или социално изключване`
              : `${firstYear}–${latestYear} | % of population at risk of poverty or social exclusion`}
          </p>
          <TrendLineChart data={data} allYears={allYears} activeAge={activeAge} locale={locale} />
        </div>

        {/* ── Chart B: Bar chart — latest year snapshot by education level ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `Б. Риск от бедност по ниво на образование — ${latestYear} (${ageLabel})`
              : `B. Poverty Risk by Education Level — ${latestYear} (${ageLabel})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Дял от населението в риск — обратна връзка между образованието и бедността'
              : 'Share of population at risk — inverse correlation between education and poverty'}
          </p>
          <EducationBarChart
            data={data}
            latestYear={latestYear}
            activeAge={activeAge}
            locale={locale}
          />
        </div>

        {/* ── Chart C: Grouped bars — both age groups side by side ── */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg
              ? `В. Сравнение по образование и възрастова група — ${latestYear}`
              : `C. Education × Age Group Comparison — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg
              ? 'Групирани стълбове за двете налични възрастови групи'
              : 'Grouped bars for both available age groups'}
          </p>
          <GroupedComparisonChart data={data} latestYear={latestYear} locale={locale} />
        </div>

      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart A — Multi-Line Trend by Education Level
// ══════════════════════════════════════════════════════════════════════════════

function TrendLineChart({ data, allYears, activeAge, locale }: {
  data: any[];
  allYears: string[];
  activeAge: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    return ['1', '2', '3'].map(eduCode => {
      const label = isBg ? EDU_LABELS_BG[eduCode] : EDU_LABELS_EN[eduCode];
      const color = EDU_COLORS[eduCode];
      const byYear: Record<string, number | null> = {};
      data.forEach(d => {
        if (String(d.SILC_Edu_Code) !== eduCode) return;
        if (String(d.SILC_Age_Code) !== activeAge) return;
        if (!d.Year) return;
        byYear[String(d.Year)] = getVal(d, 'Rate');
      });
      return { label, color, values: allYears.map(y => byYear[y] ?? null) };
    });
  }, [data, allYears, activeAge, isBg]);

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

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart B — Horizontal Bar: latest year snapshot by education level
// ══════════════════════════════════════════════════════════════════════════════

function EducationBarChart({ data, latestYear, activeAge, locale }: {
  data: any[];
  latestYear: string;
  activeAge: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { categories, values, colors, fullLabels } = useMemo(() => {
    const items = ['1', '2', '3'].map(eduCode => ({
      label: isBg ? EDU_LABELS_BG[eduCode] : EDU_LABELS_EN[eduCode],
      fullLabel: isBg ? EDU_FULL_BG[eduCode] : EDU_FULL_EN[eduCode],
      color: EDU_COLORS[eduCode],
      value: (() => {
        const row = data.find(d =>
          String(d.SILC_Edu_Code) === eduCode &&
          String(d.SILC_Age_Code) === activeAge &&
          String(d.Year) === latestYear
        );
        return getVal(row, 'Rate');
      })(),
    }));
    return {
      categories: items.map(i => i.label),
      values: items.map(i => i.value),
      colors: items.map(i => i.color),
      fullLabels: items.map(i => i.fullLabel),
    };
  }, [data, latestYear, activeAge, isBg]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const idx = categories.indexOf(p.axisValue);
          const full = fullLabels[idx] ?? p.axisValue;
          return `<div style="font-weight:600;color:#0f172a;margin-bottom:4px">${full}</div>
            <div>${isBg ? 'Дял в риск' : 'At-risk rate'}: <b>${p.value != null ? Number(p.value).toFixed(1) + '%' : '—'}</b></div>`;
        },
      },
      grid: { left: '2%', right: '12%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? '% от населението' : '% of population',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        max: (v: { max: number }) => Math.ceil(v.max * 1.2),
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
        barMaxWidth: 56,
        label: {
          show: true,
          position: 'right' as const,
          fontSize: 14,
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
  }, [categories, values, colors, fullLabels, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '240px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart C — Grouped Bars: education × both age groups (latest year)
// ══════════════════════════════════════════════════════════════════════════════

function GroupedComparisonChart({ data, latestYear, locale }: {
  data: any[];
  latestYear: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  // Two age group series — one bar per education level
  const seriesData = useMemo(() => {
    return [
      { ageCode: '2', label: isBg ? AGE_OPTIONS_BG['2'] : AGE_OPTIONS_EN['2'], color: '#6366f1' },
      { ageCode: '9', label: isBg ? AGE_OPTIONS_BG['9'] : AGE_OPTIONS_EN['9'], color: '#0ea5e9' },
    ].map(({ ageCode, label, color }) => ({
      label,
      color,
      values: ['1', '2', '3'].map(eduCode => {
        const row = data.find(d =>
          String(d.SILC_Edu_Code) === eduCode &&
          String(d.SILC_Age_Code) === ageCode &&
          String(d.Year) === latestYear
        );
        return getVal(row, 'Rate');
      }),
    }));
  }, [data, latestYear, isBg]);

  const eduCategories = isBg
    ? ['Ниско (0-2)', 'Средно (3-4)', 'Висше (5-6)']
    : ['Low (0-2)', 'Secondary (3-4)', 'Tertiary (5-6)'];

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

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
        data: seriesData.map(s => s.label),
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 12, itemHeight: 10,
      },
      grid: { left: '1%', right: '3%', bottom: '18%', top: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        data: eduCategories,
        axisLabel: { fontSize: 12, color: '#475569' },
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
      series: seriesData.map(s => ({
        name: s.label,
        type: 'bar' as const,
        data: s.values,
        itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0], opacity: 0.9 },
        barMaxWidth: 60,
        label: {
          show: true,
          position: 'top' as const,
          fontSize: 11,
          fontWeight: 'bold' as const,
          color: '#475569',
          formatter: (p: any) => p.value != null ? Number(p.value).toFixed(1) + '%' : '',
        },
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [seriesData, eduCategories, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}
