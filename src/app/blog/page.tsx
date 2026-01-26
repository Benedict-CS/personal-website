import type { Metadata } from "next";
import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import BlogPageClient from "./page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Read articles about Network Administration, Full Stack Development, Cloud Native Technologies, and more by Benedict Tiong.",
  openGraph: {
    title: "Blog",
    description:
      "Read articles about Network Administration, Full Stack Development, Cloud Native Technologies, and more by Benedict Tiong.",
    url: `${siteConfig.url}/blog`,
    images: [siteConfig.ogImage],
  },
};

export default function BlogPage() {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-6xl px-4 py-12"><p>Loading...</p></div>}>
      <BlogPageClient />
    </Suspense>
  );
}
