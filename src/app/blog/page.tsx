import type { Metadata } from "next";
import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import { getSiteConfigForRender } from "@/lib/site-config";
import BlogPageClient from "./page-client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigForRender();
  const ogUrl = config.ogImageUrl
    ? (config.ogImageUrl.startsWith("http") ? config.ogImageUrl : new URL(config.ogImageUrl, config.url).toString())
    : undefined;
  return {
    title: "Blog",
    description:
      "Read articles about Network Administration, Full Stack Development, Cloud Native Technologies, and more by Benedict Tiong.",
    openGraph: {
      title: "Blog",
      description:
        "Read articles about Network Administration, Full Stack Development, Cloud Native Technologies, and more by Benedict Tiong.",
      url: `${config.url}/blog`,
      ...(ogUrl && { images: [ogUrl] }),
    },
  };
}

export default function BlogPage() {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-6xl px-4 py-12"><p>Loading...</p></div>}>
      <BlogPageClient />
    </Suspense>
  );
}
