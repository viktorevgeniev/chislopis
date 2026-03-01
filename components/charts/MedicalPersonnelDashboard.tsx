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
  if (code === '68134' || /^[A-Z]{3}$/.test(code)) return 'district';
  return 'municipality';
}

// Personnel type codes
const PERSONNEL_CODES = ['1', '2', '3'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Row {
  year: string;
  regionCode: string;
  regionName: string;
  personnelCode: string;
  personnelName: string;
  count: number | null;
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
    count: 'Брой',
    year: 'Година',
    region: 'Регион',
    personnelType: 'Вид персонал',
    allYears: 'Всички години',
    allTypes: 'Всички видове',
    allLevels: 'Всички нива',
    national: 'Национално',
    nuts2: 'NUTS 2',
    districts: 'Области',
    prev: 'Предишна',
    next: 'Следваща',
    page: (p: number, t: number, r: number) => `Страница ${p} от ${t} (${r} реда)`,
    physicians: 'Лекари',
    dentists: 'Лекари по дентална медицина',
    specialists: 'Специалисти по здравни грижи',
    total: 'Общо',
  },
  en: {
    trend: 'National Trend',
    regional: 'Regional Distribution',
    composition: 'Composition by Type',
    table: 'Data Table',
    count: 'Count',
    year: 'Year',
    region: 'Region',
    personnelType: 'Personnel Type',
    allYears: 'All years',
    allTypes: 'All types',
    allLevels: 'All levels',
    national: 'National',
    nuts2: 'NUTS 2',
    districts: 'Districts',
    prev: 'Prev',
    next: 'Next',
    page: (p: number, t: number, r: number) => `Page ${p} of ${t} (${r} rows)`,
    physicians: 'Physicians',
    dentists: 'Dentists',
    specialists: 'Medical specialists (Health cares)',
    total: 'Total',
  },
};

// ── Color palette ─────────────────────────────────────────────────────────────

const C = {
  blue: '#3b82f6',
  teal: '#14b8a6',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  green: '#10b981',
  red: '#ef4444',
};

const PERSONNEL_COLORS: Record<string, string> = {
  '1': C.blue,
  '2': C.teal,
  '3': C.amber,
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

export function MedicalPersonnelDashboard({ data, locale = 'en' }: Props) {
  const t = LABELS[locale];

  // ── Parse rows ──────────────────────────────────────────────────────────────
  const { rows, years, latestYear, firstYear } = useMemo(() => {
    const parsed: Row[] = [];
    for (const raw of data) {
      const regionCode = String(raw['EKATTE_Hlth_Code'] ?? raw['EKATTE_Hlth'] ?? '');
      const regionName = String(raw['EKATTE_Hlth'] ?? regionCode);
      const personnelCode = String(raw['Mpersonnel_Code'] ?? raw['Mpersonnel'] ?? '');
      const personnelName = String(raw['Mpersonnel'] ?? personnelCode);
      const year = String(raw['Year'] ?? raw['periods'] ?? '');
      const count = parseValue(raw['Count'] ?? raw['ValueColumn']);

      if (!regionCode || !personnelCode || !year) continue;
      parsed.push({ year, regionCode, regionName, personnelCode, personnelName, count });
    }
    parsed.sort((a, b) => a.year.localeCompare(b.year) || a.regionCode.localeCompare(b.regionCode));
    const ys = [...new Set(parsed.map(r => r.year))].sort();
    return {
      rows: parsed,
      years: ys,
      latestYear: ys[ys.length - 1] ?? '',
      firstYear: ys[0] ?? '',
    };
  }, [data]);

  // ── KPI summary ─────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const national = rows.filter(r => r.regionCode === 'BG');
    const sumYear = (yr: string) =>
      national.filter(r => r.year === yr).reduce((s, r) => s + (r.count ?? 0), 0);
    const latest = sumYear(latestYear);
    const first = sumYear(firstYear);
    const prevYear = years.length > 1 ? years[years.length - 2] : null;
    const prev = prevYear ? sumYear(prevYear) : null;
    const yoy = prev && prev > 0 ? ((latest - prev) / prev) * 100 : null;
    const change = first > 0 ? ((latest - first) / first) * 100 : null;

    // Physicians latest
    const physicians = national.filter(r => r.year === latestYear && r.personnelCode === '1')
      .reduce((s, r) => s + (r.count ?? 0), 0);

    return { latest, first, yoy, change, physicians, firstYear, latestYear };
  }, [rows, years, latestYear, firstYear]);

  // ── Personnel name lookup ────────────────────────────────────────────────────
  const personnelNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      if (!m.has(r.personnelCode)) m.set(r.personnelCode, r.personnelName);
    }
    return m;
  }, [rows]);

  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{locale === 'bg' ? 'Няма данни' : 'No data available'}</div>;
  }

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {locale === 'bg' ? 'Медицински персонал по области и общини' : 'Medical Personnel by Districts and Municipalities'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {locale === 'bg'
            ? `${firstYear}–${latestYear} | Лекари, зъболекари и специалисти по здравни грижи`
            : `${firstYear}–${latestYear} | Physicians, dentists and health care specialists`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label={locale === 'bg' ? `Общо персонал (${latestYear})` : `Total Personnel (${latestYear})`}
            value={fmtNum(kpi.latest)}
            sub={kpi.yoy != null
              ? `${kpi.yoy >= 0 ? '▲' : '▼'} ${Math.abs(kpi.yoy).toFixed(1)}% ${locale === 'bg' ? 'спрямо пред. г.' : 'vs prev year'}`
              : undefined}
            subColor={kpi.yoy != null ? (kpi.yoy >= 0 ? 'text-emerald-600' : 'text-red-500') : undefined}
            accent="blue"
          />
          <KpiCard
            label={locale === 'bg' ? `Лекари (${latestYear})` : `Physicians (${latestYear})`}
            value={fmtNum(kpi.physicians)}
            sub={kpi.latest > 0 ? `${((kpi.physicians / kpi.latest) * 100).toFixed(1)}%` : undefined}
            subColor="text-slate-400"
            accent="teal"
          />
          <KpiCard
            label={locale === 'bg' ? `Промяна от ${firstYear}` : `Change since ${firstYear}`}
            value={kpi.change != null ? `${kpi.change >= 0 ? '+' : ''}${kpi.change.toFixed(1)}%` : '—'}
            sub={kpi.change != null
              ? (kpi.change >= 0
                ? (locale === 'bg' ? 'Нарастване' : 'Growth')
                : (locale === 'bg' ? 'Намаляване' : 'Decline'))
              : undefined}
            subColor={kpi.change != null ? (kpi.change >= 0 ? 'text-emerald-600' : 'text-red-500') : undefined}
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
            <TrendTab rows={rows} years={years} firstYear={firstYear} latestYear={latestYear} personnelNames={personnelNames} locale={locale} />
          </TabsContent>

          <TabsContent value="regional">
            <RegionalTab rows={rows} latestYear={latestYear} personnelNames={personnelNames} locale={locale} />
          </TabsContent>

          <TabsContent value="composition">
            <CompositionTab rows={rows} years={years} latestYear={latestYear} personnelNames={personnelNames} locale={locale} />
          </TabsContent>

          <TabsContent value="table">
            <TableTab rows={rows} years={years} personnelNames={personnelNames} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 1 — National Trend (multi-line chart per personnel type)
// ══════════════════════════════════════════════════════════════════════════════

function TrendTab({ rows, years, firstYear, latestYear, personnelNames, locale }: {
  rows: Row[]; years: string[]; firstYear: string; latestYear: string;
  personnelNames: Map<string, string>; locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => {
    const national = rows.filter(r => r.regionCode === 'BG');
    return PERSONNEL_CODES.map(code => {
      const byYear = new Map<string, number>();
      national.filter(r => r.personnelCode === code).forEach(r => {
        byYear.set(r.year, (r.count ?? 0));
      });
      return {
        code,
        name: personnelNames.get(code) ?? code,
        data: years.map(y => byYear.get(y) ?? null),
      };
    });
  }, [rows, years, personnelNames]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any[]) => {
          const yr = params[0]?.axisValue ?? '';
          const total = (params as any[]).reduce((s: number, p: any) => s + (p.value ?? 0), 0);
          return `<div style="font-weight:600;margin-bottom:4px">${yr}</div>` +
            params.map((p: any) =>
              `<div style="display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.seriesName}</span>
                <span style="font-weight:700;margin-left:auto;padding-left:12px">${fmtNum(p.value)}</span>
              </div>`
            ).join('') +
            `<div style="border-top:1px solid #e2e8f0;margin-top:4px;padding-top:4px;font-weight:700">${locale === 'bg' ? 'Общо' : 'Total'}: ${fmtNum(total)}</div>`;
        },
      },
      legend: { bottom: 0, itemGap: 20, textStyle: { fontSize: 11 } },
      grid: { top: 30, right: 20, bottom: 70, left: 75 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: years,
        axisLabel: { fontSize: 11, color: '#94a3b8', rotate: 30 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: locale === 'bg' ? 'Брой' : 'Count',
        nameLocation: 'middle',
        nameGap: 55,
        nameTextStyle: { fontSize: 11, color: '#94a3b8' },
        splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
      },
      series: seriesData.map(s => ({
        name: s.name,
        type: 'line' as const,
        data: s.data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5, color: PERSONNEL_COLORS[s.code] },
        itemStyle: { color: PERSONNEL_COLORS[s.code], borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: PERSONNEL_COLORS[s.code] + '28' },
              { offset: 1, color: PERSONNEL_COLORS[s.code] + '00' },
            ],
          },
        },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [seriesData, years, locale]);

  return (
    <div className="bg-white rounded-xl p-4 mt-3 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">
        {locale === 'bg' ? 'Национална тенденция — Медицински персонал' : 'National Trend — Medical Personnel'}
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        {locale === 'bg'
          ? `България ${firstYear}–${latestYear} | Брой по категория персонал`
          : `Bulgaria ${firstYear}–${latestYear} | Count by personnel category`}
      </p>
      <div ref={chartRef} style={{ height: 420 }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 2 — Regional Distribution (horizontal stacked bar, filterable by year + level)
// ══════════════════════════════════════════════════════════════════════════════

function RegionalTab({ rows, latestYear, personnelNames, locale }: {
  rows: Row[]; latestYear: string; personnelNames: Map<string, string>; locale: 'bg' | 'en';
}) {
  const t = LABELS[locale];
  const [level, setLevel] = useState<'district' | 'nuts2'>('district');
  const chartRef = useRef<HTMLDivElement>(null);

  const { regionNames, seriesData } = useMemo(() => {
    const byRegion = new Map<string, { name: string; counts: Record<string, number> }>();
    for (const r of rows) {
      if (r.year !== latestYear) continue;
      const lvl = classifyCode(r.regionCode);
      if (lvl !== level) continue;
      if (!byRegion.has(r.regionCode)) {
        byRegion.set(r.regionCode, { name: r.regionName, counts: {} });
      }
      const entry = byRegion.get(r.regionCode)!;
      entry.counts[r.personnelCode] = (entry.counts[r.personnelCode] ?? 0) + (r.count ?? 0);
    }
    // Sort by total descending
    const sorted = [...byRegion.values()].sort((a, b) => {
      const ta = Object.values(a.counts).reduce((s, v) => s + v, 0);
      const tb = Object.values(b.counts).reduce((s, v) => s + v, 0);
      return tb - ta;
    });
    const names = sorted.map(v => v.name);
    const series = PERSONNEL_CODES.map(code => ({
      code,
      name: personnelNames.get(code) ?? code,
      data: sorted.map(v => v.counts[code] ?? 0),
    }));
    return { regionNames: names, seriesData: series };
  }, [rows, latestYear, level, personnelNames]);

  const chartHeight = Math.max(300, regionNames.length * 30 + 120);

  useEffect(() => {
    if (!chartRef.current || regionNames.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any[]) => {
          const region = params[0]?.axisValue ?? '';
          const total = (params as any[]).reduce((s: number, p: any) => s + (p.value ?? 0), 0);
          return `<div style="font-weight:600;margin-bottom:4px">${region}</div>` +
            params.map((p: any) =>
              `<div style="display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.seriesName}</span>
                <span style="font-weight:700;margin-left:auto;padding-left:12px">${fmtNum(p.value)}</span>
              </div>`
            ).join('') +
            `<div style="border-top:1px solid #e2e8f0;margin-top:4px;padding-top:4px;font-weight:700">${t.total}: ${fmtNum(total)}</div>`;
        },
      },
      legend: { top: 5, right: 0, textStyle: { fontSize: 11 } },
      grid: { top: 40, right: 20, bottom: 20, left: 175, containLabel: false },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
      },
      yAxis: {
        type: 'category',
        data: [...regionNames].reverse(),
        axisLabel: { fontSize: 11, color: '#334155', width: 165, overflow: 'truncate' },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: seriesData.map(s => ({
        name: s.name,
        type: 'bar' as const,
        stack: 'total',
        data: [...s.data].reverse(),
        barMaxWidth: 18,
        itemStyle: { color: PERSONNEL_COLORS[s.code], borderRadius: s.code === '3' ? [0, 3, 3, 0] : [0, 0, 0, 0] },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [regionNames, seriesData, t]);

  return (
    <div className="bg-white rounded-xl p-4 mt-3 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            {locale === 'bg' ? `Регионално разпределение — ${latestYear}` : `Regional Distribution — ${latestYear}`}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {locale === 'bg'
              ? 'Брой медицински персонал по региони (наредени по общ брой)'
              : 'Medical personnel count by region (sorted by total)'}
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
// Tab 3 — Composition (stacked bar over time + donut for latest year)
// ══════════════════════════════════════════════════════════════════════════════

function CompositionTab({ rows, years, latestYear, personnelNames, locale }: {
  rows: Row[]; years: string[]; latestYear: string;
  personnelNames: Map<string, string>; locale: 'bg' | 'en';
}) {
  const stackedRef = useRef<HTMLDivElement>(null);
  const donutRef = useRef<HTMLDivElement>(null);

  const { stackedSeries } = useMemo(() => {
    const national = rows.filter(r => r.regionCode === 'BG');
    const byYearCode = new Map<string, Record<string, number>>();
    for (const r of national) {
      if (!byYearCode.has(r.year)) byYearCode.set(r.year, {});
      const agg = byYearCode.get(r.year)!;
      agg[r.personnelCode] = (agg[r.personnelCode] ?? 0) + (r.count ?? 0);
    }
    const series = PERSONNEL_CODES.map(code => ({
      code,
      name: personnelNames.get(code) ?? code,
      data: years.map(y => byYearCode.get(y)?.[code] ?? 0),
    }));
    return { stackedSeries: series };
  }, [rows, years, personnelNames]);

  const donutData = useMemo(() => {
    return rows
      .filter(r => r.year === latestYear && r.regionCode === 'BG')
      .filter(r => (r.count ?? 0) > 0)
      .map(r => ({ value: r.count!, name: r.personnelName, code: r.personnelCode }))
      .sort((a, b) => b.value - a.value);
  }, [rows, latestYear]);

  // Stacked bar over time
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
      legend: { bottom: 0, itemGap: 16, textStyle: { fontSize: 11 } },
      grid: { top: 20, right: 20, bottom: 90, left: 75 },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { fontSize: 11, color: '#94a3b8', rotate: 30 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: locale === 'bg' ? 'Брой' : 'Count',
        nameTextStyle: { fontSize: 11, color: '#94a3b8' },
        splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
      },
      series: stackedSeries.map(s => ({
        name: s.name,
        type: 'bar' as const,
        stack: 'total',
        data: s.data,
        itemStyle: { color: PERSONNEL_COLORS[s.code] },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [stackedSeries, years, locale]);

  // Donut chart
  useEffect(() => {
    if (!donutRef.current || donutData.length === 0) return;
    const chart = echarts.init(donutRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        ...tooltipStyle(),
        formatter: (p: any) =>
          `<b>${p.name}</b><br/>${fmtNum(p.value)} (${p.percent}%)`,
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: { fontSize: 11, color: '#334155' },
        formatter: (name: string) => name.length > 32 ? name.slice(0, 30) + '…' : name,
      },
      series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['38%', '50%'],
        data: donutData.map(d => ({ value: d.value, name: d.name })),
        label: { formatter: '{d}%', fontSize: 12, color: '#334155' },
        itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
        color: donutData.map(d => PERSONNEL_COLORS[d.code] ?? C.violet),
      }],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [donutData]);

  return (
    <div className="bg-white rounded-xl p-4 mt-3 shadow-sm space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">
          {locale === 'bg' ? 'А. Структура на персонала по вид — България' : 'A. Personnel by Type Over Time — Bulgaria'}
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          {locale === 'bg'
            ? 'Натрупана структура по вид персонал (лекари, зъболекари, специалисти) за страната'
            : 'Stacked composition by personnel type (physicians, dentists, specialists) nationwide'}
        </p>
        <div ref={stackedRef} style={{ height: 360 }} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">
          {locale === 'bg' ? `Б. Дял по вид персонал — ${latestYear}` : `B. Share by Personnel Type — ${latestYear}`}
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          {locale === 'bg'
            ? 'Разпределение на медицинския персонал по категория за последната година'
            : 'Distribution of medical personnel by category for the latest year'}
        </p>
        <div ref={donutRef} style={{ height: 300 }} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 4 — Data Table (sortable, paginated, filtered)
// ══════════════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;

function TableTab({ rows, years, personnelNames, locale }: {
  rows: Row[]; years: string[]; personnelNames: Map<string, string>; locale: 'bg' | 'en';
}) {
  const t = LABELS[locale];
  const [filterYear, setFilterYear] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortCol, setSortCol] = useState<keyof Row>('year');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const personnelOptions = useMemo(
    () => [...personnelNames.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    [personnelNames]
  );

  const filtered = useMemo(() => {
    const result = rows.filter(r => {
      if (filterYear !== 'all' && r.year !== filterYear) return false;
      if (filterType !== 'all' && r.personnelCode !== filterType) return false;
      if (filterLevel !== 'all') {
        const lvl = classifyCode(r.regionCode);
        if (filterLevel === 'national' && lvl !== 'national') return false;
        if (filterLevel === 'nuts2' && lvl !== 'nuts2') return false;
        if (filterLevel === 'district' && lvl !== 'district') return false;
      }
      return true;
    });
    return [...result].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }, [rows, filterYear, filterType, filterLevel, sortCol, sortAsc]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSort(col: keyof Row) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(0);
  }

  const Th = ({ col, label }: { col: keyof Row; label: string }) => (
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
        <Select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(0); }} className="w-52">
          <option value="all">{t.allTypes}</option>
          {personnelOptions.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
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
              <Th col="personnelName" label={t.personnelType} />
              <Th col="count" label={t.count} />
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-1.5 tabular-nums">{row.year}</td>
                <td className="px-3 py-1.5">{row.regionName}</td>
                <td className="px-3 py-1.5 max-w-xs truncate" title={row.personnelName}>{row.personnelName}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtNum(row.count)}</td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground text-sm">
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
