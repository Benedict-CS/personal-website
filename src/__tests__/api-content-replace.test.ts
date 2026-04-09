/**
 * POST /api/posts/content-replace — preview and apply (mocked DB).
 */
import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/posts/content-replace/route";

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  requireSession: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { requireSession } from "@/lib/auth";

const mockRequireSession = requireSession as jest.MockedFunction<typeof requireSession>;

function req(body: object) {
  return new NextRequest("http://localhost/api/posts/content-replace", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/posts/content-replace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireSession.mockResolvedValue({ session: {} as never });
  });

  it("returns 401 when unauthorized", async () => {
    mockRequireSession.mockResolvedValueOnce({
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(req({ mode: "preview", find: "ab", replace: "x" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when find is too short", async () => {
    const res = await POST(req({ mode: "preview", find: "a", replace: "" }));
    expect(res.status).toBe(400);
  });

  it("preview returns matches", async () => {
    mockFindMany.mockResolvedValue([
      { id: "p1", title: "T", slug: "t", content: "hello old-url hello" },
    ]);
    const res = await POST(
      req({ mode: "preview", find: "old-url", replace: "new-url", matchCase: true })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.totalOccurrences).toBe(1);
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0].occurrences).toBe(1);
  });

  it("apply updates post content", async () => {
    mockFindMany.mockResolvedValue([
      { id: "p1", title: "T", slug: "s", content: "aa bb aa" },
    ]);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      content: "aa bb aa",
      slug: "s",
    });
    mockUpdate.mockResolvedValue({});
    const res = await POST(req({ mode: "apply", find: "aa", replace: "XX", matchCase: true }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedPosts).toBe(1);
    expect(mockUpdate).toHaveBeenCalled();
    const updateArg = mockUpdate.mock.calls[0][0] as { data: { content: string } };
    expect(updateArg.data.content).toBe("XX bb XX");
  });
});
