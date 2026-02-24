'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getVal(row: any): number | null {
  const v = row.Persons;
  if (v == null || v === 0) return null; // 0 means suppressed 'x'
  return typeof v === 'number' ? v : null;
}

function fmtNum(v: number): string {
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtK(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k';
  return String(v);
}

// Short industry labels for charts
const SHORT_EN: Record<string, string> = {
  A: 'Agriculture', B: 'Mining', C: 'Manufacturing', D: 'Electricity/Gas',
  E: 'Water/Waste', F: 'Construction', G: 'Trade/Repair', H: 'Transport',
  I: 'Accommodation/Food', J: 'ICT', K: 'Finance/Insurance', L: 'Real Estate',
  M: 'Professional/Scientific', N: 'Admin/Support', O: 'Public Admin',
  P: 'Education', Q: 'Health/Social', R: 'Arts/Recreation', S: 'Other Services',
};
const SHORT_BG: Record<string, string> = {
  A: 'Селско стопанство', B: 'Добивна промишл.', C: 'Преработваща промишл.',
  D: 'Енергетика', E: 'Води/Отпадъци', F: 'Строителство',
  G: 'Търговия/Ремонт', H: 'Транспорт', I: 'Хотелиерство/Ресторант.',
  J: 'ИКТ', K: 'Финанси/Застрах.', L: 'Недвижими имоти',
  M: 'Проф./Научна дейн.', N: 'Админ./Обслужване', O: 'Държавно управление',
  P: 'Образование', Q: 'Здравеопазване', R: 'Култура/Спорт', S: 'Други услуги',
};

const INDUSTRY_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S'];

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EmployeesLabourContractNaceDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';
  const shortLabels = isBg ? SHORT_BG : SHORT_EN;

  const allYears = useMemo(() => {
    const ys = new Set<string>();
    data.forEach(d => { if (d.Year) ys.add(d.Year); });
    return [...ys].sort();
  }, [data]);

  const [selectedYear, setSelectedYear] = useState('');

  // Set latest year as default
  useMemo(() => {
    if (allYears.length > 0 && !selectedYear) {
      setSelectedYear(allYears[allYears.length - 1]);
    }
  }, [allYears, selectedYear]);

  // KPI data
  const kpiData = useMemo(() => {
    if (allYears.length === 0) return null;
    const latestY = allYears[allYears.length - 1];
    const prevY = allYears.length > 1 ? allYears[allYears.length - 2] : null;

    const totalRow = data.find(d => d.Year === latestY && d.NACE2008A21_Code === '0' && d.Ownership_Code === 'total');
    const publicRow = data.find(d => d.Year === latestY && d.NACE2008A21_Code === '0' && d.Ownership_Code === '1');
    const privateRow = data.find(d => d.Year === latestY && d.NACE2008A21_Code === '0' && d.Ownership_Code === '2');

    const totalVal = totalRow ? getVal(totalRow) : null;
    const publicVal = publicRow ? getVal(publicRow) : null;
    const privateVal = privateRow ? getVal(privateRow) : null;

    let yoyTotal: number | null = null;
    if (prevY && totalVal != null) {
      const prevRow = data.find(d => d.Year === prevY && d.NACE2008A21_Code === '0' && d.Ownership_Code === 'total');
      const prevVal = prevRow ? getVal(prevRow) : null;
      if (prevVal != null && prevVal !== 0) yoyTotal = (totalVal - prevVal) / prevVal * 100;
    }

    const publicShare = totalVal != null && publicVal != null && totalVal !== 0
      ? (publicVal / totalVal * 100) : null;

    return { latestY, totalVal, publicVal, privateVal, yoyTotal, publicShare };
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
          {isBg ? 'Наети по трудово правоотношение по дейности (A21)' : 'Employees by Economic Activities (A21)'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear} – ${lastYear}) | Средногодишен брой`
            : `Annual Data (${firstYear} – ${lastYear}) | Average Annual Number`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title={isBg ? 'Общо наети' : 'Total Employment'}
            value={kpiData.totalVal}
            yoyChange={kpiData.yoyTotal}
            subtitle={kpiData.latestY}
            accentColor="text-slate-900"
            locale={locale}
          />
          <KpiCard
            title={isBg ? 'Обществен сектор' : 'Public Sector'}
            value={kpiData.publicVal}
            subtitle={kpiData.latestY}
            accentColor="text-indigo-600"
            locale={locale}
            badge={kpiData.publicShare != null ? `${kpiData.publicShare.toFixed(1)}%` : undefined}
          />
          <KpiCard
            title={isBg ? 'Частен сектор' : 'Private Sector'}
            value={kpiData.privateVal}
            subtitle={kpiData.latestY}
            accentColor="text-emerald-600"
            locale={locale}
            badge={kpiData.publicShare != null ? `${(100 - kpiData.publicShare).toFixed(1)}%` : undefined}
          />
        </div>

        {/* Chart A: Total Employment Trend + Sector Split */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'А. Заетост по сектори' : 'A. Employment by Sector'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Обществен и частен сектор (стекирани) с обща линия' : 'Public and Private sector stacked with Total line'}
          </p>
          <SectorTrendChart data={data} allYears={allYears} locale={locale} />
        </div>

        {/* Chart B: Industry Landscape (Horizontal Bar) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-slate-700">
              {isBg ? 'Б. Заетост по отрасли' : 'B. Industry Landscape'}
            </h3>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white"
            >
              {allYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? `Наети лица по отрасли за ${selectedYear}` : `Employees by industry for ${selectedYear}`}
          </p>
          <IndustryBarChart data={data} year={selectedYear} locale={locale} shortLabels={shortLabels} />
        </div>

        {/* Chart C: Industry Composition (Public vs Private) */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'В. Обществен vs Частен по отрасли' : 'C. Public vs Private by Industry'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? `Процентно разпределение за ${selectedYear}` : `Percentage distribution for ${selectedYear}`}
          </p>
          <IndustryCompositionChart data={data} year={selectedYear} locale={locale} shortLabels={shortLabels} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ title, value, yoyChange, subtitle, accentColor, locale, badge }: {
  title: string;
  value: number | null;
  yoyChange?: number | null;
  subtitle: string;
  accentColor: string;
  locale?: 'bg' | 'en';
  badge?: string;
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
      <p className={`text-3xl font-bold mt-2 ${accentColor}`}>{value != null ? fmtK(value) : '—'}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs text-slate-400">{subtitle}</p>
        {yoyChange != null && (
          <span className={`text-xs font-semibold ${yoyChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {yoyChange >= 0 ? '▲' : '▼'} {Math.abs(yoyChange).toFixed(1)}% {isBg ? 'г/г' : 'YoY'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Chart A: Sector Trend (Stacked Area + Total Line) ──────────────────────────

function SectorTrendChart({ data, allYears, locale }: {
  data: any[];
  allYears: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const publicByY: Record<string, number | null> = {};
    const privateByY: Record<string, number | null> = {};
    const totalByY: Record<string, number | null> = {};

    data.forEach(row => {
      if (!row.Year || row.NACE2008A21_Code !== '0') return;
      const val = getVal(row);
      if (row.Ownership_Code === '1') publicByY[row.Year] = val;
      else if (row.Ownership_Code === '2') privateByY[row.Year] = val;
      else if (row.Ownership_Code === 'total') totalByY[row.Year] = val;
    });

    return {
      public: allYears.map(y => publicByY[y] ?? null),
      private: allYears.map(y => privateByY[y] ?? null),
      total: allYears.map(y => totalByY[y] ?? null),
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
              <span style="font-weight:600">${val != null ? fmtNum(val) : '—'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [
          isBg ? 'Обществен' : 'Public',
          isBg ? 'Частен' : 'Private',
          isBg ? 'Общо' : 'Total',
        ],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        selected: { [isBg ? 'Общо' : 'Total']: false },
      },
      grid: { left: '1%', right: '3%', bottom: '12%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: allYears,
        axisLabel: { fontSize: 11, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'Лица' : 'Persons',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtK(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? 'Обществен' : 'Public',
          type: 'line',
          stack: 'sector',
          areaStyle: { opacity: 0.4 },
          data: seriesData.public,
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          emphasis: { focus: 'series' },
        },
        {
          name: isBg ? 'Частен' : 'Private',
          type: 'line',
          stack: 'sector',
          areaStyle: { opacity: 0.4 },
          data: seriesData.private,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          emphasis: { focus: 'series' },
        },
        {
          name: isBg ? 'Общо' : 'Total',
          type: 'line',
          data: seriesData.total,
          itemStyle: { color: '#94a3b8' },
          lineStyle: { width: 2, type: 'dashed' },
          smooth: true,
          symbol: 'none',
          emphasis: { lineStyle: { width: 3 } },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [allYears, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart B: Industry Horizontal Bar Chart ─────────────────────────────────────

function IndustryBarChart({ data, year, locale, shortLabels }: {
  data: any[];
  year: string;
  locale: 'bg' | 'en';
  shortLabels: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const barData = useMemo(() => {
    if (!year) return [];
    const items: { code: string; label: string; value: number }[] = [];

    INDUSTRY_CODES.forEach(code => {
      const row = data.find(d => d.Year === year && d.NACE2008A21_Code === code && d.Ownership_Code === 'total');
      const val = row ? getVal(row) : null;
      if (val != null && val > 0) {
        items.push({ code, label: shortLabels[code] || code, value: val });
      }
    });

    return items.sort((a, b) => a.value - b.value); // ascending for horizontal bar
  }, [data, year, shortLabels]);

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
          return `<div style="font-weight:600;margin-bottom:2px">${p.name}</div>
            <div style="font-weight:600;color:#2563eb">${fmtNum(p.value)}</div>`;
        },
      },
      grid: { left: '2%', right: '6%', bottom: '4%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtK(v) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: barData.map(d => d.label),
        axisLabel: { fontSize: 10, color: '#475569', width: 130, overflow: 'truncate' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: barData.map(d => d.value),
        itemStyle: {
          color: (p: any) => {
            const hue = (p.dataIndex / barData.length * 220 + 200) % 360;
            return `hsl(${hue}, 55%, 55%)`;
          },
          borderRadius: [0, 4, 4, 0],
        },
        barWidth: '65%',
        label: {
          show: true,
          position: 'right',
          fontSize: 10,
          color: '#64748b',
          formatter: (p: any) => fmtK(p.value),
        },
      }],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg]);

  const chartHeight = Math.max(380, barData.length * 28);
  return <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />;
}

// ── Chart C: Industry Composition (Public vs Private %) ────────────────────────

function IndustryCompositionChart({ data, year, locale, shortLabels }: {
  data: any[];
  year: string;
  locale: 'bg' | 'en';
  shortLabels: Record<string, string>;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const barData = useMemo(() => {
    if (!year) return [];
    const items: { code: string; label: string; publicPct: number; privatePct: number; publicVal: number; privateVal: number }[] = [];

    INDUSTRY_CODES.forEach(code => {
      const pubRow = data.find(d => d.Year === year && d.NACE2008A21_Code === code && d.Ownership_Code === '1');
      const privRow = data.find(d => d.Year === year && d.NACE2008A21_Code === code && d.Ownership_Code === '2');
      const pubVal = pubRow ? getVal(pubRow) : null;
      const privVal = privRow ? getVal(privRow) : null;

      if (pubVal != null && privVal != null) {
        const total = pubVal + privVal;
        if (total > 0) {
          items.push({
            code,
            label: shortLabels[code] || code,
            publicPct: pubVal / total * 100,
            privatePct: privVal / total * 100,
            publicVal: pubVal,
            privateVal: privVal,
          });
        }
      }
    });

    // Sort by public share descending to show state-dominated industries first
    return items.sort((a, b) => b.publicPct - a.publicPct);
  }, [data, year, shortLabels]);

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
        textStyle: { color: '#334155', fontSize: 11 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].name}</div>`;
          params.forEach((p: any) => {
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${Number(p.value).toFixed(1)}%</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Обществен' : 'Public', isBg ? 'Частен' : 'Private'],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '2%', right: '4%', bottom: '10%', top: '4%', containLabel: true },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: barData.map(d => d.label),
        axisLabel: { fontSize: 10, color: '#475569', width: 130, overflow: 'truncate' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? 'Обществен' : 'Public',
          type: 'bar',
          stack: 'composition',
          data: barData.map(d => parseFloat(d.publicPct.toFixed(1))),
          itemStyle: { color: '#6366f1' },
          barWidth: '65%',
        },
        {
          name: isBg ? 'Частен' : 'Private',
          type: 'bar',
          stack: 'composition',
          data: barData.map(d => parseFloat(d.privatePct.toFixed(1))),
          itemStyle: { color: '#10b981' },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg]);

  const chartHeight = Math.max(380, barData.length * 28);
  return <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />;
}
