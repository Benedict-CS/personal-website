import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardExportImport } from "@/components/dashboard-export-import";
import { Layout, BarChart3, Image as ImageIcon, PlusCircle, ExternalLink } from "lucide-react";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DashboardHomePage() {
  let dbSizeBytes: number | null = null;
  try {
    const result = await prisma.$queryRaw<[{ pg_database_size: bigint }]>(
      Prisma.sql`SELECT pg_database_size(current_database()) AS pg_database_size`
    );
    if (result[0]) dbSizeBytes = Number(result[0].pg_database_size);
  } catch {
    // ignore
  }

  const [draftCount, publishedCount, totalPosts, recentPosts, siteRow] = await Promise.all([
    prisma.post.count({ where: { published: false } }),
    prisma.post.count({ where: { published: true } }),
    prisma.post.count(),
    prisma.post.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, slug: true, published: true, updatedAt: true },
    }),
    prisma.siteConfig
      .findUnique({ where: { id: 1 }, select: { setupCompleted: true } })
      .catch(() => null),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "";
  const setupCompleted = (siteRow as { setupCompleted?: boolean } | null)?.setupCompleted ?? false;

  if (!setupCompleted) {
    redirect("/dashboard/setup");
  }

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>

      <section>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-500">
          At a glance
        </h3>
        <div className="flex flex-wrap gap-4">
          <Card className="min-w-[120px]">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-slate-900">{totalPosts}</p>
              <p className="text-sm text-slate-600">Total posts</p>
            </CardContent>
          </Card>
          <Card className="min-w-[120px]">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-emerald-700">{publishedCount}</p>
              <p className="text-sm text-slate-600">Published</p>
            </CardContent>
          </Card>
          <Card className="min-w-[120px]">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-amber-700">{draftCount}</p>
              <p className="text-sm text-slate-600">Drafts</p>
            </CardContent>
          </Card>
          {siteUrl && (
            <Card className="min-w-[120px]">
              <CardContent className="pt-4">
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  <ExternalLink className="h-4 w-4" />
                  View site
                </a>
              </CardContent>
            </Card>
          )}
          <Card className="min-w-[120px]">
            <CardContent className="pt-4">
              <p className="text-sm font-mono text-slate-700">{process.version}</p>
              <p className="text-sm text-slate-600">Node</p>
            </CardContent>
          </Card>
          {dbSizeBytes != null && (
            <Card className="min-w-[120px]">
              <CardContent className="pt-4">
                <p className="text-sm font-mono text-slate-700">{formatBytes(dbSizeBytes)}</p>
                <p className="text-sm text-slate-600">DB size</p>
              </CardContent>
            </Card>
          )}
          <DashboardExportImport />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-500">
          Quick links
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/posts/new">
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              New post
            </Button>
          </Link>
          <Link href="/dashboard/content">
            <Button variant="outline" className="gap-2">
              <Layout className="h-4 w-4" />
              Content
            </Button>
          </Link>
          <Link href="/dashboard/analytics">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Link href="/dashboard/media">
            <Button variant="outline" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Media
            </Button>
          </Link>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-500">
          Recent posts
        </h3>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last edited</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPosts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                <p className="text-slate-600 mb-3">No posts yet. Write your first one to show on your site.</p>
                <Link href="/dashboard/posts/new">
                  <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Write first post
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {recentPosts.map((post) => (
                  <li key={post.id} className="flex items-center gap-4 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{post.title}</span>
                    <span className="w-[8.5rem] shrink-0 text-right text-xs text-slate-500">{formatDate(post.updatedAt)}</span>
                    <Link href={`/dashboard/posts/${post.id}`} className="shrink-0">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Link href="/dashboard/posts">
                <Button variant="outline" size="sm">
                  View all posts
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
