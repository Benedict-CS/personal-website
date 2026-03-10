import type { Metadata } from "next";
import { Suspense } from "react";
import { getSiteConfigForRender } from "@/lib/site-config";
import BlogPageClient from "./page-client";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigForRender();
  const ogUrl = config.ogImageUrl
    ? (config.ogImageUrl.startsWith("http") ? config.ogImageUrl : new URL(config.ogImageUrl, config.url).toString())
    : undefined;
  return {
    title: "Blog",
    description:
      "Read articles about engineering, product, and website-building best practices.",
    openGraph: {
      title: "Blog",
      description:
        "Read articles about engineering, product, and website-building best practices.",
      url: `${config.url}/blog`,
      ...(ogUrl && { images: [ogUrl] }),
    },
  };
}

function BlogSkeleton() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 animate-pulse">
      <div className="h-10 w-32 rounded bg-[var(--muted)] mb-8" />
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="h-9 w-16 rounded-full bg-[var(--muted)]" />
        <div className="h-9 w-20 rounded-full bg-[var(--muted)]" />
        <div className="h-9 w-24 rounded-full bg-[var(--muted)]" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-card p-6 shadow-[var(--shadow-sm)]">
            <div className="h-6 w-3/4 rounded bg-[var(--muted)] mb-3" />
            <div className="h-4 w-28 rounded bg-[var(--muted)]/80 mb-4" />
            <div className="h-4 w-full rounded bg-[var(--muted)]/70" />
            <div className="h-4 w-2/3 rounded bg-[var(--muted)]/70 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BlogPage() {
  return (
    <Suspense fallback={<BlogSkeleton />}>
      <BlogPageClient />
    </Suspense>
  );
}
