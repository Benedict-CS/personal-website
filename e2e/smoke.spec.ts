import { test, expect } from "@playwright/test";

test.describe("Public endpoint smoke checks", () => {
  test("home page returns 200 and contains html", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBe(true);
    const html = await res.text();
    expect(html.toLowerCase()).toContain("<html");
  });

  test("contact page returns 200 and contains form keyword", async ({ request }) => {
    const res = await request.get("/contact");
    expect(res.ok()).toBe(true);
    const html = await res.text();
    expect(html.toLowerCase()).toContain("contact");
  });

  test("blog page returns 200", async ({ request }) => {
    const res = await request.get("/blog");
    expect(res.ok()).toBe(true);
  });

});

test.describe("Auth and API", () => {
  test("dashboard redirects to signin when not logged in", async ({ request }) => {
    const res = await request.get("/dashboard", { maxRedirects: 0 });
    expect([302, 307]).toContain(res.status());
  });

<<<<<<< Current (Your changes)
<<<<<<< Current (Your changes)
  test("editor redirects to signin when not logged in", async ({ page }) => {
    await page.goto("/editor/home");
    await expect(page).toHaveURL(/\/auth\/signin/);
=======
  test("legacy dashboard content editors remain protected", async ({ request }) => {
    const homeRes = await request.get("/dashboard/content/home", { maxRedirects: 0 });
    const aboutRes = await request.get("/dashboard/content/about", { maxRedirects: 0 });
    const contactRes = await request.get("/dashboard/content/contact", { maxRedirects: 0 });
    expect([302, 307]).toContain(homeRes.status());
    expect([302, 307]).toContain(aboutRes.status());
    expect([302, 307]).toContain(contactRes.status());
>>>>>>> Incoming (Background Agent changes)
=======
  test("editor redirects to signin when not logged in", async ({ request }) => {
    const res = await request.get("/editor/home", { maxRedirects: 0 });
    expect([302, 307]).toContain(res.status());
>>>>>>> Incoming (Background Agent changes)
  });

  test("health API returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, db: "ok" });
  });
});

test.describe("Immersive editor", () => {
  test("loads frontend canvas with floating toolbar when authenticated", async ({ page }) => {
    const password = process.env.ADMIN_PASSWORD;
    test.skip(!password, "ADMIN_PASSWORD is required for authenticated editor flow.");

    await page.goto("/auth/signin");
    await page.getByPlaceholder("Enter password").fill(password as string);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/dashboard/);

    await page.goto("/editor/home");
    await expect(page.getByText("Immersive Editor")).toBeVisible();
    await expect(page.locator("main h1").first()).toBeVisible();
  });
});
