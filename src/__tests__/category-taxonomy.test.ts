import { buildCategoryTaxonomy } from "@/lib/category-taxonomy";

describe("buildCategoryTaxonomy", () => {
  it("builds nested nodes and accumulates counts across parents", () => {
    const tree = buildCategoryTaxonomy([
      "LeetCode/Array",
      "LeetCode/Array",
      "LeetCode/DP",
      "System Design",
    ]);

    expect(tree.length).toBe(2);
    const leetcode = tree.find((node) => node.slug === "leetcode");
    expect(leetcode?.count).toBe(3);
    expect(leetcode?.children.find((child) => child.slug === "leetcode/array")?.count).toBe(2);
  });

  it("ignores empty and malformed category paths", () => {
    const tree = buildCategoryTaxonomy(["", "  ", "/", "A//B", "A/B"]);
    expect(tree.length).toBe(1);
    expect(tree[0]?.slug).toBe("a");
    expect(tree[0]?.children[0]?.slug).toBe("a/b");
  });
});
