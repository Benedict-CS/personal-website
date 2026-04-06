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

  beforeEach(() => {
    jest.clearAllMocks();
    withAuthMock.mockReturnValue(() => NextResponse.next());
    delete process.env.ACCESS_BLOCK_IP_PREFIXES;
    delete process.env.ACCESS_ALLOW_IPS;
  });

  afterAll(() => {
    process.env.ACCESS_BLOCK_IP_PREFIXES = origBlock;
    process.env.ACCESS_ALLOW_IPS = origAllow;
  });

  it("protects dashboard routes via withAuth", async () => {
    const request = {
      nextUrl: { pathname: "/dashboard", origin: "http://localhost" },
      headers: new Headers(),
      cookies: { get: () => undefined },
      method: "GET",
    };
    await proxy(request as never, {} as never);
    expect(withAuthMock).toHaveBeenCalled();
  });

  it("protects editor routes via withAuth", async () => {
    const request = {
      nextUrl: { pathname: "/editor/home", origin: "http://localhost" },
      headers: new Headers(),
      cookies: { get: () => undefined },
      method: "GET",
    };
    await proxy(request as never, {} as never);
    expect(withAuthMock).toHaveBeenCalled();
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
    expect(res.status).toBe(403);
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
    expect(res.status).not.toBe(403);
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
    expect(res.status).toBe(403);
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
    expect(res.status).toBe(403);
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
});
