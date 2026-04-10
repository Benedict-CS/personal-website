import { buildInternalLinkSuggestions } from "@/lib/internal-link-suggestions";

describe("internal-link-suggestions", () => {
  it("prioritizes candidates with tag and keyword overlap", () => {
    const suggestions = buildInternalLinkSuggestions({
      currentTitle: "Redis Caching Patterns",
      currentContent: "We compare write-through caching and cache invalidation in API services.",
      currentTags: ["redis", "backend"],
      candidates: [
        {
          id: "a",
          slug: "redis-invalidation-guide",
          title: "Redis Invalidation Guide",
          tags: ["redis"],
          content: "Cache invalidation techniques for backend APIs.",
        },
        {
          id: "b",
          slug: "react-motion-polish",
          title: "React motion polish",
          tags: ["frontend"],
          content: "Micro interactions with Framer Motion.",
        },
      ],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.slug).toBe("redis-invalidation-guide");
    expect(suggestions[0]?.score).toBeGreaterThan(0);
  });

  it("excludes posts already linked in markdown", () => {
    const suggestions = buildInternalLinkSuggestions({
      currentTitle: "Linking Test",
      currentContent: "Already linked here: [guide](/blog/redis-invalidation-guide).",
      currentTags: [],
      candidates: [
        {
          id: "a",
          slug: "redis-invalidation-guide",
          title: "Redis Invalidation Guide",
          tags: [],
          content: "Redis invalidation and write-through cache",
        },
      ],
    });

    expect(suggestions).toHaveLength(0);
  });
});
