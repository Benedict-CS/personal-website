import { getPrimarySiteHostname, isPrimarySiteHost } from "@/lib/primary-site-host";

describe("primary-site-host", () => {
  const origPublic = process.env.NEXT_PUBLIC_SITE_URL;
  const origAuth = process.env.NEXTAUTH_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = origPublic;
    process.env.NEXTAUTH_URL = origAuth;
  });

  it("parses hostname from NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/blog";
    process.env.NEXTAUTH_URL = "";
    expect(getPrimarySiteHostname()).toBe("example.com");
  });

  it("matches Host header with port stripped", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    expect(isPrimarySiteHost("example.com:3000")).toBe(true);
    expect(isPrimarySiteHost("other.com")).toBe(false);
  });
});
