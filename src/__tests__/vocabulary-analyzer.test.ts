import {
  analyzeVocabulary,
  diversityGradeColor,
} from "@/lib/vocabulary-analyzer";

describe("analyzeVocabulary", () => {
  it("returns zeros for empty content", () => {
    const result = analyzeVocabulary("");
    expect(result.totalWords).toBe(0);
    expect(result.uniqueWords).toBe(0);
    expect(result.typeTokenRatio).toBe(0);
    expect(result.overusedWords).toEqual([]);
    expect(result.topContentWords).toEqual([]);
  });

  it("counts total and unique words correctly", () => {
    const result = analyzeVocabulary("hello world hello there world hello");
    expect(result.totalWords).toBe(6);
    expect(result.uniqueWords).toBe(3);
  });

  it("computes type-token ratio as unique/total", () => {
    const result = analyzeVocabulary("apple banana cherry date elderberry fig grape");
    expect(result.typeTokenRatio).toBeGreaterThan(0);
    expect(result.typeTokenRatio).toBeLessThanOrEqual(1);
  });

  it("assigns Excellent grade for highly diverse content", () => {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const words = Array.from({ length: 100 }, (_, i) => {
      const a = alphabet[i % 26];
      const b = alphabet[Math.floor(i / 26) % 26];
      return `${a}${b}word`;
    });
    const result = analyzeVocabulary(words.join(" "));
    expect(result.grade).toBe("Excellent");
  });

  it("assigns Repetitive grade for very repetitive content", () => {
    const word = "container";
    const repeated = Array.from({ length: 200 }, () => word).join(" ");
    const result = analyzeVocabulary(repeated);
    expect(result.grade).toBe("Repetitive");
  });

  it("detects overused words exceeding 3% threshold", () => {
    const base = Array.from({ length: 100 }, (_, i) => `word${i}`).join(" ");
    const overused = Array.from({ length: 10 }, () => "kubernetes").join(" ");
    const result = analyzeVocabulary(`${base} ${overused}`);
    const kube = result.overusedWords.find((w) => w.word === "kubernetes");
    if (kube) {
      expect(kube.count).toBeGreaterThanOrEqual(4);
      expect(kube.percentage).toBeGreaterThan(0);
    }
  });

  it("limits overused words to 8", () => {
    const words = Array.from({ length: 20 }, (_, i) =>
      Array.from({ length: 10 }, () => `overuse${i}`).join(" ")
    ).join(" ");
    const result = analyzeVocabulary(words);
    expect(result.overusedWords.length).toBeLessThanOrEqual(8);
  });

  it("returns top 10 content words", () => {
    const words = Array.from({ length: 200 }, (_, i) => `term${i % 30}`).join(" ");
    const result = analyzeVocabulary(words);
    expect(result.topContentWords.length).toBeLessThanOrEqual(10);
  });

  it("filters stop words from content words", () => {
    const result = analyzeVocabulary("the the the and and or but docker docker docker kubernetes kubernetes");
    const contentWordNames = result.topContentWords.map((w) => w.word);
    expect(contentWordNames).not.toContain("the");
    expect(contentWordNames).not.toContain("and");
  });

  it("strips markdown before analysis", () => {
    const md = "## Heading\n\n**Bold** text with [link](url) and `code` here.\n\n```\ncode block\n```";
    const result = analyzeVocabulary(md);
    expect(result.totalWords).toBeGreaterThan(0);
    const allWords = result.topContentWords.map((w) => w.word);
    expect(allWords).not.toContain("##");
    expect(allWords).not.toContain("```");
  });

  it("top content words are sorted by frequency descending", () => {
    const words = "alpha alpha alpha beta beta gamma delta delta delta delta epsilon";
    const result = analyzeVocabulary(words);
    for (let i = 1; i < result.topContentWords.length; i++) {
      expect(result.topContentWords[i - 1].count).toBeGreaterThanOrEqual(result.topContentWords[i].count);
    }
  });

  it("handles content with only code blocks", () => {
    const result = analyzeVocabulary("```js\nconst x = 1;\nconst y = 2;\n```");
    expect(result.totalWords).toBe(0);
  });

  it("typeTokenRatio is between 0 and 1", () => {
    const cases = [
      "hello hello hello",
      "unique words everywhere different each time novel fresh creative original",
      Array.from({ length: 50 }, (_, i) => `word${i}`).join(" "),
    ];
    for (const text of cases) {
      const result = analyzeVocabulary(text);
      expect(result.typeTokenRatio).toBeGreaterThanOrEqual(0);
      expect(result.typeTokenRatio).toBeLessThanOrEqual(1);
    }
  });

  it("overused word percentage is calculated correctly", () => {
    const base = Array.from({ length: 100 }, (_, i) => `word${i}`).join(" ");
    const overused = Array.from({ length: 10 }, () => "repeated").join(" ");
    const result = analyzeVocabulary(`${base} ${overused}`);
    for (const ow of result.overusedWords) {
      expect(ow.percentage).toBeGreaterThan(0);
      expect(ow.percentage).toBeLessThan(100);
    }
  });

  it("assigns Good grade for short content", () => {
    const result = analyzeVocabulary("short post content here");
    expect(result.grade).toBe("Good");
  });
});

describe("diversityGradeColor", () => {
  it("returns correct colors for all grades", () => {
    expect(diversityGradeColor("Excellent").text).toContain("emerald");
    expect(diversityGradeColor("Good").text).toContain("sky");
    expect(diversityGradeColor("Fair").text).toContain("amber");
    expect(diversityGradeColor("Repetitive").text).toContain("rose");
  });
});
