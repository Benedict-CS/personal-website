import type { Metadata } from "next";
import { Suspense } from "react";
import { getSiteConfigForRender } from "@/lib/site-config";
import BlogPageClient from "./page-client";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigForRender();
  const base = config.url.replace(/\/$/, "");
  const desc =
    "Read articles about engineering, product, and website-building best practices.";
  const ogUrl = config.ogImageUrl
    ? (config.ogImageUrl.startsWith("http") ? config.ogImageUrl : new URL(config.ogImageUrl, config.url).toString())
    : undefined;
  return {
    title: "Blog",
    description: desc,
    alternates: { canonical: `${base}/blog` },
    openGraph: {
      title: "Blog",
      description: desc,
      url: `${base}/blog`,
      type: "website",
      ...(ogUrl && { images: [ogUrl] }),
    },
    twitter: {
      card: "summary_large_image",
      title: `Blog | ${config.siteName}`,
      description: desc,
      ...(ogUrl && { images: [ogUrl] }),
    },
  };
}

function BlogSkeleton() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:py-10 lg:py-12 sm:px-6 lg:px-8">
      <div className="h-10 w-32 rounded-lg skeleton-shimmer mb-8" />
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="h-9 w-16 rounded-full skeleton-shimmer" />
        <div className="h-9 w-20 rounded-full skeleton-shimmer" />
        <div className="h-9 w-24 rounded-full skeleton-shimmer" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-card p-6 shadow-[var(--elevation-1)]">
            <div className="h-6 w-3/4 rounded-lg skeleton-shimmer mb-3" />
            <div className="h-4 w-28 rounded-lg skeleton-shimmer mb-4" />
            <div className="h-4 w-full rounded-lg skeleton-shimmer" />
            <div className="h-4 w-2/3 rounded-lg skeleton-shimmer mt-2" />
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
