import { test, expect } from "@playwright/test";

test.describe("Blog reading layout", () => {
  test("blog index loads and main is visible", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.locator("main")).toBeVisible();
  });

  test("horizontal overflow stays within viewport on blog index", async ({ page }) => {
    await page.goto("/blog");
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
