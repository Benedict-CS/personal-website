import {
  sanitizeSlugForStorage,
  validateCustomPageDraft,
  validateNewCustomPageInput,
} from "@/lib/editor-validation";

describe("editor validation", () => {
  it("normalizes slug input to storage-safe format", () => {
    expect(sanitizeSlugForStorage("  Hello World!!  ")).toBe("hello-world");
    expect(sanitizeSlugForStorage("already-clean")).toBe("already-clean");
    expect(sanitizeSlugForStorage("___")).toBe("");
  });

  it("rejects invalid new custom page fields and duplicates", () => {
    const result = validateNewCustomPageInput(
      { title: "A", slug: "!!!" },
      new Set(["about-me"])
    );
    expect(result.valid).toBe(false);
    expect(result.errors.title).toContain("at least 2");
    expect(result.errors.slug).toContain("required");

    const dup = validateNewCustomPageInput(
      { title: "About", slug: "about-me" },
      new Set(["about-me"])
    );
    expect(dup.valid).toBe(false);
    expect(dup.errors.slug).toContain("already exists");
  });

  it("requires meaningful custom page draft content before save", () => {
    const invalid = validateCustomPageDraft({
      title: "Portfolio",
      slug: "portfolio",
      content: "short",
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.content).toContain("at least");

    const valid = validateCustomPageDraft({
      title: "Portfolio",
      slug: "portfolio",
      content: "This is a meaningful paragraph with enough words to pass validation checks.",
    });
    expect(valid.valid).toBe(true);
  });
});
