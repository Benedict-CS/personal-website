import { resolveEditorTarget } from "@/lib/editor-route";

describe("resolveEditorTarget", () => {
  it("resolves core routes", () => {
    expect(resolveEditorTarget(["home"])).toEqual({ kind: "home" });
    expect(resolveEditorTarget(["about"])).toEqual({ kind: "about" });
    expect(resolveEditorTarget(["contact"])).toEqual({ kind: "contact" });
  });

  it("resolves custom page routes", () => {
    expect(resolveEditorTarget(["page", "portfolio"])).toEqual({ kind: "custom-page", slug: "portfolio" });
  });

  it("rejects invalid routes", () => {
    expect(resolveEditorTarget(["dashboard"])).toBeNull();
    expect(resolveEditorTarget(["page"])).toBeNull();
    expect(resolveEditorTarget(["page", ""])).toBeNull();
  });
});
