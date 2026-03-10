import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PostsSearch } from "./posts-search";
import { PostsTableClient } from "./posts-table-client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Posts" };

const POSTS_PER_PAGE = 20;

type PostsPageProps = {
  searchParams: Promise<{ status?: string; sort?: string; order?: string; q?: string; page?: string }>;
};

const SORT_KEYS = ["updatedAt", "createdAt", "title"] as const;
const ORDER_KEYS = ["asc", "desc"] as const;

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const { status, sort: sortParam, order: orderParam, q, page: pageParam } = await searchParams;
  if (status === "draft") {
    redirect("/dashboard/notes");
  }
  const search = typeof q === "string" ? q.trim() : "";
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
      include: { tags: true },
      orderBy,
      take: POSTS_PER_PAGE,
      skip: (page - 1) * POSTS_PER_PAGE,
    }),
    prisma.post.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));

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
        <h2 className="text-3xl font-bold text-[var(--foreground)]">Published Posts {total > POSTS_PER_PAGE ? `(${total} total)` : ""}</h2>
        <div className="flex items-center gap-4">
          <PostsSearch defaultValue={search} />
          <Link href="/dashboard/posts/new">
            <Button>Create New</Button>
          </Link>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-card p-12 text-center shadow-[var(--shadow-sm)]">
          {search ? (
            <>
              <p className="mb-2 text-[var(--foreground)]">No posts match your search.</p>
              <p className="mb-6 text-sm text-[var(--muted-foreground)]">Try a different title or slug, or clear the search.</p>
            </>
          ) : (
            <>
              <p className="mb-2 text-[var(--foreground)] font-medium">No posts yet.</p>
              <p className="mb-6 text-sm text-[var(--muted-foreground)]">Create your first post to get started.</p>
              <Link href="/dashboard/posts/new">
                <Button>Create New Post</Button>
              </Link>
            </>
          )}
        </div>
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
                    page: String(page - 1),
                  }).toString()}`}
                >
                  <Button variant="outline" size="sm">
                    Previous
                  </Button>
                </Link>
              ) : null}
              <span className="text-sm text-[var(--muted-foreground)] px-2">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/dashboard/posts?${new URLSearchParams({
                    sort,
                    order,
                    ...(search && { q: search }),
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
