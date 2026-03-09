/**
 * API route test: GET /api/site-config returns expected shape (with mocked DB).
 */
import { GET } from "@/app/api/site-config/route";

const mockFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    siteConfig: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

describe("GET /api/site-config", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns default config when no row exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      siteName: "My Site",
      navItems: expect.any(Array),
      templateId: "default",
    });
    expect(Array.isArray(data.navItems)).toBe(true);
    expect(data.navItems.length).toBeGreaterThan(0);
  });

  it("returns stored config when row exists", async () => {
    mockFindUnique
      .mockResolvedValueOnce({
        siteName: "Test Site",
        logoUrl: null,
        faviconUrl: null,
        metaTitle: "",
        metaDescription: null,
        authorName: null,
        links: {},
        navItems: [{ label: "Home", href: "/" }],
        footerText: null,
        ogImageUrl: null,
      })
      .mockResolvedValueOnce({
        setupCompleted: true,
        templateId: "minimal",
        themeMode: "light",
        autoAddCustomPagesToNav: true,
      });
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.siteName).toBe("Test Site");
    expect(data.navItems).toEqual([{ label: "Home", href: "/" }]);
    expect(data.templateId).toBe("minimal");
  });
});
