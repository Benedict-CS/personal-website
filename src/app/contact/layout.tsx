import type { Metadata } from "next";
import { getSiteConfigForRender } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigForRender();
  const siteName = config.siteName;
  const url = config.url;
  return {
    title: "Contact",
    description: `Get in touch with ${siteName}. Open to opportunities, collaborations, and conversations about technology.`,
    openGraph: {
      title: "Contact",
      description: `Get in touch with ${siteName}.`,
      url: `${url}/contact`,
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
