import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PostsFilterTabs } from "./posts-filter";
import { PostsSearch } from "./posts-search";
import { PostsTableClient } from "./posts-table-client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Posts" };

type PostsPageProps = {
  searchParams: Promise<{ status?: string; sort?: string; order?: string; q?: string }>;
};

const SORT_KEYS = ["updatedAt", "createdAt", "title"] as const;
const ORDER_KEYS = ["asc", "desc"] as const;

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const { status, sort: sortParam, order: orderParam, q } = await searchParams;
  const statusFilter = status === "published" || status === "draft" ? status : null;
  const search = typeof q === "string" ? q.trim() : "";
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
    ...(statusFilter ? { published: statusFilter === "published" } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const posts = await prisma.post.findMany({
    where,
    include: { tags: true },
    orderBy,
  });

  const serialized = posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    published: p.published,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    tags: p.tags.map((t) => ({ name: t.name, slug: t.slug })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-slate-900">All Posts</h2>
        <div className="flex items-center gap-4">
          <Suspense fallback={<div className="h-9 w-56 rounded bg-slate-100" />}>
            <PostsSearch defaultValue={search} />
          </Suspense>
          <Suspense fallback={<div className="h-8 w-24 rounded bg-slate-100" />}>
            <PostsFilterTabs />
          </Suspense>
          <Link href="/dashboard/posts/new">
            <Button>Create New</Button>
          </Link>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          {search ? (
            <>
              <p className="mb-2 text-slate-600">No posts match your search.</p>
              <p className="mb-6 text-sm text-slate-500">Try a different title or slug, or clear the search.</p>
            </>
          ) : (
            <>
              <p className="mb-2 text-slate-600">No posts yet.</p>
              <p className="mb-6 text-sm text-slate-500">Create your first post to get started.</p>
              <Link href="/dashboard/posts/new">
                <Button>Create New Post</Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <PostsTableClient posts={serialized} sort={sort} order={order} />
      )}
    </div>
  );
}
