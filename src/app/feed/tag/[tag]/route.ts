import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";
import { stripMarkdown } from "@/lib/utils";

function escapeCdata(s: string): string {
  return s.replace(/\]\]>/g, "]]]]><![CDATA[>");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag: tagSlug } = await params;
    const fullContent = request.nextUrl.searchParams.get("full") === "1";
    const baseUrl = siteConfig.url;

    const tag = await prisma.tag.findUnique({
      where: { slug: tagSlug },
      select: { id: true, name: true },
    });
    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const posts = await prisma.post.findMany({
      where: {
        published: true,
        tags: { some: { id: tag.id } },
      },
      orderBy: { createdAt: "desc" },
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

    const formatRSSDate = (date: Date) => new Date(date).toUTCString();
    const generateDescription = (content: string, description: string | null) => {
      if (description) return description;
      const plain = stripMarkdown(content);
      return plain.length <= 200 ? plain : plain.substring(0, 200).trim() + "...";
    };

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
      <author>${siteConfig.author.email} (${siteConfig.author.name})</author>${contentEncoded}
    </item>`;
      })
      .join("\n");

    const channelTitle = `${siteConfig.title} — ${tag.name}`;
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[${channelTitle}]]></title>
    <link>${baseUrl}/blog/tag/${tagSlug}</link>
    <description><![CDATA[Posts tagged "${tag.name}"]]></description>
    <language>en-US</language>
    <lastBuildDate>${formatRSSDate(new Date())}</lastBuildDate>
    <atom:link href="${baseUrl}/feed/tag/${tagSlug}" rel="self" type="application/rss+xml"/>
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
    console.error("Error generating tag RSS:", error);
    return NextResponse.json({ error: "RSS generation failed" }, { status: 500 });
  }
}
