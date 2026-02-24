import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";
import { stripMarkdown } from "@/lib/utils";

/** Escape CDATA end marker so it doesn't break XML. */
function escapeCdata(s: string): string {
  return s.replace(/\]\]>/g, "]]]]><![CDATA[>");
}

export async function GET(request: NextRequest) {
  try {
    const fullContent = request.nextUrl.searchParams.get("full") === "1";
    const baseUrl = siteConfig.url;

    // 查詢最新的 20 篇已發布文章
    const posts = await prisma.post.findMany({
      where: {
        published: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        title: true,
        slug: true,
        content: true,
        // @ts-ignore - description field added via migration
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 格式化日期為 RSS 標準格式 (RFC 822)
    const formatRSSDate = (date: Date): string => {
      return new Date(date).toUTCString();
    };

    // 生成描述（優先使用 description 欄位，否則使用內容前 200 字）
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
        // @ts-ignore - description field
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
      <author>${siteConfig.author.email} (${siteConfig.author.name})</author>${contentEncoded}
    </item>`;
      })
      .join("\n");

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[${siteConfig.title}]]></title>
    <link>${baseUrl}</link>
    <description><![CDATA[${siteConfig.description}]]></description>
    <language>en-US</language>
    <managingEditor>${siteConfig.author.email} (${siteConfig.author.name})</managingEditor>
    <webMaster>${siteConfig.author.email} (${siteConfig.author.name})</webMaster>
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
