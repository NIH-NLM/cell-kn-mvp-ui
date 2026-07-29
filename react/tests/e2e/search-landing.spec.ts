import { expect, test } from "@playwright/test";

// Behavior: the search landing redo hides the navy-bar global search on Home
// (the page's own search box is primary there), shows live per-collection
// counts, and lets an example chip fill + open the page's search dropdown.
// Mocks: /arango_api/collection/*/count/ -> { count }, /arango_api/search/ -> one result.

test.describe("search landing redo", () => {
  test.beforeEach(async ({ page }) => {
    // Stats row: one glob covers CS, CL, GS, PUB, CSD count requests.
    await page.route("**/arango_api/collection/*/count/", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 1234 }),
      });
    });

    // Search: only "pericyte" resolves to a result, matching the example chip.
    await page.route("**/arango_api/search/", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        // biome-ignore lint/suspicious/noExplicitAny: mocking request body
        const body = request.postDataJSON?.() as any;
        const term = body?.search_term?.toString()?.toLowerCase?.() ?? "";
        if (term.includes("pericyte")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([{ _id: "CL/0000669", label: "pericyte" }]),
          });
        }
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
  });

  test("navy-bar search is hidden on Home; page search box is primary", async ({ page }) => {
    await page.goto("/");

    // Global title-bar search absent on Home.
    await expect(page.locator(".app-title-bar input")).toHaveCount(0);

    // Page's own search box present.
    const pageSearchInput = page.locator(".main-search-box .search-bar-wrapper input");
    await expect(pageSearchInput).toBeVisible();
  });

  test("live stats row renders formatted counts", async ({ page }) => {
    await page.goto("/");

    const firstStatValue = page.locator(".network-stat-value").first();
    await expect(firstStatValue).toHaveText("1,234", { timeout: 10_000 });
  });

  test("example chip fills the search box and opens the results dropdown", async ({ page }) => {
    await page.goto("/");

    const pericyteChip = page.locator(".example-search-chip", { hasText: "pericyte" });
    await expect(pericyteChip).toBeVisible();
    await pericyteChip.click();

    const pageSearchInput = page.locator(".main-search-box .search-bar-wrapper input");
    await expect(pageSearchInput).toHaveValue("pericyte");

    const dropdown = page.locator(".main-search-box .search-results-dropdown");
    await expect(dropdown).toHaveClass(/show/);

    const firstResult = page.locator(".main-search-box .result-item-row-link").first();
    await expect(firstResult).toBeVisible();
    await expect(firstResult).toContainText("pericyte");
  });

  test("navy-bar search is present on non-Home routes", async ({ page }) => {
    await page.goto("/#/about");

    await expect(page.locator(".app-title-bar input")).toHaveCount(1);
  });
});
