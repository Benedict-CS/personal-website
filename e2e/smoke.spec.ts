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

  test("blog page returns 200 with blog index chrome", async ({ request }) => {
    const res = await request.get("/blog");
    expect(res.ok()).toBe(true);
    const html = await res.text();
    const lower = html.toLowerCase();
    expect(lower).toContain("<html");
    // Subtitle/tag UI hydrates on the client; meta + RSS row are in the initial HTML.
    expect(lower).toContain("read articles about engineering");
    expect(lower).toMatch(/subscribe via rss/);
    expect(lower).toContain("feed.xml");
  });

  test("blog archive page returns 200 with archive chrome", async ({ request }) => {
    const res = await request.get("/blog/archive");
    expect(res.ok()).toBe(true);
    const html = await res.text();
    const lower = html.toLowerCase();
    expect(lower).toContain("archive");
    expect(lower).toMatch(/back to blog/);
    expect(lower).toMatch(/post(s)? in total|no posts available yet/);
  });

  test("about page returns 200", async ({ request }) => {
    const res = await request.get("/about");
    expect(res.ok()).toBe(true);
    const html = await res.text();
    expect(html.toLowerCase()).toContain("<html");
  });

  test("sign-in page returns 200 with admin sign-in metadata", async ({ request }) => {
    const res = await request.get("/auth/signin");
    expect(res.ok()).toBe(true);
    const html = await res.text();
    const lower = html.toLowerCase();
    expect(lower).toContain("<html");
    // Title comes from server metadata; visible card copy hydrates on the client.
    expect(lower).toContain("admin sign-in");
  });

  test("not-found returns 404 and html", async ({ request }) => {
    const res = await request.get("/no-such-page-404");
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html.toLowerCase()).toContain("404");
  });

  test("sitemap.xml returns urlset with core pages", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toMatch(/xml/i);
    const xml = await res.text();
    expect(xml).toMatch(/urlset/i);
    expect(xml).toMatch(/sitemaps\.org\/schemas\/sitemap/i);
    expect(xml).toMatch(/<loc>/i);
    expect(xml).toMatch(/\/about</);
    expect(xml).toMatch(/\/blog</);
    expect(xml).toMatch(/\/contact</);
  });

  test("robots.txt returns 200 with crawler rules and sitemap line", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"] || "").toMatch(/text\/plain/i);
    const text = await res.text();
    expect(text.toLowerCase()).toContain("user-agent:");
    expect(text).toMatch(/allow:\s*\//i);
    expect(text).toMatch(/disallow:\s*\/dashboard\//i);
    expect(text).toMatch(/disallow:\s*\/api\//i);
    expect(text).toMatch(/sitemap:\s*https?:\/\/.+\/sitemap\.xml/i);
  });

  test("feed.xml returns 200 with XML headers and channel shape", async ({ request }) => {
    const res = await request.get("/feed.xml");
    expect(res.ok()).toBe(true);
    const ct = res.headers()["content-type"] || "";
    expect(ct).toMatch(/xml/i);
    expect(ct.toLowerCase()).toMatch(/utf-8/);
    const cc = res.headers()["cache-control"] || "";
    expect(cc).toMatch(/public|s-maxage/i);
    const text = await res.text();
    expect(text).toMatch(/<\?xml/i);
    expect(text).toMatch(/<rss[\s>]/i);
    expect(text).toMatch(/<channel[\s>]/i);
    expect(text.toLowerCase()).toContain("feed.xml");
    expect(text).toMatch(/rel="self"/i);
    expect(text).toMatch(/<lastBuildDate>/i);
  });

  test("security.txt returns 200 as text/plain with Preferred-Languages", async ({ request }) => {
    const res = await request.get("/.well-known/security.txt");
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toMatch(/text\/plain/i);
    const text = await res.text();
    expect(text).toMatch(/Preferred-Languages:\s*en/i);
  });

  test("security.txt HEAD matches GET status with empty body", async ({ request }) => {
    const headRes = await request.head("/.well-known/security.txt");
    const getRes = await request.get("/.well-known/security.txt");
    expect(headRes.status()).toBe(getRes.status());
    expect(headRes.headers()["content-type"]).toMatch(/text\/plain/i);
    expect(await headRes.text()).toBe("");
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

  test("cv status API returns 401 without session", async ({ request }) => {
    const res = await request.get("/api/cv/status");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Unauthorized" });
  });

  test("export API returns 401 without session", async ({ request }) => {
    const res = await request.get("/api/export");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Unauthorized" });
  });

  test("import API returns 401 without session", async ({ request }) => {
    const res = await request.post("/api/import", {
      data: { posts: [], customPages: [] },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Unauthorized" });
  });

  test("audit API returns 401 without session", async ({ request }) => {
    const res = await request.get("/api/audit");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Unauthorized" });
  });

  test("tags API returns JSON array without session (published tags only)", async ({ request }) => {
    const res = await request.get("/api/tags");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("tags API returns 401 without session when all=1", async ({ request }) => {
    const res = await request.get("/api/tags?all=1");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Unauthorized" });
  });

  test("posts API returns JSON array without session (published only)", async ({ request }) => {
    const res = await request.get("/api/posts");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    for (const item of body) {
      expect(typeof item.slug).toBe("string");
      expect(typeof item.title).toBe("string");
      const pub = item.published === true;
      const scheduled =
        item.publishedAt != null && new Date(String(item.publishedAt)).getTime() <= Date.now();
      expect(pub || scheduled).toBe(true);
    }
  });

  test("health API returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBe(true);
    expect(res.headers()["cache-control"]).toMatch(/no-store/i);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, db: "ok" });
  });

  test("health API HEAD returns same status as GET with empty body", async ({ request }) => {
    const headRes = await request.head("/api/health");
    const getRes = await request.get("/api/health");
    expect(headRes.status()).toBe(getRes.status());
    expect(headRes.headers()["cache-control"]).toMatch(/no-store/i);
    expect(await headRes.text()).toBe("");
  });

  test("v1 health API returns ok with version label", async ({ request }) => {
    const res = await request.get("/api/v1/health");
    expect(res.ok()).toBe(true);
    expect(res.headers()["cache-control"]).toMatch(/no-store/i);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, db: "ok", version: "v1" });
  });

  test("v1 health HEAD returns same status as GET with empty body", async ({ request }) => {
    const headRes = await request.head("/api/v1/health");
    const getRes = await request.get("/api/v1/health");
    expect(headRes.status()).toBe(getRes.status());
    expect(headRes.headers()["cache-control"]).toMatch(/no-store/i);
    const text = await headRes.text();
    expect(text).toBe("");
  });

  test("live API returns process liveness without database", async ({ request }) => {
    const res = await request.get("/api/live");
    expect(res.ok()).toBe(true);
    expect(res.headers()["cache-control"]).toMatch(/no-store/i);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, live: true });
  });

  test("live API HEAD returns same status as GET with empty body", async ({ request }) => {
    const headRes = await request.head("/api/live");
    const getRes = await request.get("/api/live");
    expect(headRes.status()).toBe(getRes.status());
    expect(headRes.headers()["cache-control"]).toMatch(/no-store/i);
    expect(await headRes.text()).toBe("");
  });

  test("site-config API returns 200 and siteName", async ({ request }) => {
    const res = await request.get("/api/site-config");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty("siteName");
    expect(typeof body.siteName).toBe("string");
  });

  test("giscus-config API returns 200 with enabled boolean", async ({ request }) => {
    const res = await request.get("/api/giscus-config");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty("enabled");
    expect(typeof body.enabled).toBe("boolean");
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

  test("search API without query returns empty posts and pages", async ({ request }) => {
    const res = await request.get("/api/search");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toEqual({ posts: [], pages: [] });
  });

  test("search API returns posts and pages arrays for static page match", async ({ request }) => {
    const res = await request.get("/api/search?q=About");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body.posts)).toBe(true);
    expect(Array.isArray(body.pages)).toBe(true);
    const aboutHit = body.pages.some((p: { path?: string }) => p.path === "/about");
    expect(aboutHit).toBe(true);
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
