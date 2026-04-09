import { buildCmsDateInsertMarkdown } from "@/lib/cms-date-insert";

describe("buildCmsDateInsertMarkdown", () => {
  it("includes ISO date and markdown bold wrapper", () => {
    const s = buildCmsDateInsertMarkdown(new Date("2026-04-09T12:00:00.000Z"));
    expect(s).toContain("2026-04-09");
    expect(s).toContain("**");
    expect(s).toContain("`");
  });
});
