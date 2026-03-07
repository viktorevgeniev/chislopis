# /test-dashboards

Test one or more dashboards for data problems, broken filters, and visual anomalies using the Playwright browser.

## Usage
```
/test-dashboards                         # test all critical pages
/test-dashboards demographics            # test a category
/test-dashboards deaths-by-weeks         # test a specific dataset by ID
/test-dashboards vital-statistics marriages divorces  # test multiple
```

## Instructions

You are performing interactive dashboard testing on the running Next.js app.

**Before starting:**
1. Check if a server is running at http://localhost:3000. If not, ask the user to run `npm run dev` or `npm start` (after `npm run build`) in a terminal.
2. Parse the argument(s) to determine scope:
   - No args or "all" → test all subcategory pages from the list below
   - Category name (e.g. "demographics") → test pages in that category
   - Dataset ID (e.g. "deaths-by-weeks") → navigate to its subcategory page and focus on that card
   - Subcategory name (e.g. "vital-statistics") → test that subcategory page

**For each page to test, perform these steps in order:**

### Step 1: Navigate and wait for load
- Navigate to the page URL (e.g. `/en/category/demographics/vital-statistics`)
- Wait until `.animate-spin` elements are gone (all data has loaded or failed)
- Take a screenshot to capture the initial state

### Step 2: Check for error states
Scan the page for:
- Text "No data available" → **FAIL**: note which `data-testid` ancestor wraps it (e.g. `dataset-deaths-by-weeks`)
- Text "Error loading data" → **FAIL**: note which dataset and the error message
- Text "Loading data..." still visible → **WARN**: data did not finish loading

### Step 3: Check browser console
Call `browser_console_messages` with level "error". Flag any errors that are:
- Not favicon/extension related
- Not `Failed to load resource` for fonts

### Step 4: Cycle through tabs
Find all `[role="tab"]` elements on the page. For each one:
1. Click it
2. Wait 800ms for ECharts to render
3. Check for "No data available" text

If any tab results in "No data available", that is a **FAIL** for that dataset's filter logic.

### Step 5: Check select filters (if present)
For any `<select>` elements visible, try changing the value to a few different options and check for "No data available" after each change.

### Step 6: Report findings

For each page tested, output a summary like:

```
## /en/category/demographics/vital-statistics

PASS ✓ deaths-by-weeks — all 3 tabs loaded correctly
PASS ✓ marriages — all 3 tabs loaded correctly
FAIL ✗ deaths-by-causes-age — "No data available" on "Regional" tab
WARN ⚠ mortality-by-causes — JS console error: "Cannot read properties of undefined"

Screenshots: [attached]
```

---

## Subcategory page URLs

| Scope | URL |
|-------|-----|
| demographics/population | `/en/category/demographics/population` |
| demographics/vital-statistics | `/en/category/demographics/vital-statistics` |
| labor/employment | `/en/category/employment/employment` |
| labor/employees | `/en/category/employment/employees` |
| labor/unemployment | `/en/category/unemployment/unemployment` |
| labor/labour-force | `/en/category/unemployment/labour-force` |
| labor/wages | `/en/category/unemployment/wages` |
| social/poverty | `/en/category/poverty/poverty` |
| social/income | `/en/category/income-health/income` |
| social/expenditure | `/en/category/poverty/expenditure` |
| social/education | `/en/category/income-health/education` |
| social/healthcare | `/en/category/income-health/healthcare` |
| economy/fdi | `/en/category/economy-sectors/fdi` |
| economy/business | `/en/category/economy-sectors/business` |
| economy/construction | `/en/category/economy-sectors/construction` |
| economy/trade | `/en/category/economy-sectors/trade` |
| economy/tourism | `/en/category/economy-sectors/tourism` |
| economy/culture | `/en/category/economy-sectors/culture` |
| finance/insurance | `/en/category/finance/insurance` |
| finance/pensions | `/en/category/finance/pensions` |
| finance/investments | `/en/category/finance/investments` |
| finance/associations | `/en/category/finance/associations` |

## Dataset → subcategory mapping (for targeted tests)

| Dataset ID | Subcategory page |
|------------|-----------------|
| population-by-districts | demographics/population |
| population-demographics | demographics/population |
| live-births, deaths, deaths-by-causes-age, deaths-by-weeks, marriages, divorces, mortality-by-causes | demographics/vital-statistics |
| employed-by-residence-sex | employment/employment |
| employees-by-residence | employment/employees |
| (all others) | check registry category/subcategory fields |
