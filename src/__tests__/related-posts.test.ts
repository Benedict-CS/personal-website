import {
  computeSimilarity,
  findRelatedPosts,
  type PostForSimilarity,
} from "@/lib/related-posts";

function makePost(
  id: string,
  title: string,
  tags: string[],
  content: string
): PostForSimilarity {
  return { id, title, slug: id, tags, content };
}

describe("computeSimilarity", () => {
  it("returns 0 for completely unrelated posts", () => {
    const a = makePost("1", "React Hooks Guide", ["React"], "Learn about useState and useEffect hooks in React components.");
    const b = makePost("2", "Sourdough Bread Recipe", ["Cooking"], "Mix flour water and salt to make delicious bread at home.");
    const result = computeSimilarity(a, b);
    expect(result.score).toBeLessThan(10);
  });

  it("returns high score for posts with shared tags", () => {
    const a = makePost("1", "Docker Basics", ["Docker", "DevOps", "Linux"], "Install Docker on Ubuntu.");
    const b = makePost("2", "Docker Compose", ["Docker", "DevOps"], "Use Docker Compose for multi-container apps.");
    const result = computeSimilarity(a, b);
    expect(result.score).toBeGreaterThan(20);
    expect(result.reasons.some((r) => r.includes("shared tag"))).toBe(true);
  });

  it("returns high score for posts with overlapping title keywords", () => {
    const a = makePost("1", "Building REST APIs with Express", ["Node"], "Express server setup.");
    const b = makePost("2", "Testing REST APIs with Supertest", ["Testing"], "Test Express REST endpoints.");
    const result = computeSimilarity(a, b);
    expect(result.score).toBeGreaterThan(5);
    expect(result.reasons.some((r) => r.includes("title keywords"))).toBe(true);
  });

  it("returns positive score for posts with similar content vocabulary", () => {
    const sharedVocab = "typescript generics interfaces unions discriminated narrowing conditional mapped template literal";
    const a = makePost("1", "TypeScript Generics", ["TypeScript"], `Advanced ${sharedVocab} patterns for type safety.`);
    const b = makePost("2", "TypeScript Type System", ["TypeScript"], `Exploring ${sharedVocab} in depth for better code.`);
    const result = computeSimilarity(a, b);
    expect(result.score).toBeGreaterThan(15);
  });

  it("includes shared tag names in reasons", () => {
    const a = makePost("1", "A", ["React", "Next.js"], "content");
    const b = makePost("2", "B", ["React", "TypeScript"], "content");
    const result = computeSimilarity(a, b);
    expect(result.reasons.some((r) => r.includes("1 shared tag"))).toBe(true);
  });

  it("handles posts with no tags", () => {
    const a = makePost("1", "Hello World", [], "Some content.");
    const b = makePost("2", "Goodbye World", [], "Some content.");
    const result = computeSimilarity(a, b);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("handles posts with empty content", () => {
    const a = makePost("1", "Title A", ["Tag"], "");
    const b = makePost("2", "Title B", ["Tag"], "");
    const result = computeSimilarity(a, b);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("score never exceeds 100", () => {
    const tags = Array.from({ length: 10 }, (_, i) => `Tag${i}`);
    const a = makePost("1", "Identical Title Keywords Match", tags, "Same exact content vocabulary repeated.");
    const b = makePost("2", "Identical Title Keywords Match", tags, "Same exact content vocabulary repeated.");
    const result = computeSimilarity(a, b);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("strips markdown syntax before comparison", () => {
    const a = makePost("1", "Markdown Post", ["Dev"], "## Heading\n\n**bold** text with [links](http://example.com) and `code`.");
    const b = makePost("2", "Similar Post", ["Dev"], "Heading bold text with links and code.");
    const result = computeSimilarity(a, b);
    expect(result.score).toBeGreaterThan(0);
  });
});

describe("findRelatedPosts", () => {
  const source = makePost("src", "Building APIs with Node.js", ["Node.js", "API", "Backend"], "Express routes middleware authentication database.");
  const candidates = [
    makePost("c1", "Node.js Best Practices", ["Node.js", "Backend"], "Express middleware error handling patterns in node applications."),
    makePost("c2", "React Component Patterns", ["React", "Frontend"], "Hooks context reducers component composition in react apps."),
    makePost("c3", "API Authentication Guide", ["API", "Security"], "JWT OAuth tokens authentication middleware for rest api endpoints."),
    makePost("c4", "CSS Grid Layout", ["CSS", "Frontend"], "Grid template areas columns rows responsive design layout."),
    makePost("c5", "Backend Testing", ["Backend", "Testing"], "Unit integration testing express routes database mocking jest."),
  ];

  it("returns results sorted by score descending", () => {
    const results = findRelatedPosts(source, candidates);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("excludes the source post from results", () => {
    const withSource = [...candidates, source];
    const results = findRelatedPosts(source, withSource);
    expect(results.find((r) => r.id === "src")).toBeUndefined();
  });

  it("limits results to specified count", () => {
    const results = findRelatedPosts(source, candidates, 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("filters out posts below minScore", () => {
    const results = findRelatedPosts(source, candidates, 10, 50);
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(50);
    }
  });

  it("returns empty array for no candidates", () => {
    const results = findRelatedPosts(source, []);
    expect(results).toEqual([]);
  });

  it("returns empty array when no candidates meet minScore", () => {
    const unrelated = [makePost("x", "Cooking Tips", ["Food"], "Make pasta and pizza with fresh ingredients.")];
    const results = findRelatedPosts(source, unrelated, 5, 50);
    expect(results).toEqual([]);
  });

  it("includes reasons for each related post", () => {
    const results = findRelatedPosts(source, candidates, 5, 1);
    for (const r of results) {
      expect(Array.isArray(r.reasons)).toBe(true);
    }
  });

  it("ranks tag-similar posts higher than unrelated", () => {
    const results = findRelatedPosts(source, candidates, 5, 1);
    const nodePost = results.find((r) => r.id === "c1");
    const cssPost = results.find((r) => r.id === "c4");
    if (nodePost && cssPost) {
      expect(nodePost.score).toBeGreaterThan(cssPost.score);
    }
  });
});
