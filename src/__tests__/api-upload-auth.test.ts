import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/upload/route";
import { requireSession } from "@/lib/auth";
import { processImage } from "@/lib/image-process";
import { uploadToS3 } from "@/lib/s3";

jest.mock("@/lib/auth", () => ({
  requireSession: jest.fn(),
}));

jest.mock("@/lib/image-process", () => ({
  processImage: jest.fn(),
}));

jest.mock("@/lib/s3", () => ({
  uploadToS3: jest.fn(),
}));

function createFormRequest(file?: File) {
  const form = new FormData();
  if (file) form.append("file", file);
  return new NextRequest("http://localhost/api/upload", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/upload auth and validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (requireSession as jest.Mock).mockResolvedValue({
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const req = createFormRequest();
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when file is missing", async () => {
    (requireSession as jest.Mock).mockResolvedValue({ session: { user: {} } });
    const req = createFormRequest();
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/no file/i);
  });

  it("returns 400 for invalid file type", async () => {
    (requireSession as jest.Mock).mockResolvedValue({ session: { user: {} } });
    const bad = new File(["x"], "x.txt", { type: "text/plain" });
    const req = createFormRequest(bad);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid file type/i);
  });

  it("returns 200 with url when upload succeeds", async () => {
    (requireSession as jest.Mock).mockResolvedValue({ session: { user: {} } });
    const file = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });
    (processImage as jest.Mock).mockResolvedValue({
      buffer: Buffer.from([1, 2, 3]),
      contentType: "image/png",
      fileName: "ok.png",
    });
    (uploadToS3 as jest.Mock).mockResolvedValue("/api/media/serve/ok.png");
    const req = createFormRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe("/api/media/serve/ok.png");
  });
});

