/**
 * API route tests: POST /api/contact (validation and rate limit).
 * Mail sender (Resend/SMTP) is not mocked; 503 when not configured depends on env at load time.
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/contact/route";

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimitAsync: jest.fn(async () => ({ ok: true, remaining: 5 })),
  getClientIP: jest.fn(() => "127.0.0.1"),
}));

function createRequest(body: Record<string, string>) {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/contact", () => {
  it("returns 400 when name is missing", async () => {
    const req = createRequest({ email: "a@b.com", message: "Hi" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/name|required/i);
  });

  it("returns 400 when email is missing", async () => {
    const req = createRequest({ name: "Alice", message: "Hi" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email|required/i);
  });

  it("returns 400 when message is missing", async () => {
    const req = createRequest({ name: "Alice", email: "a@b.com" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/message|required/i);
  });

  it("returns 400 when name is only whitespace", async () => {
    const req = createRequest({ name: "   ", email: "a@b.com", message: "Hi" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when message is only whitespace", async () => {
    const req = createRequest({ name: "Alice", email: "a@b.com", message: "   " });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
