/**
 * API route test: GET /api/giscus-config reflects env (no DB).
 */
import { GET } from "@/app/api/giscus-config/route";

const GISCUS_ENV_KEYS = [
  "NEXT_PUBLIC_GISCUS_REPO",
  "GISCUS_REPO",
  "NEXT_PUBLIC_GISCUS_REPO_ID",
  "GISCUS_REPO_ID",
  "NEXT_PUBLIC_GISCUS_CATEGORY",
  "GISCUS_CATEGORY",
  "NEXT_PUBLIC_GISCUS_CATEGORY_ID",
  "GISCUS_CATEGORY_ID",
] as const;

describe("GET /api/giscus-config", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const k of GISCUS_ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of GISCUS_ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("returns enabled false when any required value is missing", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ enabled: false });
  });

  it("returns enabled true and fields when GISCUS_* vars are complete", async () => {
    process.env.GISCUS_REPO = "owner/name";
    process.env.GISCUS_REPO_ID = "repo-id";
    process.env.GISCUS_CATEGORY = "Announcements";
    process.env.GISCUS_CATEGORY_ID = "cat-id";
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      enabled: true,
      repo: "owner/name",
      repoId: "repo-id",
      category: "Announcements",
      categoryId: "cat-id",
    });
  });

  it("prefers NEXT_PUBLIC_GISCUS_* over GISCUS_* when both are set", async () => {
    process.env.GISCUS_REPO = "fallback/repo";
    process.env.NEXT_PUBLIC_GISCUS_REPO = "public/repo";
    process.env.GISCUS_REPO_ID = "1";
    process.env.NEXT_PUBLIC_GISCUS_REPO_ID = "2";
    process.env.GISCUS_CATEGORY = "c1";
    process.env.NEXT_PUBLIC_GISCUS_CATEGORY = "c2";
    process.env.GISCUS_CATEGORY_ID = "d1";
    process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID = "d2";
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      enabled: true,
      repo: "public/repo",
      repoId: "2",
      category: "c2",
      categoryId: "d2",
    });
  });
});
