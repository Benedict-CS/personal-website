import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";
import { ThemeApplier } from "@/components/theme-applier";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { RssAutodiscovery } from "@/components/rss-autodiscovery";
import { FloatingEditButton } from "@/components/floating-edit-button";
import { GoogleAnalyticsScript } from "@/components/google-analytics-script";
import { getSiteConfigForRender } from "@/lib/site-config";
import { JsonLdRoot } from "@/components/json-ld-root";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

function metaKeywordsFromConfig(raw: string | null | undefined): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigForRender();
  const title = config.metaTitle || config.siteName;
  const description = config.metaDescription ?? "";
  return {
    metadataBase: new URL(config.url),
    title: {
      default: title,
      template: `%s | ${config.siteName}`,
    },
    description: description || undefined,
    keywords: metaKeywordsFromConfig(config.metaKeywords),
    authors: config.authorName ? [{ name: config.authorName, url: config.links?.linkedin }] : undefined,
    creator: config.authorName ?? undefined,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: config.url,
      title,
      description: description || undefined,
      siteName: config.siteName,
      ...(config.ogImageUrl && {
        images: [
          config.ogImageUrl.startsWith("http") ? config.ogImageUrl : new URL(config.ogImageUrl, config.url).toString(),
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description || undefined,
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
    ...(process.env.GOOGLE_SITE_VERIFICATION?.trim() && {
      verification: { google: process.env.GOOGLE_SITE_VERIFICATION.trim() },
    }),
  };
}

export const viewport = {
  themeColor: "#f8fafc",
};

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
        <JsonLdRoot config={siteConfigForRender} />
        <ThemeApplier themeMode={siteConfigForRender.themeMode ?? "light"} />
        {siteConfigForRender.googleAnalyticsId && (
          <GoogleAnalyticsScript measurementId={siteConfigForRender.googleAnalyticsId} />
        )}
        <Providers>
          <RssAutodiscovery />
          <AnalyticsBeacon />
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Navbar siteConfig={siteConfigForRender} />
          <main id="main-content" className="flex flex-1 flex-col min-h-0 main-fade-in">{children}</main>
          <FloatingEditButton />
          <Footer siteConfig={siteConfigForRender} />
        </Providers>
      </body>
    </html>
  );
}
