import { DASHBOARD_NAV_ITEMS } from "@/app/dashboard/dashboard-nav";

describe("dashboard navigation", () => {
  it("keeps management links and removes legacy content editors", () => {
    const hrefs = DASHBOARD_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toContain("/dashboard/content/site");
    expect(hrefs).toContain("/dashboard/media");
    expect(hrefs).not.toContain("/dashboard/content/home");
    expect(hrefs).not.toContain("/dashboard/content/contact");
    expect(hrefs).not.toContain("/dashboard/content/about");
    expect(hrefs).not.toContain("/dashboard/content/pages");
  });
});
