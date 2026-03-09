import { test, expect } from "@playwright/test";

test("SaaS platform APIs are reachable", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);

  const edge = await request.post("/api/infra/edge", {
    data: { host: "localhost", ip: "127.0.0.1" },
  });
  expect([200, 429]).toContain(edge.status());

  const blog = await request.get("/blog");
  expect(blog.ok()).toBe(true);
});

