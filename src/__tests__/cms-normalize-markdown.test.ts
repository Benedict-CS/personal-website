import { normalizeMarkdownWhitespace } from "@/lib/cms-normalize-markdown";

describe("normalizeMarkdownWhitespace", () => {
  it("trims trailing spaces per line", () => {
    expect(normalizeMarkdownWhitespace("a  \nb\t ")).toBe("a\nb");
  });

  it("collapses excessive blank lines", () => {
    expect(normalizeMarkdownWhitespace("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("trims outer whitespace on the document", () => {
    expect(normalizeMarkdownWhitespace("\n\nhello\n\n")).toBe("hello");
  });

  it("normalizes CRLF", () => {
    expect(normalizeMarkdownWhitespace("x\r\ny")).toBe("x\ny");
  });
});
