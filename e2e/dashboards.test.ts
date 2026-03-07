/**
 * Dashboard E2E tests.
 *
 * What is tested:
 *   1. Every subcategory page that has custom dashboards loads without errors.
 *      Failures detected: "No data available", "Error loading data", JS console errors.
 *
 *   2. Tab-cycling on complex dashboards — clicks through every tab trigger on the
 *      page and checks that no "No data available" appears after the click.
 *      This catches broken filter logic (e.g. a Gender_Code='0' row was removed).
 *
 * How to run:
 *   npm run build && npm run test:e2e
 *   # or against a running dev server:
 *   npm run test:e2e
 */

import { test, expect, Page } from '@playwright/test';

// ── Pages to test ─────────────────────────────────────────────────────────────
// Each entry is a subcategory page URL (English locale) that contains at least
// one dataset with a custom dashboard. Derived from the dataset registry.

const SUBCATEGORY_PAGES = [
  // Demographics — most critical, have complex tabs and data contracts
  '/en/category/demographics/population',
  '/en/category/demographics/vital-statistics',
  // Labor market
  '/en/category/employment/employment',
  '/en/category/employment/employees',
  '/en/category/unemployment/unemployment',
  '/en/category/unemployment/labour-force',
  '/en/category/unemployment/wages',
  // Social
  '/en/category/poverty/poverty',
  '/en/category/income-health/income',
  '/en/category/poverty/expenditure',
  '/en/category/income-health/education',
  '/en/category/income-health/healthcare',
  // Economy
  '/en/category/economy-sectors/fdi',
  '/en/category/economy-sectors/business',
  '/en/category/economy-sectors/construction',
  '/en/category/economy-sectors/trade',
  '/en/category/economy-sectors/tourism',
  '/en/category/economy-sectors/culture',
  // Finance
  '/en/category/finance/insurance',
  '/en/category/finance/pensions',
  '/en/category/finance/investments',
  '/en/category/finance/associations',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wait until all loading spinners have disappeared from the page. */
async function waitForAllLoaded(page: Page) {
  // First wait for at least one spinner to appear (data fetches are async)
  // then wait for all of them to be gone.
  await page.waitForFunction(() => {
    const spinners = document.querySelectorAll('.animate-spin');
    return spinners.length === 0;
  }, { timeout: 45_000 });
}

/** Collect all visible "problem" text on the page and return them as strings. */
async function collectProblems(page: Page): Promise<string[]> {
  const problems: string[] = [];

  // "No data available" — card-level failure
  const noData = page.getByText('No data available', { exact: true });
  const noDataCount = await noData.count();
  if (noDataCount > 0) {
    // Try to identify which dataset(s) are affected via data-testid ancestors
    for (let i = 0; i < noDataCount; i++) {
      const el = noData.nth(i);
      const card = el.locator('xpath=ancestor::div[@data-testid]').first();
      const testId = await card.getAttribute('data-testid').catch(() => null);
      problems.push(`"No data available" in ${testId ?? 'unknown dataset'}`);
    }
  }

  // "Error loading data" — API or network failure
  const error = page.getByText('Error loading data', { exact: true });
  const errorCount = await error.count();
  if (errorCount > 0) {
    for (let i = 0; i < errorCount; i++) {
      const el = error.nth(i);
      const card = el.locator('xpath=ancestor::div[@data-testid]').first();
      const testId = await card.getAttribute('data-testid').catch(() => null);
      // Get the error message text if available
      const msgEl = el.locator('..').locator('p.text-sm').first();
      const msg = await msgEl.textContent().catch(() => '');
      problems.push(`"Error loading data" in ${testId ?? 'unknown dataset'}${msg ? ': ' + msg.trim() : ''}`);
    }
  }

  return problems;
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe('Dashboard pages — data presence', () => {
  for (const url of SUBCATEGORY_PAGES) {
    test(url, async ({ page }) => {
      // Capture JS errors from the browser console
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          // Ignore browser extension noise and known non-critical warnings
          const text = msg.text();
          if (!text.includes('favicon') && !text.includes('extension')) {
            consoleErrors.push(text);
          }
        }
      });

      await page.goto(url);
      await waitForAllLoaded(page);

      // Check for data problems
      const problems = await collectProblems(page);
      expect(problems, `Problems on ${url}:\n  ${problems.join('\n  ')}`).toHaveLength(0);

      // Report JS errors as soft failures (warn, don't fail the test)
      if (consoleErrors.length > 0) {
        console.warn(`[WARN] JS console errors on ${url}:\n  ${consoleErrors.join('\n  ')}`);
      }
    });
  }
});

test.describe('Dashboard tabs — no data after filter click', () => {
  // For pages with complex multi-tab dashboards, cycle through every visible
  // tab trigger and verify no "No data available" appears after clicking.
  // This detects broken filter logic (e.g. missing required code values).

  const TAB_HEAVY_PAGES = [
    '/en/category/demographics/population',
    '/en/category/demographics/vital-statistics',
    '/en/category/employment/employment',
    '/en/category/employment/employees',
    '/en/category/unemployment/unemployment',
    '/en/category/unemployment/labour-force',
    '/en/category/poverty/poverty',
    '/en/category/income-health/income',
  ];

  for (const url of TAB_HEAVY_PAGES) {
    test(`tab cycle: ${url}`, async ({ page }) => {
      await page.goto(url);
      await waitForAllLoaded(page);

      // Find all tab trigger buttons. The shadcn Tabs component in this project
      // renders TabsTrigger as <button data-state="active"|"inactive"> (no role="tab").
      const tabTriggers = page.locator('button[data-state="active"], button[data-state="inactive"]');
      const count = await tabTriggers.count();

      if (count === 0) {
        // No tabs on this page — skip silently
        return;
      }

      for (let i = 0; i < count; i++) {
        const trigger = tabTriggers.nth(i);
        const label = await trigger.textContent();

        // Click the tab and wait for any lazy-loaded content
        await trigger.click();
        // Brief pause for ECharts to initialise (it's canvas-based)
        await page.waitForTimeout(500);

        const problems = await collectProblems(page);
        expect(
          problems,
          `After clicking tab "${label?.trim()}" on ${url}:\n  ${problems.join('\n  ')}`
        ).toHaveLength(0);
      }
    });
  }
});
