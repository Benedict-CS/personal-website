import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardEmptyState, DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import { PostsSearch } from "./posts-search";
import { PostsTableClient } from "./posts-table-client";
import { buildCategoryTaxonomy, type CategoryTaxonomyNode } from "@/lib/category-taxonomy";

export const dynamic = "force-dynamic";

export const metadata = { title: "Posts" };

const POSTS_PER_PAGE = 20;

type PostsPageProps = {
  searchParams: Promise<{ status?: string; sort?: string; order?: string; q?: string; page?: string; category?: string }>;
};

const SORT_KEYS = ["updatedAt", "createdAt", "title"] as const;
const ORDER_KEYS = ["asc", "desc"] as const;

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const { status, sort: sortParam, order: orderParam, q, page: pageParam, category: categoryParam } = await searchParams;
  if (status === "draft") {
    redirect("/dashboard/notes");
  }
  const search = typeof q === "string" ? q.trim() : "";
  const categoryFilter = typeof categoryParam === "string" ? categoryParam.trim() : "";
  const page = Math.max(1, parseInt(String(pageParam), 10) || 1);
  const sort = SORT_KEYS.includes(sortParam as (typeof SORT_KEYS)[number])
    ? (sortParam as (typeof SORT_KEYS)[number])
    : "updatedAt";
  const order = ORDER_KEYS.includes(orderParam as (typeof ORDER_KEYS)[number])
    ? (orderParam as (typeof ORDER_KEYS)[number])
    : "desc";

  const orderBy =
    sort === "createdAt"
      ? { createdAt: order }
      : sort === "title"
        ? { title: order }
        : { updatedAt: order };

  const where = {
    published: true,
    ...(categoryFilter ? { category: { startsWith: categoryFilter } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        published: true,
        publishedAt: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        tags: { select: { name: true, slug: true } },
      },
      orderBy,
      take: POSTS_PER_PAGE,
      skip: (page - 1) * POSTS_PER_PAGE,
    }),
    prisma.post.count({ where }),
  ]);
  const categoryBuckets = await prisma.post.groupBy({
    by: ["category"],
    where: {
      published: true,
      category: { not: null },
    },
    _count: { category: true },
    orderBy: { _count: { category: "desc" } },
    take: 200,
  });
  const categoryTaxonomy = buildCategoryTaxonomy(
    categoryBuckets
      .filter((row) => typeof row.category === "string" && row.category.trim().length > 0)
      .map((row) => ({ path: row.category as string, count: row._count.category }))
  );

  const buildCategoryHref = (categorySlug: string) => {
    const params = new URLSearchParams({
      sort,
      order,
      ...(search ? { q: search } : {}),
      category: categorySlug,
      page: "1",
    });
    return `/dashboard/posts?${params.toString()}`;
  };

  const clearCategoryHref = () => {
    const params = new URLSearchParams({
      sort,
      order,
      ...(search ? { q: search } : {}),
      page: "1",
    });
    return `/dashboard/posts?${params.toString()}`;
  };

  const renderTaxonomyNodes = (nodes: CategoryTaxonomyNode[], depth = 0): ReactNode => {
    if (nodes.length === 0) return null;
    return (
      <ul className={depth === 0 ? "space-y-1" : "mt-1 space-y-1"}>
        {nodes.map((node) => (
          <li key={node.slug}>
            <Link
              href={buildCategoryHref(node.slug)}
              className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-[colors,transform] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 ${
                categoryFilter === node.slug
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{node.label}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">{node.count}</span>
            </Link>
            {node.children.length > 0 ? <div className="ml-4">{renderTaxonomyNodes(node.children, depth + 1)}</div> : null}
          </li>
        ))}
      </ul>
    );
  };
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));

  const serialized = posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    category: p.category,
    published: p.published,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    viewCount: p.viewCount,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    tags: p.tags.map((t) => ({ name: t.name, slug: t.slug })),
  }));

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Blog"
        title={`Published posts${total > POSTS_PER_PAGE ? ` (${total} total)` : ""}`}
        description="Live articles visible on the blog. Drafts live under Notes."
      >
        <PostsSearch defaultValue={search} />
        {categoryFilter ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={clearCategoryHref()}>Clear category filter</Link>
          </Button>
        ) : null}
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/posts/operations">Find &amp; replace</Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard/posts/new">Create new</Link>
        </Button>
      </DashboardPageHeader>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Content taxonomy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Browse nested categories as a folder-like tree and scope the table instantly.
          </p>
          {categoryTaxonomy.length > 0 ? (
            renderTaxonomyNodes(categoryTaxonomy)
          ) : (
            <DashboardEmptyState
              illustration="folder"
              title="No categories assigned yet"
              description="Set post categories while editing posts to unlock nested taxonomy navigation."
            />
          )}
        </CardContent>
      </Card>

      {posts.length === 0 ? (
        search ? (
          <DashboardEmptyState
            illustration="magnifier"
            title="No posts match your search."
            description="Try a different title or slug, or clear the search."
          />
        ) : (
          <DashboardEmptyState
            illustration="documents"
            title="No posts yet."
            description="Create your first post to get started."
          >
            <Button asChild>
              <Link href="/dashboard/posts/new">Create new post</Link>
            </Button>
          </DashboardEmptyState>
        )
      ) : (
        <>
          <PostsTableClient posts={serialized} sort={sort} order={order} />
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              {page > 1 ? (
                <Link
                  href={`/dashboard/posts?${new URLSearchParams({
                    sort,
                    order,
                    ...(search && { q: search }),
                    ...(categoryFilter && { category: categoryFilter }),
                    page: String(page - 1),
                  }).toString()}`}
                >
                  <Button variant="outline" size="sm">
                    Previous
                  </Button>
                </Link>
              ) : null}
              <span className="text-sm text-muted-foreground px-2">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/dashboard/posts?${new URLSearchParams({
                    sort,
                    order,
                    ...(search && { q: search }),
                    ...(categoryFilter && { category: categoryFilter }),
                    page: String(page + 1),
                  }).toString()}`}
                >
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </Link>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
