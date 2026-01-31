import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PostsFilterTabs } from "./posts-filter";

export const dynamic = "force-dynamic";

type PostsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const { status } = await searchParams;
  const statusFilter = status === "published" || status === "draft" ? status : null;

  const posts = await prisma.post.findMany({
    where: statusFilter
      ? { published: statusFilter === "published" }
      : undefined,
    include: {
      tags: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-slate-900">All Posts</h2>
        <div className="flex items-center gap-4">
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
          <p className="text-slate-500">No posts found</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Published Status</TableHead>
                <TableHead>Published Date</TableHead>
                <TableHead>Last Edited</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>
                    {post.published ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                        Draft
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(post.createdAt)}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(post.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/posts/${post.id}`}>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
