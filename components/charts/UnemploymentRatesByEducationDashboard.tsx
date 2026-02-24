'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRate(row: any): number | null {
  if (row.Rate == null || row.Rate === '' || row.Rate === '..' || row.Rate === 'null') return null;
  const v = typeof row.Rate === 'number' ? row.Rate : parseFloat(row.Rate);
  return isNaN(v) ? null : v;
}

function parseQuarter(q: string): { year: number; quarter: number } {
  const match = q.match(/^(\d{4})Q(\d)$/);
  if (!match) return { year: 0, quarter: 0 };
  return { year: parseInt(match[1]), quarter: parseInt(match[2]) };
}

function sortQuarters(a: string, b: string): number {
  const pa = parseQuarter(a);
  const pb = parseQuarter(b);
  return pa.year !== pb.year ? pa.year - pb.year : pa.quarter - pb.quarter;
}

// Education level codes in display order (excluding Total)
const EDU_ORDER = ['1', '2', '2_1', '2_2', '3', '4'];

// Colors: Higher=blue (good), Primary or lower=red (high unemployment)
const EDU_COLORS: Record<string, string> = {
  '1': '#3b82f6',   // Higher – blue
  '2': '#10b981',   // Upper secondary – green
  '2_1': '#6366f1', // Secondary vocational – indigo
  '2_2': '#8b5cf6', // Secondary general – purple
  '3': '#f59e0b',   // Lower secondary – amber
  '4': '#ef4444',   // Primary or lower – red
  '0': '#64748b',   // Total – slate
};

const AGE_OPTIONS = [
  { code: '0', labelEn: 'Total (15+)', labelBg: 'Общо (15+)' },
  { code: '15 - 64_gr', labelEn: '15-64 years', labelBg: '15-64 години' },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function UnemploymentRatesByEducationDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const [selectedAge, setSelectedAge] = useState<string>('15 - 64_gr');

  // Derive quarters and education levels from data
  const { allQuarters, eduLevels } = useMemo(() => {
    const quarters = new Set<string>();
    const eduMap = new Map<string, string>(); // code → label

    data.forEach(d => {
      if (d.Year) quarters.add(d.Year);
      const code = d.LFS_EDUlevel_Code || '';
      if (code && !eduMap.has(code)) {
        eduMap.set(code, d.LFS_EDUlevel || code);
      }
    });

    const sortedEdu = [...eduMap.entries()]
      .sort((a, b) => {
        const ia = EDU_ORDER.indexOf(a[0]);
        const ib = EDU_ORDER.indexOf(b[0]);
        const oa = ia >= 0 ? ia : (a[0] === '0' ? -1 : 99);
        const ob = ib >= 0 ? ib : (b[0] === '0' ? -1 : 99);
        return oa - ob;
      })
      .map(([code, label]) => ({ code, label }));

    return {
      allQuarters: [...quarters].sort(sortQuarters),
      eduLevels: sortedEdu,
    };
  }, [data]);

  // Find a specific data point
  const findRow = (quarter: string, eduCode: string, ageCode: string) =>
    data.find(d =>
      d.Year === quarter &&
      d.LFS_EDUlevel_Code === eduCode &&
      d.Age10_LFS_Code === ageCode
    );

  const findRate = (quarter: string, eduCode: string) => {
    const row = findRow(quarter, eduCode, selectedAge);
    return row ? getRate(row) : null;
  };

  // KPI data
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const prevQ = allQuarters.length > 1 ? allQuarters[allQuarters.length - 2] : null;
    const { year, quarter } = parseQuarter(latestQ);
    const yoyQ = `${year - 1}Q${quarter}`;

    const totalRate = findRate(latestQ, '0');
    const higherRate = findRate(latestQ, '1');
    const upperSecRate = findRate(latestQ, '2');
    const lowerSecRate = findRate(latestQ, '3');
    const primaryRate = findRate(latestQ, '4');

    // QoQ change
    const prevTotal = prevQ ? findRate(prevQ, '0') : null;
    const qoqChange = totalRate != null && prevTotal != null ? totalRate - prevTotal : null;

    // YoY change
    const yoyPrev = findRate(yoyQ, '0');
    const yoyChange = totalRate != null && yoyPrev != null ? totalRate - yoyPrev : null;

    // Education gap: Primary or lower minus Higher
    const eduGap = primaryRate != null && higherRate != null ? primaryRate - higherRate : null;

    return {
      latestQ, totalRate, higherRate, upperSecRate, lowerSecRate, primaryRate,
      qoqChange, yoyChange, eduGap,
    };
  }, [data, allQuarters, selectedAge]);

  if (!data || data.length === 0 || !kpiData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isBg ? 'Няма налични данни' : 'No data available'}
      </div>
    );
  }

  const firstYear = parseQuarter(allQuarters[0]).year;
  const lastYear = parseQuarter(allQuarters[allQuarters.length - 1]).year;

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isBg ? 'Коефициенти на безработица по степен на образование' : 'Unemployment Rates by Education Level'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Тримесечни данни (${firstYear} – ${lastYear}) | Единица: %`
            : `Quarterly Data (${firstYear} – ${lastYear}) | Unit: %`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Age Group Filter */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {isBg ? 'Възрастова група' : 'Age Group'}
          </span>
          <div className="flex gap-1.5">
            {AGE_OPTIONS.map(opt => (
              <button
                key={opt.code}
                onClick={() => setSelectedAge(opt.code)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  selectedAge === opt.code
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {isBg ? opt.labelBg : opt.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <KpiCard
            title={isBg ? 'Общо' : 'Total Rate'}
            value={kpiData.totalRate}
            subtitle={kpiData.latestQ}
            accentColor="text-slate-900"
            locale={locale}
            qoqChange={kpiData.qoqChange}
            yoyChange={kpiData.yoyChange}
          />
          <KpiCard
            title={isBg ? 'Висше' : 'Higher Edu.'}
            value={kpiData.higherRate}
            subtitle={kpiData.latestQ}
            accentColor="text-blue-600"
            locale={locale}
            badge={kpiData.totalRate != null && kpiData.higherRate != null && kpiData.totalRate > 0
              ? `${(kpiData.higherRate / kpiData.totalRate).toFixed(2)}x ${isBg ? 'от общо' : 'of total'}`
              : undefined}
          />
          <KpiCard
            title={isBg ? 'Основно средно' : 'Lower Sec.'}
            value={kpiData.lowerSecRate}
            subtitle={kpiData.latestQ}
            accentColor="text-amber-600"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Образ. разлика' : 'Edu. Gap'}
            value={kpiData.eduGap}
            subtitle={isBg ? 'Начално – Висше' : 'Primary – Higher'}
            accentColor="text-red-600"
            locale={locale}
            suffix="pp"
            badge={kpiData.eduGap != null && kpiData.eduGap > 0
              ? (isBg ? 'Начално е по-високо' : 'Primary higher')
              : undefined}
          />
        </div>

        {/* Chart A: Education Level Trends (Multi-Line) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Безработица по степен на образование' : 'A. Unemployment Rate by Education Level'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Тримесечна тенденция (без агрегати)' : 'Quarterly trend — individual education levels'}
          </p>
          <EducationTrendsChart
            data={data}
            allQuarters={allQuarters}
            eduLevels={eduLevels}
            selectedAge={selectedAge}
            locale={locale}
          />
        </div>

        {/* Charts B & C side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Б. Сравнение по образование' : 'B. Education Snapshot'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? `Последно тримесечие: ${kpiData.latestQ}` : `Latest quarter: ${kpiData.latestQ}`}
            </p>
            <EducationBarChart
              data={data}
              allQuarters={allQuarters}
              eduLevels={eduLevels}
              selectedAge={selectedAge}
              locale={locale}
            />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'В. Разлика висше – основно' : 'C. Higher vs Primary Gap'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isBg ? 'Тримесечна тенденция на разликата (pp)' : 'Quarterly gap trend (percentage points)'}
            </p>
            <EduGapChart
              data={data}
              allQuarters={allQuarters}
              selectedAge={selectedAge}
              locale={locale}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ title, value, subtitle, accentColor, locale, badge, qoqChange, yoyChange, suffix = '%' }: {
  title: string;
  value: number | null;
  subtitle: string;
  accentColor: string;
  locale?: 'bg' | 'en';
  badge?: string;
  qoqChange?: number | null;
  yoyChange?: number | null;
  suffix?: string;
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
        {value != null ? `${value.toFixed(1)}${suffix}` : '—'}
      </p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <p className="text-xs text-slate-400">{subtitle}</p>
        {qoqChange != null && (
          <span className={`text-xs font-semibold ${qoqChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {qoqChange <= 0 ? '▼' : '▲'} {Math.abs(qoqChange).toFixed(1)}pp {isBg ? 'кв/кв' : 'QoQ'}
          </span>
        )}
        {yoyChange != null && (
          <span className={`text-xs font-semibold ${yoyChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {yoyChange <= 0 ? '▼' : '▲'} {Math.abs(yoyChange).toFixed(1)}pp {isBg ? 'г/г' : 'YoY'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Chart A: Education Level Trends (Multi-Line) ──────────────────────────────

function EducationTrendsChart({ data, allQuarters, eduLevels, selectedAge, locale }: {
  data: any[];
  allQuarters: string[];
  eduLevels: { code: string; label: string }[];
  selectedAge: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const eduToShow = useMemo(() => eduLevels.filter(e => e.code !== '0'), [eduLevels]);

  const seriesData = useMemo(() => {
    return eduToShow.map(edu => {
      const byQuarter: Record<string, number | null> = {};
      data.forEach(row => {
        if (row.Year && row.LFS_EDUlevel_Code === edu.code && row.Age10_LFS_Code === selectedAge) {
          byQuarter[row.Year] = getRate(row);
        }
      });
      return {
        code: edu.code,
        label: edu.label,
        values: allQuarters.map(q => byQuarter[q] ?? null),
      };
    });
  }, [data, allQuarters, eduToShow, selectedAge]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const brushStart = Math.max(0, Math.round((1 - 32 / allQuarters.length) * 100));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 11 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          // Sort by value descending for easy comparison
          const sorted = [...params].sort((a: any, b: any) => (b.value ?? -999) - (a.value ?? -999));
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          sorted.forEach((p: any) => {
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
        type: 'scroll',
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: brushStart, end: 100 },
        { type: 'slider', start: brushStart, end: 100, height: 18, bottom: 24, borderColor: '#cbd5e1', fillerColor: 'rgba(148,163,184,0.15)' },
      ],
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allQuarters,
        axisLabel: {
          fontSize: 10, color: '#94a3b8',
          formatter: (v: string) => { const p = parseQuarter(v); return p.quarter === 1 ? String(p.year) : ''; },
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
      series: seriesData.map(s => ({
        name: s.label,
        type: 'line' as const,
        data: s.values,
        itemStyle: { color: EDU_COLORS[s.code] || undefined },
        lineStyle: { width: s.code === '4' ? 3 : 2 }, // Emphasize Primary or lower
        smooth: true,
        symbol: 'none' as const,
        connectNulls: true,
        emphasis: { focus: 'series' as const, lineStyle: { width: 3 } },
      })),
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

// ── Chart B: Education Snapshot Bar Chart ──────────────────────────────────────

function EducationBarChart({ data, allQuarters, eduLevels, selectedAge, locale }: {
  data: any[];
  allQuarters: string[];
  eduLevels: { code: string; label: string }[];
  selectedAge: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const latestQ = allQuarters[allQuarters.length - 1] || '';
  const [selectedQ, setSelectedQ] = useState(latestQ);

  useEffect(() => {
    if (latestQ && !selectedQ) setSelectedQ(latestQ);
  }, [latestQ, selectedQ]);

  const barData = useMemo(() => {
    const quarter = selectedQ || latestQ;
    return eduLevels
      .filter(e => e.code !== '0')
      .map(edu => {
        const row = data.find(d =>
          d.Year === quarter &&
          d.LFS_EDUlevel_Code === edu.code &&
          d.Age10_LFS_Code === selectedAge
        );
        return {
          code: edu.code,
          label: edu.label,
          value: row ? (getRate(row) ?? 0) : 0,
        };
      })
      .sort((a, b) => a.value - b.value); // Sort ascending (lowest unemployment first)
  }, [data, eduLevels, selectedAge, selectedQ, latestQ]);

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
          const p = params[0];
          const val = p.value != null ? Number(p.value) : null;
          return `<div style="font-weight:600;margin-bottom:2px;color:#0f172a">${p.name}</div>
            <div style="font-weight:600;font-size:14px">${val != null ? val.toFixed(1) + '%' : '—'}</div>`;
        },
      },
      grid: { left: '3%', right: '12%', bottom: '3%', top: '6%', containLabel: true },
      xAxis: {
        type: 'value',
        name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: barData.map(d => d.label),
        axisLabel: { fontSize: 11, color: '#64748b' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      series: [{
        name: isBg ? 'Безработица' : 'Unemployment Rate',
        type: 'bar',
        data: barData.map(d => ({
          value: d.value,
          itemStyle: {
            color: EDU_COLORS[d.code] || '#3b82f6',
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          fontWeight: 'bold',
          color: '#334155',
          formatter: (p: any) => p.value != null ? p.value.toFixed(1) + '%' : '',
        },
      }],
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
          value={selectedQ}
          onChange={e => setSelectedQ(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300"
        >
          {[...allQuarters].reverse().map(q => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '320px' }} />
    </div>
  );
}

// ── Chart C: Education Gap Over Time (Area) ───────────────────────────────────

function EduGapChart({ data, allQuarters, selectedAge, locale }: {
  data: any[];
  allQuarters: string[];
  selectedAge: string;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const { gapValues, higherValues, primaryValues } = useMemo(() => {
    const higherByQ: Record<string, number | null> = {};
    const primaryByQ: Record<string, number | null> = {};

    data.forEach(row => {
      if (!row.Year || row.Age10_LFS_Code !== selectedAge) return;
      const eduCode = row.LFS_EDUlevel_Code;
      const val = getRate(row);
      if (eduCode === '1') higherByQ[row.Year] = val;
      else if (eduCode === '4') primaryByQ[row.Year] = val;
    });

    return {
      higherValues: allQuarters.map(q => higherByQ[q] ?? null),
      primaryValues: allQuarters.map(q => primaryByQ[q] ?? null),
      gapValues: allQuarters.map(q => {
        const h = higherByQ[q];
        const p = primaryByQ[q];
        return h != null && p != null ? p - h : null;
      }),
    };
  }, [data, allQuarters, selectedAge]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const brushStart = Math.max(0, Math.round((1 - 32 / allQuarters.length) * 100));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 11 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          const qLabel = params[0].axisValue;
          const qi = allQuarters.indexOf(qLabel);
          const higher = qi >= 0 ? higherValues[qi] : null;
          const primary = qi >= 0 ? primaryValues[qi] : null;
          const gap = qi >= 0 ? gapValues[qi] : null;

          return `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${qLabel}</div>
            <div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${EDU_COLORS['4']}"></span>
              <span style="flex:1">${isBg ? 'Начално и по-ниско' : 'Primary or lower'}</span>
              <span style="font-weight:600">${primary != null ? primary.toFixed(1) + '%' : '—'}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${EDU_COLORS['1']}"></span>
              <span style="flex:1">${isBg ? 'Висше' : 'Higher'}</span>
              <span style="font-weight:600">${higher != null ? higher.toFixed(1) + '%' : '—'}</span>
            </div>
            <div style="font-size:11px;font-weight:600;margin-top:4px;padding-top:4px;border-top:1px solid #e2e8f0;color:#0f172a">
              ${isBg ? 'Разлика' : 'Gap'}: ${gap != null ? gap.toFixed(1) + ' pp' : '—'}
            </div>`;
        },
      },
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: brushStart, end: 100 },
        { type: 'slider', start: brushStart, end: 100, height: 18, bottom: 24, borderColor: '#cbd5e1', fillerColor: 'rgba(148,163,184,0.15)' },
      ],
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allQuarters,
        axisLabel: {
          fontSize: 10, color: '#94a3b8',
          formatter: (v: string) => { const p = parseQuarter(v); return p.quarter === 1 ? String(p.year) : ''; },
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'pp',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        name: isBg ? 'Разлика (pp)' : 'Gap (pp)',
        type: 'line',
        data: gapValues,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(239,68,68,0.25)' },
              { offset: 1, color: 'rgba(239,68,68,0.02)' },
            ],
          },
        },
        itemStyle: { color: '#ef4444' },
        lineStyle: { width: 2.5, color: '#ef4444' },
        smooth: true,
        symbol: 'none',
        connectNulls: true,
      }],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allQuarters, gapValues, higherValues, primaryValues, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '320px' }} />;
}
