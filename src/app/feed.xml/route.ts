import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteConfigForRender } from "@/lib/site-config";
import { stripMarkdown } from "@/lib/utils";

/** Escape CDATA end marker so it doesn't break XML. */
function escapeCdata(s: string): string {
  return s.replace(/\]\]>/g, "]]]]><![CDATA[>");
}

export async function GET(request: NextRequest) {
  try {
    const fullContent = request.nextUrl.searchParams.get("full") === "1";
    const config = await getSiteConfigForRender();
    const baseUrl = config.url;
    const siteTitle = config.metaTitle || config.siteName;
    const siteDescription = config.metaDescription ?? "";
    const authorName = config.authorName ?? config.siteName;
    const authorEmail = config.links?.email ?? "";

    const now = new Date();
    const posts = await prisma.post.findMany({
      where: {
        OR: [{ published: true }, { publishedAt: { lte: now } }],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        title: true,
        slug: true,
        content: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Format date per RSS RFC 822
    const formatRSSDate = (date: Date): string => {
      return new Date(date).toUTCString();
    };

    // Description: description field or first 200 chars of content
    const generateDescription = (content: string, description: string | null): string => {
      if (description) {
        return description;
      }
      const plainText = stripMarkdown(content);
      const maxLength = 200;
      if (plainText.length <= maxLength) {
        return plainText;
      }
      return plainText.substring(0, maxLength).trim() + "...";
    };

    // Build RSS XML (atom:updated, optional content:encoded for full body)
    const rssItems = posts
      .map((post) => {
        const link = `${baseUrl}/blog/${post.slug}`;
        const pubDate = formatRSSDate(post.createdAt);
        const updatedDate = formatRSSDate(post.updatedAt);
        const description = generateDescription(post.content, post.description);
        const contentEncoded = fullContent
          ? `\n      <content:encoded><![CDATA[${escapeCdata(post.content)}]]></content:encoded>`
          : "";
        return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <description><![CDATA[${description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <atom:updated>${updatedDate}</atom:updated>
      <guid isPermaLink="true">${link}</guid>
      <author>${authorEmail} (${authorName})</author>${contentEncoded}
    </item>`;
      })
      .join("\n");

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[${siteTitle}]]></title>
    <link>${baseUrl}</link>
    <description><![CDATA[${siteDescription}]]></description>
    <language>en-US</language>
    <managingEditor>${authorEmail} (${authorName})</managingEditor>
    <webMaster>${authorEmail} (${authorName})</webMaster>
    <lastBuildDate>${formatRSSDate(new Date())}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

    return new NextResponse(rssXml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    return new NextResponse("Error generating RSS feed", { status: 500 });
  }
}
