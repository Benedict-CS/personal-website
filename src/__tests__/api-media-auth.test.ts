import { NextResponse } from "next/server";
import { GET } from "@/app/api/media/route";
import { requireSession } from "@/lib/auth";
import { listS3Objects } from "@/lib/s3";

jest.mock("@/lib/auth", () => ({
  requireSession: jest.fn(),
}));

jest.mock("@/lib/s3", () => ({
  listS3Objects: jest.fn(),
}));

describe("GET /api/media auth and response", () => {
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

  it("returns sorted files and excludes cv.pdf when authenticated", async () => {
    (requireSession as jest.Mock).mockResolvedValue({ session: { user: {} } });
    (listS3Objects as jest.Mock).mockResolvedValue([
      { Key: "cv.pdf", Size: 1, LastModified: new Date("2026-03-01T00:00:00Z") },
      { Key: "a.png", Size: 2, LastModified: new Date("2026-03-02T00:00:00Z") },
      { Key: "b.png", Size: 3, LastModified: new Date("2026-03-03T00:00:00Z") },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("b.png");
    expect(data[1].name).toBe("a.png");
  });
});

