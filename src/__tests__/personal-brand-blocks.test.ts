import {
  parseFormFieldsText,
  parseProjectsText,
  parseSkillsText,
  parseTimelineText,
} from "@/lib/personal-brand-blocks";

describe("personal-brand-blocks parsers", () => {
  it("parses timeline lines", () => {
    const rows = parseTimelineText("2020–2022|Dev|Co|Built things");
    expect(rows[0]).toMatchObject({
      period: "2020–2022",
      title: "Dev",
      organization: "Co",
      description: "Built things",
    });
  });

  it("parses projects", () => {
    const p = parseProjectsText("Site|Blog|https://x.com|https://i.jpg");
    expect(p[0]).toMatchObject({
      title: "Site",
      summary: "Blog",
      link: "https://x.com",
      imageUrl: "https://i.jpg",
    });
  });

  it("parses skills with icon key", () => {
    const s = parseSkillsText("TS|code|Strong");
    expect(s[0]).toMatchObject({ name: "TS", iconKey: "code", level: "Strong" });
  });

  it("parses form fields", () => {
    const f = parseFormFieldsText("Name|text|required\nSite|url|optional");
    expect(f[0].required).toBe(true);
    expect(f[1].fieldType).toBe("url");
    expect(f[1].required).toBe(false);
  });
});
