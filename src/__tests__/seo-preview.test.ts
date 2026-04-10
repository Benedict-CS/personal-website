import { analyzeSeo } from "@/lib/seo-preview";

const WELL_FORMED = {
  title: "How to Build a Fast Blog with Next.js and Markdown",
  slug: "build-fast-blog-nextjs-markdown",
  description:
    "A comprehensive guide to building a high-performance blog using Next.js App Router, Markdown, and Tailwind CSS. Learn routing, data fetching, and deployment.",
  content: Array.from({ length: 200 }, (_, i) => `Sentence ${i} about building a blog with nextjs and markdown.`).join(" "),
};

describe("analyzeSeo", () => {
  it("returns a low score for completely empty input", () => {
    const result = analyzeSeo({ title: "", slug: "", description: "", content: "" });
    expect(result.score).toBeLessThan(20);
    expect(result.grade).toBe("Needs work");
    expect(result.signals.length).toBe(5);
  });

  it("returns a high score for well-optimized input", () => {
    const result = analyzeSeo(WELL_FORMED);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.grade === "Good" || result.grade === "Excellent").toBe(true);
  });

  it("generates correct SERP preview title truncation", () => {
    const longTitle = "A".repeat(80);
    const result = analyzeSeo({ title: longTitle, slug: "test", description: "", content: "words" });
    expect(result.serp.title.length).toBeLessThanOrEqual(61);
    expect(result.serp.title.endsWith("\u2026")).toBe(true);
  });

  it("generates SERP URL in breadcrumb format", () => {
    const result = analyzeSeo({ ...WELL_FORMED, siteHost: "example.com" });
    expect(result.serp.url).toContain("example.com");
    expect(result.serp.url).toContain("blog");
    expect(result.serp.url).toContain(WELL_FORMED.slug);
  });

  it("scores title length in the optimal range (50-60 chars)", () => {
    const title = "Building a Blog with Next.js and Tailwind CSS Guide";
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(60);
    const result = analyzeSeo({ title, slug: "test", description: "", content: "" });
    const titleSignal = result.signals.find((s) => s.key === "title_length");
    expect(titleSignal?.score).toBe(25);
  });

  it("penalizes very short titles", () => {
    const result = analyzeSeo({ title: "Blog", slug: "test", description: "", content: "" });
    const titleSignal = result.signals.find((s) => s.key === "title_length");
    expect(titleSignal!.score).toBeLessThanOrEqual(5);
  });

  it("scores description length in optimal range (120-160 chars)", () => {
    const desc = "A".repeat(10) + " " + "B".repeat(60) + " " + "C".repeat(60) + " " + "D".repeat(20);
    expect(desc.length).toBeGreaterThanOrEqual(120);
    expect(desc.length).toBeLessThanOrEqual(160);
    const result = analyzeSeo({ title: "T", slug: "s", description: desc, content: "" });
    const descSignal = result.signals.find((s) => s.key === "desc_length");
    expect(descSignal?.score).toBe(25);
  });

  it("penalizes missing description", () => {
    const result = analyzeSeo({ title: "Title", slug: "slug", description: "", content: "words" });
    const descSignal = result.signals.find((s) => s.key === "desc_length");
    expect(descSignal!.score).toBe(0);
  });

  it("scores clean short slugs highly", () => {
    const result = analyzeSeo({ title: "T", slug: "nextjs-blog-guide", description: "", content: "" });
    const slugSignal = result.signals.find((s) => s.key === "slug_quality");
    expect(slugSignal!.score).toBe(20);
  });

  it("penalizes slugs with special characters", () => {
    const result = analyzeSeo({ title: "T", slug: "my_post!here", description: "", content: "" });
    const slugSignal = result.signals.find((s) => s.key === "slug_quality");
    expect(slugSignal!.score).toBeLessThanOrEqual(5);
  });

  it("detects keyword consistency between title and content", () => {
    const result = analyzeSeo({
      title: "React Performance Optimization Guide",
      slug: "s",
      description: "",
      content: "This guide covers react performance optimization techniques for modern web applications.",
    });
    const kwSignal = result.signals.find((s) => s.key === "keyword_presence");
    expect(kwSignal!.score).toBeGreaterThanOrEqual(10);
  });

  it("penalizes keyword mismatch", () => {
    const result = analyzeSeo({
      title: "Advanced Python Machine Learning",
      slug: "s",
      description: "",
      content: "Today we discuss cooking recipes and gardening tips.",
    });
    const kwSignal = result.signals.find((s) => s.key === "keyword_presence");
    expect(kwSignal!.score).toBeLessThanOrEqual(5);
  });

  it("rewards long-form content", () => {
    const longContent = Array.from({ length: 1200 }, () => "word").join(" ");
    const result = analyzeSeo({ title: "T", slug: "s", description: "", content: longContent });
    const depthSignal = result.signals.find((s) => s.key === "content_depth");
    expect(depthSignal!.score).toBe(15);
  });

  it("score is always between 0 and 100", () => {
    const cases = [
      { title: "", slug: "", description: "", content: "" },
      WELL_FORMED,
      { title: "A".repeat(200), slug: "a-b-c-d-e-f-g-h-i-j-k", description: "D".repeat(300), content: "word ".repeat(2000) },
    ];
    for (const input of cases) {
      const result = analyzeSeo(input);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  it("each signal score does not exceed its maxScore", () => {
    const result = analyzeSeo(WELL_FORMED);
    for (const signal of result.signals) {
      expect(signal.score).toBeLessThanOrEqual(signal.maxScore);
      expect(signal.score).toBeGreaterThanOrEqual(0);
    }
  });
});
