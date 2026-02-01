# NSI Open Data - Dataset Implementation Checklist

**Total Datasets:** 131
**Implemented:** 1 (with custom visualization)
**Pending:** 130

---

## DEMOGRAPHICS (Population, Births, Deaths, Migration)

| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 97 | 1169 | Population by sex, residence districts and municipalities | Pending |
| 98 | 1942 | **Population by statistical regions, age, place of residence and sex** | **DONE** |

#### Requirements for #98 (ID 1942):
- [x] Basic implementation with 3 visualizations (Pyramid, Trends, Regional)
- [x] **Population Pyramid filters:**
  - [x] Add year filter (dropdown to select year)
  - [x] Add region filter (dropdown to select NUTS region, default: entire country)
- [x] Use English names from Code Lists instead of NUTS codes (e.g., "Severozapaden" instead of "BG31")
| 67 | 1130 | Live births by districts, municipalities and sex | Pending |
| 21 | 1139 | Deaths by districts, municipalities and sex | Pending |
| 20 | 1678 | Deaths by causes, sex and age groups by statistical regions (2015-2019) | Pending |
| 22 | 1893 | Deaths by weeks, age, sex and districts | Pending |
| 71 | 818 | Marriages by statistical regions, districts, municipalities | Pending |
| 27 | 819 | Divorces by statistical regions, districts, municipalities | Pending |
| 79 | 1125 | Mortality by causes, sex, statistical regions and districts (2005-2019) | Pending |

---

## LABOR & EMPLOYMENT

### Activity Rates
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 2 | 1175 | Activity rates by age groups and sex (Quarterly) | Pending |
| 3 | 1214 | Activity rates by age, sex and statistical region (Quarterly) | Pending |
| 4 | 1211 | Activity rates by level of education (Quarterly) | Pending |
| 5 | 1209 | Activity rates by place of residence and sex (Quarterly) | Pending |

### Employment Rates
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 47 | 939 | Employment rates (15-64) by sex, statistical regions and districts (Quarterly) | Pending |
| 48 | 1099 | Employment rates (20-64 years) by sex (Quarterly) | Pending |
| 49 | 1176 | Employment rates by age group and sex (Quarterly) | Pending |
| 50 | 1212 | Employment rates by level of education (Quarterly) | Pending |
| 51 | 1210 | Employment rates by place of residence and sex (Quarterly) | Pending |
| 52 | 1722 | Employment rates by sex and 10-year age groups (Annual) | Pending |
| 53 | 937 | Employment rates by sex, statistical regions and districts (Quarterly) | Pending |

### Employed Persons
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 28 | 922 | Employed persons aged 15-64 by sex, statistical regions and districts (Quarterly) | Pending |
| 29 | 1098 | Employed persons aged 20-64 by sex (Quarterly) | Pending |
| 30 | 1101 | Employed persons by age groups and sex (Quarterly) | Pending |
| 31 | 1135 | Employed persons by economic activity groupings and sex (2003-2007) | Pending |
| 32 | 1133 | Employed persons by economic activity groupings and sex (from 2008) | Pending |
| 33 | 1124 | Employed persons by level of education (Quarterly) | Pending |
| 34 | 1428 | Employed persons by occupational classes and sex (2003-2005) | Pending |
| 35 | 1129 | Employed persons by occupational classes and sex (2006-2010) | Pending |
| 36 | 1127 | Employed persons by occupational classes and sex (from 2011) | Pending |
| 37 | 1108 | Employed persons by place of residence and sex (Quarterly) | Pending |
| 38 | 1123 | Employed persons by professional status and sex (Quarterly) | Pending |
| 39 | 908 | Employed persons by sex, statistical regions and districts (Quarterly) | Pending |

### Employees
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 40 | 1264 | Employees by kind of ownership (Quarterly) | Pending |
| 41 | 1265 | Employees by permanency of job (Quarterly) | Pending |
| 42 | 1260 | Employees by place of residence (Quarterly) | Pending |
| 43 | 1259 | Employees by sex (Quarterly) | Pending |
| 44 | 1263 | Employees by type of contract with the employer (Quarterly) | Pending |
| 45 | 1262 | Employees by type of working time (full/part time) (Quarterly) | Pending |
| 46 | 365 | Employees under labour contract by economic activities (A21) (2008-2024) | Pending |

### Unemployment
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 68 | 1093 | Long-term unemployment rate by sex (Quarterly) | Pending |
| 119 | 1096 | Unemployed persons by age groups and sex (Quarterly) | Pending |
| 120 | 1106 | Unemployed persons by duration of unemployment and sex (Quarterly) | Pending |
| 121 | 1110 | Unemployed persons by previous employment experience (Quarterly) | Pending |
| 122 | 1150 | Unemployed persons by level of education (Quarterly) | Pending |
| 123 | 1117 | Unemployed persons by methods of job search and sex (Quarterly) | Pending |
| 124 | 1119 | Unemployed persons by place of residence and sex (Quarterly) | Pending |
| 125 | 1112 | Unemployed persons by statistical regions and sex (Quarterly) | Pending |
| 126 | 1103 | Unemployment rates by age groups and sex (Quarterly) | Pending |
| 127 | 1166 | Unemployment rates by level of education (Quarterly) | Pending |
| 128 | 1120 | Unemployment rates by place of residence and sex (Quarterly) | Pending |
| 129 | 1720 | Unemployment rates by sex and 10-year age groups (Annual) | Pending |
| 130 | 1011 | Unemployment rates by sex, statistical regions and districts (Annual) | Pending |
| 131 | 1116 | Unemployment rates by statistical regions and sex (Quarterly) | Pending |

### Labour Force
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 63 | 1187 | Labour force by age groups and sex (Quarterly) | Pending |
| 64 | 1190 | Labour force by level of education (Quarterly) | Pending |
| 65 | 385 | Labour force by place of residence and sex (Quarterly) | Pending |
| 66 | 1183 | Labour force by sex and statistical regions (Quarterly) | Pending |

### Persons Not in Labour Force
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 91 | 1161 | Persons not in labour force by age groups and sex (Quarterly) | Pending |
| 92 | 1155 | Persons not in labour force by level of education (Quarterly) | Pending |
| 93 | 1158 | Persons not in labour force by place of residence and sex (Quarterly) | Pending |
| 94 | 1217 | Persons not in labour force by reasons of inactivity (2003-2020) | Pending |
| 95 | 1163 | Persons not in labour force by statistical regions and sex (Quarterly) | Pending |

### Discouraged Persons
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 23 | 1157 | Discouraged persons by age groups and sex (Quarterly) | Pending |
| 24 | 1164 | Discouraged persons by level of education (Quarterly) | Pending |
| 25 | 1153 | Discouraged persons by place of residence and sex (Quarterly) | Pending |

### Wages & Working Hours
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 15 | 612 | Average annual wages and salaries by economic activities (2008-2024) | Pending |
| 16 | 1341 | Average weekly hours per employed person by ownership (Quarterly) | Pending |
| 17 | 1340 | Average weekly hours per employed person by sex (Quarterly) | Pending |

---

## SOCIAL INDICATORS (Income, Poverty, Living Conditions)

### Poverty & Social Exclusion
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 8 | 199 | At-risk-of-poverty rate before social transfers (pensions excluded) | Pending |
| 9 | 202 | At-risk-of-poverty rate before social transfers (pensions included) | Pending |
| 10 | 176 | At-risk-of-poverty rate by age and sex | Pending |
| 11 | 684 | At-risk-of-poverty rate by household type | Pending |
| 12 | 189 | At-risk-of-poverty rate by most frequent activity status | Pending |
| 13 | 212 | At-risk-of-poverty rate of older people | Pending |
| 14 | 169 | At-risk-of-poverty thresholds | Pending |
| 59 | 251 | In-work at-risk-of-poverty rate by age and sex | Pending |
| 60 | 263 | In-work at-risk-of-poverty rate by educational attainment level | Pending |
| 61 | 273 | In-work at-risk-of-poverty rate by full-/part-time work | Pending |
| 62 | 259 | In-work at-risk-of-poverty rate by household type | Pending |
| 83 | 319 | People at risk of poverty or social exclusion by age and sex | Pending |
| 84 | 325 | People at risk of poverty or social exclusion by education (18+) | Pending |
| 85 | 324 | People at risk of poverty or social exclusion by household type | Pending |
| 86 | 320 | People at risk of poverty or social exclusion by activity status (18+) | Pending |

### Material Deprivation
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 72 | 302 | Material deprivation rate by age and sex | Pending |
| 103 | 305 | Severe material deprivation rate by household type | Pending |
| 104 | 304 | Severe material deprivation rate by most frequent activity status | Pending |

### Low Work Intensity Households
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 87 | 307 | People in households with very low work intensity by age and sex (until 2020) | Pending |
| 88 | 315 | People in households with very low work intensity by education (until 2020) | Pending |
| 89 | 312 | People in households with very low work intensity by household type (until 2020) | Pending |
| 90 | 309 | People in households with very low work intensity by activity status (until 2020) | Pending |

### Income & Inequality
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 6 | 242 | Aggregate replacement ratio | Pending |
| 26 | 295 | Distribution of income by deciles (top cut-off point) | Pending |
| 56 | 301 | Gini coefficient | Pending |
| 73 | 296 | Mean and median income by age and sex | Pending |
| 74 | 297 | Mean and median income by household type | Pending |
| 75 | 298 | Mean and median income by most frequent activity status | Pending |
| 100 | 235 | Relative median income ratio | Pending |
| 102 | 300 | S80/S20 income quintile share ratio | Pending |
| 117 | 470 | Total income by source and place of residence | Pending |

### Expenditure & Consumption
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 58 | 428 | Household consumption of main foods and beverages | Pending |
| 77 | 727 | Monetary expenditure by group and place of residence | Pending |
| 78 | 690 | Monetary income by source and place of residence | Pending |
| 116 | 715 | Total expenditure by group and place of residence | Pending |

---

## EDUCATION

| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 19 | 107 | Children in kindergartens by municipalities | Pending |
| 82 | 118 | Pedagogical staff in kindergartens by districts and municipalities | Pending |
| 96 | 1219 | Population aged 15+ by level of education (Quarterly) | Pending |

---

## HEALTHCARE

| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 57 | 1206 | Health establishments by districts and municipalities (2011-2024) | Pending |
| 76 | 1105 | Medical personnel by districts and municipalities (2003-2017) | Pending |

---

## ECONOMY & BUSINESS

### Foreign Direct Investment
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 54 | 860 | FDI in non-financial enterprises by economic activity (NACE Rev.2) | Pending |
| 55 | 629 | FDI in non-financial enterprises by statistical regions and districts | Pending |

### Business Indicators
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 69 | 868 | Main economic indicators by enterprise size and economic activity | Pending |
| 70 | 865 | Main economic indicators by enterprise size and statistical regions | Pending |
| 99 | 1274 | PRODPROM data by product subcategories (CPA classification) | Pending |

### Construction
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 18 | 654 | Building permits issued for construction by districts | Pending |

### Trade
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 101 | 454 | Retail sales premises as of 31.12 (2007-2016) | Pending |

---

## TOURISM

| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 1 | 1363 | Accommodation establishments | Pending |
| 7 | 240 | Arrivals of visitors from abroad to Bulgaria (2008-2020) | Pending |
| 81 | 1227 | Nights spent by foreigners in accommodation (2012-2020) | Pending |
| 118 | 159 | Trips of Bulgarian residents abroad (2008-2020) | Pending |

---

## CULTURE

| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 80 | 844 | Museums - exhibits and visits by districts | Pending |

---

## FINANCE & INSURANCE

### Insurance Companies
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 105 | 873 | Statement of financial position of insurance companies | Pending |
| 106 | 1050 | Statement of profit or loss of insurance companies | Pending |

### Pension Companies & Funds
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 110 | 1200 | Summarized balance sheet of pension companies | Pending |
| 111 | 781 | Summarized balance sheet of supplementary pension insurance funds | Pending |
| 113 | 646 | Summarized income statement of pension companies | Pending |
| 114 | 785 | Summarized income statement of supplementary pension insurance funds | Pending |

### Investment Companies
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 108 | 434 | Summarized balance sheet of investment companies | Pending |
| 112 | 1046 | Summarized income statement of investment companies | Pending |

### Associations & Foundations
| # | NSI ID | Dataset Name | Status |
|---|--------|--------------|--------|
| 107 | 772 | Summarized balance sheet of associations and foundations | Pending |
| 115 | 521 | Summarized profit-loss statement of associations and foundations | Pending |

---

## Legend

- **DONE** = Fully implemented with custom visualization
- **Pending** = Not yet implemented

---

## Global Requirements (Apply to ALL Datasets)

1. **NUTS Codes**: Always display English names from Code Lists instead of raw NUTS codes
   - Example: Show "Severozapaden" instead of "BG31"
   - The multiCsvFetcher already stores both `NUTS` (name) and `NUTS_Code` (code) - use `NUTS` for display

---

## Priority Recommendations

### High Priority (Core Demographics & Economy)
1. Population by sex, residence districts (ID 1169) - Basic population data
2. Live births / Deaths - Vital statistics
3. Employment/Unemployment rates - Key labor metrics
4. GDP / FDI data - Economic indicators

### Medium Priority (Social Indicators)
1. Poverty rates
2. Income distribution (Gini, quintile ratios)
3. Material deprivation

### Lower Priority (Specialized)
1. Tourism statistics
2. Financial statements
3. Historical data (limited date ranges)
