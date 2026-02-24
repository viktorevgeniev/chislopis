'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dataset } from '@/types/dataset';

interface DashboardProps {
  data: any[];
  dataset: Dataset;
  locale?: 'bg' | 'en';
}

function getHours(row: any): number | null {
  const v = row.Hours;
  if (v == null || v === '' || v === 'x' || v === '..' || v === 'null') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : Math.round(n * 10) / 10;
}

function quarterSort(a: string, b: string): number {
  const [yA, qA] = a.split('Q').map(Number);
  const [yB, qB] = b.split('Q').map(Number);
  return yA !== yB ? yA - yB : qA - qB;
}

export function AvgHoursBySexDashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const { quarters, totalByQ, maleByQ, femaleByQ, latestQ } = useMemo(() => {
    const tMap: Record<string, number | null> = {};
    const mMap: Record<string, number | null> = {};
    const fMap: Record<string, number | null> = {};
    const qSet = new Set<string>();

    data.forEach(row => {
      if (!row.Year) return;
      const q = row.Year;
      const val = getHours(row);
      const code = row.Gender_Code;
      qSet.add(q);
      if (code === '0') tMap[q] = val;
      else if (code === '1') mMap[q] = val;
      else if (code === '2') fMap[q] = val;
    });

    const sorted = [...qSet].sort(quarterSort);
    return {
      quarters: sorted,
      totalByQ: tMap,
      maleByQ: mMap,
      femaleByQ: fMap,
      latestQ: sorted[sorted.length - 1] || '',
    };
  }, [data]);

  const kpi = useMemo(() => {
    if (!latestQ) return null;
    const total = totalByQ[latestQ];
    const male = maleByQ[latestQ];
    const female = femaleByQ[latestQ];
    const gap = male != null && female != null ? Math.round((male - female) * 10) / 10 : null;

    const idx = quarters.indexOf(latestQ);
    const prevQ = idx > 0 ? quarters[idx - 1] : null;
    const prevTotal = prevQ ? totalByQ[prevQ] : null;
    const qoqChange = total != null && prevTotal != null
      ? Math.round((total - prevTotal) * 10) / 10 : null;

    return { total, male, female, gap, qoqChange };
  }, [latestQ, quarters, totalByQ, maleByQ, femaleByQ]);

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
            ? `Тримесечни данни (${quarters[0]} – ${latestQ}) | Средни отработени часове седмично | По пол`
            : `Quarterly data (${quarters[0]} – ${latestQ}) | Average actual weekly hours | By sex`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Общо (${latestQ})` : `Total (${latestQ})`}
            </p>
            <p className="text-2xl font-bold mt-2 text-slate-900">
              {kpi.total != null ? `${kpi.total}h` : '—'}
            </p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Промяна спрямо предх. тримесечие' : 'QoQ Change'}
            </p>
            <p className={`text-2xl font-bold mt-2 ${kpi.qoqChange != null ? (kpi.qoqChange >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-300'}`}>
              {kpi.qoqChange != null ? `${kpi.qoqChange >= 0 ? '+' : ''}${kpi.qoqChange}h` : '—'}
            </p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Мъже (${latestQ})` : `Male (${latestQ})`}
            </p>
            <p className="text-2xl font-bold mt-2 text-blue-600">
              {kpi.male != null ? `${kpi.male}h` : '—'}
            </p>
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Жени (${latestQ})` : `Female (${latestQ})`}
            </p>
            <p className="text-2xl font-bold mt-2 text-rose-500">
              {kpi.female != null ? `${kpi.female}h` : '—'}
            </p>
          </div>
        </div>

        {/* Gender Gap indicator */}
        {kpi.gap != null && (
          <div className="bg-white shadow-sm rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <span className="text-amber-600 text-lg font-bold">{kpi.gap > 0 ? '+' : ''}{kpi.gap}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {isBg ? 'Разлика между половете' : 'Gender Gap'}
              </p>
              <p className="text-xs text-slate-400">
                {isBg
                  ? `Мъжете работят ${Math.abs(kpi.gap)}h ${kpi.gap > 0 ? 'повече' : 'по-малко'} седмично от жените`
                  : `Men work ${Math.abs(kpi.gap)}h ${kpi.gap > 0 ? 'more' : 'less'} per week than women`}
              </p>
            </div>
          </div>
        )}

        {/* Chart A: Multi-Series Line Chart */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Динамика на средните отработени часове' : 'Average Weekly Hours Over Time'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Мъже, жени и общо' : 'Male, female, and total'}
          </p>
          <TrendLineChart
            quarters={quarters}
            totalByQ={totalByQ}
            maleByQ={maleByQ}
            femaleByQ={femaleByQ}
            locale={locale}
          />
        </div>

        {/* Chart B: Bar – Latest Quarter Snapshot */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? `Сравнение по пол (${latestQ})` : `Comparison by Sex (${latestQ})`}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            {isBg ? 'Мъже vs Жени — последно тримесечие' : 'Male vs Female — latest quarter'}
          </p>
          <LatestQuarterBar
            latestQ={latestQ}
            maleVal={kpi.male}
            femaleVal={kpi.female}
            totalVal={kpi.total}
            locale={locale}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Multi-Series Line Chart ─────────────────────────────────────────

function TrendLineChart({ quarters, totalByQ, maleByQ, femaleByQ, locale }: {
  quarters: string[];
  totalByQ: Record<string, number | null>;
  maleByQ: Record<string, number | null>;
  femaleByQ: Record<string, number | null>;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current || quarters.length === 0) return;
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
              <span style="font-weight:600">${p.value != null ? p.value + 'h' : 'N/A'}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [
          isBg ? 'Общо' : 'Total',
          isBg ? 'Мъже' : 'Male',
          isBg ? 'Жени' : 'Female',
        ],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '15%', top: '6%', containLabel: true },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 30,
          height: 18,
          borderColor: '#e2e8f0',
          fillerColor: 'rgba(37,99,235,0.08)',
          handleStyle: { color: '#2563eb' },
          textStyle: { fontSize: 10, color: '#94a3b8' },
        },
      ],
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: quarters,
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          rotate: 45,
          interval: 3,
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isBg ? 'часове' : 'hours',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        min: (v: { min: number }) => Math.floor(v.min - 1),
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? 'Общо' : 'Total',
          type: 'line',
          data: quarters.map(q => totalByQ[q] ?? null),
          itemStyle: { color: '#1e293b' },
          lineStyle: { width: 2.5 },
          smooth: true,
          symbol: 'circle',
          symbolSize: 3,
          areaStyle: { color: 'rgba(30,41,59,0.04)' },
        },
        {
          name: isBg ? 'Мъже' : 'Male',
          type: 'line',
          data: quarters.map(q => maleByQ[q] ?? null),
          itemStyle: { color: '#2563eb' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'circle',
          symbolSize: 3,
        },
        {
          name: isBg ? 'Жени' : 'Female',
          type: 'line',
          data: quarters.map(q => femaleByQ[q] ?? null),
          itemStyle: { color: '#e11d48' },
          lineStyle: { width: 2 },
          smooth: true,
          symbol: 'circle',
          symbolSize: 3,
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [quarters, totalByQ, maleByQ, femaleByQ, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '420px' }} />;
}

// ── Chart B: Bar – Latest Quarter Snapshot ───────────────────────────────────

function LatestQuarterBar({ latestQ, maleVal, femaleVal, totalVal, locale }: {
  latestQ: string;
  maleVal: number | null;
  femaleVal: number | null;
  totalVal: number | null;
  locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const categories = [
      isBg ? 'Мъже' : 'Male',
      isBg ? 'Жени' : 'Female',
      isBg ? 'Общо' : 'Total',
    ];
    const values = [maleVal ?? 0, femaleVal ?? 0, totalVal ?? 0];
    const colors = ['#2563eb', '#e11d48', '#1e293b'];

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
          return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
            <div style="font-size:14px;font-weight:700;color:${colors[p.dataIndex]}">${p.value}h</div>`;
        },
      },
      grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        name: isBg ? 'часове' : 'hours',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        min: (v: { min: number }) => Math.floor(v.min - 1),
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: { fontSize: 12, color: '#475569', fontWeight: 500 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [{
        type: 'bar',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: colors[i] },
              { offset: 1, color: colors[i] + 'cc' },
            ]),
            borderRadius: [0, 6, 6, 0],
          },
        })),
        barMaxWidth: 36,
        label: {
          show: true,
          position: 'right',
          fontSize: 13,
          fontWeight: 'bold' as const,
          color: '#334155',
          formatter: (p: any) => `${p.value}h`,
        },
      }],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [latestQ, maleVal, femaleVal, totalVal, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '200px' }} />;
}
