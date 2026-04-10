import { buildCvProfileLines } from "@/lib/cv-profile-export";

describe("cv-profile-export", () => {
  it("builds readable CV lines from structured snapshot", () => {
    const lines = buildCvProfileLines({
      heroName: "Alex Chen",
      heroTagline: "Full-Stack Engineer",
      heroEmail: "alex@example.com",
      introText: "Builds reliable product systems.",
      educationBlocks: [
        {
          title: "M.S. Computer Science",
          organization: "NYCU",
          dateRange: "2023 - 2026",
          content: "- Thesis on CI/CD\n- Focus on distributed systems",
        },
      ],
      technicalSkills: [{ category: "Languages", items: ["TypeScript", "Go"] }],
    });

    expect(lines.join("\n")).toContain("Alex Chen");
    expect(lines.join("\n")).toContain("EDUCATION");
    expect(lines.join("\n")).toContain("SKILLS");
    expect(lines.join("\n")).toContain("Languages: TypeScript, Go");
  });
});
