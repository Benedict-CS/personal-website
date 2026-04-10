import type { Metadata } from "next";
import { getSiteConfigForRender } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigForRender();
  const base = config.url.replace(/\/$/, "");
  const canonical = `${base}/contact`;
  const description = "Contact the site owner for opportunities, collaborations, or technical discussions.";
  const ogUrl = config.ogImageUrl
    ? (config.ogImageUrl.startsWith("http")
      ? config.ogImageUrl
      : new URL(config.ogImageUrl, config.url).toString())
    : undefined;

  return {
    title: "Contact",
    description,
    alternates: { canonical },
    openGraph: {
      title: "Contact",
      description,
      url: canonical,
      type: "website",
      ...(ogUrl && { images: [ogUrl] }),
    },
    twitter: {
      card: "summary_large_image",
      title: `Contact | ${config.siteName}`,
      description,
      ...(ogUrl && { images: [ogUrl] }),
    },
  };
}

export default function ContactLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
