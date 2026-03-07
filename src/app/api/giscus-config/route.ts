import { NextResponse } from "next/server";

/**
 * Returns Giscus config from server env so Docker runtime env works.
 * NEXT_PUBLIC_* are baked at build time; this allows runtime env in containers.
 */
export async function GET() {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO ?? process.env.GISCUS_REPO;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID ?? process.env.GISCUS_REPO_ID;
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY ?? process.env.GISCUS_CATEGORY;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ?? process.env.GISCUS_CATEGORY_ID;

  if (!repo || !repoId || !category || !categoryId) {
    return NextResponse.json({ enabled: false });
  }
  return NextResponse.json({
    enabled: true,
    repo,
    repoId,
    category,
    categoryId,
  });
}
