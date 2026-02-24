import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";
import { ThemeApplier } from "@/components/theme-applier";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { RssAutodiscovery } from "@/components/rss-autodiscovery";
import { siteConfig } from "@/config/site";
import { getSiteConfigForRender } from "@/lib/site-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigForRender();
  return {
    metadataBase: new URL(config.url),
    title: {
      default: config.metaTitle || siteConfig.title,
      template: `%s | ${config.siteName}`,
    },
    description: config.metaDescription ?? siteConfig.description,
    keywords: [
      "Benedict Tiong",
      "Network Administrator",
      "Full Stack Developer",
      "Cloud Native",
      "Kubernetes",
      "CI/CD",
      "DevOps",
      "Next.js",
      "TypeScript",
      "Proxmox",
      "Linux",
    ],
    authors: [{ name: config.authorName ?? siteConfig.author.name, url: config.links?.linkedin }],
    creator: config.authorName ?? siteConfig.author.name,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: config.url,
      title: config.metaTitle || siteConfig.title,
      description: config.metaDescription ?? siteConfig.description,
      siteName: config.siteName,
      ...(config.ogImageUrl && {
        images: [
          config.ogImageUrl.startsWith("http") ? config.ogImageUrl : new URL(config.ogImageUrl, config.url).toString(),
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: config.metaTitle || siteConfig.title,
      description: config.metaDescription ?? siteConfig.description,
      creator: "@benedicttiong",
      ...(config.ogImageUrl && {
        images: [
          config.ogImageUrl.startsWith("http") ? config.ogImageUrl : new URL(config.ogImageUrl, config.url).toString(),
        ],
      }),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: config.faviconUrl
      ? { icon: config.faviconUrl, shortcut: config.faviconUrl }
      : { icon: "/favicon.ico", shortcut: "/favicon.ico" },
  };
}

export const viewport = {
  themeColor: "#f8fafc",
};

// Always read site config from DB on each request (no static cache)
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteConfigForRender = await getSiteConfigForRender();
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex min-h-screen flex-col`}
        data-template={siteConfigForRender.templateId ?? "default"}
      >
        <ThemeApplier themeMode={siteConfigForRender.themeMode ?? "system"} />
        <Providers>
          <RssAutodiscovery />
          <AnalyticsBeacon />
          <a
            href="#main-content"
            className="skip-link"
          >
            Skip to main content
          </a>
          <Navbar siteConfig={siteConfigForRender} />
          <main id="main-content" className="flex flex-1 flex-col min-h-0 main-fade-in">{children}</main>
          <Footer siteConfig={siteConfigForRender} />
        </Providers>
      </body>
    </html>
  );
}
