import type { Prisma } from "@prisma/client";

type AiPageBlock = {
  type: string;
  content: Record<string, unknown>;
  styles?: Record<string, unknown>;
};

type AiGeneratedPage = {
  slug: string;
  title: string;
  blocks: AiPageBlock[];
};

type AiGeneratedSite = {
  siteName: string;
  palette: { primary: string; accent: string; surface: string };
  typography: { heading: string; body: string };
  pages: AiGeneratedPage[];
};

function normalizePrompt(input: string): string {
  return input.toLowerCase().trim();
}

function choosePalette(prompt: string) {
  if (prompt.includes("bakery") || prompt.includes("restaurant")) {
    return { primary: "#b45309", accent: "#7c2d12", surface: "#fff7ed" };
  }
  if (prompt.includes("tech") || prompt.includes("startup")) {
    return { primary: "#1d4ed8", accent: "#0f172a", surface: "#f8fafc" };
  }
  if (prompt.includes("creative") || prompt.includes("portfolio")) {
    return { primary: "#7c3aed", accent: "#1e1b4b", surface: "#faf5ff" };
  }
  return { primary: "#2563eb", accent: "#0f172a", surface: "#ffffff" };
}

function inferBusinessName(prompt: string): string {
  const words = prompt
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "AI Generated Site";
  return words.slice(0, 4).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export function generateSiteSchemaFromPrompt(promptRaw: string): AiGeneratedSite {
  const prompt = normalizePrompt(promptRaw);
  const name = inferBusinessName(promptRaw);
  const palette = choosePalette(prompt);

  const hero = {
    type: "MarketingHeroSplit",
    content: {
      title: `${name} - Built with AI`,
      subtitle: `A conversion-ready website generated from your prompt: "${promptRaw}"`,
      ctaText: "Book now",
      ctaHref: "/contact",
    },
    styles: {
      paddingTop: 84,
      paddingBottom: 84,
      backgroundColor: palette.surface,
      color: palette.accent,
    },
  };

  const pages: AiGeneratedPage[] = [
    {
      slug: "home",
      title: "Home",
      blocks: [
        hero,
        {
          type: "MarketingFeatureGrid",
          content: {
            title: "Why customers choose us",
            features: ["Fast onboarding", "Clear value proposition", "Strong trust signals"],
          },
          styles: { backgroundColor: "#ffffff" },
        },
        {
          type: "CommerceProductGrid",
          content: { title: "Featured products", collection: "featured", limit: 8 },
          styles: { backgroundColor: "#ffffff" },
        },
      ],
    },
    {
      slug: "about",
      title: "About",
      blocks: [
        {
          type: "LayoutTimeline",
          content: {
            title: "Our story",
            items: ["Founded with a customer-first vision", "Scaled through quality", "Trusted by local community"],
          },
          styles: { backgroundColor: "#ffffff" },
        },
      ],
    },
    {
      slug: "contact",
      title: "Contact",
      blocks: [
        {
          type: "InteractiveFormContact",
          content: {
            title: "Contact us",
            fields: ["name", "email", "phone", "message"],
          },
          styles: { backgroundColor: "#ffffff" },
        },
        {
          type: "InteractiveMapCard",
          content: { address: "New York, NY" },
          styles: { backgroundColor: "#ffffff" },
        },
      ],
    },
  ];

  return {
    siteName: name,
    palette,
    typography: { heading: "Inter", body: "Inter" },
    pages,
  };
}

export async function tryFetchUnsplashImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { urls?: { regular?: string } };
  return data.urls?.regular ?? null;
}

export function asJsonValue<T>(value: T): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function rewriteMarketingCopy(text: string, tone: "seo" | "formal" | "friendly"): string {
  const source = text.trim();
  if (!source) return "";
  if (tone === "seo") {
    return `${source} | Trusted quality, competitive pricing, and fast delivery.`;
  }
  if (tone === "formal") {
    return `We are pleased to present: ${source}. Our team is committed to delivering a dependable and professional experience.`;
  }
  return `${source} We make every step simple, clear, and friendly for your customers.`;
}

