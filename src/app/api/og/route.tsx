import { ImageResponse } from "next/og";
import { sanitizeShareCardTheme } from "@/lib/social-share-card";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 } as const;

function paletteFor(theme: "slate" | "blue" | "emerald") {
  if (theme === "blue") {
    return {
      bgFrom: "#eff6ff",
      bgTo: "#dbeafe",
      title: "#1e3a8a",
      subtitle: "#1e40af",
      chipBg: "#bfdbfe",
      chipText: "#1e40af",
      border: "#93c5fd",
    };
  }
  if (theme === "emerald") {
    return {
      bgFrom: "#ecfdf5",
      bgTo: "#d1fae5",
      title: "#065f46",
      subtitle: "#047857",
      chipBg: "#a7f3d0",
      chipText: "#065f46",
      border: "#6ee7b7",
    };
  }
  return {
    bgFrom: "#f8fafc",
    bgTo: "#e2e8f0",
    title: "#0f172a",
    subtitle: "#334155",
    chipBg: "#cbd5e1",
    chipText: "#0f172a",
    border: "#94a3b8",
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = (url.searchParams.get("title") || "Untitled").slice(0, 140);
  const subtitle = (url.searchParams.get("subtitle") || "").slice(0, 220);
  const label = (url.searchParams.get("label") || "Share Card").slice(0, 40);
  const theme = sanitizeShareCardTheme(url.searchParams.get("theme"));
  const palette = paletteFor(theme);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${palette.bgFrom}, ${palette.bgTo})`,
          border: `1px solid ${palette.border}`,
          padding: "56px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 14px",
            borderRadius: "999px",
            background: palette.chipBg,
            color: palette.chipText,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: 64,
              lineHeight: 1.08,
              color: palette.title,
              fontWeight: 800,
              maxHeight: "3.2em",
              overflow: "hidden",
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              style={{
                margin: 0,
                fontSize: 30,
                lineHeight: 1.3,
                color: palette.subtitle,
                maxHeight: "2.7em",
                overflow: "hidden",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    ),
    SIZE
  );
}
