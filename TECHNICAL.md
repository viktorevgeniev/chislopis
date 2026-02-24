# Chislopis - Technical Reference

A data visualization platform for Bulgarian National Statistical Institute (NSI) open data, built with Next.js 15 App Router.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 18, Tailwind CSS 3.4, shadcn/ui-style components |
| Charts | Apache ECharts 5.5 (tree-shaken custom build) |
| Maps | Leaflet + react-leaflet |
| Data parsing | PapaParse |
| i18n | next-intl (Bulgarian / English) |
| Icons | lucide-react |
| Utilities | clsx, tailwind-merge, date-fns |

## Directory Structure

```
chislopis/
├── app/
│   ├── [locale]/                     # i18n routing segment (bg | en)
│   │   ├── layout.tsx                # Root layout: Header + NextIntlClientProvider
│   │   ├── page.tsx                  # Homepage: hero, search bar, category grid
│   │   └── category/
│   │       └── [slug]/
│   │           ├── page.tsx          # Category page: subcategory cards or dataset list
│   │           └── [subcategory]/
│   │               └── page.tsx      # Subcategory page: filtered dataset cards
│   ├── api/
│   │   └── data/
│   │       └── [id]/
│   │           └── route.ts          # GET /api/data/:id?locale=bg|en — dataset API
│   └── globals.css                   # CSS variables, Tailwind base
│
├── components/
│   ├── charts/                       # ~80 dashboard components (one per visualization)
│   │   ├── PopulationDashboard.tsx
│   │   ├── PopulationByDistrictsDashboard.tsx
│   │   ├── VitalStatisticsDashboard.tsx
│   │   ├── BirthsDashboard.tsx
│   │   ├── MortalityDashboard.tsx
│   │   ├── WeeklyMortalityDashboard.tsx
│   │   ├── MarriagesDashboard.tsx
│   │   ├── DivorcesDashboard.tsx
│   │   ├── MortalityRatesDashboard.tsx
│   │   ├── ActivityRates*.tsx         # Activity rate variants (regional, education, residence)
│   │   ├── EmploymentRates*.tsx       # Employment rate variants (~10 dashboards)
│   │   ├── Employed*.tsx              # Employed persons variants (~10 dashboards)
│   │   ├── Employees*.tsx             # Employee variants (~5 dashboards)
│   │   ├── Unemployed*.tsx            # Unemployed variants (~7 dashboards)
│   │   ├── UnemploymentRates*.tsx     # Unemployment rate variants (~6 dashboards)
│   │   ├── LabourForce*.tsx           # Labour force variants (~4 dashboards)
│   │   ├── NotInLF*.tsx               # Not in labour force variants (~5 dashboards)
│   │   └── Discouraged*.tsx           # Discouraged persons variants (~2 dashboards)
│   │
│   ├── layout/
│   │   ├── Header.tsx                # Sticky header with nav, search, language switch
│   │   ├── CategoryNav.tsx           # Homepage category card grid
│   │   └── LanguageSwitch.tsx        # bg/en locale toggle
│   │
│   ├── search/
│   │   ├── DatasetSearch.tsx         # Homepage search with typewriter placeholder
│   │   ├── HeaderSearch.tsx          # Compact header search
│   │   └── useDatasetSearch.ts       # Search hook (filters datasetRegistry)
│   │
│   ├── ui/                           # Reusable UI primitives (shadcn/ui pattern)
│   │   ├── card.tsx                  # Card, CardHeader, CardContent, etc.
│   │   ├── tabs.tsx                  # Tabs, TabsList, TabsTrigger, TabsContent
│   │   ├── select.tsx                # Native select wrapper
│   │   └── label.tsx                 # Form label
│   │
│   └── visualization/
│       └── VisualizationCard.tsx      # Dynamic dashboard loader (maps name → component)
│
├── lib/
│   ├── data/
│   │   ├── categories.ts             # Category & subcategory definitions with i18n
│   │   ├── datasetRegistry.ts        # 130 dataset entries + query helpers
│   │   ├── fetchers/
│   │   │   ├── localCsvLoader.ts     # Loads CSV triplet from disk, applies codelist mappings
│   │   │   ├── multiCsvFetcher.ts    # Remote CSV fetcher + createCodeMappings()
│   │   │   ├── csvFetcher.ts         # Simple single-CSV remote fetcher
│   │   │   ├── jsonStatFetcher.ts    # JSON-stat format fetcher
│   │   │   ├── dataCache.ts          # In-memory server-side cache (1h TTL)
│   │   │   └── mockData.ts           # Mock data generator for dev fallback
│   │   └── transformers/
│   │       └── normalizeData.ts      # Normalizes rows → NormalizedData + auto-detects dimensions
│   │
│   ├── echarts.ts                    # Tree-shaken ECharts (Bar, Line, Pie, Heatmap, Scatter, Treemap)
│   ├── i18n/
│   │   └── request.ts               # next-intl server config
│   └── utils.ts                      # cn() — clsx + tailwind-merge
│
├── messages/
│   ├── bg.json                       # Bulgarian UI translations
│   └── en.json                       # English UI translations
│
├── public/
│   └── data/                         # Pre-built JSON files (generated at build time)
│       └── {nsiId}.json              # One per dataset, ready to serve
│
├── scripts/
│   └── prebuild-data.ts              # CSV → JSON converter, runs before `next build`
│
├── source_data/
│   └── nsi/                          # ~130 dataset directories from NSI
│       └── {nsiId}/                  # e.g., 1169/, 1942/, 1130/
│           ├── *-data.csv            # Raw data rows
│           ├── *-fields.csv          # Column/field definitions
│           └── *-codelists.csv       # Code → human-readable label mappings
│
├── types/
│   └── dataset.ts                    # Core types: Dataset, NormalizedData, CategoryId, etc.
│
├── middleware.ts                      # next-intl locale routing (bg default, en)
├── next.config.ts                     # Next.js config with next-intl plugin
├── tailwind.config.ts                 # Tailwind + CSS variable theme + tailwindcss-animate
├── tsconfig.json                      # TypeScript config (paths: @/* → ./*)
└── package.json
```

## Data Pipeline

### Overview

```
source_data/nsi/{id}/*.csv
        │
        ▼  (build time)
scripts/prebuild-data.ts
        │
        ▼
public/data/{id}.json          ← pre-built, fastest path
        │
        ▼  (runtime)
app/api/data/[id]/route.ts     ← serves JSON with ETag/304
        │
        ▼
VisualizationCard.tsx          ← client fetches /api/data/:id
        │
        ▼
DashboardComponent             ← renders ECharts visualizations
```

### Step by step

1. **Source data** lives in `source_data/nsi/{nsiId}/` as three CSV files per dataset: data, fields, and codelists. These are downloaded from the NSI Open Data portal.

2. **Prebuild** (`npm run prebuild` / `scripts/prebuild-data.ts`): At build time, iterates over all datasets with `localNsiId`, parses CSVs, applies codelist mappings, deduplicates revisions, normalizes, and writes `public/data/{nsiId}.json`.

3. **API route** (`/api/data/[id]`): Serves dataset data with this priority chain:
   - **Pre-built JSON** from `public/data/` (fastest, supports ETag/304)
   - **In-memory cache** (1h TTL via `dataCache.ts`)
   - **Local CSV processing** (runtime parse via `localCsvLoader.ts`)
   - **Remote fetch** (multi-CSV, simple CSV, or JSON-stat)
   - **Mock data** (development fallback)

4. **Client rendering**: `VisualizationCard` fetches `/api/data/:id?locale=X`, then dynamically imports the correct dashboard component based on `dataset.customVisualization`.

### CSV Processing (localCsvLoader.ts)

The loader reads three files and maps coded values to human-readable labels:

**Explicitly handled columns:**
| CSV Column | Output Column(s) | Behavior |
|-----------|------------------|----------|
| `NUTS` | `NUTS`, `NUTS_Code` | Geographic region mapping |
| `EKATTE` | `EKATTE`, `EKATTE_Code` | District/municipality mapping |
| `GenderID` / `Gender` / `Gender_Child` | `Gender`, `Gender_Code` | Gender label mapping |
| `Residence` | `Residence`, `Residence_Code` | Urban/Rural/Total mapping |
| `Age` | `Age`, `Age_Code` | Age group mapping |
| `periods` / `Period` / `Edu_schYear` | `Year` | Time period extraction |
| `ValueColumn` / `Value` | `{valueColumnName}` | Numeric value (configurable name) |
| `RevisionColumn` | `_revision` (internal) | Used for deduplication |
| `Units` | *(skipped)* | Dropped |

**Generic fallback**: Any column not in the above list but present in the codelists CSV is automatically mapped via `codeMappings`. The original code is preserved as `{ColumnName}_Code`.

**Revision dedup**: If `_revision` exists, only the latest revision per dimension combination is kept.

## Dataset Registry

`lib/data/datasetRegistry.ts` contains 130 dataset definitions using the `nsiDataset()` helper:

```typescript
nsiDataset(
  id,           // URL-friendly slug: 'population-by-districts'
  nsiId,        // NSI numeric ID: '1169' (maps to source_data/nsi/1169/)
  titleBg, titleEn,
  descBg, descEn,
  category,     // CategoryId: 'demographics' | 'labor' | 'social' | ...
  subcategory,  // string: 'population', 'employment', 'poverty', ...
  valueColumnName,  // output column name for the numeric value
  opts?: { updateFrequency, hasGeographic, suggestedChartTypes, customVisualization, dimensions }
)
```

**Key fields:**
- `localNsiId` — links to `source_data/nsi/{localNsiId}/` directory
- `customVisualization` — name of the dashboard component (e.g., `'PopulationDashboard'`). Only datasets with this field appear in the UI.
- `valueColumnName` — what to call the numeric value column after processing

**Helper functions** exported from the registry:
- `getDatasetById(id)` — lookup by slug
- `getDatasetsByCategory(categoryId)` — filter by category
- `getDatasetsBySubcategory(categoryId, subcategoryId)` — filter by both
- `getAllDatasets()` — all 130
- `getImplementedDatasets()` — only those with `customVisualization`
- `searchDatasets(query, locale)` — text search on title/description

### Categories & Subcategories

| Category | Subcategories | Dataset Count |
|----------|--------------|---------------|
| demographics | population, vital-statistics | ~9 |
| labor | employment, employees, unemployment, labour-force, wages | ~59 |
| social | poverty, income, expenditure, education, healthcare | ~42 |
| economy | gdp, fdi, business, construction, trade | ~7 |
| sectoral | tourism, culture | ~5 |
| finance | budget, insurance, pensions, investments, associations | ~10 |
| regional | *(no subcategories)* | 0 |

## Routing

The app uses Next.js 15 App Router with `[locale]` segment for i18n:

| Route | Page | Description |
|-------|------|-------------|
| `/{locale}` | `app/[locale]/page.tsx` | Homepage with search + category grid |
| `/{locale}/category/{slug}` | `app/[locale]/category/[slug]/page.tsx` | Category page with subcategory cards |
| `/{locale}/category/{slug}/{sub}` | `app/[locale]/category/[slug]/[subcategory]/page.tsx` | Dataset list for subcategory |
| `/api/data/{id}` | `app/api/data/[id]/route.ts` | Dataset data API |

**Locale routing** is handled by `middleware.ts` using next-intl. Default locale is `bg`. Supported: `bg`, `en`.

## Dashboard Components

All dashboards follow this pattern:

```typescript
// components/charts/SomeDashboard.tsx
'use client';

import echarts from '@/lib/echarts';
import type { EChartsOption } from '@/lib/echarts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';

interface SomeDashboardProps {
  data: any[];           // Processed rows from the API
  dataset?: Dataset;     // Dataset metadata (optional)
  locale?: 'bg' | 'en'; // Current locale
}

export function SomeDashboard({ data, locale = 'en' }: SomeDashboardProps) {
  // 1. useMemo to derive chart data from raw rows
  // 2. useRef + useEffect for ECharts instance lifecycle
  // 3. Tabs for multiple views, Select for dimension filters
  // 4. Card wrappers for layout
}
```

**Registration**: Every dashboard must be added to the `dashboards` record in `components/visualization/VisualizationCard.tsx` using `next/dynamic`:

```typescript
SomeDashboard: dynamic(
  () => import('@/components/charts/SomeDashboard')
    .then(m => ({ default: m.SomeDashboard })),
  { loading: () => <DashboardSkeleton />, ssr: false }
),
```

**ECharts**: Always import from `@/lib/echarts` (not `echarts` directly) to use the tree-shaken build. Available chart types: Bar, Line, Pie, Heatmap, Scatter, Treemap. Available components: Grid, Tooltip, Legend, Title, MarkLine, VisualMap, DataZoom.

## How to Add a New Dataset

1. **Get the data**: Download the CSV triplet from [NSI Open Data](https://www.nsi.bg/opendata/)
2. **Place files**: Create `source_data/nsi/{nsiId}/` with the three CSV files (`*-data.csv`, `*-fields.csv`, `*-codelists.csv`)
3. **Register**: Add a `nsiDataset(...)` entry to `lib/data/datasetRegistry.ts`. Set `customVisualization` to your dashboard name.
4. **Create dashboard**: Add `components/charts/YourDashboard.tsx` following the pattern above
5. **Register in VisualizationCard**: Add a dynamic import entry in `components/visualization/VisualizationCard.tsx`
6. **Build**: Run `npm run build` — the prebuild step automatically generates the JSON file

## Type Definitions

Core types in `types/dataset.ts`:

```typescript
CategoryId = 'demographics' | 'economy' | 'labor' | 'social' | 'regional' | 'sectoral' | 'finance'

Dataset {
  id: string                    // URL slug
  nsiId: string                 // NSI numeric ID
  title: { bg, en }             // Bilingual title
  description: { bg, en }       // Bilingual description
  category: CategoryId
  subcategory: string
  format: 'csv' | 'json-stat'
  urls: { bg, en }              // NSI API URLs
  localNsiId?: string           // Maps to source_data/nsi/{localNsiId}/
  valueColumnName?: string      // Name for the numeric value column
  updateFrequency: 'monthly' | 'quarterly' | 'yearly' | 'daily'
  dimensions: DataDimension[]
  suggestedChartTypes: ChartType[]
  hasGeographic: boolean
  hasTimeSeries: boolean
  customVisualization?: string  // Dashboard component name
}

NormalizedData {
  headers: string[]
  rows: Record<string, any>[]
  metadata: { rowCount, columnCount, dimensions: DataDimension[] }
}

DataDimension {
  name: string
  type: 'categorical' | 'numerical' | 'temporal' | 'geographic'
  cardinality: number
  isKey: boolean
}
```

## i18n

- **Framework**: next-intl with `[locale]` dynamic route segment
- **Locales**: `bg` (default), `en`
- **Translation files**: `messages/bg.json`, `messages/en.json`
- **Server-side**: `getTranslations()` from `next-intl/server`
- **Client-side**: `useTranslations()` from `next-intl`
- **Middleware**: `middleware.ts` handles locale detection and routing
- **Config**: `lib/i18n/request.ts` loads message files dynamically

All dataset titles and descriptions are bilingual (stored in the registry, not in message files).

## Styling

- **Tailwind CSS** with CSS variable-based theming (shadcn/ui pattern)
- **Dark mode**: Configured via `darkMode: ["class"]` in `tailwind.config.ts`
- **Color tokens**: `background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `ring`, plus 5 chart colors
- **UI components**: `components/ui/` contains Card, Tabs, Select, Label (forwardRef pattern with `cn()` utility)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Run prebuild + Next.js build |
| `npm run prebuild` | Convert all local CSVs to JSON (`scripts/prebuild-data.ts`) |
| `npm start` | Start production server |
| `npm run lint` | ESLint |

## Key Files Quick Reference

| Task | File(s) |
|------|---------|
| Add a dataset | `lib/data/datasetRegistry.ts` |
| Add a dashboard | `components/charts/`, `components/visualization/VisualizationCard.tsx` |
| Change CSV processing | `lib/data/fetchers/localCsvLoader.ts` |
| Add codelist column mapping | `lib/data/fetchers/localCsvLoader.ts` (explicit handler or rely on generic) |
| Change data API behavior | `app/api/data/[id]/route.ts` |
| Add a category/subcategory | `lib/data/categories.ts` |
| Add ECharts chart type | `lib/echarts.ts` (import + register) |
| Change translations | `messages/bg.json`, `messages/en.json` |
| Add a locale | `middleware.ts`, `lib/i18n/request.ts`, new `messages/{locale}.json` |
| Modify homepage | `app/[locale]/page.tsx` |
| Modify header/nav | `components/layout/Header.tsx` |
| Change theme colors | `app/globals.css` (CSS variables), `tailwind.config.ts` |
| Modify prebuild | `scripts/prebuild-data.ts` |
| Core types | `types/dataset.ts` |

## Environment Notes

- **Windows**: Use `//F` not `-F` for taskkill flags in Git Bash. `/dev/stdin` doesn't work — use temp files instead.
- **Memory**: Next.js dev server can crash with "Jest worker" errors under memory pressure. Production build+start works fine as an alternative.
- **Node**: Uses `tsx` for running TypeScript scripts directly.
- **Path alias**: `@/*` maps to project root (`./`) via tsconfig paths.
