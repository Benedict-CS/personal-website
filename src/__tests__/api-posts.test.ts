/**
 * API route tests: GET/POST /api/posts (with mocked DB and auth).
 */
import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "@/app/api/posts/route";

const mockFindMany = jest.fn();
const mockCreate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  requireSession: jest.fn(),
  authOptions: {},
}));
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock("@/lib/audit", () => ({
  auditLog: jest.fn(),
}));

import { requireSession } from "@/lib/auth";
import { getServerSession } from "next-auth";

const mockRequireSession = requireSession as jest.MockedFunction<typeof requireSession>;
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

function createGetRequest(searchParams?: Record<string, string>) {
  const url = new URL("http://localhost/api/posts");
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url.toString());
}

describe("GET /api/posts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(null);
  });

  it("returns empty array when no posts", async () => {
    mockFindMany.mockResolvedValue([]);
    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0);
  });

  it("returns posts with tags", async () => {
    const posts = [
      {
        id: "1",
        title: "First",
        slug: "first",
        content: "Body",
        published: true,
        tags: [{ id: "t1", name: "Tech", slug: "tech" }],
      },
    ];
    mockFindMany.mockResolvedValue(posts);
    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("First");
    expect(data[0].tags).toHaveLength(1);
    expect(data[0].publicationState).toBe("published");
  });

  it("filters by published when query param set", async () => {
    mockFindMany.mockResolvedValue([]);
    const req = createGetRequest({ published: "true" });
    await GET(req);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ published: true }]),
        }),
      })
    );
  });

  it("public GET never omits published filter (no draft leak)", async () => {
    mockFindMany.mockResolvedValue([]);
    const req = createGetRequest();
    await GET(req);
    expect(mockGetServerSession).toHaveBeenCalled();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ published: true }, { publishedAt: expect.any(Object) }]),
        }),
      })
    );
  });

  it("authenticated GET without published param can list all posts", async () => {
    mockGetServerSession.mockResolvedValue({ user: { name: "Admin" } } as never);
    mockFindMany.mockResolvedValue([]);
    const req = createGetRequest();
    await GET(req);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
  });
});

describe("POST /api/posts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireSession.mockResolvedValue({
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const req = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      body: JSON.stringify({
        title: "Test",
        slug: "test",
        content: "Body",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when missing required fields", async () => {
    mockRequireSession.mockResolvedValue({ session: { user: {} } } as Awaited<ReturnType<typeof requireSession>>);
    const req = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "Only title" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/required|title|slug|content/i);
  });

  it("returns 201 and post when valid body and authenticated", async () => {
    mockRequireSession.mockResolvedValue({ session: { user: {} } } as Awaited<ReturnType<typeof requireSession>>);
    const created = {
      id: "new-id",
      title: "New Post",
      slug: "new-post",
      content: "Content",
      published: false,
      tags: [],
    };
    mockCreate.mockResolvedValue(created);
    const req = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      body: JSON.stringify({
        title: "New Post",
        slug: "new-post",
        content: "Content",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe("New Post");
    expect(data.slug).toBe("new-post");
    expect(data.publicationState).toBe("draft");
  });
});
