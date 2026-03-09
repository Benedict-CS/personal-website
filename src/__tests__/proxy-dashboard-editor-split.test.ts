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
  beforeEach(() => {
    jest.clearAllMocks();
    withAuthMock.mockReturnValue(() => NextResponse.next());
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

  it("does not apply dashboard auth wrapper on editor routes", async () => {
    const request = {
      nextUrl: { pathname: "/editor/home", origin: "http://localhost" },
      headers: new Headers(),
      cookies: { get: () => undefined },
      method: "GET",
    };
    await proxy(request as never, {} as never);
    expect(withAuthMock).not.toHaveBeenCalled();
  });
});
