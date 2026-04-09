import { isJunkAnalyticsPath } from "@/lib/analytics-noise";

describe("isJunkAnalyticsPath", () => {
  it("treats probe paths as junk regardless of casing", () => {
    expect(isJunkAnalyticsPath("/.ENV")).toBe(true);
    expect(isJunkAnalyticsPath("/.Git/config")).toBe(true);
    expect(isJunkAnalyticsPath("/.AWS/credentials")).toBe(true);
  });

  it("does not flag normal blog paths", () => {
    expect(isJunkAnalyticsPath("/blog/hello-world")).toBe(false);
    expect(isJunkAnalyticsPath("/about")).toBe(false);
  });
});
