import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getRequestOrigin } from "@/lib/get-request-origin";
import { evaluateRssFeedXml, evaluateSitemapXml } from "@/lib/seo-integrity";
import { fetchWithRetry } from "@/lib/self-healing-fetch";

type FetchCheck = {
  url: string;
  ok: boolean;
  status: number;
  body: string;
};

async function fetchText(url: string): Promise<FetchCheck> {
  try {
    const res = await fetchWithRetry(
      url,
      { cache: "no-store" },
      { retries: 2, timeoutMs: 3500, retryDelayMs: 160 }
    );
    const body = await res.text();
    return { url, ok: res.ok, status: res.status, body };
  } catch {
    return { url, ok: false, status: 0, body: "" };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  const origin = getRequestOrigin(request);
  if (!origin) {
    return NextResponse.json({ error: "Could not determine request origin." }, { status: 400 });
  }

  const [rss, sitemap, robots, securityTxt] = await Promise.all([
    fetchText(`${origin}/feed.xml`),
    fetchText(`${origin}/sitemap.xml`),
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/.well-known/security.txt`),
  ]);

  const rssSummary = evaluateRssFeedXml(rss.body);
  const sitemapSummary = evaluateSitemapXml(sitemap.body, origin);
  const robotsHasSitemap = /sitemap:\s*https?:\/\/\S+/i.test(robots.body);
  const securityHasContact = /contact:\s*.+/i.test(securityTxt.body);

  return NextResponse.json({
    ok:
      rss.ok &&
      sitemap.ok &&
      robots.ok &&
      securityTxt.ok &&
      rssSummary.issues.filter((i) => i.level === "error").length === 0 &&
      sitemapSummary.issues.filter((i) => i.level === "error").length === 0,
    checks: {
      rss: { status: rss.status, ...rssSummary },
      sitemap: { status: sitemap.status, ...sitemapSummary },
      robots: { status: robots.status, hasSitemapDeclaration: robotsHasSitemap },
      securityTxt: { status: securityTxt.status, hasContact: securityHasContact },
    },
    scannedAt: new Date().toISOString(),
  });
}
