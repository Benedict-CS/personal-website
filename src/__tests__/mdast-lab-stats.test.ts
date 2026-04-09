import { computeMdastStats } from "@/lib/mdast-lab-stats";
import type { Root } from "mdast";

describe("computeMdastStats", () => {
  it("returns null for null root", () => {
    expect(computeMdastStats(null)).toBeNull();
  });

  it("counts heading, code, and link nodes in a minimal tree", () => {
    const root = {
      type: "root",
      children: [
        {
          type: "heading",
          depth: 2,
          children: [{ type: "text", value: "Hi" }],
        },
        {
          type: "paragraph",
          children: [
            {
              type: "link",
              url: "https://example.com",
              children: [{ type: "text", value: "x" }],
            },
          ],
        },
        { type: "code", lang: "ts", value: "1" },
      ],
    } as unknown as Root;

    const s = computeMdastStats(root);
    expect(s).not.toBeNull();
    expect(s!.heading).toBe(1);
    expect(s!.code).toBe(1);
    expect(s!.link).toBe(1);
    expect(s!.nodes).toBeGreaterThanOrEqual(3);
  });
});
