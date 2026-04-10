import { expect, test } from "@playwright/test";

test.describe("entrypoint smoke", () => {
  test("sign-in page has accessible password field and submit", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible();
    await expect(page.getByLabel("Admin password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("dashboard entrypoint redirects to auth or dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const currentUrl = page.url();
    const onDashboard = /\/dashboard(?:\/analytics)?(?:\?|$)/.test(currentUrl);
    const onAuth = /\/auth\/signin(?:\?|$)/.test(currentUrl);
    expect(onDashboard || onAuth).toBeTruthy();
  });
});
