import { prisma } from "@/lib/prisma";

type LinkSourceType = "post" | "custom-page";

export type LinkAuditIssue = {
  sourceType: LinkSourceType;
  sourceId: string;
  sourceLabel: string;
  href: string;
  normalizedPath: string;
};

export type LinkAuditReport = {
  scannedDocuments: number;
  scannedLinks: number;
  brokenLinks: LinkAuditIssue[];
};

const MARKDOWN_LINK_REGEX = /\[[^\]]*\]\(([^)\s]+(?:\s+"[^"]*")?)\)/g;

function normalizeHref(rawHref: string): string | null {
  const trimmed = rawHref.trim();
  if (!trimmed) return null;
  const href = trimmed.replace(/\s+"[^"]*"$/, "").trim();
  if (!href || href.startsWith("#")) return null;
  if (/^(mailto:|tel:|data:|javascript:)/i.test(href)) return null;
  if (/^https?:\/\//i.test(href)) return null;
  if (!href.startsWith("/")) return null;
  const noHash = href.split("#")[0] ?? href;
  const noQuery = noHash.split("?")[0] ?? noHash;
  return noQuery.length > 0 ? noQuery : "/";
}

function extractInternalLinks(markdown: string): Array<{ href: string; normalizedPath: string }> {
  const out: Array<{ href: string; normalizedPath: string }> = [];
  for (const match of markdown.matchAll(MARKDOWN_LINK_REGEX)) {
    const href = String(match[1] ?? "").trim();
    const normalizedPath = normalizeHref(href);
    if (!normalizedPath) continue;
    out.push({ href, normalizedPath });
  }
  return out;
}

function buildKnownInternalPaths(input: {
  postSlugs: string[];
  customPageSlugs: string[];
  tagSlugs: string[];
}): Set<string> {
  const known = new Set<string>([
    "/",
    "/about",
    "/contact",
    "/blog",
    "/blog/archive",
    "/feed.xml",
    "/sitemap.xml",
    "/robots.txt",
    "/.well-known/security.txt",
  ]);
  for (const slug of input.postSlugs) known.add(`/blog/${slug}`);
  for (const slug of input.customPageSlugs) known.add(`/page/${slug}`);
  for (const slug of input.tagSlugs) known.add(`/blog/tag/${slug}`);
  return known;
}

export async function auditInternalMarkdownLinks(): Promise<LinkAuditReport> {
  const [posts, customPages, tags] = await Promise.all([
    prisma.post.findMany({
      select: { id: true, title: true, content: true, slug: true },
    }),
    prisma.customPage.findMany({
      select: { id: true, title: true, content: true, slug: true },
    }),
    prisma.tag.findMany({
      select: { slug: true },
    }),
  ]);

  const knownPaths = buildKnownInternalPaths({
    postSlugs: posts.map((post) => post.slug),
    customPageSlugs: customPages.map((page) => page.slug),
    tagSlugs: tags.map((tag) => tag.slug),
  });

  const brokenLinks: LinkAuditIssue[] = [];
  let scannedLinks = 0;

  for (const post of posts) {
    const links = extractInternalLinks(post.content);
    scannedLinks += links.length;
    for (const link of links) {
      if (knownPaths.has(link.normalizedPath)) continue;
      brokenLinks.push({
        sourceType: "post",
        sourceId: post.id,
        sourceLabel: post.title,
        href: link.href,
        normalizedPath: link.normalizedPath,
      });
    }
  }

  for (const page of customPages) {
    const links = extractInternalLinks(page.content);
    scannedLinks += links.length;
    for (const link of links) {
      if (knownPaths.has(link.normalizedPath)) continue;
      brokenLinks.push({
        sourceType: "custom-page",
        sourceId: page.id,
        sourceLabel: page.title,
        href: link.href,
        normalizedPath: link.normalizedPath,
      });
    }
  }

  return {
    scannedDocuments: posts.length + customPages.length,
    scannedLinks,
    brokenLinks,
  };
}
