/**
 * API route test: GET /api/cv/status (S3 HeadObject, mocked).
 */
import { NextResponse } from "next/server";
import { GET } from "@/app/api/cv/status/route";
import { requireSession } from "@/lib/auth";
import { s3Client } from "@/lib/s3";

jest.mock("@/lib/auth", () => ({
  requireSession: jest.fn(),
}));

jest.mock("@/lib/s3", () => ({
  s3Client: { send: jest.fn() },
  S3_BUCKET: "test-bucket",
}));

describe("GET /api/cv/status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (requireSession as jest.Mock).mockResolvedValue({
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns exists false when object is missing", async () => {
    (requireSession as jest.Mock).mockResolvedValue({ session: { user: {} } });
    (s3Client.send as jest.Mock).mockRejectedValue({ name: "NotFound" });
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ exists: false, lastModified: null, contentLength: null });
  });

  it("returns metadata when object exists", async () => {
    (requireSession as jest.Mock).mockResolvedValue({ session: { user: {} } });
    (s3Client.send as jest.Mock).mockResolvedValue({
      LastModified: new Date("2026-03-10T14:30:00.000Z"),
      ContentLength: 4096,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exists).toBe(true);
    expect(data.lastModified).toBe("2026-03-10T14:30:00.000Z");
    expect(data.contentLength).toBe(4096);
  });
});
