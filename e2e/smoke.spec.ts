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

  test("about page returns 200", async ({ request }) => {
    const res = await request.get("/about");
    expect(res.ok()).toBe(true);
    const html = await res.text();
    expect(html.toLowerCase()).toContain("<html");
  });

  test("not-found returns 404 and html", async ({ request }) => {
    const res = await request.get("/no-such-page-404");
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html.toLowerCase()).toContain("404");
  });

  test("sitemap returns 200", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBe(true);
  });

  test("robots.txt returns 200", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok()).toBe(true);
    const text = await res.text();
    expect(text).toMatch(/sitemap|allow|disallow/i);
  });

  test("feed.xml returns 200 and RSS", async ({ request }) => {
    const res = await request.get("/feed.xml");
    expect(res.ok()).toBe(true);
    const text = await res.text();
    expect(text).toMatch(/<rss|<channel|<item/i);
  });
});

test.describe("Auth and API", () => {
  test("dashboard redirects to signin when not logged in", async ({ request }) => {
    const res = await request.get("/dashboard", { maxRedirects: 0 });
    expect([302, 307]).toContain(res.status());
  });

  test("editor redirects to signin when not logged in", async ({ request }) => {
    const res = await request.get("/editor/home", { maxRedirects: 0 });
    expect([302, 307]).toContain(res.status());
  });

  test("legacy dashboard content editors remain protected", async ({ request }) => {
    const homeRes = await request.get("/dashboard/content/home", { maxRedirects: 0 });
    const aboutRes = await request.get("/dashboard/content/about", { maxRedirects: 0 });
    const contactRes = await request.get("/dashboard/content/contact", { maxRedirects: 0 });
    expect([302, 307]).toContain(homeRes.status());
    expect([302, 307]).toContain(aboutRes.status());
    expect([302, 307]).toContain(contactRes.status());
  });

  test("health API returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, db: "ok" });
  });

  test("site-config API returns 200 and siteName", async ({ request }) => {
    const res = await request.get("/api/site-config");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty("siteName");
    expect(typeof body.siteName).toBe("string");
  });

  test("site-content API GET home returns 200", async ({ request }) => {
    const res = await request.get("/api/site-content?page=home");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body === null || (typeof body === "object" && body !== null)).toBe(true);
  });

  test("site-content API GET invalid page returns 400", async ({ request }) => {
    const res = await request.get("/api/site-content?page=invalid");
    expect(res.status()).toBe(400);
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
