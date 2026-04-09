import type { Metadata } from "next";
import { getSiteConfigForRender } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigForRender();
  const siteName = config.siteName;
  const base = config.url.replace(/\/$/, "");
  const desc = `Get in touch with ${siteName}. Open to opportunities, collaborations, and conversations about technology.`;
  const ogShort = `Get in touch with ${siteName}.`;
  return {
    title: "Contact",
    description: desc,
    alternates: { canonical: `${base}/contact` },
    openGraph: {
      title: "Contact",
      description: ogShort,
      url: `${base}/contact`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Contact",
      description: ogShort,
    },
  };
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
