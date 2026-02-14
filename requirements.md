# Chislopis - NSI Open Data Visualization Platform

## 1. Overview

Data visualization platform for the Bulgarian National Statistical Institute (NSI) open data. Built with Next.js 15 (App Router), Apache ECharts, PapaParse, and Tailwind CSS.

**Total Datasets:** 131 | **Implemented:** 4 | **Pending:** 127

See `DATASETS_CHECKLIST.md` for implementation status tracking.

---

## 2. Architecture

```
source_data/nsi/{id}/              → Local CSV files (3 per dataset: data, fields, codelists)
lib/data/fetchers/localCsvLoader.ts → Server-side CSV reader (fs.readFileSync + PapaParse)
lib/data/datasetRegistry.ts        → Dataset metadata catalog (all 131 entries)
lib/data/categories.ts             → Category & subcategory definitions
app/api/data/[id]/route.ts         → API endpoint (loads local files, applies code mappings)
components/charts/*Dashboard.tsx   → Custom visualization components per dataset
components/visualization/VisualizationCard.tsx → Routes datasets to correct dashboard
components/charts/ChartContainer.tsx → Generic auto-chart fallback
```

**Data flow:** Local CSV → `localCsvLoader.ts` → API route → Client fetch → Dashboard component

**Routing:** `/{locale}/category/{slug}/{subcategory}` → shows all datasets in that subcategory as `VisualizationCard` components.

---

## 3. Per-Dataset Implementation Steps

For each new dataset:

### Step A: Analyze Source Data
Read the 3 CSVs in `source_data/nsi/{id}/`:
- `*-data.csv` — identify columns, row count, value ranges
- `*-fields.csv` — column metadata (names in BG/EN)
- `*-codelists.csv` — code-to-name mappings

### Step B: Register in `datasetRegistry.ts`
Add entry with:
```ts
{
  id: 'kebab-case-name',
  nsiId: '{id}',
  title: { bg: '...', en: '...' },
  description: { bg: '...', en: '...' },
  category: '{categoryId}',           // Must match categories.ts
  subcategory: '{subcategoryId}',      // Must match categories.ts subcategory id
  format: 'csv',
  urls: { bg: '...', en: '...' },
  localNsiId: '{id}',                  // Points to source_data/nsi/{id}/
  valueColumnName: '{MetricName}',     // e.g. 'Population', 'Rate', 'Amount'
  updateFrequency: 'yearly' | 'quarterly' | 'monthly',
  lastUpdated: '2024-01-15',
  dimensions: [...],
  suggestedChartTypes: [...],
  hasGeographic: true/false,
  hasTimeSeries: true/false,
  customVisualization: '{DashboardName}' // Optional, omit for auto-chart
}
```

### Step C: Extend `localCsvLoader.ts` (if needed)
If the dataset has columns not yet handled by the generic processor (see Section 7), add mapping logic for new column types.

### Step D: Create Custom Dashboard (if needed)
- Create `components/charts/{Name}Dashboard.tsx`
- Add routing in `VisualizationCard.tsx`:
  ```ts
  if (dataset.customVisualization === '{Name}Dashboard') {
    return <{Name}Dashboard data={data} locale={locale} />;
  }
  ```
- Use auto-chart (`ChartContainer`) when a simple line/bar/pie is sufficient.

### Step E: Build & Test
- `npm run build` — no TypeScript errors
- Navigate to subcategory page — verify data loads and charts render

---

## 4. Reusable Dashboard Components

Before creating a new dashboard, check if an existing one fits:

| Dashboard | Reusable For | Accepts Props |
|-----------|-------------|---------------|
| `VitalStatisticsDashboard` | Any dataset with EKATTE + Gender + Year + single value (births, deaths, marriages, divorces) | `data`, `dataset`, `locale` |
| `PopulationByDistrictsDashboard` | Datasets with EKATTE + Residence + Gender + Year + Population | `data`, `locale` |
| `PopulationDashboard` | Datasets with NUTS + Age + Gender + Residence + Year | `data`, `locale` |
| `ChartContainer` (auto) | Any dataset — auto-selects line/bar/pie/table based on dimensions | `data`, `dataset`, `locale` |

### Proposed New Reusable Dashboards

| Dashboard | For | Dimensions |
|-----------|-----|-----------|
| `RateTrendDashboard` | Labor rate datasets (activity, employment, unemployment rates) | GenderID + Age/NUTS + periods + Rate |
| `PersonsByGroupDashboard` | Labor person-count datasets (employed, unemployed, labour force) | GenderID + Age/NUTS/Residence + periods + Count |
| `SocialIndicatorDashboard` | SILC poverty/deprivation datasets | NUTS + GenderID + SILC_Age + periods + Rate |
| `FinancialStatementDashboard` | All finance datasets (insurance, pension, investment) | Indicators + periods + Amount |
| `EconomicActivityDashboard` | FDI, business indicators, wages by NACE | NACE code + periods + Value |

---

## 5. Category-by-Category Dataset Listings

### 5.1 DEMOGRAPHICS (`demographics`)

#### Subcategory: `population`
| # | NSI ID | Dataset Name | Columns | Value Column | Viz Type | Status |
|---|--------|--------------|---------|-------------|----------|--------|
| 97 | 1169 | Population by sex, residence, districts & municipalities | EKATTE, Residence, GenderID, periods | Population | Custom: `PopulationByDistrictsDashboard` | **DONE** |
| 98 | 1942 | Population by statistical regions, age, residence & sex | NUTS, Residence, Age, GenderID, periods | Population | Custom: `PopulationDashboard` | **DONE** |

#### Subcategory: `vital-statistics`
| # | NSI ID | Dataset Name | Columns | Value Column | Viz Type | Status |
|---|--------|--------------|---------|-------------|----------|--------|
| 67 | 1130 | Live births by districts, municipalities & sex | EKATTE, Gender_Child, periods | LiveBirths | Custom: `VitalStatisticsDashboard` | **DONE** |
| 21 | 1139 | Deaths by districts, municipalities & sex | EKATTE, GenderID, periods | Deaths | Custom: `VitalStatisticsDashboard` | **DONE** |
| 20 | 1678 | Deaths by causes, sex & age groups (2015-2019) | NUTS, GenderID, Age, Cause, periods | Deaths | Custom or auto | Pending |
| 22 | 1893 | Deaths by weeks, age, sex & districts | EKATTE, GenderID, Age, Week, periods | Deaths | Custom (weekly timeline) | Pending |
| 71 | 818 | Marriages by statistical regions, districts, municipalities | EKATTE, periods | Marriages | Reuse: `VitalStatisticsDashboard` | Pending |
| 27 | 819 | Divorces by statistical regions, districts, municipalities | EKATTE, periods | Divorces | Reuse: `VitalStatisticsDashboard` | Pending |
| 79 | 1125 | Mortality by causes, sex, regions & districts (2005-2019) | NUTS, GenderID, Cause, periods | Deaths | Custom or auto | Pending |

---

### 5.2 LABOR & EMPLOYMENT (`labor`)

**Common column patterns:**
- Most use `GenderID`, `periods`, `Units`, `ValueColumn`
- Rate datasets → value is a percentage
- Person-count datasets → value is thousands of persons
- Age grouping: `Age10_LFS` (10-year LFS age groups)
- Geographic: `NUTS` (statistical regions)
- Education: `Edu_LFS` (education level)
- Residence: `Residence_LFS` (place of residence)

#### Subcategory: `employment`
Covers Activity Rates, Employment Rates, and Employed Persons.

**Activity Rates:**
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 2 | 1175 | Activity rates by age groups & sex (Q) | GenderID, Age10_LFS, periods | Rate | Pending |
| 3 | 1214 | Activity rates by age, sex & region (Q) | NUTS, GenderID, Age10_LFS, periods | Rate | Pending |
| 4 | 1211 | Activity rates by education level (Q) | Edu_LFS, periods | Rate | Pending |
| 5 | 1209 | Activity rates by residence & sex (Q) | Residence_LFS, GenderID, periods | Rate | Pending |

**Employment Rates:**
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 47 | 939 | Employment rates (15-64) by sex, regions & districts (Q) | NUTS, GenderID, periods | Rate | Pending |
| 48 | 1099 | Employment rates (20-64) by sex (Q) | GenderID, periods | Rate | Pending |
| 49 | 1176 | Employment rates by age group & sex (Q) | GenderID, Age10_LFS, periods | Rate | Pending |
| 50 | 1212 | Employment rates by education level (Q) | Edu_LFS, periods | Rate | Pending |
| 51 | 1210 | Employment rates by residence & sex (Q) | Residence_LFS, GenderID, periods | Rate | Pending |
| 52 | 1722 | Employment rates by sex & 10-year age groups (A) | GenderID, Age10_LFS, periods | Rate | Pending |
| 53 | 937 | Employment rates by sex, regions & districts (Q) | NUTS, GenderID, periods | Rate | Pending |

**Employed Persons:**
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 28 | 922 | Employed persons (15-64) by sex, regions & districts (Q) | NUTS, GenderID, periods | Persons | Pending |
| 29 | 1098 | Employed persons (20-64) by sex (Q) | GenderID, periods | Persons | Pending |
| 30 | 1101 | Employed persons by age groups & sex (Q) | GenderID, Age10_LFS, periods | Persons | Pending |
| 31 | 1135 | Employed by economic activity & sex (2003-2007) | NACE_LFS, GenderID, periods | Persons | Pending |
| 32 | 1133 | Employed by economic activity & sex (from 2008) | NACE_LFS, GenderID, periods | Persons | Pending |
| 33 | 1124 | Employed persons by education level (Q) | Edu_LFS, periods | Persons | Pending |
| 34 | 1428 | Employed by occupational classes & sex (2003-2005) | Occup_LFS, GenderID, periods | Persons | Pending |
| 35 | 1129 | Employed by occupational classes & sex (2006-2010) | Occup_LFS, GenderID, periods | Persons | Pending |
| 36 | 1127 | Employed by occupational classes & sex (from 2011) | Occup_LFS, GenderID, periods | Persons | Pending |
| 37 | 1108 | Employed persons by residence & sex (Q) | Residence_LFS, GenderID, periods | Persons | Pending |
| 38 | 1123 | Employed by professional status & sex (Q) | ProfStatus_LFS, GenderID, periods | Persons | Pending |
| 39 | 908 | Employed persons by sex, regions & districts (Q) | NUTS, GenderID, periods | Persons | Pending |

**Recommended:** Create `RateTrendDashboard` for rate datasets (line chart over time with gender/age/region filters). Create `PersonsByGroupDashboard` for person-count datasets (bar + line with same filters). Both can be reused across all ~23 employment-related datasets.

#### Subcategory: `employees`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 40 | 1264 | Employees by kind of ownership (Q) | Ownership_LFS, periods | Persons | Pending |
| 41 | 1265 | Employees by permanency of job (Q) | Permanency_LFS, periods | Persons | Pending |
| 42 | 1260 | Employees by place of residence (Q) | Residence_LFS, periods | Persons | Pending |
| 43 | 1259 | Employees by sex (Q) | GenderID, periods | Persons | Pending |
| 44 | 1263 | Employees by type of contract (Q) | Contract_LFS, periods | Persons | Pending |
| 45 | 1262 | Employees by working time (full/part) (Q) | WorkTime_LFS, periods | Persons | Pending |
| 46 | 365 | Employees under labour contract by economic activities (2008-2024) | NACE2008A21, Ownership, periods | Persons | Pending |

**Recommended:** Auto-chart or lightweight `PersonsByGroupDashboard` — most have only 1 categorical dimension + time.

#### Subcategory: `unemployment`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 68 | 1093 | Long-term unemployment rate by sex (Q) | GenderID, periods | Rate | Pending |
| 119 | 1096 | Unemployed persons by age groups & sex (Q) | GenderID, Age10_LFS, periods | Persons | Pending |
| 120 | 1106 | Unemployed by duration & sex (Q) | Duration_LFS, GenderID, periods | Persons | Pending |
| 121 | 1110 | Unemployed by previous experience (Q) | Experience_LFS, periods | Persons | Pending |
| 122 | 1150 | Unemployed by education level (Q) | Edu_LFS, periods | Persons | Pending |
| 123 | 1117 | Unemployed by job search methods & sex (Q) | Method_LFS, GenderID, periods | Persons | Pending |
| 124 | 1119 | Unemployed by residence & sex (Q) | Residence_LFS, GenderID, periods | Persons | Pending |
| 125 | 1112 | Unemployed by regions & sex (Q) | NUTS, GenderID, periods | Persons | Pending |
| 126 | 1103 | Unemployment rates by age groups & sex (Q) | GenderID, Age10_LFS, periods | Rate | Pending |
| 127 | 1166 | Unemployment rates by education level (Q) | Edu_LFS, periods | Rate | Pending |
| 128 | 1120 | Unemployment rates by residence & sex (Q) | Residence_LFS, GenderID, periods | Rate | Pending |
| 129 | 1720 | Unemployment rates by sex & 10-year age groups (A) | GenderID, Age10_LFS, periods | Rate | Pending |
| 130 | 1011 | Unemployment rates by sex, regions & districts (A) | NUTS, GenderID, periods | Rate | Pending |
| 131 | 1116 | Unemployment rates by regions & sex (Q) | NUTS, GenderID, periods | Rate | Pending |

**Recommended:** Reuse `RateTrendDashboard` for rate datasets, `PersonsByGroupDashboard` for person counts.

#### Subcategory: `labour-force`
Covers Labour Force, Persons Not in Labour Force, and Discouraged Persons.

**Labour Force:**
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 63 | 1187 | Labour force by age groups & sex (Q) | GenderID, Age10_LFS, periods | Persons | Pending |
| 64 | 1190 | Labour force by education level (Q) | Edu_LFS, periods | Persons | Pending |
| 65 | 385 | Labour force by residence & sex (Q) | Residence_LFS, GenderID, periods | Persons | Pending |
| 66 | 1183 | Labour force by sex & regions (Q) | NUTS, GenderID, periods | Persons | Pending |

**Persons Not in Labour Force:**
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 91 | 1161 | Not in labour force by age groups & sex (Q) | GenderID, Age10_LFS, periods | Persons | Pending |
| 92 | 1155 | Not in labour force by education level (Q) | Edu_LFS, periods | Persons | Pending |
| 93 | 1158 | Not in labour force by residence & sex (Q) | Residence_LFS, GenderID, periods | Persons | Pending |
| 94 | 1217 | Not in labour force by reasons (2003-2020) | Reason_LFS, periods | Persons | Pending |
| 95 | 1163 | Not in labour force by regions & sex (Q) | NUTS, GenderID, periods | Persons | Pending |

**Discouraged Persons:**
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 23 | 1157 | Discouraged persons by age groups & sex (Q) | GenderID, Age10_LFS, periods | Persons | Pending |
| 24 | 1164 | Discouraged persons by education level (Q) | Edu_LFS, periods | Persons | Pending |
| 25 | 1153 | Discouraged persons by residence & sex (Q) | Residence_LFS, GenderID, periods | Persons | Pending |

**Recommended:** All reuse `PersonsByGroupDashboard`.

#### Subcategory: `wages`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 15 | 612 | Average annual wages by economic activities (2008-2024) | NACE2008A21, Ownership, periods | Amount (BGN) | Pending |
| 16 | 1341 | Avg weekly hours by ownership (Q) | Ownership_LFS, periods | Hours | Pending |
| 17 | 1340 | Avg weekly hours by sex (Q) | GenderID, periods | Hours | Pending |

**Recommended:** Create `EconomicActivityDashboard` for wages by NACE. Auto-chart for simple hours datasets.

---

### 5.3 SOCIAL INDICATORS (`social`)

**Common column patterns:**
- SILC datasets use `SILC_Age`, `SILC_Median` (different from LFS age groups)
- Most have `NUTS` for regional breakdown
- Values are rates (%) or absolute amounts

#### Subcategory: `poverty`
Covers Poverty & Social Exclusion, Material Deprivation, and Low Work Intensity.

**At-Risk-of-Poverty:**
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 8 | 199 | At-risk-of-poverty rate before social transfers (pensions excluded) | NUTS, periods | Rate | Pending |
| 9 | 202 | At-risk-of-poverty rate before social transfers (pensions included) | NUTS, periods | Rate | Pending |
| 10 | 176 | At-risk-of-poverty rate by age & sex | NUTS, SILC_Median, GenderID, SILC_Age, periods | Rate | Pending |
| 11 | 684 | At-risk-of-poverty rate by household type | NUTS, HouseholdType, periods | Rate | Pending |
| 12 | 189 | At-risk-of-poverty rate by activity status | NUTS, ActivityStatus, periods | Rate | Pending |
| 13 | 212 | At-risk-of-poverty rate of older people | NUTS, GenderID, periods | Rate | Pending |
| 14 | 169 | At-risk-of-poverty thresholds | NUTS, HouseholdSize, periods | Threshold (BGN) | Pending |

**In-Work Poverty:**
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 59 | 251 | In-work at-risk-of-poverty rate by age & sex | GenderID, SILC_Age, periods | Rate | Pending |
| 60 | 263 | In-work poverty rate by education level | Edu_SILC, periods | Rate | Pending |
| 61 | 273 | In-work poverty rate by full-/part-time work | WorkTime_SILC, periods | Rate | Pending |
| 62 | 259 | In-work poverty rate by household type | HouseholdType, periods | Rate | Pending |

**People at Risk:**
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 83 | 319 | People at risk of poverty/exclusion by age & sex | GenderID, SILC_Age, periods | Rate/Count | Pending |
| 84 | 325 | People at risk by education (18+) | Edu_SILC, periods | Rate/Count | Pending |
| 85 | 324 | People at risk by household type | HouseholdType, periods | Rate/Count | Pending |
| 86 | 320 | People at risk by activity status (18+) | ActivityStatus, periods | Rate/Count | Pending |

**Material Deprivation:**
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 72 | 302 | Material deprivation rate by age & sex | NUTS, GenderID, SILC_Age, periods | Rate | Pending |
| 103 | 305 | Severe material deprivation by household type | HouseholdType, periods | Rate | Pending |
| 104 | 304 | Severe material deprivation by activity status | ActivityStatus, periods | Rate | Pending |

**Low Work Intensity:**
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 87 | 307 | Low work intensity households by age & sex (until 2020) | GenderID, SILC_Age, periods | Rate | Pending |
| 88 | 315 | Low work intensity by education (until 2020) | Edu_SILC, periods | Rate | Pending |
| 89 | 312 | Low work intensity by household type (until 2020) | HouseholdType, periods | Rate | Pending |
| 90 | 309 | Low work intensity by activity status (until 2020) | ActivityStatus, periods | Rate | Pending |

**Recommended:** Create `SocialIndicatorDashboard` — line chart of rate over time with NUTS region filter, gender filter, age filter. Reusable for all ~24 poverty/deprivation datasets.

#### Subcategory: `income`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 6 | 242 | Aggregate replacement ratio | NUTS, GenderID, periods | Ratio | Pending |
| 26 | 295 | Distribution of income by deciles | NUTS, Decile, periods | Amount | Pending |
| 56 | 301 | Gini coefficient | NUTS, periods | Coefficient | Pending |
| 73 | 296 | Mean & median income by age & sex | GenderID, SILC_Age, periods | Amount | Pending |
| 74 | 297 | Mean & median income by household type | HouseholdType, periods | Amount | Pending |
| 75 | 298 | Mean & median income by activity status | ActivityStatus, periods | Amount | Pending |
| 100 | 235 | Relative median income ratio | NUTS, GenderID, periods | Ratio | Pending |
| 102 | 300 | S80/S20 income quintile share ratio | NUTS, periods | Ratio | Pending |
| 117 | 470 | Total income by source & residence | IncomeSource, Residence, periods | Amount | Pending |

**Recommended:** Reuse `SocialIndicatorDashboard` for rate/ratio datasets. Auto-chart for simple ones like Gini (single line).

#### Subcategory: `expenditure`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 58 | 428 | Household consumption of foods & beverages | HBS_POTR, Residence, periods | Amount | Pending |
| 77 | 727 | Monetary expenditure by group & residence | ExpGroup, Residence, periods | Amount | Pending |
| 78 | 690 | Monetary income by source & residence | IncomeSource, Residence, periods | Amount | Pending |
| 116 | 715 | Total expenditure by group & residence | ExpGroup, Residence, periods | Amount | Pending |

**Recommended:** Auto-chart with stacked bar (expenditure groups) + line trend. Custom column: `HBS_POTR` needs codelist mapping in `localCsvLoader.ts`.

#### Subcategory: `education`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 19 | 107 | Children in kindergartens by municipalities | EKATTE, Edu_schYear | Count | Pending |
| 82 | 118 | Pedagogical staff in kindergartens | EKATTE, Edu_schYear | Count | Pending |
| 96 | 1219 | Population 15+ by education level (Q) | Edu_LFS, periods | Persons | Pending |

**Note:** Datasets 107 and 118 use `Edu_schYear` (school year format "YYYY/YYYY") instead of standard `periods`. Needs handling in `localCsvLoader.ts`.

#### Subcategory: `healthcare`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 57 | 1206 | Health establishments by districts (2011-2024) | EKATTE_Hlth, HlthEst_2011_2013, HlthEst_measures, periods | Count/Beds | Pending |
| 76 | 1105 | Medical personnel by districts (2003-2017) | EKATTE, MedPersonnel, periods | Count | Pending |

**Note:** Dataset 1206 has dual measures (`Est` = establishments, `Beds` = bed count) via `HlthEst_measures`. Uses `EKATTE_Hlth` instead of standard `EKATTE`. Needs custom column handling.

---

### 5.4 ECONOMY & BUSINESS (`economy`)

**Common column patterns:**
- NACE classifications: `NACE2008A21` (21 sectors) or `NACE2008A38` (38 sectors)
- `Indicators` field with hierarchical codes (e.g., `3.1.1.6.1`)
- Units may be currency (BGN, EUR, 1000EUR)

#### Subcategory: `gdp`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| — | (existing) | GDP by Districts | region, year | GDP | Pending (registry only) |

#### Subcategory: `fdi`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 54 | 860 | FDI in non-financial enterprises by economic activity | Indicators, NACE2008A38, periods | Amount (1000EUR) | Pending |
| 55 | 629 | FDI by statistical regions & districts | NUTS, Indicators, periods | Amount (1000EUR) | Pending |

**Recommended:** Create `EconomicActivityDashboard` with NACE sector breakdown bar chart + trend line.

#### Subcategory: `business`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 69 | 868 | Main indicators by enterprise size & activity | NACE2008A21, SZCLS_EMPL, Indicators, periods | Mixed (num, 1000BGN) | Pending |
| 70 | 865 | Main indicators by enterprise size & regions | NUTS, SZCLS_EMPL, Indicators, periods | Mixed | Pending |
| 99 | 1274 | PRODPROM by product subcategories (CPA) | CPA_class, periods | Amount | Pending |

**Note:** Datasets 868/865 have multiple indicators per record with mixed units. Needs indicator-level filtering. `SZCLS_EMPL` = enterprise size class.

#### Subcategory: `construction`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 18 | 654 | Building permits by districts | District_Projection, BUILD_Permit, BUILD_Permit1, periods, periods_name | Count | Pending |

**Note:** Has duplicate building type columns (`BUILD_Permit` and `BUILD_Permit1`), quarterly periods with `periods_name` for human-readable labels. `District_Projection` instead of EKATTE.

#### Subcategory: `trade`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 101 | 454 | Retail sales premises (2007-2016) | EKATTE, TradeType, periods | Count | Pending |

---

### 5.5 SECTORAL STATISTICS (`sectoral`)

#### Subcategory: `tourism`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 1 | 1363 | Accommodation establishments | NUTS, Indicators, periods | Count/Nights | Pending |
| 7 | 240 | Arrivals of visitors from abroad (2008-2020) | Country/Region, periods | Visitors | Pending |
| 81 | 1227 | Nights spent by foreigners (2012-2020) | NUTS, Country, periods | Nights | Pending |
| 118 | 159 | Trips of Bulgarian residents abroad (2008-2020) | Country/Region, periods | Trips | Pending |

**Recommended:** Auto-chart (line + bar) should work. Tourism datasets use `Indicators` with hierarchical codes.

#### Subcategory: `culture`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 80 | 844 | Museums - exhibits & visits by districts | NUTS, Muz_Measure, periods | Count | Pending |

**Note:** `Muz_Measure` has specific museum metric codes. Auto-chart should work.

---

### 5.6 FINANCE & INSURANCE (`finance`)

**Common pattern:** All finance datasets share identical structure: `Indicators + periods + ValueColumn`. No geographic or demographic breakdowns. National-level aggregates with indicator-based detail.

#### Subcategory: `budget`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| — | (existing) | Consolidated Budget | type, quarter | Amount | Pending (registry only) |

#### Subcategory: `insurance`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 105 | 873 | Financial position of insurance companies | Indicators, periods | Amount (1000BGN) | Pending |
| 106 | 1050 | Profit or loss of insurance companies | Indicators, periods | Amount (1000BGN) | Pending |

#### Subcategory: `pensions`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 110 | 1200 | Balance sheet of pension companies | Indicators, periods | Amount (1000BGN) | Pending |
| 111 | 781 | Balance sheet of supplementary pension funds | Indicators, periods | Amount (1000BGN) | Pending |
| 113 | 646 | Income statement of pension companies | Indicators, periods | Amount (1000BGN) | Pending |
| 114 | 785 | Income statement of supplementary pension funds | Indicators, periods | Amount (1000BGN) | Pending |

#### Subcategory: `investments`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 108 | 434 | Balance sheet of investment companies | Indicators, periods | Amount (1000BGN) | Pending |
| 112 | 1046 | Income statement of investment companies | Indicators, periods | Amount (1000BGN) | Pending |

#### Subcategory: `associations`
| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| 107 | 772 | Balance sheet of associations & foundations | Indicators, periods | Amount (1000BGN) | Pending |
| 115 | 521 | Profit-loss of associations & foundations | Indicators, periods | Amount (1000BGN) | Pending |

**Recommended:** Create single `FinancialStatementDashboard` reusable for all 10 finance datasets. Shows indicator hierarchy as tree/grouped bar chart with time trend.

---

### 5.7 REGIONAL STATISTICS (`regional`)

No subcategories (flat). Only 1 dataset currently registered:

| # | NSI ID | Dataset Name | Columns | Value Column | Status |
|---|--------|--------------|---------|-------------|--------|
| — | (existing) | Regional Development Index | region, year | Index | Pending (registry only) |

---

## 6. Global Requirements

1. **NUTS/EKATTE Codes:** Always display English names from Code Lists instead of raw codes (e.g., "Severozapaden" not "BG31", "Burgas" not "BGS").
2. **Locale Support:** All UI text supports bg/en via next-intl.
3. **Responsive Charts:** Use ResizeObserver for chart resizing.
4. **No External Fetches:** All data loads from local `source_data/nsi/` folder via `fs.readFileSync`.
5. **Total Handling:** Filter out pre-aggregated totals (code `0`, `BG`) when summing constituent parts to prevent double-counting.

---

## 7. Data Column Reference

Columns currently handled by `localCsvLoader.ts`:

| Column | Type | Codes | Mapped To |
|--------|------|-------|-----------|
| `EKATTE` | Geographic | BG, BGS, BG031, etc. | `EKATTE` (name) + `EKATTE_Code` |
| `NUTS` | Geographic | BG, BG31, BG311, etc. | `NUTS` (name) + `NUTS_Code` |
| `GenderID` / `Gender` / `Gender_Child` | Categorical | 0=Total, 1=Male, 2=Female | `Gender` + `Gender_Code` |
| `Residence` | Categorical | 0=Total, 1=Urban, 2=Rural | `Residence` + `Residence_Code` |
| `Age` | Categorical | Age group codes | `Age` + `Age_Code` |
| `periods` | Temporal | Year string | Renamed to `Year` |
| `ValueColumn` | Numeric | Raw value | Renamed to `valueColumnName` from registry |

### Columns NOT YET handled (need `localCsvLoader.ts` extension):

| Column | Found In | Description |
|--------|----------|-------------|
| `Age10_LFS` | Labor datasets | 10-year LFS age groups |
| `Edu_LFS` / `Edu_SILC` | Labor/Social | Education level codes |
| `Residence_LFS` | Labor | Place of residence (LFS variant) |
| `Ownership` / `Ownership_LFS` | Labor/Economy | Public/private ownership |
| `NACE2008A21` / `NACE2008A38` | Economy/Labor | Economic activity classification |
| `SZCLS_EMPL` | Economy | Enterprise size class |
| `Indicators` | Finance/Tourism/Economy | Hierarchical indicator codes |
| `SILC_Age` / `SILC_Median` | Social | SILC survey age/income groups |
| `HBS_POTR` | Social | Household consumption items |
| `HlthEst_measures` | Healthcare | Dual measures (establishments/beds) |
| `Muz_Measure` | Culture | Museum metric types |
| `Edu_schYear` | Education | School year format (YYYY/YYYY) |
| `BUILD_Permit` | Construction | Building permit types |
| `District_Projection` | Construction | Geographic codes (non-EKATTE) |
| `HouseholdType` | Social | Household composition codes |
| `ActivityStatus` | Social | Employment activity status codes |
| `Duration_LFS` | Labor | Unemployment duration codes |
| `ProfStatus_LFS` | Labor | Professional status codes |
| `Occup_LFS` | Labor | Occupational class codes |

**Implementation note:** For each new column type, add a generic mapping block in `processLocalDataset()` that reads the column name, looks up its codelist, and creates `{Column}` (mapped name) + `{Column}_Code` (raw code) pairs.
