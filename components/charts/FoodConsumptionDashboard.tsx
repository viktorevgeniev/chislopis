'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import type { Dataset } from '@/types/dataset';

// ── Types ──────────────────────────────────────────────────────────────────────

type DataIndex = Map<string, Map<string, Map<string, number>>>; // code → res → year → value

interface CatDef {
  code: string;
  en: string;
  bg: string;
  unit: string;
  color: string;
}

// ── All 2-digit main categories ────────────────────────────────────────────────

const CATS: CatDef[] = [
  { code: '01', en: 'Bread & paste', bg: 'Хляб и тестени', unit: 'kg', color: '#f59e0b' },
  { code: '02', en: 'Flour', bg: 'Брашно', unit: 'kg', color: '#fbbf24' },
  { code: '03', en: 'Rice', bg: 'Ориз', unit: 'kg', color: '#a16207' },
  { code: '04', en: 'Other cereals', bg: 'Друго зърно', unit: 'kg', color: '#d97706' },
  { code: '05', en: 'Other bakery', bg: 'Хлебни изделия', unit: 'kg', color: '#b45309' },
  { code: '06', en: 'Meat', bg: 'Месо', unit: 'kg', color: '#ef4444' },
  { code: '07', en: 'Meat products', bg: 'Месни продукти', unit: 'kg', color: '#dc2626' },
  { code: '08', en: 'Fish & products', bg: 'Риба и продукти', unit: 'kg', color: '#2563eb' },
  { code: '09', en: 'Milk', bg: 'Прясно мляко', unit: 'L', color: '#bfdbfe' },
  { code: '10', en: 'Yoghurt', bg: 'Кисело мляко', unit: 'kg', color: '#93c5fd' },
  { code: '11', en: 'White cheese', bg: 'Сирене', unit: 'kg', color: '#60a5fa' },
  { code: '12', en: 'Yellow cheese', bg: 'Кашкавал', unit: 'kg', color: '#3b82f6' },
  { code: '13', en: 'Other dairy', bg: 'Друго мляко', unit: 'kg', color: '#1d4ed8' },
  { code: '14', en: 'Eggs', bg: 'Яйца', unit: 'pcs', color: '#fef08a' },
  { code: '15', en: 'Sunflower oil', bg: 'Олио', unit: 'L', color: '#eab308' },
  { code: '16', en: 'Margarine', bg: 'Маргарин', unit: 'kg', color: '#ca8a04' },
  { code: '17', en: 'Butter', bg: 'Масло', unit: 'kg', color: '#854d0e' },
  { code: '18', en: 'Lard', bg: 'Мас', unit: 'kg', color: '#78716c' },
  { code: '19', en: 'Fruit', bg: 'Плодове', unit: 'kg', color: '#10b981' },
  { code: '20', en: 'Nuts', bg: 'Ядки', unit: 'kg', color: '#059669' },
  { code: '21', en: 'Compotes', bg: 'Компоти', unit: 'kg', color: '#047857' },
  { code: '22', en: 'Jam & preserves', bg: 'Конфитюри', unit: 'kg', color: '#065f46' },
  { code: '23', en: 'Fruit juices', bg: 'Плодови сокове', unit: 'L', color: '#6ee7b7' },
  { code: '24', en: 'Fresh vegetables', bg: 'Пресни зеленчуци', unit: 'kg', color: '#34d399' },
  { code: '25', en: 'Dry beans', bg: 'Боб', unit: 'kg', color: '#16a34a' },
  { code: '26', en: 'Lentils', bg: 'Леща', unit: 'kg', color: '#15803d' },
  { code: '27', en: 'Canned vegetables', bg: 'Конс. зеленчуци', unit: 'kg', color: '#166534' },
  { code: '28', en: 'Vegetable juices', bg: 'Зеленч. сокове', unit: 'L', color: '#14532d' },
  { code: '29', en: 'Pickled vegetables', bg: 'Туршия', unit: 'kg', color: '#064e3b' },
  { code: '30', en: 'Mushrooms', bg: 'Гъби', unit: 'kg', color: '#86efac' },
  { code: '31', en: 'Potatoes', bg: 'Картофи', unit: 'kg', color: '#6b7280' },
  { code: '32', en: 'Sugar', bg: 'Захар', unit: 'kg', color: '#a78bfa' },
  { code: '33', en: 'Sugar products', bg: 'Захарни изделия', unit: 'kg', color: '#8b5cf6' },
  { code: '34', en: 'Chocolate', bg: 'Шоколадови', unit: 'kg', color: '#7c3aed' },
  { code: '35', en: 'Salt', bg: 'Сол', unit: 'kg', color: '#94a3b8' },
  { code: '36', en: 'Vinegar', bg: 'Оцет', unit: 'L', color: '#64748b' },
  { code: '37', en: 'Non-alc. beverages', bg: 'Безалкохолни', unit: 'L', color: '#4ade80' },
  { code: '38', en: 'Alcoholic beverages', bg: 'Алкохолни', unit: 'L', color: '#c084fc' },
  { code: '39', en: 'Cigarettes', bg: 'Цигари', unit: 'pcs', color: '#78716c' },
];

const CATS_MAP: Record<string, CatDef> = Object.fromEntries(CATS.map(c => [c.code, c]));

// ── Residence labels ───────────────────────────────────────────────────────────

const RESIDENCE_EN: Record<string, string> = { '0': 'Total', '1': 'Urban', '2': 'Rural' };
const RESIDENCE_BG: Record<string, string> = { '0': 'Общо', '1': 'Градско', '2': 'Селско' };

// ── Trend groups ───────────────────────────────────────────────────────────────

const TREND_GROUPS = [
  { key: 'staples', en: 'Staples', bg: 'Основни храни', codes: ['01', '02', '03', '31'] },
  { key: 'proteins', en: 'Proteins', bg: 'Белтъчини', codes: ['06', '07', '08'] },
  { key: 'dairy', en: 'Dairy', bg: 'Млечни продукти', codes: ['09', '10', '11', '12'] },
  { key: 'fruits_veg', en: 'Fruit & Vegetables', bg: 'Плодове и зеленчуци', codes: ['19', '24', '25', '29'] },
  { key: 'beverages', en: 'Beverages', bg: 'Напитки', codes: ['23', '37', '38'] },
];

// ── Subcategory definitions ────────────────────────────────────────────────────

const MEAT_SUBS: CatDef[] = [
  { code: '061', en: 'Pork', bg: 'Свинско', unit: 'kg', color: '#ef4444' },
  { code: '062', en: 'Beef & veal', bg: 'Говеждо и телешко', unit: 'kg', color: '#b91c1c' },
  { code: '063', en: 'Lamb', bg: 'Агнешко', unit: 'kg', color: '#991b1b' },
  { code: '064', en: 'Mutton & goat', bg: 'Овче и козе', unit: 'kg', color: '#7f1d1d' },
  { code: '065', en: 'Minced meat', bg: 'Кайма', unit: 'kg', color: '#f97316' },
  { code: '066', en: 'Poultry', bg: 'Птиче месо', unit: 'kg', color: '#fb923c' },
  { code: '067', en: 'Other meat', bg: 'Друго месо', unit: 'kg', color: '#fca5a5' },
  { code: '068', en: 'Offals', bg: 'Вътрешности', unit: 'kg', color: '#fecaca' },
];

const MEAT_PROD_SUBS: CatDef[] = [
  { code: '071', en: 'Non-perishable sausages', bg: 'Трайни колбаси', unit: 'kg', color: '#b91c1c' },
  { code: '072', en: 'Perishable sausages', bg: 'Нетрайни колбаси', unit: 'kg', color: '#ef4444' },
  { code: '073', en: 'Bacon', bg: 'Бекон', unit: 'kg', color: '#f97316' },
  { code: '074', en: 'Meat cans', bg: 'Консерви от месо', unit: 'kg', color: '#fb923c' },
  { code: '075', en: 'Ready-to-cook', bg: 'Полуфабрикати', unit: 'kg', color: '#fbbf24' },
];

const FRUIT_SUBS: CatDef[] = [
  { code: '191', en: 'Apples', bg: 'Ябълки', unit: 'kg', color: '#10b981' },
  { code: '192', en: 'Pears', bg: 'Круши', unit: 'kg', color: '#34d399' },
  { code: '193', en: 'Grapes', bg: 'Грозде', unit: 'kg', color: '#6ee7b7' },
  { code: '194', en: 'Tropical fruit', bg: 'Тропически плодове', unit: 'kg', color: '#a7f3d0' },
  { code: '195', en: 'Melons & watermelons', bg: 'Пъпеши и дини', unit: 'kg', color: '#059669' },
  { code: '196', en: 'Pumpkins', bg: 'Тикви', unit: 'kg', color: '#047857' },
  { code: '197', en: 'Other fruit', bg: 'Други плодове', unit: 'kg', color: '#065f46' },
];

const VEG_SUBS: CatDef[] = [
  { code: '241', en: 'Tomatoes', bg: 'Домати', unit: 'kg', color: '#ef4444' },
  { code: '242', en: 'Cucumbers', bg: 'Краставици', unit: 'kg', color: '#10b981' },
  { code: '243', en: 'Cabbage', bg: 'Зеле', unit: 'kg', color: '#3b82f6' },
  { code: '244', en: 'Peppers', bg: 'Чушки', unit: 'kg', color: '#f97316' },
  { code: '245', en: 'Onions', bg: 'Лук', unit: 'kg', color: '#8b5cf6' },
  { code: '246', en: 'Other vegetables', bg: 'Други зеленчуци', unit: 'kg', color: '#6b7280' },
];

const ALCOHOL_SUBS: CatDef[] = [
  { code: '381', en: 'Beer', bg: 'Бира', unit: 'L', color: '#f59e0b' },
  { code: '382', en: 'Wine', bg: 'Вино', unit: 'L', color: '#7c3aed' },
  { code: '383', en: 'Brandy', bg: 'Ракия', unit: 'L', color: '#d97706' },
  { code: '384', en: 'Other spirits', bg: 'Други спиртни', unit: 'L', color: '#92400e' },
];

const DETAIL_GROUPS = [
  { key: 'meat', en: 'Meat Types', bg: 'Видове месо', subs: MEAT_SUBS },
  { key: 'meat_products', en: 'Meat Products', bg: 'Месни продукти', subs: MEAT_PROD_SUBS },
  { key: 'fruit', en: 'Fruit Types', bg: 'Видове плодове', subs: FRUIT_SUBS },
  { key: 'veg', en: 'Vegetable Types', bg: 'Видове зеленчуци', subs: VEG_SUBS },
  { key: 'alcohol', en: 'Alcoholic Beverages', bg: 'Алкохолни напитки', subs: ALCOHOL_SUBS },
];

// Visible categories for Urban vs Rural bar chart (key representative items)
const URBAN_RURAL_CATS = ['01', '05', '06', '07', '08', '10', '11', '19', '24', '31', '32', '37', '38'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseValue(v: any): number | null {
  if (v == null || v === '' || v === '..' || v === 'null') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[()]/g, ''));
  return isNaN(n) ? null : n;
}

function buildIndex(data: any[]): DataIndex {
  const idx: DataIndex = new Map();
  for (const row of data) {
    const code = String(row.HBS_POTR_Code ?? '');
    const res = String(row.Residence_Code ?? '');
    const yr = String(row.Year ?? '');
    const val = parseValue(row.Amount ?? row.ValueColumn);
    if (!code || !res || !yr || val == null) continue;
    if (!idx.has(code)) idx.set(code, new Map());
    const codeMap = idx.get(code)!;
    if (!codeMap.has(res)) codeMap.set(res, new Map());
    codeMap.get(res)!.set(yr, val);
  }
  return idx;
}

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 12 },
  };
}

function fmtVal(v: number | null, decimals = 1): string {
  return v != null ? v.toLocaleString('bg-BG', { maximumFractionDigits: decimals }) : '—';
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  data: any[];
  dataset?: Dataset;
  locale?: 'bg' | 'en';
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════════════

export function FoodConsumptionDashboard({ data, locale = 'en' }: Props) {
  const isBg = locale === 'bg';

  const { allYears, latestYear, firstYear, idx } = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => { if (d.Year) years.add(String(d.Year)); });
    const sorted = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    return {
      allYears: sorted,
      latestYear: sorted[sorted.length - 1] ?? '',
      firstYear: sorted[0] ?? '',
      idx: buildIndex(data),
    };
  }, [data]);

  const get = (code: string, res: string, yr: string): number | null =>
    idx.get(code)?.get(res)?.get(yr) ?? null;

  const kpi = useMemo(() => {
    if (!latestYear) return null;
    const prevYear = allYears.length > 1 ? allYears[allYears.length - 2] : null;
    const bread = get('01', '0', latestYear);
    const breadPrev = prevYear ? get('01', '0', prevYear) : null;
    const meat = get('06', '0', latestYear);
    const meatPrev = prevYear ? get('06', '0', prevYear) : null;
    const fruit = get('19', '0', latestYear);
    const veg = get('24', '0', latestYear);

    const yoyPct = (cur: number | null, prev: number | null) =>
      cur != null && prev != null && prev > 0 ? ((cur - prev) / prev) * 100 : null;

    return {
      bread, breadUrban: get('01', '1', latestYear), breadRural: get('01', '2', latestYear),
      breadYoy: yoyPct(bread, breadPrev),
      meat, meatUrban: get('06', '1', latestYear), meatRural: get('06', '2', latestYear),
      meatYoy: yoyPct(meat, meatPrev),
      fruit, fruitUrban: get('19', '1', latestYear), fruitRural: get('19', '2', latestYear),
      veg, vegUrban: get('24', '1', latestYear), vegRural: get('24', '2', latestYear),
    };
  }, [idx, latestYear, allYears]); // eslint-disable-line react-hooks/exhaustive-deps

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
            ? 'Потребление на основни хранителни продукти и напитки'
            : 'Household Consumption of Main Foods & Beverages'}
        </CardTitle>
        <CardDescription className="text-slate-500">
          {isBg
            ? `Годишни данни (${firstYear}–${latestYear}) | По местоживеене: Общо, Градско, Селско | Средно на домакинство`
            : `Annual data (${firstYear}–${latestYear}) | By residence: Total, Urban, Rural | Average per household`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ── */}
        {kpi && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label={isBg ? 'Хляб и тестени' : 'Bread & paste'}
              total={kpi.bread} urban={kpi.breadUrban} rural={kpi.breadRural}
              yoyPct={kpi.breadYoy} unit="kg" year={latestYear}
              accent="amber" isBg={isBg}
            />
            <KpiCard
              label={isBg ? 'Месо' : 'Meat'}
              total={kpi.meat} urban={kpi.meatUrban} rural={kpi.meatRural}
              yoyPct={kpi.meatYoy} unit="kg" year={latestYear}
              accent="red" isBg={isBg}
            />
            <KpiCard
              label={isBg ? 'Пресни плодове' : 'Fresh Fruit'}
              total={kpi.fruit} urban={kpi.fruitUrban} rural={kpi.fruitRural}
              yoyPct={null} unit="kg" year={latestYear}
              accent="emerald" isBg={isBg}
            />
            <KpiCard
              label={isBg ? 'Пресни зеленчуци' : 'Fresh Vegetables'}
              total={kpi.veg} urban={kpi.vegUrban} rural={kpi.vegRural}
              yoyPct={null} unit="kg" year={latestYear}
              accent="green" isBg={isBg}
            />
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="trends">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="trends">{isBg ? 'Динамика' : 'Trends'}</TabsTrigger>
            <TabsTrigger value="urban-rural">{isBg ? 'Градско / Селско' : 'Urban vs Rural'}</TabsTrigger>
            <TabsTrigger value="detail">{isBg ? 'По категории' : 'Category Detail'}</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsSection idx={idx} allYears={allYears} firstYear={firstYear} latestYear={latestYear} isBg={isBg} />
          </TabsContent>

          <TabsContent value="urban-rural">
            <UrbanRuralSection idx={idx} allYears={allYears} latestYear={latestYear} isBg={isBg} />
          </TabsContent>

          <TabsContent value="detail">
            <DetailSection idx={idx} allYears={allYears} firstYear={firstYear} latestYear={latestYear} isBg={isBg} />
          </TabsContent>
        </Tabs>

      </CardContent>
    </Card>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

type Accent = 'amber' | 'red' | 'emerald' | 'green';

const ACCENT_CLASSES: Record<Accent, { bg: string; text: string }> = {
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  green: { bg: 'bg-green-50', text: 'text-green-700' },
};

function KpiCard({
  label, total, urban, rural, yoyPct, unit, year, accent, isBg,
}: {
  label: string;
  total: number | null;
  urban: number | null;
  rural: number | null;
  yoyPct: number | null;
  unit: string;
  year: string;
  accent: Accent;
  isBg: boolean;
}) {
  const cls = ACCENT_CLASSES[accent];
  return (
    <div className={`${cls.bg} rounded-xl p-4`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${cls.text}`}>
        {fmtVal(total)} <span className="text-sm font-normal text-slate-400">{unit}</span>
      </p>
      {yoyPct != null && (
        <span className={`text-[10px] font-semibold ${yoyPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {yoyPct >= 0 ? '▲' : '▼'} {Math.abs(yoyPct).toFixed(1)}% YoY
        </span>
      )}
      <div className="flex gap-3 mt-2">
        <div>
          <p className="text-[11px] text-slate-400">{isBg ? 'Градско' : 'Urban'}</p>
          <p className={`text-sm font-semibold ${cls.text}`}>{fmtVal(urban)}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">{isBg ? 'Селско' : 'Rural'}</p>
          <p className={`text-sm font-semibold ${cls.text}`}>{fmtVal(rural)}</p>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 mt-1">{year} | {isBg ? 'ср. на домакинство' : 'avg. per household'}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab A — Multi-series Line: Consumption Trends
// ══════════════════════════════════════════════════════════════════════════════

function TrendsSection({
  idx, allYears, firstYear, latestYear, isBg,
}: {
  idx: DataIndex;
  allYears: string[];
  firstYear: string;
  latestYear: string;
  isBg: boolean;
}) {
  const [groupKey, setGroupKey] = useState('staples');
  const [residenceCode, setResidenceCode] = useState('0');

  const selectedGroup = TREND_GROUPS.find(g => g.key === groupKey) ?? TREND_GROUPS[0];

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg ? 'А. Динамика на потреблението по години' : 'A. Consumption Trends Over Years'}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Група:' : 'Group:'}</label>
            <Select
              value={groupKey}
              onChange={e => setGroupKey(e.target.value)}
              className="text-xs py-1 px-2 h-8 w-40"
            >
              {TREND_GROUPS.map(g => (
                <option key={g.key} value={g.key}>{isBg ? g.bg : g.en}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Местоживеене:' : 'Residence:'}</label>
            <Select
              value={residenceCode}
              onChange={e => setResidenceCode(e.target.value)}
              className="text-xs py-1 px-2 h-8 w-28"
            >
              {(['0', '1', '2'] as const).map(c => (
                <option key={c} value={c}>{isBg ? RESIDENCE_BG[c] : RESIDENCE_EN[c]}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isBg
          ? `${firstYear}–${latestYear} | Средно потребление на домакинство (кг/л) | ${selectedGroup.bg}`
          : `${firstYear}–${latestYear} | Average consumption per household (kg/L) | ${selectedGroup.en}`}
      </p>
      <TrendLineChart
        idx={idx}
        allYears={allYears}
        codes={selectedGroup.codes}
        residenceCode={residenceCode}
        isBg={isBg}
      />
    </div>
  );
}

function TrendLineChart({
  idx, allYears, codes, residenceCode, isBg,
}: {
  idx: DataIndex;
  allYears: string[];
  codes: string[];
  residenceCode: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => codes.map(code => {
    const cat = CATS_MAP[code] ?? { code, en: code, bg: code, unit: '', color: '#94a3b8' };
    return {
      code,
      label: isBg ? cat.bg : cat.en,
      color: cat.color,
      unit: cat.unit,
      values: allYears.map(yr => idx.get(code)?.get(residenceCode)?.get(yr) ?? null),
    };
  }), [idx, allYears, codes, residenceCode, isBg]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          [...params]
            .filter((p: any) => p.value != null)
            .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
            .forEach((p: any) => {
              const s = seriesData.find(s => s.label === p.seriesName);
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)} ${s?.unit ?? ''}</span>
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
      grid: { left: '1%', right: '3%', bottom: '18%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allYears,
        axisLabel: { fontSize: 11, color: '#94a3b8', rotate: 30 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        nameTextStyle: { fontSize: 10, color: '#94a3b8' },
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
        symbolSize: 6,
        connectNulls: true,
        emphasis: { lineStyle: { width: 4 } },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: s.color + '22' },
              { offset: 1, color: s.color + '04' },
            ],
          },
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

// ══════════════════════════════════════════════════════════════════════════════
// Tab B — Grouped Bar: Urban vs Rural comparison
// ══════════════════════════════════════════════════════════════════════════════

function UrbanRuralSection({
  idx, allYears, latestYear, isBg,
}: {
  idx: DataIndex;
  allYears: string[];
  latestYear: string;
  isBg: boolean;
}) {
  const [year, setYear] = useState(latestYear);

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg ? 'Б. Потребление: Градско срещу Селско' : 'B. Consumption: Urban vs Rural'}
        </h3>
        <div className="flex items-center gap-1">
          <label className="text-xs text-slate-500">{isBg ? 'Година:' : 'Year:'}</label>
          <Select
            value={year || latestYear}
            onChange={e => setYear(e.target.value)}
            className="text-xs py-1 px-2 h-8 w-24"
          >
            {[...allYears].reverse().map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isBg
          ? 'Средно потребление на домакинство по категории (кг/л) | Разлики между Градско и Селско'
          : 'Average household consumption by category (kg/L) | Differences between Urban and Rural'}
      </p>
      <UrbanRuralChart idx={idx} year={year || latestYear} isBg={isBg} />

      {/* Urban–Rural gap table */}
      <UrbanRuralGapTable idx={idx} year={year || latestYear} isBg={isBg} />
    </div>
  );
}

function UrbanRuralChart({ idx, year, isBg }: { idx: DataIndex; year: string; isBg: boolean }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => (
    URBAN_RURAL_CATS.map(code => {
      const cat = CATS_MAP[code]!;
      return {
        code,
        label: isBg ? cat.bg : cat.en,
        unit: cat.unit,
        urban: idx.get(code)?.get('1')?.get(year) ?? null,
        rural: idx.get(code)?.get('2')?.get(year) ?? null,
      };
    }).filter(d => d.urban != null || d.rural != null)
  ), [idx, year, isBg]);

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const urbanLabel = isBg ? 'Градско' : 'Urban';
    const ruralLabel = isBg ? 'Селско' : 'Rural';

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const cat = chartData.find(d => d.label === params[0]?.axisValue);
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue} (${year})</div>`;
          params.forEach((p: any) => {
            if (p.value == null) return;
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
              <span style="flex:1">${p.seriesName}</span>
              <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(1)} ${cat?.unit ?? ''}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: [urbanLabel, ruralLabel],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
        itemWidth: 14, itemHeight: 8,
      },
      grid: { left: '2%', right: '4%', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: chartData.map(d => d.label),
        axisLabel: { fontSize: 10, color: '#475569', rotate: 35, interval: 0 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: [
        {
          name: urbanLabel,
          type: 'bar' as const,
          data: chartData.map(d => ({
            value: d.urban,
            itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] as any },
          })),
          barMaxWidth: 28,
          emphasis: { focus: 'series' as const },
        },
        {
          name: ruralLabel,
          type: 'bar' as const,
          data: chartData.map(d => ({
            value: d.rural,
            itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] as any },
          })),
          barMaxWidth: 28,
          emphasis: { focus: 'series' as const },
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, year, isBg]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

function UrbanRuralGapTable({ idx, year, isBg }: { idx: DataIndex; year: string; isBg: boolean }) {
  const rows = useMemo(() => (
    URBAN_RURAL_CATS.map(code => {
      const cat = CATS_MAP[code]!;
      const urban = idx.get(code)?.get('1')?.get(year) ?? null;
      const rural = idx.get(code)?.get('2')?.get(year) ?? null;
      const gap = urban != null && rural != null ? urban - rural : null;
      const pct = urban != null && rural != null && rural > 0
        ? ((urban - rural) / rural) * 100 : null;
      return { code, label: isBg ? cat.bg : cat.en, unit: cat.unit, urban, rural, gap, pct };
    }).filter(r => r.urban != null || r.rural != null)
      .sort((a, b) => Math.abs(b.pct ?? 0) - Math.abs(a.pct ?? 0))
  ), [idx, year, isBg]);

  return (
    <div className="mt-4 overflow-x-auto">
      <p className="text-xs font-medium text-slate-500 mb-2">
        {isBg ? 'Разлика Градско – Селско:' : 'Urban – Rural gap:'}
      </p>
      <table className="w-full text-xs text-slate-600 border-collapse">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase">
            <th className="text-left py-1.5 pr-3 font-medium">{isBg ? 'Продукт' : 'Item'}</th>
            <th className="text-right py-1.5 pr-3 font-medium">{isBg ? 'Градско' : 'Urban'}</th>
            <th className="text-right py-1.5 pr-3 font-medium">{isBg ? 'Селско' : 'Rural'}</th>
            <th className="text-right py-1.5 font-medium">{isBg ? 'Разлика %' : 'Gap %'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.code} className="border-b border-slate-50 hover:bg-slate-50">
              <td className="py-1.5 pr-3">{r.label}</td>
              <td className="text-right py-1.5 pr-3 text-blue-600 font-medium">{fmtVal(r.urban)} <span className="text-slate-400">{r.unit}</span></td>
              <td className="text-right py-1.5 pr-3 text-emerald-600 font-medium">{fmtVal(r.rural)} <span className="text-slate-400">{r.unit}</span></td>
              <td className="text-right py-1.5">
                {r.pct != null && (
                  <span className={`font-semibold ${Math.abs(r.pct) > 20 ? (r.pct > 0 ? 'text-blue-600' : 'text-emerald-600') : 'text-slate-500'}`}>
                    {r.pct >= 0 ? '+' : ''}{r.pct.toFixed(1)}%
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab C — Stacked Area: Category Subcategory Breakdown
// ══════════════════════════════════════════════════════════════════════════════

function DetailSection({
  idx, allYears, firstYear, latestYear, isBg,
}: {
  idx: DataIndex;
  allYears: string[];
  firstYear: string;
  latestYear: string;
  isBg: boolean;
}) {
  const [groupKey, setGroupKey] = useState('meat');
  const [residenceCode, setResidenceCode] = useState('0');

  const selectedGroup = DETAIL_GROUPS.find(g => g.key === groupKey) ?? DETAIL_GROUPS[0];

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {isBg ? 'В. Разбивка по подкатегории' : 'C. Subcategory Breakdown'}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Категория:' : 'Category:'}</label>
            <Select
              value={groupKey}
              onChange={e => setGroupKey(e.target.value)}
              className="text-xs py-1 px-2 h-8 w-40"
            >
              {DETAIL_GROUPS.map(g => (
                <option key={g.key} value={g.key}>{isBg ? g.bg : g.en}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">{isBg ? 'Местоживеене:' : 'Residence:'}</label>
            <Select
              value={residenceCode}
              onChange={e => setResidenceCode(e.target.value)}
              className="text-xs py-1 px-2 h-8 w-28"
            >
              {(['0', '1', '2'] as const).map(c => (
                <option key={c} value={c}>{isBg ? RESIDENCE_BG[c] : RESIDENCE_EN[c]}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isBg
          ? `${firstYear}–${latestYear} | Потребление на подгрупи (кг/л) | ${isBg ? selectedGroup.bg : selectedGroup.en}`
          : `${firstYear}–${latestYear} | Subcategory consumption (kg/L) | ${selectedGroup.en}`}
      </p>
      <DetailAreaChart
        idx={idx}
        allYears={allYears}
        subs={selectedGroup.subs}
        residenceCode={residenceCode}
        isBg={isBg}
      />
      <LatestYearBreakdown
        idx={idx}
        subs={selectedGroup.subs}
        residenceCode={residenceCode}
        latestYear={latestYear}
        isBg={isBg}
      />
    </div>
  );
}

function DetailAreaChart({
  idx, allYears, subs, residenceCode, isBg,
}: {
  idx: DataIndex;
  allYears: string[];
  subs: CatDef[];
  residenceCode: string;
  isBg: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const seriesData = useMemo(() => (
    subs.map(sub => ({
      code: sub.code,
      label: isBg ? sub.bg : sub.en,
      color: sub.color,
      unit: sub.unit,
      values: allYears.map(yr => idx.get(sub.code)?.get(residenceCode)?.get(yr) ?? null),
    })).filter(s => s.values.some(v => v != null))
  ), [idx, allYears, subs, residenceCode, isBg]);

  useEffect(() => {
    if (!chartRef.current || allYears.length === 0 || seriesData.length === 0) return;
    const chart = echarts.init(chartRef.current);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const total = params.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
          let tip = `<div style="font-weight:600;margin-bottom:4px;color:#0f172a">${params[0].axisValue}</div>`;
          [...params]
            .filter((p: any) => p.value != null && p.value > 0)
            .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
            .forEach((p: any) => {
              const s = seriesData.find(s => s.label === p.seriesName);
              const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '—';
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:600;margin-left:8px">${Number(p.value).toFixed(2)} ${s?.unit ?? 'kg'} (${pct}%)</span>
              </div>`;
            });
          if (total > 0) {
            tip += `<div style="margin-top:4px;padding-top:4px;border-top:1px solid #e2e8f0;font-weight:600">
              Total: ${total.toFixed(2)} ${seriesData[0]?.unit ?? 'kg'}
            </div>`;
          }
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
      grid: { left: '1%', right: '3%', bottom: '20%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allYears,
        axisLabel: { fontSize: 11, color: '#94a3b8', rotate: 30 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        min: 0,
      },
      series: seriesData.map(s => ({
        name: s.label,
        type: 'line' as const,
        stack: 'total',
        data: s.values,
        itemStyle: { color: s.color },
        lineStyle: { width: 1, color: s.color },
        smooth: false,
        symbol: 'none',
        connectNulls: true,
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: s.color + 'cc' },
              { offset: 1, color: s.color + '66' },
            ],
          },
        },
        emphasis: { focus: 'series' as const },
      })),
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [allYears, seriesData]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

function LatestYearBreakdown({
  idx, subs, residenceCode, latestYear, isBg,
}: {
  idx: DataIndex;
  subs: CatDef[];
  residenceCode: string;
  latestYear: string;
  isBg: boolean;
}) {
  const rows = useMemo(() => {
    const items = subs.map(sub => ({
      label: isBg ? sub.bg : sub.en,
      unit: sub.unit,
      color: sub.color,
      value: idx.get(sub.code)?.get(residenceCode)?.get(latestYear) ?? null,
    })).filter(r => r.value != null);
    const total = items.reduce((s, r) => s + (r.value ?? 0), 0);
    return items
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      .map(r => ({ ...r, pct: total > 0 ? ((r.value ?? 0) / total) * 100 : 0 }));
  }, [idx, subs, residenceCode, latestYear, isBg]);

  if (rows.length === 0) return null;

  return (
    <div className="mt-5">
      <p className="text-xs font-medium text-slate-500 mb-2">
        {isBg ? `Разпределение за ${latestYear}:` : `Breakdown for ${latestYear}:`}
      </p>
      <div className="space-y-1.5">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-2">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: r.color, display: 'inline-block', flexShrink: 0 }} />
            <span className="text-xs text-slate-600 w-40 truncate">{r.label}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(r.pct, 100)}%`, background: r.color }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-700 w-14 text-right">
              {fmtVal(r.value)} <span className="text-slate-400 font-normal">{r.unit}</span>
            </span>
            <span className="text-[11px] text-slate-400 w-10 text-right">{r.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
