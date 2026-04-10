import { buildTranslatedDraftScaffold } from "@/lib/content-translator";

describe("content translator scaffold", () => {
  it("builds locale-specific draft metadata and scaffold", () => {
    const result = buildTranslatedDraftScaffold({
      title: "Performance guide",
      description: "Security summary",
      content: "# Source body",
      locale: "zh-TW",
    });

    expect(result.translatedTitle).toContain("(zh-TW)");
    expect(result.translatedDescription).toContain("[zh-TW]");
    expect(result.translatedContent).toContain("Source (English)");
    expect(result.translatedContent).toContain("# Source body");
  });
});
