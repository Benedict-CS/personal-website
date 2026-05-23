import {
  isHumanCvDownloadRow,
  mergeCvDownloadDetails,
  mergeVisitorByIp,
} from "@/lib/analytics-cv-downloads";

describe("mergeCvDownloadDetails", () => {
  it("merges PageView and audit rows and dedupes same IP in the same minute", () => {
    const merged = mergeCvDownloadDetails(
      [
        {
          path: "/cv.pdf",
          ip: "1.2.3.4",
          country: "TW",
          city: "Taipei",
          referrer: null,
          userAgent: "Mozilla/5.0",
          createdAt: new Date("2026-05-01T10:00:05Z"),
        },
      ],
      [
        {
          ip: "1.2.3.4",
          createdAt: new Date("2026-05-01T10:00:30Z"),
          details: JSON.stringify({ path: "/cv.pdf", referrer: "https://example.com/" }),
        },
        {
          ip: "5.6.7.8",
          createdAt: new Date("2026-05-02T12:00:00Z"),
          details: null,
        },
      ]
    );
    expect(merged).toHaveLength(2);
    expect(merged[0].ip).toBe("5.6.7.8");
    expect(merged[1].ip).toBe("1.2.3.4");
    expect(merged[1].country).toBe("TW");
  });
});

describe("isHumanCvDownloadRow", () => {
  it("excludes Facebook link-preview crawlers", () => {
    expect(
      isHumanCvDownloadRow({
        path: "/cv.pdf",
        ip: "57.141.16.45",
        createdAt: "2026-05-16T20:42:00.000Z",
        userAgent: "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
      })
    ).toBe(false);
  });
});

describe("mergeVisitorByIp", () => {
  it("adds CV-only IPs with page views equal to CV count (never 0 views + 1 CV)", () => {
    const merged = mergeVisitorByIp(
      [{ ip: "1.2.3.4", count: 5, lastVisit: "2026-05-10T12:00:00.000Z" }],
      [
        { ip: "1.2.3.4", count: 1, lastVisit: "2026-05-10T22:00:00.000Z" },
        { ip: "107.189.7.156", count: 1, lastVisit: "2026-05-10T22:23:00.000Z" },
      ]
    );
    expect(merged).toHaveLength(2);
    const withViews = merged.find((r) => r.ip === "1.2.3.4");
    expect(withViews?.count).toBe(5);
    expect(withViews?.cvDownloads).toBe(1);
    const cvOnly = merged.find((r) => r.ip === "107.189.7.156");
    expect(cvOnly?.count).toBe(1);
    expect(cvOnly?.cvDownloads).toBe(1);
  });
});
