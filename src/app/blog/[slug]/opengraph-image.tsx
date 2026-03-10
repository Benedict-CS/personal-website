import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { getSiteConfigForRender } from "@/lib/site-config";
import { calculateReadingTime } from "@/lib/reading-time";

export const alt = "Blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function publishedWhere() {
  const now = new Date();
  return {
    OR: [{ published: true }, { publishedAt: { lte: now } }],
  };
}

export default async function BlogPostOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.post.findFirst({
    where: { slug, ...publishedWhere() },
    include: { tags: true },
  });
  const config = await getSiteConfigForRender();

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fafafa",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <span style={{ fontSize: 32, color: "#737373" }}>Post not found</span>
        </div>
      ),
      { ...size }
    );
  }

  const siteName = config.siteName ?? "Blog";
  const readingMin = calculateReadingTime(post.content);
  const readLabel = readingMin === 1 ? "1 min read" : `${readingMin} min read`;
  const tagLabels = post.tags.map((t) => t.name).filter(Boolean).slice(0, 4);
  const dateStr = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          border: "1px solid #e5e5e5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top bar: site name + date */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "40px 56px 0",
            marginBottom: 24,
          }}
        >
          <span
            style={{
              fontSize: 20,
              color: "#737373",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {siteName}
          </span>
          <span style={{ fontSize: 18, color: "#a3a3a3" }}>{dateStr}</span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flex: 1,
            padding: "0 56px 24px",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#171717",
              lineHeight: 1.15,
              margin: 0,
              display: "flex",
              maxHeight: "3.5em",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {post.title || "Untitled"}
          </h1>
        </div>

        {/* Bottom: tags + reading time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 56px 40px",
            borderTop: "1px solid #e5e5e5",
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {tagLabels.map((name) => (
              <span
                key={name}
                style={{
                  fontSize: 16,
                  color: "#525252",
                  background: "#f5f5f5",
                  padding: "8px 14px",
                  borderRadius: 6,
                }}
              >
                {name}
              </span>
            ))}
            {tagLabels.length === 0 && (
              <span style={{ fontSize: 16, color: "#a3a3a3" }}>Article</span>
            )}
          </div>
          <span style={{ fontSize: 18, color: "#737373" }}>{readLabel}</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
