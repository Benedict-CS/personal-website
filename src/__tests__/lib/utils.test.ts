/**
 * Unit tests for lib/utils (stripMarkdown, cn).
 */
import { stripMarkdown, cn } from "@/lib/utils";

describe("stripMarkdown", () => {
  it("strips headers", () => {
    expect(stripMarkdown("# Title")).toBe("Title");
    expect(stripMarkdown("## Subtitle")).toBe("Subtitle");
    expect(stripMarkdown("### Level 3")).toBe("Level 3");
  });

  it("strips bold and italic", () => {
    expect(stripMarkdown("**bold**")).toBe("bold");
    expect(stripMarkdown("*italic*")).toBe("italic");
    expect(stripMarkdown("__also bold__")).toBe("also bold");
  });

  it("keeps link text, removes URL", () => {
    expect(stripMarkdown("[click here](https://example.com)")).toBe("click here");
  });

  it("removes image syntax", () => {
    expect(stripMarkdown("![alt text](/img.png)")).toBe("");
  });

  it("keeps inline code text", () => {
    expect(stripMarkdown("use `code` here")).toBe("use code here");
  });

  it("keeps code block content", () => {
    const md = "```js\nconst x = 1;\n```";
    expect(stripMarkdown(md)).toContain("const x = 1");
  });

  it("strips blockquotes and list markers", () => {
    expect(stripMarkdown("> quote")).toBe("quote");
    expect(stripMarkdown("- item")).toBe("item");
  });

  it("returns plain text for mixed content", () => {
    const md = "# Hello\n\n**World** and [link](https://x.com).";
    const out = stripMarkdown(md);
    expect(out).toContain("Hello");
    expect(out).toContain("World");
    expect(out).toContain("link");
    expect(out).not.toContain("**");
    expect(out).not.toContain("https://x.com");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("handles tailwind merge (later overrides)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
