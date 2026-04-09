import { stableStringify } from "@/lib/stable-stringify";

describe("stableStringify", () => {
  it("sorts object keys for stable output", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("preserves array order", () => {
    expect(stableStringify([3, 1, 2])).toBe("[3,1,2]");
  });
});
