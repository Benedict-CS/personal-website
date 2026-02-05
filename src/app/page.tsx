import type { Metadata } from "next";
import Link from "next/link";
import { Pin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { stripMarkdown } from "@/lib/utils";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home",
  description: siteConfig.description,
  openGraph: {
    title: "Home",
    description: siteConfig.description,
    url: siteConfig.url,
    images: [siteConfig.ogImage],
  },
};

export default async function Home() {
  const latestPosts = await prisma.post.findMany({
    where: {
      published: true,
    },
    include: {
      tags: true,
    },
    orderBy: [
      { pinned: "desc" },
      { createdAt: "desc" },
    ],
    take: 3,
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    const plainText = stripMarkdown(content);
    if (plainText.length <= maxLength) {
      return plainText;
    }
    return plainText.substring(0, maxLength).trim() + "...";
  };

  const skills = [
    "Next.js",
    "TypeScript",
    "Proxmox",
    "Linux",
    "Networking",
    "Docker",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <section className="container mx-auto max-w-6xl px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-slate-900 md:text-6xl lg:text-7xl">
            Hi, I&apos;m Benedict.
          </h1>
          <p className="mb-8 text-xl text-slate-600 md:text-2xl">
            Network Administrator | Full Stack Developer | Open Source Enthusiast
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/blog">
              <Button size="lg" className="w-full sm:w-auto">
                Read My Blog
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                View Projects
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Get in Touch
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Posts Section */}
      <section className="container mx-auto max-w-6xl px-4 py-16">
        <div className="w-full">
          <h2 className="mb-8 text-3xl font-bold text-slate-900">
            Latest Articles
          </h2>
          {latestPosts.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
              <p className="text-slate-500">More content coming soon...</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
                    <CardHeader className="gap-3">
                      <CardTitle className="line-clamp-2 text-slate-900 leading-relaxed flex items-start gap-1.5">
                        {post.pinned && (
                          <Pin className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" aria-hidden />
                        )}
                        <span>{post.title}</span>
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>{formatDate(post.createdAt)}</span>
                        <span>•</span>
                        <span>{formatReadingTime(calculateReadingTime(post.content))}</span>
                      </div>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {post.tags.map((tag) => (
                            <Link
                              key={tag.id}
                              href={`/blog/tag/${tag.slug}`}
                              className="inline-block"
                            >
                              <Badge
                                variant="secondary"
                                className="text-xs cursor-pointer hover:bg-slate-200 hover:scale-105 transition-all"
                                title={`View all posts tagged "${tag.name}"`}
                              >
                                {tag.name}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                        {/* @ts-ignore */}
                        {post.description || truncateContent(post.content)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Skills Section */}
      <section className="container mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-3xl font-bold text-slate-900">
            Technical Skills
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="px-4 py-2 text-sm font-medium text-slate-700"
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
