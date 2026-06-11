import { NextResponse } from "next/server";

/**
 * Returns Giscus config from server env so Docker runtime env works.
 * NEXT_PUBLIC_* are baked at build time; this allows runtime env in containers.
 *
 * Response is deterministic per deploy (only depends on env vars), so it is
 * safe to cache publicly. We use a short max-age with a long
 * stale-while-revalidate window so updates after a redeploy propagate quickly
 * while keeping repeat-visit latency low.
 */
export async function GET() {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO ?? process.env.GISCUS_REPO;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID ?? process.env.GISCUS_REPO_ID;
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY ?? process.env.GISCUS_CATEGORY;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ?? process.env.GISCUS_CATEGORY_ID;

  const cacheControl = "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";

  if (!repo || !repoId || !category || !categoryId) {
    return NextResponse.json(
      { enabled: false },
      { headers: { "Cache-Control": cacheControl } },
    );
  }
  return NextResponse.json(
    {
      enabled: true,
      repo,
      repoId,
      category,
      categoryId,
    },
    { headers: { "Cache-Control": cacheControl } },
  );
}
