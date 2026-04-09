import { expandDevEmbeds } from "@/lib/markdown-dev-embeds";

describe("expandDevEmbeds", () => {
  it("expands GitHub and LeetCode comments to div placeholders", () => {
    const md = `## Hi\n<!-- embed:github:overview:octocat -->\n<!-- embed:leetcode:foo_bar -->`;
    const out = expandDevEmbeds(md);
    expect(out).toContain('class="dev-embed-github"');
    expect(out).toContain('data-user="octocat"');
    expect(out).toContain('data-variant="overview"');
    expect(out).toContain('class="dev-embed-leetcode"');
    expect(out).toContain('data-user="foo_bar"');
  });

  it("ignores invalid usernames", () => {
    const md = `<!-- embed:github:overview:bad name -->`;
    expect(expandDevEmbeds(md)).not.toContain("dev-embed-github");
  });
});
