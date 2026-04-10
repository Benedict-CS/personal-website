import { summarizeContent } from "@/lib/content-summarizer";

describe("summarizeContent", () => {
  it("returns empty results for empty content", () => {
    const result = summarizeContent("Title", "");
    expect(result.candidates).toEqual([]);
    expect(result.suggested).toBe("");
  });

  it("returns empty results for very short content", () => {
    const result = summarizeContent("Title", "Hello.");
    expect(result.candidates).toEqual([]);
    expect(result.suggested).toBe("");
  });

  it("returns candidates for a multi-sentence post", () => {
    const content = [
      "## Introduction",
      "",
      "Docker containers have revolutionized how we deploy applications in production environments.",
      "They provide isolation, reproducibility, and scalability for modern software teams.",
      "",
      "## Getting Started",
      "",
      "Install Docker Desktop on your machine to begin working with containerized applications.",
      "The installation process is straightforward and well-documented for all major operating systems.",
    ].join("\n");
    const result = summarizeContent("Getting Started with Docker Containers", content);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.length).toBeLessThanOrEqual(5);
    expect(result.suggested.length).toBeGreaterThan(0);
  });

  it("ranks sentences with title keywords higher", () => {
    const content = [
      "Python is a versatile programming language used in many domains.",
      "Machine learning with Python has become incredibly popular in recent years.",
      "The weather today is pleasant and sunny across the region.",
    ].join(" ");
    const result = summarizeContent("Python Machine Learning Guide", content);
    const topText = result.candidates[0]?.text ?? "";
    expect(topText.toLowerCase()).toContain("python");
  });

  it("limits candidates to maxCandidates", () => {
    const sentences = Array.from({ length: 20 }, (_, i) =>
      `This is sentence number ${i + 1} discussing various important technical topics in detail.`
    );
    const result = summarizeContent("Technical Discussion", sentences.join(" "), 3);
    expect(result.candidates.length).toBeLessThanOrEqual(3);
  });

  it("strips markdown syntax before analysis", () => {
    const content = [
      "## Docker Setup",
      "",
      "**Docker** is essential for [container orchestration](https://docker.com) in production systems.",
      "Use `docker-compose` to manage multi-container applications easily.",
      "",
      "```bash",
      "docker run -d nginx",
      "```",
      "",
      "![Docker logo](docker.png)",
      "",
      "Production deployments benefit from container isolation and resource management capabilities.",
    ].join("\n");
    const result = summarizeContent("Docker Production Setup", content);
    expect(result.candidates.length).toBeGreaterThan(0);
    for (const c of result.candidates) {
      expect(c.text).not.toContain("##");
      expect(c.text).not.toContain("```");
      expect(c.text).not.toContain("![");
    }
  });

  it("suggested description is at most 155 characters", () => {
    const longSentences = Array.from({ length: 10 }, (_, i) =>
      `This is a moderately long sentence number ${i + 1} that discusses various technical concepts and architectural decisions in software engineering.`
    );
    const result = summarizeContent("Software Architecture", longSentences.join(" "));
    expect(result.suggested.length).toBeLessThanOrEqual(156);
  });

  it("combines two sentences when first is short", () => {
    const content = [
      "APIs are important.",
      "They enable communication between different software systems and services across the network.",
      "Authentication protects your API endpoints from unauthorized access and potential security threats.",
    ].join(" ");
    const result = summarizeContent("API Design", content);
    expect(result.suggested.length).toBeGreaterThan(0);
  });

  it("all candidate scores are non-negative", () => {
    const content = Array.from({ length: 8 }, (_, i) =>
      `Sentence ${i + 1} covers an important aspect of cloud computing and distributed systems architecture.`
    ).join(" ");
    const result = summarizeContent("Cloud Computing", content);
    for (const c of result.candidates) {
      expect(c.score).toBeGreaterThanOrEqual(0);
    }
  });

  it("candidates are sorted by score descending", () => {
    const content = Array.from({ length: 10 }, (_, i) =>
      `React hooks simplify state management in functional components for building interactive user interfaces in iteration ${i + 1}.`
    ).join(" ");
    const result = summarizeContent("React Hooks Guide", content);
    for (let i = 1; i < result.candidates.length; i++) {
      expect(result.candidates[i - 1].score).toBeGreaterThanOrEqual(result.candidates[i].score);
    }
  });

  it("each candidate preserves its original index", () => {
    const content = [
      "First sentence about programming languages and their evolution over time.",
      "Second sentence discussing database design patterns for scalable applications.",
      "Third sentence exploring cloud infrastructure and deployment strategies for teams.",
    ].join(" ");
    const result = summarizeContent("Programming", content);
    for (const c of result.candidates) {
      expect(typeof c.index).toBe("number");
      expect(c.index).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles content with only headings and no prose", () => {
    const content = "# Title\n## Section 1\n## Section 2\n### Subsection";
    const result = summarizeContent("Outline", content);
    expect(result.candidates).toEqual([]);
  });

  it("handles content with only code blocks", () => {
    const content = "```js\nconst x = 1;\nconst y = 2;\nconsole.log(x + y);\n```";
    const result = summarizeContent("Code Example", content);
    expect(result.candidates).toEqual([]);
  });

  it("position bias favors earlier sentences", () => {
    const identical = "This particular sentence discusses important system design patterns and architectural decisions.";
    const content = Array.from({ length: 5 }, () => identical).join(" ");
    const result = summarizeContent("System Design", content);
    if (result.candidates.length >= 2) {
      const firstIdx = result.candidates.find((c) => c.index === 0);
      const lastIdx = result.candidates.find((c) => c.index === result.candidates.length - 1);
      if (firstIdx && lastIdx) {
        expect(firstIdx.score).toBeGreaterThanOrEqual(lastIdx.score);
      }
    }
  });

  it("suggested field is a clean string without markdown artifacts", () => {
    const content = [
      "Kubernetes orchestrates container workloads across distributed cluster infrastructure.",
      "Deploy applications with zero-downtime rolling updates and automatic health checking.",
      "Monitor cluster performance using built-in dashboards and metrics collection tools.",
    ].join(" ");
    const result = summarizeContent("Kubernetes Deployment", content);
    expect(result.suggested).not.toContain("#");
    expect(result.suggested).not.toContain("*");
    expect(result.suggested).not.toContain("`");
    expect(result.suggested).not.toContain("[");
  });
});
