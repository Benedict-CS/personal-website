import { markdownImageInsert } from "@/lib/markdown-image-insert";
import { dimensionsFromImageTitle } from "@/components/markdown/blog-markdown-image";
import { altTextFromImageFilename } from "@/lib/image-alt-from-filename";

/**
 * Lightweight stress checks for markdown helpers and large-string handling (no unified ESM in Jest).
 */
describe("Markdown helpers", () => {
  it("builds image markdown with dimensions and srcset fragment", () => {
    const md = markdownImageInsert(
      "https://cdn.example.com/a.webp",
      "1730000-vacation-photo.jpg",
      1200,
      800,
      [
        { descriptor: 640, url: "https://cdn.example.com/a-w640.webp" },
        { descriptor: 1280, url: "https://cdn.example.com/a-w1280.webp" },
      ]
    );
    expect(md).toContain("1200x800");
    expect(md).toContain("vacation photo");
    expect(md).toContain("#rs=");
    expect(md).toContain("640w=");
  });

  it("parses WxH titles for aspect ratio", () => {
    expect(dimensionsFromImageTitle("800x600")).toEqual({ w: 800, h: 600 });
    expect(dimensionsFromImageTitle("Caption only").displayTitle).toBe("Caption only");
  });

  it("handles long prose strings for alt derivation", () => {
    const longName = `${"a".repeat(200)}-photo.png`;
    const alt = altTextFromImageFilename(longName);
    expect(alt.length).toBeGreaterThan(10);
  });
});

describe("Large markdown string sanity (stress fixture)", () => {
  it("builds a 5000-word doc with 10 images, nested-style tables, and code without structural issues", () => {
    const words = Array.from({ length: 5000 }, (_, i) => `word${i}`).join(" ");
    const widths = [320, 480, 640, 800, 1024, 1280, 1600, 1920, 2560, 3840];
    const heights = [240, 360, 480, 600, 768, 720, 900, 1080, 1440, 2160];
    const tenImages = widths
      .map((w, i) =>
        markdownImageInsert(
          `https://cdn.example.com/img-${i}.webp`,
          `photo-${i}-upload.jpg`,
          w,
          heights[i]!,
          [
            { descriptor: 640, url: `https://cdn.example.com/img-${i}-w640.webp` },
            { descriptor: 1280, url: `https://cdn.example.com/img-${i}-w1280.webp` },
          ]
        )
      )
      .join("\n\n");
    /* Outer table + inner pipe-style row (nested layout stress for table wrappers) */
    const outerTable = `| Section | Details |\n| --- | --- |\n| Intro | Many cells |\n| Data | wide-cell-content-stress |\n`;
    const innerTable = `| N | A | B | C | D |\n| --- | --- | --- | --- | --- |\n${Array.from(
      { length: 12 },
      (_, r) => `| ${r} | ${r} | ${r} | ${r} | ${r} |`
    ).join("\n")}\n`;
    const code = "```ts\n" + Array.from({ length: 100 }, (_, i) => `log(${i});`).join("\n") + "\n```\n";
    const doc = `# Stress\n\n${words}\n\n${tenImages}\n\n${outerTable}\n${innerTable}\n${code}`;
    expect(doc.length).toBeGreaterThan(35_000);
    expect((doc.match(/!\[/g) || []).length).toBe(10);
    expect(doc.split("\n").filter((l) => l.startsWith("|")).length).toBeGreaterThan(15);
  });
});
