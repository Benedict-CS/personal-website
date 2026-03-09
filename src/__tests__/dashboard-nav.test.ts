import { DASHBOARD_NAV_ITEMS } from "@/app/dashboard/dashboard-nav";

describe("dashboard navigation", () => {
  it("exposes two-entry navigation destinations", () => {
    const hrefs = DASHBOARD_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toContain("/dashboard/content/site");
    expect(hrefs).toContain("/dashboard/media");
    expect(hrefs).toContain("/dashboard/content/site");
    expect(hrefs).toContain("/editor/home");
    expect(hrefs).toContain("/editor/contact");
    expect(hrefs).toContain("/editor/about");
    expect(hrefs).toContain("/dashboard/analytics");
    expect(hrefs).toContain("/dashboard");
  });
});
