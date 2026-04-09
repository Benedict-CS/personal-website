import { DASHBOARD_NAV_ITEMS } from "@/app/dashboard/dashboard-nav";

describe("dashboard navigation", () => {
  it("exposes expected sidebar destinations", () => {
    const hrefs = DASHBOARD_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toContain("/dashboard/analytics");
    expect(hrefs).toContain("/dashboard/posts");
    expect(hrefs).toContain("/dashboard/media");
    expect(hrefs).toContain("/dashboard/content/site");
    expect(hrefs).toContain("/dashboard/content/pages");
    expect(hrefs).toContain("/dashboard/notes");
    expect(hrefs).toContain("/dashboard/tags");
    expect(hrefs).toContain("/dashboard/audit");
    expect(hrefs).toContain("/dashboard/overview");
  });
});
