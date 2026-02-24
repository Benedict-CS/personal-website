import { test, expect } from "@playwright/test";

test.describe("Public pages load", () => {
  test("home page loads and has main content", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Benedict|personal|site/i);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("contact page loads and has form", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: /contact|connect/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /name|email|message/i }).first()).toBeVisible();
  });

  test("blog page loads", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("main")).toBeVisible();
  });
});

test.describe("Auth and API", () => {
  test("dashboard redirects to signin when not logged in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("health API returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, db: "ok" });
  });
});
