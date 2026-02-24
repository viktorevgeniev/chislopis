'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dataset } from '@/types/dataset';

// ── NACE Rev.2 A21 Labels ──────────────────────────────────────────────────────

const NACE_LABELS: Record<string, string> = {
  '0': 'All Economic Activities',
  A: 'Agriculture, Forestry & Fishing',
  B: 'Mining & Quarrying',
  C: 'Manufacturing',
  D: 'Electricity & Gas Supply',
  E: 'Water Supply & Waste',
  F: 'Construction',
  G: 'Wholesale & Retail Trade',
  H: 'Transport & Storage',
  I: 'Accommodation & Food',
  J: 'Information & Communication',
  K: 'Financial & Insurance',
  L: 'Real Estate',
  M: 'Professional & Scientific',
  N: 'Administrative & Support',
  O: 'Public Administration',
  P: 'Education',
  Q: 'Health & Social Work',
  R: 'Arts & Entertainment',
  S_T_U: 'Other Services',
};

const NACE_LABELS_BG: Record<string, string> = {
  '0': 'Всички дейности',
  A: 'Селско стопанство',
  B: 'Добивна промишленост',
  C: 'Преработваща промишленост',
  D: 'Електроенергия и газ',
  E: 'Водоснабдяване и отпадъци',
  F: 'Строителство',
  G: 'Търговия',
  H: 'Транспорт и складиране',
  I: 'Хотелиерство и ресторантьорство',
  J: 'ИКТ',
  K: 'Финанси и застраховане',
  L: 'Недвижими имоти',
  M: 'Професионални дейности',
  N: 'Административни дейности',
  O: 'Публична администрация',
  P: 'Образование',
  Q: 'Здравеопазване',
  R: 'Култура и развлечения',
  S_T_U: 'Други услуги',
};

const SECTOR_COLORS: Record<string, string> = {
  A: '#16a34a', B: '#78716c', C: '#2563eb', D: '#eab308', E: '#06b6d4',
  F: '#ea580c', G: '#8b5cf6', H: '#0d9488', I: '#e11d48', J: '#6366f1',
  K: '#ca8a04', L: '#64748b', M: '#7c3aed', N: '#0891b2', O: '#475569',
  P: '#059669', Q: '#dc2626', R: '#d946ef', S_T_U: '#94a3b8',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getVal(row: any): number | null {
  const v = row.Persons;
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  // Clean parenthesized values like "(4.9)"
  const cleaned = typeof v === 'string' ? v.replace(/[()]/g, '') : v;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseQuarter(q: string): { year: number; quarter: number } {
  const m = q.match(/^(\d{4})Q(\d)$/);
  if (!m) return { year: 0, quarter: 0 };
  return { year: parseInt(m[1]), quarter: parseInt(m[2]) };
}

function sortQuarters(a: string, b: string): number {
  const pa = parseQuarter(a); const pb = parseQuarter(b);
  return pa.year !== pb.year ? pa.year - pb.year : pa.quarter - pb.quarter;
}

function fmtVal(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k';
}

function naceLabel(code: string, isBg: boolean): string {
  return (isBg ? NACE_LABELS_BG[code] : NACE_LABELS[code]) || code;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps { data: any[]; dataset: Dataset; locale?: 'bg' | 'en'; }

// ── Main ───────────────────────────────────────────────────────────────────────

export function EmployedByActivity2008Dashboard({ data, dataset, locale = 'en' }: DashboardProps) {
  const isBg = locale === 'bg';

  const { allQuarters, totalData, sectorData, sectorCodes } = useMemo(() => {
    const qs = new Set<string>();
    const total: any[] = [];
    const sectors: any[] = [];
    const codes = new Set<string>();

    data.forEach(d => {
      if (d.Year) qs.add(d.Year);
      const code = d.NACE2008A21_Code || d.NACE2008A21 || '';
      if (code === '0') { total.push(d); }
      else { sectors.push(d); codes.add(code); }
    });

    return {
      allQuarters: [...qs].sort(sortQuarters),
      totalData: total,
      sectorData: sectors,
      sectorCodes: [...codes].sort(),
    };
  }, [data]);

  // KPIs
  const kpiData = useMemo(() => {
    if (allQuarters.length === 0) return null;
    const latestQ = allQuarters[allQuarters.length - 1];
    const prevQ = allQuarters.length >= 2 ? allQuarters[allQuarters.length - 2] : null;
    const latestP = parseQuarter(latestQ);
    const yoyQ = `${latestP.year - 1}Q${latestP.quarter}`;

    const findTotal = (q: string) => totalData.find(d => d.Year === q && d.Gender_Code === '0');
    const latestRow = findTotal(latestQ);
    const prevRow = prevQ ? findTotal(prevQ) : null;
    const latestVal = latestRow ? getVal(latestRow) : null;
    const prevVal = prevRow ? getVal(prevRow) : null;
    const qoqChange = latestVal != null && prevVal != null ? ((latestVal - prevVal) / prevVal * 100) : null;

    // Top growth sector YoY
    let topGrowthSector = '';
    let topGrowthPct = -Infinity;
    sectorCodes.forEach(code => {
      const curr = sectorData.find(d => d.Year === latestQ && (d.NACE2008A21_Code === code || d.NACE2008A21 === code) && d.Gender_Code === '0');
      const prev = sectorData.find(d => d.Year === yoyQ && (d.NACE2008A21_Code === code || d.NACE2008A21 === code) && d.Gender_Code === '0');
      const currV = curr ? getVal(curr) : null;
      const prevV = prev ? getVal(prev) : null;
      if (currV != null && prevV != null && prevV > 0) {
        const pct = (currV - prevV) / prevV * 100;
        if (pct > topGrowthPct) { topGrowthPct = pct; topGrowthSector = code; }
      }
    });

    // Gender gap
    const maleRow = totalData.find(d => d.Year === latestQ && d.Gender_Code === '1');
    const femaleRow = totalData.find(d => d.Year === latestQ && d.Gender_Code === '2');
    const maleVal = maleRow ? getVal(maleRow) : null;
    const femaleVal = femaleRow ? getVal(femaleRow) : null;
    const genderGap = maleVal != null && femaleVal != null && femaleVal > 0 ? maleVal / femaleVal : null;

    return { latestQ, latestVal, qoqChange, topGrowthSector, topGrowthPct: isFinite(topGrowthPct) ? topGrowthPct : null, genderGap };
  }, [allQuarters, totalData, sectorData, sectorCodes]);

  if (!data || data.length === 0 || !kpiData) {
    return <div className="text-center py-8 text-muted-foreground">{isBg ? 'Няма данни' : 'No data available'}</div>;
  }

  const firstYear = parseQuarter(allQuarters[0]).year;
  const lastYear = parseQuarter(allQuarters[allQuarters.length - 1]).year;

  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">{dataset.title[locale]}</CardTitle>
        <CardDescription className="text-slate-500">
          {isBg ? `Тримесечни данни (${firstYear}–${lastYear}) | НКИД 2008 (A21) | Хиляди лица`
            : `Quarterly Data (${firstYear}–${lastYear}) | NACE Rev.2 (A21) | Thousands of Persons`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? `Общо заети (${kpiData.latestQ})` : `Total Employed (${kpiData.latestQ})`}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">{fmtVal(kpiData.latestVal)}</p>
            {kpiData.qoqChange != null && (
              <p className={`text-sm mt-1 ${kpiData.qoqChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpiData.qoqChange >= 0 ? '\u2191' : '\u2193'} {Math.abs(kpiData.qoqChange).toFixed(1)}% {isBg ? 'т/т' : 'QoQ'}
              </p>
            )}
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Топ растящ сектор (г/г)' : 'Top Growth Sector (YoY)'}
            </p>
            <p className="text-lg font-bold mt-2 text-emerald-700">
              {kpiData.topGrowthSector ? naceLabel(kpiData.topGrowthSector, isBg) : '—'}
            </p>
            {kpiData.topGrowthPct != null && (
              <p className="text-sm text-emerald-600 mt-1">+{kpiData.topGrowthPct.toFixed(1)}%</p>
            )}
          </div>
          <div className="bg-white shadow-sm rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isBg ? 'Баланс М/Ж' : 'Gender Gap (M/F)'}
            </p>
            <p className="text-3xl font-bold mt-2 text-slate-900">
              {kpiData.genderGap != null ? kpiData.genderGap.toFixed(2) : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{isBg ? 'Съотношение мъже/жени' : 'Male to Female ratio'}</p>
          </div>
        </div>

        {/* Chart A: Sector Trend Line */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {isBg ? 'Еволюция на заетостта по сектори (2008–2025)' : 'Employment Evolution by Sector (2008–2025)'}
          </h3>
          <SectorTrendChart data={sectorData} totalData={totalData} allQuarters={allQuarters} sectorCodes={sectorCodes} locale={locale} />
        </div>

        {/* Charts B & D side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Заетост по сектори (последно тримесечие)' : 'Employment by Sector (Latest Quarter)'}
            </h3>
            <SectorGenderBarChart data={sectorData} allQuarters={allQuarters} sectorCodes={sectorCodes} locale={locale} />
          </div>
          <div className="bg-white shadow-sm rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {isBg ? 'Секторна структура на заетостта' : 'Sector Share of Total Employment'}
            </h3>
            <StructuralChangeChart data={sectorData} allQuarters={allQuarters} sectorCodes={sectorCodes} locale={locale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart A: Multi-line Sector Trends ──────────────────────────────────────────

function SectorTrendChart({ data, totalData, allQuarters, sectorCodes, locale }: {
  data: any[]; totalData: any[]; allQuarters: string[]; sectorCodes: string[]; locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [selectedSector, setSelectedSector] = useState<string>('0');

  const seriesData = useMemo(() => {
    const result: { name: string; color: string; values: (number | null)[] }[] = [];

    if (selectedSector === '0') {
      // Show Total by gender
      ['0', '1', '2'].forEach(g => {
        const byQ: Record<string, number | null> = {};
        totalData.filter(d => d.Gender_Code === g).forEach(d => { if (d.Year) byQ[d.Year] = getVal(d); });
        const label = g === '0' ? (isBg ? 'Общо' : 'Total') : g === '1' ? (isBg ? 'Мъже' : 'Male') : (isBg ? 'Жени' : 'Female');
        const color = g === '0' ? '#1e293b' : g === '1' ? '#2563eb' : '#be185d';
        result.push({ name: label, color, values: allQuarters.map(q => byQ[q] ?? null) });
      });
    } else {
      // Show specific sector by gender
      ['0', '1', '2'].forEach(g => {
        const byQ: Record<string, number | null> = {};
        data.filter(d => (d.NACE2008A21_Code === selectedSector || d.NACE2008A21 === selectedSector) && d.Gender_Code === g)
          .forEach(d => { if (d.Year) byQ[d.Year] = getVal(d); });
        const label = g === '0' ? (isBg ? 'Общо' : 'Total') : g === '1' ? (isBg ? 'Мъже' : 'Male') : (isBg ? 'Жени' : 'Female');
        const color = g === '0' ? (SECTOR_COLORS[selectedSector] || '#1e293b') : g === '1' ? '#2563eb' : '#be185d';
        result.push({ name: label, color, values: allQuarters.map(q => byQ[q] ?? null) });
      });
    }
    return result;
  }, [data, totalData, allQuarters, selectedSector, isBg]);

  useEffect(() => {
    if (!chartRef.current || allQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const brushStart = Math.max(0, Math.round((1 - 32 / allQuarters.length) * 100));

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const val = p.value != null ? Number(p.value).toFixed(1) : 'N/A';
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val} (${isBg ? 'Хиляди' : 'Thousands'})</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: { data: seriesData.map(s => s.name), bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: brushStart, end: 100 },
        { type: 'slider', start: brushStart, end: 100, height: 18, bottom: 24, borderColor: '#cbd5e1' },
      ],
      xAxis: {
        type: 'category', boundaryGap: false, data: allQuarters,
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: string) => { const p = parseQuarter(v); return p.quarter === 1 ? String(p.year) : ''; } },
        axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false },
      },
      yAxis: {
        type: 'value', name: isBg ? 'хил.' : 'K',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: seriesData.map(s => ({
        name: s.name, type: 'line' as const, data: s.values,
        itemStyle: { color: s.color }, lineStyle: { width: 2 },
        smooth: true, symbol: 'none', connectNulls: true,
      })),
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [allQuarters, seriesData, isBg]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nace-sector-sel" className="text-sm font-medium text-slate-600">{isBg ? 'Сектор' : 'Sector'}</label>
        <Select id="nace-sector-sel" value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)} className="w-[280px]">
          <option value="0">{naceLabel('0', isBg)}</option>
          {sectorCodes.map(c => <option key={c} value={c}>{c} — {naceLabel(c, isBg)}</option>)}
        </Select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '380px' }} />
    </div>
  );
}

// ── Chart B: Sector × Gender Horizontal Bar ────────────────────────────────────

function SectorGenderBarChart({ data, allQuarters, sectorCodes, locale }: {
  data: any[]; allQuarters: string[]; sectorCodes: string[]; locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');

  useEffect(() => {
    if (allQuarters.length > 0 && !selectedQuarter) setSelectedQuarter(allQuarters[allQuarters.length - 1]);
  }, [allQuarters, selectedQuarter]);

  const barData = useMemo(() => {
    const q = selectedQuarter || allQuarters[allQuarters.length - 1];
    return sectorCodes.map(code => {
      const maleRow = data.find(d => d.Year === q && (d.NACE2008A21_Code === code || d.NACE2008A21 === code) && d.Gender_Code === '1');
      const femaleRow = data.find(d => d.Year === q && (d.NACE2008A21_Code === code || d.NACE2008A21 === code) && d.Gender_Code === '2');
      return {
        code, label: naceLabel(code, isBg),
        male: maleRow ? (getVal(maleRow) ?? 0) : 0,
        female: femaleRow ? (getVal(femaleRow) ?? 0) : 0,
      };
    }).sort((a, b) => (b.male + b.female) - (a.male + a.female));
  }, [data, allQuarters, sectorCodes, selectedQuarter, isBg]);

  useEffect(() => {
    if (!chartRef.current || barData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const labels = [...barData].reverse().map(d => d.label);
    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 11 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].name}</div>`;
          let total = 0;
          params.forEach((p: any) => {
            const val = Math.abs(Number(p.value));
            total += val;
            tip += `<div style="display:flex;gap:6px;margin:1px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${val.toFixed(1)} (${isBg ? 'Хиляди' : 'Thousands'})</span>
            </div>`;
          });
          tip += `<div style="border-top:1px solid #e2e8f0;margin-top:3px;padding-top:3px;font-weight:700">${isBg ? 'Общо' : 'Total'}: ${total.toFixed(1)}</div>`;
          return tip;
        },
      },
      legend: { data: [isBg ? 'Мъже' : 'Male', isBg ? 'Жени' : 'Female'], bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      grid: { left: '3%', right: '3%', bottom: '12%', top: '3%', containLabel: true },
      yAxis: { type: 'category', data: labels, axisLabel: { fontSize: 9, color: '#475569' }, axisTick: { show: false }, axisLine: { show: false } },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => Math.abs(v).toFixed(0) },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [
        {
          name: isBg ? 'Мъже' : 'Male', type: 'bar', stack: 'gender',
          data: [...barData].reverse().map(d => -d.male),
          itemStyle: { color: '#2563eb', borderRadius: [4, 0, 0, 4] },
        },
        {
          name: isBg ? 'Жени' : 'Female', type: 'bar', stack: 'gender',
          data: [...barData].reverse().map(d => d.female),
          itemStyle: { color: '#be185d', borderRadius: [0, 4, 4, 0] },
        },
      ],
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [barData, isBg]);

  const chartHeight = Math.max(400, barData.length * 26 + 80);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nace-bar-q" className="text-sm font-medium text-slate-600">{isBg ? 'Тримесечие' : 'Quarter'}</label>
        <Select id="nace-bar-q" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-[140px]">
          {allQuarters.map(q => <option key={q} value={q}>{q}</option>)}
        </Select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: chartHeight + 'px' }} />
    </div>
  );
}

// ── Chart D: 100% Stacked Area (Structural Change) ────────────────────────────

function StructuralChangeChart({ data, allQuarters, sectorCodes, locale }: {
  data: any[]; allQuarters: string[]; sectorCodes: string[]; locale: 'bg' | 'en';
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isBg = locale === 'bg';

  // Use Q1 of each year for readability
  const yearQuarters = useMemo(() =>
    allQuarters.filter(q => parseQuarter(q).quarter === 1),
    [allQuarters]
  );

  // Top 6 sectors + Others for the area chart
  const { topCodes, areaData } = useMemo(() => {
    const latestQ = yearQuarters[yearQuarters.length - 1] || allQuarters[allQuarters.length - 1];
    const ranked = sectorCodes.map(code => {
      const row = data.find(d => d.Year === latestQ && (d.NACE2008A21_Code === code || d.NACE2008A21 === code) && d.Gender_Code === '0');
      return { code, val: row ? (getVal(row) ?? 0) : 0 };
    }).sort((a, b) => b.val - a.val);

    const top = ranked.slice(0, 6).map(r => r.code);
    const otherCodes = ranked.slice(6).map(r => r.code);

    // Build percentage data
    const result: Record<string, number[]> = {};
    top.forEach(c => { result[c] = []; });
    result['Others'] = [];

    yearQuarters.forEach(q => {
      // Get total for this quarter
      let qTotal = 0;
      const sectorVals: Record<string, number> = {};
      sectorCodes.forEach(code => {
        const row = data.find(d => d.Year === q && (d.NACE2008A21_Code === code || d.NACE2008A21 === code) && d.Gender_Code === '0');
        const v = row ? (getVal(row) ?? 0) : 0;
        sectorVals[code] = v;
        qTotal += v;
      });

      if (qTotal === 0) {
        top.forEach(c => result[c].push(0));
        result['Others'].push(0);
        return;
      }

      top.forEach(c => result[c].push(sectorVals[c] / qTotal * 100));
      const othersSum = otherCodes.reduce((s, c) => s + (sectorVals[c] || 0), 0);
      result['Others'].push(othersSum / qTotal * 100);
    });

    return { topCodes: top, areaData: result };
  }, [data, allQuarters, yearQuarters, sectorCodes]);

  const categories = useMemo(() => [...topCodes, 'Others'], [topCodes]);

  useEffect(() => {
    if (!chartRef.current || yearQuarters.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 11 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            tip += `<div style="display:flex;gap:4px;margin:1px 0;font-size:11px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-top:3px"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600">${Number(p.value).toFixed(1)}%</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: categories.map(c => c === 'Others' ? (isBg ? 'Други' : 'Others') : naceLabel(c, isBg)),
        bottom: 0, type: 'scroll', textStyle: { fontSize: 9, color: '#64748b' },
      },
      grid: { left: '1%', right: '3%', bottom: '16%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category', boundaryGap: false, data: yearQuarters,
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: string) => String(parseQuarter(v).year) },
        axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false },
      },
      yAxis: {
        type: 'value', max: 100, name: '%',
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
        axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => v + '%' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: categories.map((c, i) => ({
        name: c === 'Others' ? (isBg ? 'Други' : 'Others') : naceLabel(c, isBg),
        type: 'line' as const,
        stack: 'share',
        areaStyle: { opacity: 0.7 },
        data: areaData[c],
        itemStyle: { color: c === 'Others' ? '#94a3b8' : (SECTOR_COLORS[c] || SECTOR_COLORS[sectorCodes[i % sectorCodes.length]] || '#64748b') },
        lineStyle: { width: 0.5 },
        symbol: 'none',
        smooth: true,
      })),
    };

    chart.setOption(option);
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); chart.dispose(); };
  }, [yearQuarters, categories, areaData, isBg, sectorCodes]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}
