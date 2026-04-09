import { getOrCreateRequestId } from "@/lib/request-id";

describe("getOrCreateRequestId", () => {
  it("generates a 32-char hex id when no header", () => {
    const h = new Headers();
    const id = getOrCreateRequestId(h);
    expect(id).toMatch(/^[a-f0-9]{32}$/);
  });

  it("reuses valid x-request-id", () => {
    const h = new Headers();
    h.set("x-request-id", "upstream-req-id-001");
    expect(getOrCreateRequestId(h)).toBe("upstream-req-id-001");
  });

  it("reuses x-correlation-id when x-request-id missing", () => {
    const h = new Headers();
    h.set("x-correlation-id", "corr-abc-12345");
    expect(getOrCreateRequestId(h)).toBe("corr-abc-12345");
  });

  it("generates new id when incoming value is invalid", () => {
    const h = new Headers();
    h.set("x-request-id", "!!");
    const id = getOrCreateRequestId(h);
    expect(id).toMatch(/^[a-f0-9]{32}$/);
  });
});
