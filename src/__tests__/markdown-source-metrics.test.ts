import {
  countSourceGraphemeClusters,
  countSourceLines,
  countSourceUtf8Bytes,
  countSourceWords,
} from "@/lib/markdown-source-metrics";

describe("countSourceLines", () => {
  it("returns 0 for empty string", () => {
    expect(countSourceLines("")).toBe(0);
  });

  it("counts LF-separated segments", () => {
    expect(countSourceLines("a")).toBe(1);
    expect(countSourceLines("a\nb")).toBe(2);
    expect(countSourceLines("a\nb\n")).toBe(3);
  });
});

describe("countSourceWords", () => {
  it("returns 0 for empty or whitespace-only", () => {
    expect(countSourceWords("")).toBe(0);
    expect(countSourceWords("   ")).toBe(0);
    expect(countSourceWords("\n\t  \n")).toBe(0);
  });

  it("splits on whitespace runs after trim", () => {
    expect(countSourceWords("hello world")).toBe(2);
    expect(countSourceWords("  one   two\tthree  ")).toBe(3);
  });
});

describe("countSourceUtf8Bytes", () => {
  it("returns 0 for empty string", () => {
    expect(countSourceUtf8Bytes("")).toBe(0);
  });

  it("matches ASCII byte length", () => {
    expect(countSourceUtf8Bytes("a")).toBe(1);
    expect(countSourceUtf8Bytes("hello")).toBe(5);
  });

  it("counts UTF-8 for emoji (4 bytes, 2 UTF-16 code units in JS)", () => {
    expect("😀".length).toBe(2);
    expect(countSourceUtf8Bytes("😀")).toBe(4);
  });
});

describe("countSourceGraphemeClusters", () => {
  it("returns 0 for empty string", () => {
    expect(countSourceGraphemeClusters("")).toBe(0);
  });

  it("counts ASCII like length", () => {
    expect(countSourceGraphemeClusters("hello")).toBe(5);
  });

  it("counts emoji as one cluster when Intl.Segmenter exists", () => {
    expect("😀".length).toBe(2);
    expect(countSourceGraphemeClusters("😀")).toBe(1);
  });

  it("treats e + combining acute as one grapheme when Intl.Segmenter exists", () => {
    const s = "e\u0301";
    expect([...s].length).toBe(2);
    if (typeof Intl.Segmenter !== "undefined") {
      expect(countSourceGraphemeClusters(s)).toBe(1);
    }
  });
});
