import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${siteConfig.name}. Open to opportunities, collaborations, and conversations about technology.`,
  openGraph: {
    title: "Contact",
    description: `Get in touch with ${siteConfig.name}.`,
    url: `${siteConfig.url}/contact`,
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
