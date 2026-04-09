import { slugifyPostTitle } from "@/lib/cms-slug-from-title";

describe("slugifyPostTitle", () => {
  it("produces a valid slug shape", () => {
    expect(slugifyPostTitle("Hello World!")).toBe("hello-world");
  });

  it("collapses hyphens and strips edges", () => {
    expect(slugifyPostTitle("  Foo   ---  Bar  ")).toBe("foo-bar");
  });

  it("handles empty input", () => {
    expect(slugifyPostTitle("")).toBe("");
    expect(slugifyPostTitle("   !!!  ")).toBe("");
  });
});
