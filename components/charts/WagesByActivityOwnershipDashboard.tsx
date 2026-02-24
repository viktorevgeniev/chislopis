'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dataset } from '@/types/dataset';

// ── Short labels for NACE A21 sectors ────────────────────────────────────────

const SHORT_EN: Record<string, string> = {
  'Agriculture, forestry and fishing': 'Agriculture',
  'Mining and quarrying': 'Mining',
  'Manufacturing': 'Manufacturing',
  'Electricity, gas, steam and air conditioning supply': 'Electricity & Gas',
  'Water supply, sewerage, waste management and remediation activities': 'Water & Waste',
  'Construction': 'Construction',
  'Wholesale and retail trade; repair of motor vehicles and motorcycles': 'Wholesale & Retail',
  'Transportation and storage': 'Transport',
  'Accommodation and food service activities': 'Hotels & Food',
  'Information and communication': 'IT & Telecom',
  'Financial and insurance activities': 'Finance & Insurance',
  'Real estate activities': 'Real Estate',
  'Professional, scientific and technical activities': 'Professional & Science',
  'Administrative and support service activities': 'Admin Services',
  'Public administration and defence; compulsory social security': 'Public Admin.',
  'Education': 'Education',
  'Human health and social work activities': 'Health & Social',
  'Arts, entertainment and recreation': 'Arts & Recreation',
  'Other service activities': 'Other Services',
};

const SHORT_BG: Record<string, string> = {
  'Agriculture, forestry and fishing': 'Земеделие',
  'Mining and quarrying': 'Добивна пром.',
  'Manufacturing': 'Преработваща пром.',
  'Electricity, gas, steam and air conditioning supply': 'Електричество',
  'Water supply, sewerage, waste management and remediation activities': 'ВиК и отпадъци',
  'Construction': 'Строителство',
  'Wholesale and retail trade; repair of motor vehicles and motorcycles': 'Търговия',
  'Transportation and storage': 'Транспорт',
  'Accommodation and food service activities': 'Хотели и ресторанти',
  'Information and communication': 'ИТ и телеком',
  'Financial and insurance activities': 'Финанси и застр.',
  'Real estate activities': 'Недвижими имоти',
  'Professional, scientific and technical activities': 'Проф. дейности',
  'Administrative and support service activities': 'Адм. услуги',
  'Public administration and defence; compulsory social security': 'Публична админ.',
  'Education': 'Образование',
  'Human health and social work activities': 'Здравеопазване',
  'Arts, entertainment and recreation': 'Изкуство и забавл.',
  'Other service activities': 'Други дейности',
};

const SECTOR_COLORS = [
  '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#be185d', '#4f46e5', '#65a30d', '#c2410c',
  '#0d9488', '#a21caf', '#ca8a04', '#475569', '#6366f1',
  '#e11d48', '#16a34a', '#ea580c', '#8b5cf6',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getAmount(row: any): number | null {
  const v = row.Amount;
  if (v == null || v === '' || v === 'x' || v === '..' || v === 'null') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function shortLabel(fullName: string, isBg: boolean): string {
  return (isBg ? SHORT_BG[fullName] : SHORT_EN[fullName]) || fullName;
}

function formatBGN(v: number | null, isBg: boolean): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US') + (isBg ? ' лв.' : ' BGN');
}

// ── Types ───────────────────────────────────────────────────────────────────

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

// ── Main Component ──────────────────────────────────────────────────────────

export function WagesByActivityOwnershipDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const { years, sectors, totalRows, sectorRows } = useMemo(() => {
    const yrSet = new Set<string>();
    const secSet = new Set<string>();
    const total: any[] = [];
    const sector: any[] = [];

    data.forEach(d => {
      if (d.Year) yrSet.add(d.Year);
      const actName = d.NACE2008A21 || '';
      if (actName === 'Total' || d.NACE2008A21_Code === '0') {
        total.push(d);
      } else {
        sector.push(d);
        secSet.add(actName);
      }
    });

    return {
      years: [...yrSet].sort(),
      sectors: [...secSet].sort(),
      totalRows: total,
      sectorRows: sector,
    };
  }, [data]);

  // KPI: latest year total wage
  const kpi = useMemo(() => {
    if (years.length === 0) return null;
    const latestYear = years[years.length - 1];
    const prevYear = years.length >= 2 ? years[years.length - 2] : null;

    const findTotal = (y: string) =>
      totalRows.find(d => d.Year === y && (d.Ownership === 'Total' || d.Ownership_Code === 'total'));
    const latest = findTotal(latestYear);
    const prev = prevYear ? findTotal(prevYear) : null;
    const latestVal = latest ? getAmount(latest) : null;
    const prevVal = prev ? getAmount(prev) : null;
    const yoyChange = latestVal != null && prevVal != null
      ? ((latestVal - prevVal) / prevVal * 100) : null;

    // Public vs Private latest
    const pubRow = totalRows.find(d => d.Year === latestYear && d.Ownership_Code === '1');
    const privRow = totalRows.find(d => d.Year === latestYear && d.Ownership_Code === '2');
    const pubVal = pubRow ? getAmount(pubRow) : null;
    const privVal = privRow ? getAmount(privRow) : null;

    return { latestYear, latestVal, yoyChange, pubVal, privVal };
  }, [years, totalRows]);

  if (!data || data.length === 0 || !kpi) {
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
          {dataset.title[locale]}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${years[0]} – ${years[years.length - 1]}) | Средна годишна работна заплата (лв.) | НКИД 2008 А21`
            : `Annual Data (${years[0]} – ${years[years.length - 1]}) | Average Annual Wages (BGN) | NACE 2008 A21`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Средна заплата (${kpi.latestYear})` : `Avg Wage (${kpi.latestYear})`}
            </p>
            <p className="text-2xl font-bold mt-2 text-slate-900">{formatBGN(kpi.latestVal, isBg)}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Годишна промяна' : 'YoY Change'}
            </p>
            <p className={`text-2xl font-bold mt-2 ${kpi.yoyChange != null ? (kpi.yoyChange >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-300'}`}>
              {kpi.yoyChange != null ? `${kpi.yoyChange >= 0 ? '+' : ''}${kpi.yoyChange.toFixed(1)}%` : '—'}
            </p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Публичен сектор (${kpi.latestYear})` : `Public Sector (${kpi.latestYear})`}
            </p>
            <p className="text-2xl font-bold mt-2 text-blue-600">{formatBGN(kpi.pubVal, isBg)}</p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Частен сектор (${kpi.latestYear})` : `Private Sector (${kpi.latestYear})`}
            </p>
            <p className="text-2xl font-bold mt-2 text-amber-600">{formatBGN(kpi.privVal, isBg)}</p>
          </div>
        </div>

        {/* Chart A: Macro Wage Trends */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Динамика на средната заплата' : 'Average Wage Trends Over Time'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Общо за икономиката по сектор на собственост' : 'Total economy by ownership sector'}
          </p>
          <MacroWageTrendChart totalRows={totalRows} years={years} locale={locale} />
        </div>

        {/* Chart B: Sectoral Wage Disparities */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Заплати по икономически дейности' : 'Wages by Economic Activity'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Сортирано по размер на заплата (Общо по собственост)' : 'Sorted by wage level (Total ownership)'}
          </p>
          <SectorBarChart sectorRows={sectorRows} years={years} locale={locale} />
        </div>

        {/* Chart C: Public vs Private */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Публичен vs Частен сектор' : 'Public vs Private Sector'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Сравнение на заплатите по сектор на собственост' : 'Wage comparison by ownership sector'}
          </p>
          <Tabs defaultValue="trend">
            <TabsList>
              <TabsTrigger value="trend">{isBg ? 'Тенденции' : 'Trends'}</TabsTrigger>
              <TabsTrigger value="sectors">{isBg ? 'По дейности' : 'By Activity'}</TabsTrigger>
            </TabsList>
            <TabsContent value="trend">
              <PublicPrivateTrendChart sectorRows={sectorRows} totalRows={totalRows} years={years} sectors={sectors} locale={locale} />
            </TabsContent>
            <TabsContent value="sectors">
              <PublicPrivateSectorChart sectorRows={sectorRows} years={years} sectors={sectors} locale={locale} />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Macro Wage Trend (Line) ────────────────────────────────────────

function MacroWageTrendChart({ totalRows, years, locale }: {
  totalRows: any[];
  years: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const totalByY: Record<string, number | null> = {};
    const pubByY: Record<string, number | null> = {};
    const privByY: Record<string, number | null> = {};

    totalRows.forEach(row => {
      if (!row.Year) return;
      const val = getAmount(row);
      const code = row.Ownership_Code;
      if (code === 'total') totalByY[row.Year] = val;
      else if (code === '1') pubByY[row.Year] = val;
      else if (code === '2') privByY[row.Year] = val;
    });

    return {
      total: years.map(y => totalByY[y] ?? null),
      pub: years.map(y => pubByY[y] ?? null),
      priv: years.map(y => privByY[y] ?? null),
    };
  }, [totalRows, years]);

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
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
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${p.value != null ? Number(p.value).toLocaleString('en-US') : 'N/A'} ${isBg ? 'лв.' : 'BGN'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [
          isBg ? 'Общо' : 'Total',
          isBg ? 'Публичен сектор' : 'Public Sector',
          isBg ? 'Частен сектор' : 'Private Sector',
        ],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '15%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: years,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'лв.' : 'BGN',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toString(),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? 'Общо' : 'Total',
          type: 'line',
          data: seriesData.total,
          itemStyle: { color: '#1e293b' },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          areaStyle: { color: 'rgba(30,41,59,0.05)' },
        },
        {
          name: isBg ? 'Публичен сектор' : 'Public Sector',
          type: 'line',
          data: seriesData.pub,
          itemStyle: { color: '#2563eb' },
          lineStyle: { width: 2, type: 'dashed' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
        },
        {
          name: isBg ? 'Частен сектор' : 'Private Sector',
          type: 'line',
          data: seriesData.priv,
          itemStyle: { color: '#d97706' },
          lineStyle: { width: 2, type: 'dashed' },
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [years, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart B: Sectoral Wage Disparities (Horizontal Bar) ─────────────────────

function SectorBarChart({ sectorRows, years, locale }: {
  sectorRows: any[];
  years: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    if (years.length > 0 && !selectedYear) {
      setSelectedYear(years[years.length - 1]);
    }
  }, [years, selectedYear]);

  const barData = useMemo(() => {
    const year = selectedYear || years[years.length - 1];
    if (!year) return [];

    const sectorMap = new Map<string, number>();
    sectorRows.forEach(d => {
      if (d.Year === year && (d.Ownership === 'Total' || d.Ownership_Code === 'total')) {
        const name = d.NACE2008A21 || '';
        const val = getAmount(d);
        if (val != null) sectorMap.set(name, val);
      }
    });

    return [...sectorMap.entries()]
      .map(([name, value]) => ({ name, label: shortLabel(name, isBg), value }))
      .sort((a, b) => a.value - b.value);
  }, [sectorRows, years, selectedYear, isBg]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const labels = barData.map(d => d.label);
    const values = barData.map(d => d.value);
    const maxVal = Math.max(...values);

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
          const fullName = barData[p.dataIndex]?.name || p.name;
          return `<div style="font-weight:600;margin-bottom:4px">${fullName}</div>
            <div style="font-size:14px;font-weight:700;color:#2563eb">${Number(p.value).toLocaleString('en-US')} ${isBg ? 'лв.' : 'BGN'}</div>`;
        },
      },
      grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? 'лв.' : 'BGN',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toString(),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: { fontSize: 10, color: '#475569', width: 140, overflow: 'truncate' },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [{
        type: 'bar',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: v / maxVal > 0.7 ? '#2563eb' : v / maxVal > 0.4 ? '#0891b2' : '#94a3b8' },
              { offset: 1, color: v / maxVal > 0.7 ? '#3b82f6' : v / maxVal > 0.4 ? '#06b6d4' : '#cbd5e1' },
            ]),
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barMaxWidth: 24,
        label: {
          show: true,
          position: 'right',
          fontSize: 10,
          color: '#64748b',
          formatter: (p: any) => Number(p.value).toLocaleString('en-US'),
        },
      }],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg]);

  const chartHeight = Math.max(380, barData.length * 30 + 60);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sector-year" className="text-sm font-medium text-slate-600">
          {isBg ? 'Година' : 'Year'}
        </label>
        <Select id="sector-year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-[120px]">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: chartHeight + 'px' }} />
    </div>
  );
}

// ── Chart C-1: Public vs Private Trend (Multi-line, total economy) ──────────

function PublicPrivateTrendChart({ totalRows, years, locale }: {
  totalRows: any[];
  sectorRows: any[];
  years: string[];
  sectors: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  const seriesData = useMemo(() => {
    const pubByY: Record<string, number | null> = {};
    const privByY: Record<string, number | null> = {};
    const gapByY: Record<string, number | null> = {};

    totalRows.forEach(row => {
      if (!row.Year) return;
      const val = getAmount(row);
      const code = row.Ownership_Code;
      if (code === '1') pubByY[row.Year] = val;
      else if (code === '2') privByY[row.Year] = val;
    });

    years.forEach(y => {
      const pub = pubByY[y];
      const priv = privByY[y];
      gapByY[y] = pub != null && priv != null ? pub - priv : null;
    });

    return {
      pub: years.map(y => pubByY[y] ?? null),
      priv: years.map(y => privByY[y] ?? null),
      gap: years.map(y => gapByY[y] ?? null),
    };
  }, [totalRows, years]);

  useEffect(() => {
    if (!chartRef.current || years.length === 0) return;
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
            const val = p.value != null ? Number(p.value).toLocaleString('en-US') : 'N/A';
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val} ${isBg ? 'лв.' : 'BGN'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [
          isBg ? 'Публичен сектор' : 'Public Sector',
          isBg ? 'Частен сектор' : 'Private Sector',
          isBg ? 'Разлика (Публ. - Частен)' : 'Gap (Public - Private)',
        ],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '15%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: years,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'лв.' : 'BGN',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toString(),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? 'Публичен сектор' : 'Public Sector',
          type: 'line',
          data: seriesData.pub,
          itemStyle: { color: '#2563eb' },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
        },
        {
          name: isBg ? 'Частен сектор' : 'Private Sector',
          type: 'line',
          data: seriesData.priv,
          itemStyle: { color: '#d97706' },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
        },
        {
          name: isBg ? 'Разлика (Публ. - Частен)' : 'Gap (Public - Private)',
          type: 'bar',
          data: seriesData.gap.map(v => ({
            value: v,
            itemStyle: {
              color: (v ?? 0) >= 0 ? 'rgba(37,99,235,0.2)' : 'rgba(217,119,6,0.2)',
              borderColor: (v ?? 0) >= 0 ? '#2563eb' : '#d97706',
              borderWidth: 1,
            },
          })),
          barMaxWidth: 20,
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [years, seriesData, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '380px' }} />;
}

// ── Chart C-2: Public vs Private by Sector (Grouped Bar) ────────────────────

function PublicPrivateSectorChart({ sectorRows, years, sectors, locale }: {
  sectorRows: any[];
  years: string[];
  sectors: string[];
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    if (years.length > 0 && !selectedYear) {
      setSelectedYear(years[years.length - 1]);
    }
  }, [years, selectedYear]);

  const barData = useMemo(() => {
    const year = selectedYear || years[years.length - 1];
    if (!year) return [];

    const result: { name: string; label: string; pub: number; priv: number }[] = [];

    sectors.forEach(s => {
      const pubRow = sectorRows.find(d => d.Year === year && d.NACE2008A21 === s && d.Ownership_Code === '1');
      const privRow = sectorRows.find(d => d.Year === year && d.NACE2008A21 === s && d.Ownership_Code === '2');
      const pub = pubRow ? (getAmount(pubRow) ?? 0) : 0;
      const priv = privRow ? (getAmount(privRow) ?? 0) : 0;
      if (pub > 0 || priv > 0) {
        result.push({ name: s, label: shortLabel(s, isBg), pub, priv });
      }
    });

    return result.sort((a, b) => (b.pub + b.priv) / 2 - (a.pub + a.priv) / 2);
  }, [sectorRows, years, sectors, selectedYear, isBg]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const labels = barData.map(d => d.label);

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
          const fullName = barData.find(d => d.label === params[0].name)?.name || params[0].name;
          let tip = `<div style="font-weight:600;margin-bottom:4px">${fullName}</div>`;
          params.forEach((p: any) => {
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${Number(p.value).toLocaleString('en-US')} ${isBg ? 'лв.' : 'BGN'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [isBg ? 'Публичен' : 'Public', isBg ? 'Частен' : 'Private'],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '3%', right: '3%', bottom: '12%', top: '3%', containLabel: true },
      yAxis: {
        type: 'category',
        data: [...labels].reverse(),
        axisLabel: { fontSize: 10, color: '#475569', width: 140, overflow: 'truncate' },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      xAxis: {
        type: 'value',
        name: isBg ? 'лв.' : 'BGN',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toString(),
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? 'Публичен' : 'Public',
          type: 'bar',
          data: [...barData].reverse().map(d => d.pub),
          itemStyle: { color: '#2563eb', borderRadius: [0, 4, 4, 0] },
          barMaxWidth: 16,
        },
        {
          name: isBg ? 'Частен' : 'Private',
          type: 'bar',
          data: [...barData].reverse().map(d => d.priv),
          itemStyle: { color: '#d97706', borderRadius: [0, 4, 4, 0] },
          barMaxWidth: 16,
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [barData, isBg]);

  const chartHeight = Math.max(380, barData.length * 40 + 80);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pubpriv-year" className="text-sm font-medium text-slate-600">
          {isBg ? 'Година' : 'Year'}
        </label>
        <Select id="pubpriv-year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-[120px]">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: chartHeight + 'px' }} />
    </div>
  );
}
