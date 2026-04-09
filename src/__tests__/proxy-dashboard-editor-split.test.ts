import { NextResponse } from "next/server";
import { proxy } from "@/proxy";

const withAuthMock = jest.fn();

jest.mock("next-auth/middleware", () => ({
  withAuth: (...args: unknown[]) => withAuthMock(...args),
}));

jest.mock("@/lib/logger", () => ({
  logRequest: jest.fn(),
}));

describe("proxy dashboard/editor split", () => {
  const origBlock = process.env.ACCESS_BLOCK_IP_PREFIXES;
  const origAllow = process.env.ACCESS_ALLOW_IPS;
  const origEnableHsts = process.env.ENABLE_HSTS;

  beforeEach(() => {
    jest.clearAllMocks();
    withAuthMock.mockReturnValue(() => NextResponse.next());
    delete process.env.ACCESS_BLOCK_IP_PREFIXES;
    delete process.env.ACCESS_ALLOW_IPS;
    delete process.env.ENABLE_HSTS;
  });

  afterAll(() => {
    process.env.ACCESS_BLOCK_IP_PREFIXES = origBlock;
    process.env.ACCESS_ALLOW_IPS = origAllow;
    if (origEnableHsts === undefined) delete process.env.ENABLE_HSTS;
    else process.env.ENABLE_HSTS = origEnableHsts;
  });

  it("protects dashboard routes via withAuth", async () => {
    const request = {
      nextUrl: { pathname: "/dashboard", origin: "http://localhost" },
      headers: new Headers(),
      cookies: { get: () => undefined },
      method: "GET",
    };
    const res = await proxy(request as never, {} as never);
    expect(withAuthMock).toHaveBeenCalled();
    if (!res) throw new Error("expected NextResponse");
    expect(res.headers.get("x-request-id")).toMatch(/^[a-f0-9]{32}$/);
  });

  it("protects editor routes via withAuth", async () => {
    const request = {
      nextUrl: { pathname: "/editor/home", origin: "http://localhost" },
      headers: new Headers(),
      cookies: { get: () => undefined },
      method: "GET",
    };
    const res = await proxy(request as never, {} as never);
    expect(withAuthMock).toHaveBeenCalled();
    if (!res) throw new Error("expected NextResponse");
    expect(res.headers.get("x-request-id")).toMatch(/^[a-f0-9]{32}$/);
  });

  it("returns 403 for blocked IP before auth (X-Forwarded-For)", async () => {
    process.env.ACCESS_BLOCK_IP_PREFIXES = "140.113.194.";
    process.env.ACCESS_ALLOW_IPS = "140.113.194.249";
    const headers = new Headers();
    headers.set("x-forwarded-for", "140.113.194.88");
    const request = {
      nextUrl: { pathname: "/dashboard", origin: "http://localhost" },
      headers,
      cookies: { get: () => undefined },
      method: "GET",
    };
    const res = await proxy(request as never, {} as never);
    expect(res).toBeDefined();
    expect(res!.status).toBe(403);
    expect(res!.headers.get("x-request-id")).toBeTruthy();
    expect(withAuthMock).not.toHaveBeenCalled();
  });

  it("allows POST /api/analytics/access-block-log through IP block so internal log fetch can succeed", async () => {
    process.env.ACCESS_BLOCK_IP_PREFIXES = "140.113.194.";
    delete process.env.ACCESS_ALLOW_IPS;
    const headers = new Headers();
    headers.set("x-forwarded-for", "140.113.194.88");
    const request = {
      nextUrl: { pathname: "/api/analytics/access-block-log", origin: "http://localhost" },
      headers,
      cookies: { get: () => undefined },
      method: "POST",
    };
    const res = await proxy(request as never, {} as never);
    expect(res).toBeDefined();
    expect(res!.status).not.toBe(403);
  });

  it("still returns 403 for blocked IP on GET /api/analytics/access-block-log", async () => {
    process.env.ACCESS_BLOCK_IP_PREFIXES = "140.113.194.";
    delete process.env.ACCESS_ALLOW_IPS;
    const headers = new Headers();
    headers.set("x-forwarded-for", "140.113.194.88");
    const request = {
      nextUrl: { pathname: "/api/analytics/access-block-log", origin: "http://localhost" },
      headers,
      cookies: { get: () => undefined },
      method: "GET",
    };
    const res = await proxy(request as never, {} as never);
    expect(res).toBeDefined();
    expect(res!.status).toBe(403);
  });

  it("returns 403 using CF-Connecting-IP when present", async () => {
    process.env.ACCESS_BLOCK_IP_PREFIXES = "140.113.194.";
    delete process.env.ACCESS_ALLOW_IPS;
    const headers = new Headers();
    headers.set("cf-connecting-ip", "140.113.194.10");
    headers.set("x-forwarded-for", "10.0.0.1");
    const request = {
      nextUrl: { pathname: "/", origin: "http://localhost" },
      headers,
      cookies: { get: () => undefined },
      method: "GET",
    };
    const res = await proxy(request as never, {} as never);
    expect(res).toBeDefined();
    expect(res!.status).toBe(403);
  });

  it("sets x-request-id on public HTML routes", async () => {
    const request = {
      nextUrl: { pathname: "/about", origin: "http://localhost" },
      headers: new Headers(),
      cookies: { get: () => undefined },
      method: "GET",
    };
    const res = await proxy(request as never, {} as never);
    if (!res) throw new Error("expected NextResponse");
    expect(res.headers.get("x-request-id")).toMatch(/^[a-f0-9]{32}$/);
  });

  it("preserves incoming x-request-id on public routes", async () => {
    const headers = new Headers();
    headers.set("x-request-id", "edge-provided-id-0001");
    const request = {
      nextUrl: { pathname: "/contact", origin: "http://localhost" },
      headers,
      cookies: { get: () => undefined },
      method: "GET",
    };
    const res = await proxy(request as never, {} as never);
    if (!res) throw new Error("expected NextResponse");
    expect(res.headers.get("x-request-id")).toBe("edge-provided-id-0001");
  });

  it("allows allowlisted IP through to dashboard auth", async () => {
    process.env.ACCESS_BLOCK_IP_PREFIXES = "140.113.194.";
    process.env.ACCESS_ALLOW_IPS = "140.113.194.249";
    const headers = new Headers();
    headers.set("x-forwarded-for", "140.113.194.249");
    const request = {
      nextUrl: { pathname: "/dashboard", origin: "http://localhost" },
      headers,
      cookies: { get: () => undefined },
      method: "GET",
    };
    await proxy(request as never, {} as never);
    expect(withAuthMock).toHaveBeenCalled();
  });

  it("sets Strict-Transport-Security only when ENABLE_HSTS is true and request is HTTPS", async () => {
    process.env.ENABLE_HSTS = "true";
    const headers = new Headers();
    headers.set("x-forwarded-proto", "https");
    const request = {
      nextUrl: { pathname: "/", origin: "https://example.com" },
      headers,
      cookies: { get: () => undefined },
      method: "GET",
    };
    const res = await proxy(request as never, {} as never);
    if (!res) throw new Error("expected NextResponse");
    expect(res.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains; preload"
    );
  });

  it("does not set Strict-Transport-Security when ENABLE_HSTS is unset (even if HTTPS)", async () => {
    const headers = new Headers();
    headers.set("x-forwarded-proto", "https");
    const request = {
      nextUrl: { pathname: "/about", origin: "https://example.com" },
      headers,
      cookies: { get: () => undefined },
      method: "GET",
    };
    const res = await proxy(request as never, {} as never);
    if (!res) throw new Error("expected NextResponse");
    expect(res.headers.get("Strict-Transport-Security")).toBeNull();
  });
});
