import { suggestTags, type ExistingTag } from "@/lib/auto-tag-suggest";

const EXISTING_TAGS: ExistingTag[] = [
  { name: "Next.js", slug: "nextjs" },
  { name: "React", slug: "react" },
  { name: "TypeScript", slug: "typescript" },
  { name: "Docker", slug: "docker" },
  { name: "Linux", slug: "linux" },
  { name: "Tailwind CSS", slug: "tailwind-css" },
  { name: "PostgreSQL", slug: "postgresql" },
  { name: "DevOps", slug: "devops" },
];

describe("suggestTags", () => {
  it("returns empty array for empty content", () => {
    const result = suggestTags("", "", EXISTING_TAGS);
    expect(result).toEqual([]);
  });

  it("returns empty array for stop-words-only content", () => {
    const result = suggestTags("The And Or", "a the is was are", EXISTING_TAGS);
    expect(result).toEqual([]);
  });

  it("suggests existing tags when title keywords match", () => {
    const result = suggestTags(
      "Building a Blog with Next.js and React",
      "This post covers building a blog with Next.js and React components.",
      EXISTING_TAGS
    );
    const tagNames = result.map((s) => s.tag);
    expect(tagNames).toContain("Next.js");
    expect(tagNames).toContain("React");
    expect(result.every((s) => s.score > 0)).toBe(true);
  });

  it("ranks tags with title matches higher than content-only matches", () => {
    const result = suggestTags(
      "Getting Started with React",
      "React is a library for building UIs. You might also use Docker for deployment.",
      EXISTING_TAGS
    );
    const reactSuggestion = result.find((s) => s.tag === "React");
    const dockerSuggestion = result.find((s) => s.tag === "Docker");
    if (reactSuggestion && dockerSuggestion) {
      expect(reactSuggestion.score).toBeGreaterThan(dockerSuggestion.score);
    }
  });

  it("excludes tags already assigned to the post", () => {
    const result = suggestTags(
      "Building with React and TypeScript",
      "React and TypeScript work great together for building web apps.",
      EXISTING_TAGS,
      "React, TypeScript"
    );
    const tagNames = result.map((s) => s.tag);
    expect(tagNames).not.toContain("React");
    expect(tagNames).not.toContain("TypeScript");
  });

  it("marks existing tags with isExisting: true", () => {
    const result = suggestTags(
      "Deploying with Docker",
      "Docker containers make deployment easy. Docker compose simplifies multi-service setups.",
      EXISTING_TAGS
    );
    const dockerSuggestion = result.find((s) => s.tag === "Docker");
    expect(dockerSuggestion).toBeDefined();
    expect(dockerSuggestion?.isExisting).toBe(true);
  });

  it("suggests new tags from high-frequency title terms", () => {
    const result = suggestTags(
      "Understanding Kubernetes Orchestration",
      "Kubernetes orchestration handles kubernetes pods. Kubernetes clusters scale automatically with kubernetes.",
      [] // no existing tags
    );
    const tagNames = result.map((s) => s.tag.toLowerCase());
    expect(tagNames.some((t) => t.includes("kubernetes"))).toBe(true);
    const kubeSuggestion = result.find((s) => s.tag.toLowerCase().includes("kubernetes"));
    expect(kubeSuggestion?.isExisting).toBe(false);
  });

  it("limits results to maxSuggestions", () => {
    const manyTags: ExistingTag[] = Array.from({ length: 20 }, (_, i) => ({
      name: `Tag${i}`,
      slug: `tag${i}`,
    }));
    const content = manyTags.map((t) => `${t.name} ${t.name} ${t.name}`).join(". ");
    const result = suggestTags("Tag0 Tag1 Tag2", content, manyTags, "", 5);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("includes reason text for each suggestion", () => {
    const result = suggestTags(
      "React Performance Tips",
      "React performance optimization techniques. React hooks for better react performance.",
      EXISTING_TAGS
    );
    for (const suggestion of result) {
      expect(suggestion.reason.length).toBeGreaterThan(0);
    }
  });

  it("handles content with markdown syntax", () => {
    const result = suggestTags(
      "Docker Guide",
      "## Setting up Docker\n\n```bash\ndocker run -it ubuntu\n```\n\nDocker is great for **containerization**. Use [Docker Compose](https://docs.docker.com) for multi-service.",
      EXISTING_TAGS
    );
    const dockerSuggestion = result.find((s) => s.tag === "Docker");
    expect(dockerSuggestion).toBeDefined();
    expect(dockerSuggestion!.score).toBeGreaterThan(0);
  });

  it("handles partial tag name matches in content", () => {
    const result = suggestTags(
      "Styling with Tailwind",
      "Tailwind CSS utility classes make styling fast. Tailwind responsive design is intuitive.",
      EXISTING_TAGS
    );
    const tailwindSuggestion = result.find((s) => s.tag === "Tailwind CSS");
    expect(tailwindSuggestion).toBeDefined();
  });

  it("returns suggestions sorted by score descending", () => {
    const result = suggestTags(
      "Full Stack Development with React and Docker",
      "React components. Docker containers. React hooks. Docker volumes. React state management.",
      EXISTING_TAGS
    );
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it("handles case-insensitive tag matching", () => {
    const result = suggestTags(
      "Working with typescript",
      "typescript type checking. typescript generics. typescript interfaces.",
      EXISTING_TAGS
    );
    const tsSuggestion = result.find((s) => s.tag === "TypeScript");
    expect(tsSuggestion).toBeDefined();
  });

  it("handles empty existing tags list", () => {
    const result = suggestTags(
      "Building Websites",
      "Building websites with modern tools. Building websites takes practice. Building websites is fun.",
      []
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it("produces score > 0 for every returned suggestion", () => {
    const result = suggestTags(
      "React and Next.js Tutorial",
      "React components work with Next.js routing. React hooks simplify state in Next.js apps.",
      EXISTING_TAGS
    );
    for (const s of result) {
      expect(s.score).toBeGreaterThan(0);
    }
  });
});
