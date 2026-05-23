import {
  isDirectTagProbePath,
  isLowEngagementProbeIp,
  isQualifiedPageView,
  prismaWhereQualifiedPageView,
} from "@/lib/analytics-qualified-visit";

describe("isQualifiedPageView", () => {
  it("rejects homepage with no dwell time", () => {
    expect(isQualifiedPageView("/", null)).toBe(false);
    expect(isQualifiedPageView("/", 0)).toBe(false);
  });

  it("accepts homepage with dwell time", () => {
    expect(isQualifiedPageView("/", 12)).toBe(true);
  });

  it("accepts inner pages without dwell (LinkedIn landings, quick reads)", () => {
    expect(isQualifiedPageView("/about", null)).toBe(true);
    expect(isQualifiedPageView("/blog", null)).toBe(true);
    expect(isQualifiedPageView("/blog/tag/foo", null)).toBe(true);
  });

  it("accepts CV paths without dwell", () => {
    expect(isQualifiedPageView("/cv.pdf", null)).toBe(true);
  });
});

describe("isLowEngagementProbeIp", () => {
  it("flags single tag hit with no referrer or dwell", () => {
    expect(
      isLowEngagementProbeIp([
        { path: "/blog/tag/lxc", durationSeconds: null, referrer: null },
      ])
    ).toBe(true);
  });

  it("keeps LinkedIn landing with referrer", () => {
    expect(
      isLowEngagementProbeIp([
        {
          path: "/about",
          durationSeconds: null,
          referrer: "https://www.linkedin.com/",
        },
      ])
    ).toBe(false);
  });

  it("keeps CV download without dwell", () => {
    expect(isLowEngagementProbeIp([{ path: "/cv.pdf", durationSeconds: null, referrer: null }])).toBe(
      false
    );
  });
});

describe("isDirectTagProbePath", () => {
  it("detects direct tag URL fetches", () => {
    expect(isDirectTagProbePath("/blog/tag/lxc", null)).toBe(true);
    expect(isDirectTagProbePath("/blog/tag/lxc", "https://www.linkedin.com/")).toBe(false);
  });
});

describe("prismaWhereQualifiedPageView", () => {
  it("excludes only / with null or zero duration", () => {
    expect(prismaWhereQualifiedPageView()).toEqual({
      NOT: {
        AND: [
          { path: "/" },
          { OR: [{ durationSeconds: null }, { durationSeconds: 0 }] },
        ],
      },
    });
  });
});
