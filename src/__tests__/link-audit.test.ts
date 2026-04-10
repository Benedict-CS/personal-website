import { auditInternalMarkdownLinks } from "@/lib/link-audit";

const mockPostFindMany = jest.fn();
const mockCustomPageFindMany = jest.fn();
const mockTagFindMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: (...args: unknown[]) => mockPostFindMany(...args),
    },
    customPage: {
      findMany: (...args: unknown[]) => mockCustomPageFindMany(...args),
    },
    tag: {
      findMany: (...args: unknown[]) => mockTagFindMany(...args),
    },
  },
}));

describe("auditInternalMarkdownLinks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports unknown internal links and ignores external links", async () => {
    mockPostFindMany.mockResolvedValue([
      {
        id: "p1",
        title: "Post 1",
        slug: "post-1",
        content:
          "See [About](/about) and [Missing](/page/ghost). External [site](https://example.com).",
      },
    ]);
    mockCustomPageFindMany.mockResolvedValue([
      {
        id: "cp1",
        title: "Custom Page",
        slug: "custom-page",
        content: "Read [Blog Post](/blog/post-1) and [Nope](/blog/does-not-exist).",
      },
    ]);
    mockTagFindMany.mockResolvedValue([{ slug: "networking" }]);

    const report = await auditInternalMarkdownLinks();

    expect(report.scannedDocuments).toBe(2);
    expect(report.scannedLinks).toBe(4);
    expect(report.brokenLinks).toHaveLength(2);
    expect(report.brokenLinks.map((item) => item.normalizedPath).sort()).toEqual([
      "/blog/does-not-exist",
      "/page/ghost",
    ]);
  });
});
