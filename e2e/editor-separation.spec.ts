import { test, expect } from "@playwright/test";

test.describe("Dashboard vs editor separation", () => {
  test("dashboard routes are still auth protected", async ({ request }) => {
    const response = await request.get("/dashboard", { maxRedirects: 0 });
    expect([302, 307]).toContain(response.status());
  });

  test("editor home renders public canvas without dashboard shell", async ({ page }) => {
    await page.goto("/editor/home");
    await expect(page.getByText("Latest Articles")).toBeVisible();
    await expect(page.getByText("Save & Publish")).toHaveCount(0);
    await expect(page.getByText("Menu")).toHaveCount(0);
  });
});
