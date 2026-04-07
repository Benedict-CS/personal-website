import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/captcha-required/route";
import { getAttemptCountAsync, getClientIP, CAPTCHA_REQUIRED_AFTER } from "@/lib/login-rate-limit";

jest.mock("@/lib/login-rate-limit", () => ({
  getAttemptCountAsync: jest.fn(),
  getClientIP: jest.fn(),
  CAPTCHA_REQUIRED_AFTER: 2,
}));

describe("GET /api/auth/captcha-required", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getClientIP as jest.Mock).mockReturnValue("1.2.3.4");
  });

  it("returns false below threshold", async () => {
    (getAttemptCountAsync as jest.Mock).mockResolvedValue(CAPTCHA_REQUIRED_AFTER - 1);
    const req = new NextRequest("http://localhost/api/auth/captcha-required");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ captchaRequired: false });
  });

  it("returns true at threshold", async () => {
    (getAttemptCountAsync as jest.Mock).mockResolvedValue(CAPTCHA_REQUIRED_AFTER);
    const req = new NextRequest("http://localhost/api/auth/captcha-required");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ captchaRequired: true });
  });

  it("returns true above threshold", async () => {
    (getAttemptCountAsync as jest.Mock).mockResolvedValue(CAPTCHA_REQUIRED_AFTER + 3);
    const req = new NextRequest("http://localhost/api/auth/captcha-required");
    const res = await GET(req);
    const data = await res.json();
    expect(data.captchaRequired).toBe(true);
  });

  it("uses client IP extracted from request headers", async () => {
    (getAttemptCountAsync as jest.Mock).mockResolvedValue(0);
    const req = new NextRequest("http://localhost/api/auth/captcha-required", {
      headers: { "x-forwarded-for": "9.8.7.6" },
    });
    await GET(req);
    expect(getClientIP).toHaveBeenCalledWith(req.headers);
    expect(getAttemptCountAsync).toHaveBeenCalledWith("1.2.3.4");
  });
});

