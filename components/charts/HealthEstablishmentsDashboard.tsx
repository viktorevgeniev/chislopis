'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import type { Dataset } from '@/types/dataset';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseValue(v: any): number | null {
  if (v == null || v === '' || v === '-' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[(),\s]/g, ''));
  return isNaN(n) ? null : n;
}

function fmtNum(v: number | null, decimals = 0): string {
  return v != null ? v.toLocaleString('bg-BG', { maximumFractionDigits: decimals }) : '—';
}

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
    extraCssText: 'box-shadow:0 4px 16px rgba(0,0,0,0.08)',
  };
}

type GeoLevel = 'national' | 'macro' | 'nuts2' | 'district' | 'municipality';

function classifyCode(code: string): GeoLevel {
  if (code === 'BG') return 'national';
  if (/^BG\d$/.test(code)) return 'macro';
  if (/^BG\d{2}$/.test(code)) return 'nuts2';
  // Districts: exactly 3 uppercase letters (VID, SFO, PAZ...) or Sofia city code
  if (code === '68134' || /^[A-Z]{3}$/.test(code)) return 'district';
  return 'municipality';
}

// Top-level facility codes (non-overlapping)
const TOP_LEVEL = ['1', '2', '3'];
// Sub-type codes only (leaves)
const SUBTYPES = ['1.1', '1.2', '1.3', '1.4', '1.5', '2.1', '2.2', '2.3', '2.4', '2.5', '3'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface PivotRow {
  year: string;
  regionCode: string;
  regionName: string;
  facilityCode: string;
  facilityName: string;
  establishments: number | null;
  beds: number | null;
}

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ── i18n ─────────────────────────────────────────────────────────────────────

const LABELS = {
  bg: {
    trend: 'Национална тенденция',
    regional: 'Регионално разпределение',
    composition: 'Структура по вид',
    table: 'Таблица',
    establishments: 'Заведения',
    beds: 'Легла',
    year: 'Година',
    region: 'Регион',
    facilityType: 'Вид заведение',
    allYears: 'Всички години',
    allLevels: 'Всички нива',
    national: 'Национално',
    nuts2: 'NUTS 2',
    districts: 'Области',
    prev: 'Предишна',
    next: 'Следваща',
    page: (p: number, t: number, r: number) => `Страница ${p} от ${t} (${r} реда)`,
  },
  en: {
    trend: 'National Trend',
    regional: 'Regional Distribution',
    composition: 'Composition by Type',
    table: 'Data Table',
    establishments: 'Establishments',
    beds: 'Beds',
    year: 'Year',
    region: 'Region',
    facilityType: 'Facility Type',
    allYears: 'All years',
    allLevels: 'All levels',
    national: 'National',
    nuts2: 'NUTS 2',
    districts: 'Districts',
    prev: 'Prev',
    next: 'Next',
    page: (p: number, t: number, r: number) => `Page ${p} of ${t} (${r} rows)`,
  },
};

// ── Accent palette ────────────────────────────────────────────────────────────

const C = {
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#10b981',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
};

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, subColor, accent }: {
  label: string; value: string; sub?: string; subColor?: string;
  accent: keyof typeof C;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: C[accent] }}>{value}</p>
      {sub && <p className={`text-[11px] font-semibold mt-1 ${subColor ?? 'text-slate-400'}`}>{sub}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function HealthEstablishmentsDashboard({ data, locale = 'en' }: Props) {
  const t = LABELS[locale];

  // ── Pivot raw rows ──────────────────────────────────────────────────────────
  const { pivoted, years, latestYear, firstYear } = useMemo(() => {
    const map = new Map<string, PivotRow>();
    for (const row of data) {
      const regionCode = String(row['EKATTE_Hlth_Code'] ?? row['EKATTE_Hlth'] ?? '');
      const regionName = String(row['EKATTE_Hlth'] ?? regionCode);
      const facilityCode = String(row['HlthEst_2011_2013_Code'] ?? row['HlthEst_2011_2013'] ?? '');
      const facilityName = String(row['HlthEst_2011_2013'] ?? facilityCode);
      const measureCode = String(row['HlthEst_measures_Code'] ?? row['HlthEst_measures'] ?? '');
      const year = String(row['Year'] ?? row['periods'] ?? '');
      const val = parseValue(row['Count'] ?? row['ValueColumn']);

      if (!regionCode || !facilityCode || !year) continue;

      const key = `${year}|${regionCode}|${facilityCode}`;
      if (!map.has(key)) {
        map.set(key, { year, regionCode, regionName, facilityCode, facilityName, establishments: null, beds: null });
      }
      const entry = map.get(key)!;
      if (measureCode === 'Est') entry.establishments = val;
      else if (measureCode === 'Beds') entry.beds = val;
    }
    const all = Array.from(map.values()).sort(
      (a, b) => a.year.localeCompare(b.year) || a.regionCode.localeCompare(b.regionCode)
    );
    const ys = [...new Set(all.map(r => r.year))].sort();
    return {
      pivoted: all,
      years: ys,
      latestYear: ys[ys.length - 1] ?? '',
      firstYear: ys[0] ?? '',
    };
  }, [data]);

  // ── KPI summary ─────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const natTop = pivoted.filter(r => r.regionCode === 'BG' && TOP_LEVEL.includes(r.facilityCode));
    const sum = (yr: string) => natTop.filter(r => r.year === yr)
      .reduce((s, r) => ({ est: s.est + (r.establishments ?? 0), beds: s.beds + (r.beds ?? 0) }), { est: 0, beds: 0 });
    const latest = sum(latestYear);
    const first = sum(firstYear);
    const prevYear = years.length > 1 ? years[years.length - 2] : null;
    const prev = prevYear ? sum(prevYear) : null;
    const yoyEst = prev && prev.est > 0 ? ((latest.est - prev.est) / prev.est) * 100 : null;
    const changeEst = first.est > 0 ? ((latest.est - first.est) / first.est) * 100 : null;
    return { latest, first, yoyEst, changeEst, firstYear, latestYear };
  }, [pivoted, latestYear, firstYear, years]);

  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{locale === 'bg' ? 'Няма данни' : 'No data available'}</div>;
  }

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {locale === 'bg' ? 'Здравни заведения по области и общини' : 'Health Establishments by Districts and Municipalities'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {locale === 'bg'
            ? `${firstYear}–${latestYear} | Заведения и легла по вид, регион и година`
            : `${firstYear}–${latestYear} | Establishments and beds by type, region, and year`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label={locale === 'bg' ? `Всички заведения (${latestYear})` : `Total Establishments (${latestYear})`}
            value={fmtNum(kpi.latest.est)}
            sub={kpi.yoyEst != null
              ? `${kpi.yoyEst >= 0 ? '▲' : '▼'} ${Math.abs(kpi.yoyEst).toFixed(1)}% ${locale === 'bg' ? 'спрямо пред. г.' : 'vs prev year'}`
              : undefined}
            subColor={kpi.yoyEst != null ? (kpi.yoyEst >= 0 ? 'text-emerald-600' : 'text-red-500') : undefined}
            accent="blue"
          />
          <KpiCard
            label={locale === 'bg' ? `Легла (${latestYear})` : `Total Beds (${latestYear})`}
            value={fmtNum(kpi.latest.beds)}
            accent="red"
          />
          <KpiCard
            label={locale === 'bg' ? `Промяна в заведения от ${firstYear}` : `Change in Establishments since ${firstYear}`}
            value={kpi.changeEst != null ? `${kpi.changeEst >= 0 ? '+' : ''}${kpi.changeEst.toFixed(1)}%` : '—'}
            sub={kpi.changeEst != null
              ? (kpi.changeEst >= 0
                ? (locale === 'bg' ? 'Нарастване' : 'Growth')
                : (locale === 'bg' ? 'Намаляване' : 'Decline'))
              : undefined}
            subColor={kpi.changeEst != null ? (kpi.changeEst >= 0 ? 'text-emerald-600' : 'text-red-500') : undefined}
            accent="amber"
          />
          <KpiCard
            label={locale === 'bg' ? 'Обхванати години' : 'Years Covered'}
            value={String(years.length)}
            sub={`${firstYear} – ${latestYear}`}
            subColor="text-slate-400"
            accent="green"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="trend">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="trend">{t.trend}</TabsTrigger>
            <TabsTrigger value="regional">{t.regional}</TabsTrigger>
            <TabsTrigger value="composition">{t.composition}</TabsTrigger>
            <TabsTrigger value="table">{t.table}</TabsTrigger>
          </TabsList>

          <TabsContent value="trend">
            <TrendTab pivoted={pivoted} years={years} firstYear={firstYear} latestYear={latestYear} locale={locale} />
          </TabsContent>

          <TabsContent value="regional">
            <RegionalTab pivoted={pivoted} latestYear={latestYear} locale={locale} />
          </TabsContent>

          <TabsContent value="composition">
            <CompositionTab pivoted={pivoted} years={years} latestYear={latestYear} locale={locale} />
          </TabsContent>

          <TabsContent value="table">
            <TableTab pivoted={pivoted} years={years} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 1 — National Trend (dual-axis line chart)
// ══════════════════════════════════════════════════════════════════════════════

function TrendTab({ pivoted, years, firstYear, latestYear, locale }: {
  pivoted: PivotRow[]; years: string[]; firstYear: string; latestYear: string; locale: 'bg' | 'en';
}) {
  const t = LABELS[locale];
  const chartRef = useRef<HTMLDivElement>(null);

  const { estData, bedsData } = useMemo(() => {
    const national = pivoted.filter(r => r.regionCode === 'BG' && TOP_LEVEL.includes(r.facilityCode));
    const byYear = new Map<string, { est: number; beds: number }>();
    for (const r of national) {
      if (!byYear.has(r.year)) byYear.set(r.year, { est: 0, beds: 0 });
      const agg = byYear.get(r.year)!;
      agg.est += r.establishments ?? 0;
      agg.beds += r.beds ?? 0;
    }
    return {
      estData: years.map(y => byYear.get(y)?.est ?? null),
      bedsData: years.map(y => byYear.get(y)?.beds ?? null),
    };
  }, [pivoted, years]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any[]) => {
          const yr = params[0]?.axisValue ?? '';
          return `<div style="font-weight:600;margin-bottom:4px">${yr}</div>` +
            params.map((p: any) =>
              `<div style="display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span>${p.seriesName}</span>
                <span style="font-weight:700;margin-left:auto;padding-left:12px">${fmtNum(p.value)}</span>
              </div>`
            ).join('');
        },
      },
      legend: { bottom: 0, data: [t.establishments, t.beds], itemGap: 24 },
      grid: { top: 30, right: 80, bottom: 60, left: 80 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: years,
        axisLabel: { fontSize: 11, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: t.establishments,
          nameLocation: 'middle',
          nameGap: 55,
          nameTextStyle: { fontSize: 11, color: '#94a3b8' },
          splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
          axisLabel: { fontSize: 10, color: '#94a3b8' },
        },
        {
          type: 'value',
          name: t.beds,
          nameLocation: 'middle',
          nameGap: 55,
          nameTextStyle: { fontSize: 11, color: '#94a3b8' },
          splitLine: { show: false },
          axisLabel: { fontSize: 10, color: '#94a3b8' },
        },
      ],
      series: [
        {
          name: t.establishments,
          type: 'line',
          data: estData,
          yAxisIndex: 0,
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { width: 2.5, color: C.blue },
          itemStyle: { color: C.blue, borderWidth: 2, borderColor: '#fff' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.15)' }, { offset: 1, color: 'rgba(59,130,246,0)' }] } },
        },
        {
          name: t.beds,
          type: 'line',
          data: bedsData,
          yAxisIndex: 1,
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { width: 2.5, color: C.red, type: 'dashed' },
          itemStyle: { color: C.red, borderWidth: 2, borderColor: '#fff' },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [estData, bedsData, years, t]);

  return (
    <div className="bg-white rounded-xl p-4 mt-3 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">
        {locale === 'bg' ? 'Национална тенденция — Заведения и Легла' : 'National Trend — Establishments & Beds'}
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        {locale === 'bg'
          ? `България ${firstYear}–${latestYear} | Брой заведения (лява ос) и легла (дясна ос)`
          : `Bulgaria ${firstYear}–${latestYear} | Number of establishments (left axis) and beds (right axis)`}
      </p>
      <div ref={chartRef} style={{ height: 400 }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 2 — Regional Distribution (horizontal bar)
// ══════════════════════════════════════════════════════════════════════════════

function RegionalTab({ pivoted, latestYear, locale }: {
  pivoted: PivotRow[]; latestYear: string; locale: 'bg' | 'en';
}) {
  const t = LABELS[locale];
  const [level, setLevel] = useState<'district' | 'nuts2'>('district');
  const chartRef = useRef<HTMLDivElement>(null);

  const { names, estData, bedsData } = useMemo(() => {
    const byRegion = new Map<string, { name: string; est: number; beds: number }>();
    for (const r of pivoted) {
      if (r.year !== latestYear) continue;
      if (!TOP_LEVEL.includes(r.facilityCode)) continue;
      const lvl = classifyCode(r.regionCode);
      if (lvl !== level) continue;
      if (!byRegion.has(r.regionCode)) {
        byRegion.set(r.regionCode, { name: r.regionName, est: 0, beds: 0 });
      }
      const agg = byRegion.get(r.regionCode)!;
      agg.est += r.establishments ?? 0;
      agg.beds += r.beds ?? 0;
    }
    const sorted = [...byRegion.values()].sort((a, b) => b.beds - a.beds);
    return {
      names: sorted.map(v => v.name),
      estData: sorted.map(v => v.est),
      bedsData: sorted.map(v => v.beds),
    };
  }, [pivoted, latestYear, level]);

  const chartHeight = Math.max(300, names.length * 28 + 100);

  useEffect(() => {
    if (!chartRef.current || names.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any[]) => {
          const region = params[0]?.axisValue ?? '';
          return `<div style="font-weight:600;margin-bottom:4px">${region}</div>` +
            params.map((p: any) =>
              `<div style="display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span>${p.seriesName}</span>
                <span style="font-weight:700;margin-left:auto;padding-left:12px">${fmtNum(p.value)}</span>
              </div>`
            ).join('');
        },
      },
      legend: { top: 5, right: 0, data: [t.establishments, t.beds] },
      grid: { top: 40, right: 20, bottom: 20, left: 170, containLabel: false },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
      },
      yAxis: {
        type: 'category',
        data: [...names].reverse(),
        axisLabel: { fontSize: 11, color: '#334155', width: 160, overflow: 'truncate' },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          name: t.establishments,
          type: 'bar',
          data: [...estData].reverse(),
          barMaxWidth: 14,
          itemStyle: { color: C.blue, borderRadius: [0, 3, 3, 0] },
        },
        {
          name: t.beds,
          type: 'bar',
          data: [...bedsData].reverse(),
          barMaxWidth: 14,
          itemStyle: { color: C.red, borderRadius: [0, 3, 3, 0] },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [names, estData, bedsData, t]);

  return (
    <div className="bg-white rounded-xl p-4 mt-3 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            {locale === 'bg' ? `Регионално разпределение — ${latestYear}` : `Regional Distribution — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {locale === 'bg'
              ? 'Брой заведения и легла по региони (сума на всички видове)'
              : 'Number of establishments and beds by region (all types combined)'}
          </p>
        </div>
        <Select
          value={level}
          onChange={e => setLevel(e.target.value as 'district' | 'nuts2')}
          className="w-40 shrink-0"
        >
          <option value="district">{t.districts}</option>
          <option value="nuts2">{t.nuts2}</option>
        </Select>
      </div>
      <div ref={chartRef} style={{ height: chartHeight }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 3 — Composition by Facility Type
// ══════════════════════════════════════════════════════════════════════════════

function CompositionTab({ pivoted, years, latestYear, locale }: {
  pivoted: PivotRow[]; years: string[]; latestYear: string; locale: 'bg' | 'en';
}) {
  const t = LABELS[locale];
  const stackedRef = useRef<HTMLDivElement>(null);
  const donutRef = useRef<HTMLDivElement>(null);

  // National top-level by year (for stacked bar)
  const { stackedData, facilityNames } = useMemo(() => {
    const natTop = pivoted.filter(r => r.regionCode === 'BG' && TOP_LEVEL.includes(r.facilityCode));
    const namesMap = new Map<string, string>();
    const byYear = new Map<string, Record<string, number>>();
    for (const r of natTop) {
      namesMap.set(r.facilityCode, r.facilityName);
      if (!byYear.has(r.year)) byYear.set(r.year, {});
      const agg = byYear.get(r.year)!;
      agg[r.facilityCode] = (r.establishments ?? 0);
    }
    return { stackedData: byYear, facilityNames: namesMap };
  }, [pivoted]);

  // National latest year subtypes (for donut — beds)
  const donutData = useMemo(() => {
    return pivoted
      .filter(r => r.year === latestYear && r.regionCode === 'BG' && TOP_LEVEL.includes(r.facilityCode))
      .filter(r => (r.beds ?? 0) > 0)
      .map(r => ({ value: r.beds!, name: r.facilityName }))
      .sort((a, b) => b.value - a.value);
  }, [pivoted, latestYear]);

  const f1 = facilityNames.get('1') ?? 'Hospital establishments';
  const f2 = facilityNames.get('2') ?? 'Outpatient establishments';
  const f3 = facilityNames.get('3') ?? 'Other establishments';

  // Stacked bar chart
  useEffect(() => {
    if (!stackedRef.current || years.length === 0) return;
    const chart = echarts.init(stackedRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any[]) => {
          const yr = params[0]?.axisValue ?? '';
          const total = (params as any[]).reduce((s: number, p: any) => s + (p.value ?? 0), 0);
          return `<div style="font-weight:600;margin-bottom:4px">${yr}</div>` +
            params.map((p: any) =>
              `<div style="display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.seriesName}</span>
                <span style="font-weight:700;margin-left:auto;padding-left:12px">${fmtNum(p.value)}</span>
              </div>`
            ).join('') +
            `<div style="border-top:1px solid #e2e8f0;margin-top:4px;padding-top:4px;font-weight:700">${locale === 'bg' ? 'Общо' : 'Total'}: ${fmtNum(total)}</div>`;
        },
      },
      legend: { bottom: 0, data: [f1, f2, f3], itemGap: 16, textStyle: { fontSize: 11 } },
      grid: { top: 20, right: 20, bottom: 70, left: 70 },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { fontSize: 11, color: '#94a3b8', rotate: 30 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: t.establishments,
        nameTextStyle: { fontSize: 11, color: '#94a3b8' },
        splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
      },
      series: [
        {
          name: f1,
          type: 'bar',
          stack: 'total',
          data: years.map(y => stackedData.get(y)?.['1'] ?? 0),
          itemStyle: { color: C.blue },
        },
        {
          name: f2,
          type: 'bar',
          stack: 'total',
          data: years.map(y => stackedData.get(y)?.['2'] ?? 0),
          itemStyle: { color: C.green },
        },
        {
          name: f3,
          type: 'bar',
          stack: 'total',
          data: years.map(y => stackedData.get(y)?.['3'] ?? 0),
          itemStyle: { color: C.amber },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [stackedData, facilityNames, years, f1, f2, f3, t, locale]);

  // Donut chart
  useEffect(() => {
    if (!donutRef.current || donutData.length === 0) return;
    const chart = echarts.init(donutRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        ...tooltipStyle(),
        formatter: (p: any) => `<b>${p.name}</b><br/>${fmtNum(p.value)} ${t.beds} (${p.percent}%)`,
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: { fontSize: 11, color: '#334155' },
        formatter: (name: string) => name.length > 30 ? name.slice(0, 28) + '…' : name,
      },
      series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['38%', '50%'],
        data: donutData,
        label: { formatter: '{d}%', fontSize: 12, color: '#334155' },
        itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
        color: [C.blue, C.green, C.amber],
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [donutData, t]);

  return (
    <div className="bg-white rounded-xl p-4 mt-3 shadow-sm space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">
          {locale === 'bg' ? 'А. Динамика на заведения по вид — България' : 'A. Establishment Count by Type Over Time — Bulgaria'}
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          {locale === 'bg'
            ? 'Структура на заведенията по основни категории (болнична, извънболнична, друга) по години'
            : 'Breakdown of establishments by main category (hospital, outpatient, other) across years'}
        </p>
        <div ref={stackedRef} style={{ height: 360 }} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">
          {locale === 'bg' ? `Б. Дял на легла по вид заведение — ${latestYear}` : `B. Bed Share by Facility Type — ${latestYear}`}
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          {locale === 'bg'
            ? 'Разпределение на легла между болнична, извънболнична помощ и друга'
            : 'Distribution of beds across hospital, outpatient, and other facilities'}
        </p>
        <div ref={donutRef} style={{ height: 300 }} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 4 — Data Table (sortable, paginated)
// ══════════════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;

function TableTab({ pivoted, years, locale }: {
  pivoted: PivotRow[]; years: string[]; locale: 'bg' | 'en';
}) {
  const t = LABELS[locale];
  const [filterYear, setFilterYear] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortCol, setSortCol] = useState<keyof PivotRow>('year');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const rows = pivoted.filter(r => {
      if (!TOP_LEVEL.includes(r.facilityCode)) return false;
      if (filterYear !== 'all' && r.year !== filterYear) return false;
      if (filterLevel !== 'all') {
        const lvl = classifyCode(r.regionCode);
        if (filterLevel === 'national' && lvl !== 'national') return false;
        if (filterLevel === 'nuts2' && lvl !== 'nuts2') return false;
        if (filterLevel === 'district' && lvl !== 'district') return false;
      }
      return true;
    });
    return [...rows].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }, [pivoted, filterYear, filterLevel, sortCol, sortAsc]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSort(col: keyof PivotRow) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(0);
  }

  const Th = ({ col, label }: { col: keyof PivotRow; label: string }) => (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      {label}{sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div className="bg-white rounded-xl p-4 mt-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(0); }} className="w-36">
          <option value="all">{t.allYears}</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </Select>
        <Select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setPage(0); }} className="w-40">
          <option value="all">{t.allLevels}</option>
          <option value="national">{t.national}</option>
          <option value="nuts2">{t.nuts2}</option>
          <option value="district">{t.districts}</option>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <Th col="year" label={t.year} />
              <Th col="regionName" label={t.region} />
              <Th col="facilityName" label={t.facilityType} />
              <Th col="establishments" label={t.establishments} />
              <Th col="beds" label={t.beds} />
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-1.5 tabular-nums">{row.year}</td>
                <td className="px-3 py-1.5">{row.regionName}</td>
                <td className="px-3 py-1.5 max-w-xs truncate" title={row.facilityName}>{row.facilityName}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtNum(row.establishments)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtNum(row.beds)}</td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground text-sm">
                  {locale === 'bg' ? 'Няма резултати' : 'No results'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">
            {t.page(page + 1, pageCount, filtered.length)}
          </span>
          <div className="flex gap-1">
            <button
              className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-slate-50"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              {t.prev}
            </button>
            <button
              className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-slate-50"
              onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
            >
              {t.next}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
