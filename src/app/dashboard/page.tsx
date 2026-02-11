import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Layout, BarChart3, Image as ImageIcon, PlusCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const [draftCount, recentPosts] = await Promise.all([
    prisma.post.count({ where: { published: false } }),
    prisma.post.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, slug: true, published: true, updatedAt: true },
    }),
  ]);

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
          <Card className="min-w-[140px]">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-slate-900">{draftCount}</p>
              <p className="text-sm text-slate-600">Drafts</p>
            </CardContent>
          </Card>
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
              <p className="text-slate-500">No posts yet.</p>
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
