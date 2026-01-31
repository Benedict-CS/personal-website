import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { stripMarkdown } from "@/lib/utils";
import { siteConfig } from "@/config/site";

const SNIPPET_RADIUS = 80;
const MAX_SNIPPETS_PER_POST = 10;

function extractOneSnippet(
  plain: string,
  lower: string,
  t: string,
  idx: number,
  termLen: number,
  maxLen: number
): string {
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(plain.length, idx + termLen + SNIPPET_RADIUS);
  let snippet = plain.slice(start, end).trim();
  if (start > 0) snippet = "… " + snippet;
  if (end < plain.length) snippet = snippet + " …";
  if (snippet.length > maxLen) snippet = snippet.slice(0, maxLen - 1) + "…";
  return snippet;
}

/**
 * Extract all snippets for the given term in document order.
 * No dedupe — so occurrence index matches DOM order and every click scrolls to the right place.
 */
function extractSnippets(
  text: string,
  term: string,
  maxCount = MAX_SNIPPETS_PER_POST,
  maxLen = SNIPPET_RADIUS * 2
): string[] {
  if (!text || !term.trim()) return [];
  const plain = stripMarkdown(text);
  const lower = plain.toLowerCase();
  const t = term.trim().toLowerCase();
  const termLen = term.trim().length;
  const results: string[] = [];
  let idx = 0;
  while (results.length < maxCount) {
    const found = lower.indexOf(t, idx);
    if (found === -1) break;
    results.push(extractOneSnippet(plain, lower, t, found, termLen, maxLen));
    idx = found + termLen;
  }
  return results;
}

const STATIC_PAGES: { path: string; title: string; searchableText: string }[] = [
  {
    path: "/about",
    title: "About",
    searchableText: [
      "About",
      siteConfig.name,
      "Education",
      "M.S. in Computer Science",
      "NYCU",
      "National Yang Ming Chiao Tung University",
      "Taiwan",
      "Sep 2023 Jan 2026",
      "Thesis CI/CD Framework Zero Downtime Deployment Wi-Fi Mesh Networks",
      "Research Focus Network Function Virtualization NFV CI/CD DevOps Kubernetes Cloud-Native",
      "Advisor Chien-Chao Tseng Wireless Internet Laboratory WinLab",
      "B.S. in Interaction Design",
      "Media Design Division",
      "NTUT",
      "National Taipei University of Technology",
      "Taipei Tech",
      "Sep 2019 Jun 2023",
      "Outstanding Overseas Chinese Graduate Presidential Award",
      "Graduation Project Location-Based AR System Urban Exploration Infrastructure Maintenance",
      "IoT Embedded Systems Full-Stack Development AR/VR Human-Computer Interaction HCI",
      "Advisor Lydia Hsiao-Mei Lin",
      "Projects",
      "Kubernetes Multi-Cluster Hybrid Cloud",
      "Karmada GitOps ArgoCD",
      "Work Experience",
      "Teaching Assistant SDN NFV NYCU",
      "Makalot Software Engineer Intern",
      "Contact phone email LinkedIn GitHub CV Download",
    ].join(" "),
  },
  {
    path: "/contact",
    title: "Contact",
    searchableText: "Contact get in touch email LinkedIn GitHub message",
  },
  {
    path: "/",
    title: "Home",
    searchableText:
      "Home Benedict Hi Network Administrator Full Stack Developer Open Source Enthusiast Latest Posts Read My Blog Next.js TypeScript Proxmox Linux Networking Docker",
  },
];

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json({ posts: [], pages: [] });
    }

    const term = q.replace(/'/g, " ");
    const publishedOnly = true;

    let postIds: string[] = [];
    try {
      const sql =
        publishedOnly
          ? Prisma.sql`SELECT id FROM "Post" WHERE published = true AND search_vector @@ plainto_tsquery('english', ${term}) ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${term})) DESC`
          : Prisma.sql`SELECT id FROM "Post" WHERE search_vector @@ plainto_tsquery('english', ${term}) ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${term})) DESC`;
      const rows = await prisma.$queryRaw<{ id: string }[]>(sql);
      postIds = rows.map((r) => r.id);
    } catch {
      // fallback
    }

    const tagMatch = await prisma.post.findMany({
      where: {
        published: true,
        tags: { some: { name: { contains: q, mode: "insensitive" } } },
      },
      select: { id: true },
    });
    const tagIds = tagMatch.map((p) => p.id);
    const mergedIds = [...new Set([...postIds, ...tagIds])];

    let posts: Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      content: string;
      createdAt: Date;
      tags: Array<{ name: string }>;
      snippets: string[];
    }> = [];

    const qLower = q.toLowerCase();

    if (mergedIds.length > 0) {
      const orderMap = new Map(mergedIds.map((id, i) => [id, i]));
      const list = await prisma.post.findMany({
        where: { id: { in: mergedIds } },
        include: { tags: true },
      });
      list.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
      posts = list.map((p) => {
        const fromContent = extractSnippets(p.content, q);
        const snippets: string[] = [...fromContent];
        if (
          p.description &&
          p.description.toLowerCase().includes(qLower) &&
          !snippets.some((s) => s.includes(p.description!.slice(0, 30)))
        ) {
          snippets.unshift(p.description);
        }
        if (
          p.title.toLowerCase().includes(qLower) &&
          !snippets.some((s) => s.toLowerCase().includes(p.title.toLowerCase().slice(0, 20)))
        ) {
          snippets.unshift(p.title);
        }
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          description: p.description,
          content: p.content,
          createdAt: p.createdAt,
          tags: p.tags,
          snippets: snippets.slice(0, MAX_SNIPPETS_PER_POST),
        };
      });
    } else {
      const fallback = await prisma.post.findMany({
        where: {
          published: true,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { tags: { some: { name: { contains: q, mode: "insensitive" } } } },
          ],
        },
        include: { tags: true },
      });
      posts = fallback.map((p) => {
        const fromContent = extractSnippets(p.content, q);
        const snippets: string[] = [...fromContent];
        if (
          p.description &&
          p.description.toLowerCase().includes(qLower) &&
          !snippets.some((s) => s.includes(p.description!.slice(0, 30)))
        ) {
          snippets.unshift(p.description);
        }
        if (
          p.title.toLowerCase().includes(qLower) &&
          !snippets.some((s) => s.toLowerCase().includes(p.title.toLowerCase().slice(0, 20)))
        ) {
          snippets.unshift(p.title);
        }
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          description: p.description,
          content: p.content,
          createdAt: p.createdAt,
          tags: p.tags,
          snippets: snippets.slice(0, MAX_SNIPPETS_PER_POST),
        };
      });
    }

    const queryLower = q.toLowerCase();
    const tokens = queryLower.replace(/[()]/g, " ").split(/\s+/).filter(Boolean);
    const pages = STATIC_PAGES.filter((p) => {
      const text = p.searchableText.toLowerCase();
      return tokens.every((token) => token.length < 2 || text.includes(token));
    }).map((p) => {
      const snippets = extractSnippets(p.searchableText, q, 5);
      return {
        path: p.path,
        title: p.title,
        snippets: snippets.length > 0 ? snippets : [p.searchableText.slice(0, 120) + "…"],
      };
    });

    return NextResponse.json({
      posts: posts.map(({ content: _, ...rest }) => rest),
      pages,
    });
  } catch (e) {
    console.error("Search API error:", e);
    return NextResponse.json({ posts: [], pages: [] }, { status: 500 });
  }
}
