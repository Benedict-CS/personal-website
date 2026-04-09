import { isAccessBlocked, shouldEnforceAccessBlockIp } from "@/lib/access-blocked-ips";

describe("isAccessBlocked", () => {
  const origBlock = process.env.ACCESS_BLOCK_IP_PREFIXES;
  const origAllow = process.env.ACCESS_ALLOW_IPS;

  afterEach(() => {
    process.env.ACCESS_BLOCK_IP_PREFIXES = origBlock;
    process.env.ACCESS_ALLOW_IPS = origAllow;
  });

  it("returns false when no block prefixes configured", () => {
    delete process.env.ACCESS_BLOCK_IP_PREFIXES;
    delete process.env.ACCESS_ALLOW_IPS;
    expect(isAccessBlocked("140.113.194.100")).toBe(false);
  });

  it("blocks IPs under prefix but allows allowlist", () => {
    process.env.ACCESS_BLOCK_IP_PREFIXES = "140.113.194.";
    process.env.ACCESS_ALLOW_IPS = "140.113.194.249";
    expect(isAccessBlocked("140.113.194.100")).toBe(true);
    expect(isAccessBlocked("140.113.194.249")).toBe(false);
    expect(isAccessBlocked("140.113.128.3")).toBe(false);
  });

  it("normalizes IPv4-mapped IPv6", () => {
    process.env.ACCESS_BLOCK_IP_PREFIXES = "140.113.194.";
    delete process.env.ACCESS_ALLOW_IPS;
    expect(isAccessBlocked("::ffff:140.113.194.50")).toBe(true);
  });

  it("does not block unknown or empty IP", () => {
    process.env.ACCESS_BLOCK_IP_PREFIXES = "140.113.194.";
    expect(isAccessBlocked("")).toBe(false);
    expect(isAccessBlocked("unknown")).toBe(false);
  });

  it("accepts three-octet prefix without trailing dot in env", () => {
    process.env.ACCESS_BLOCK_IP_PREFIXES = "140.113.194";
    delete process.env.ACCESS_ALLOW_IPS;
    expect(isAccessBlocked("140.113.194.1")).toBe(true);
    expect(isAccessBlocked("140.113.195.1")).toBe(false);
  });

  it("strips CR and quotes from env tokens", () => {
    process.env.ACCESS_BLOCK_IP_PREFIXES = '"140.113.194."\r';
    process.env.ACCESS_ALLOW_IPS = "140.113.194.249\r";
    expect(isAccessBlocked("140.113.194.88")).toBe(true);
    expect(isAccessBlocked("140.113.194.249")).toBe(false);
  });
});

function req(pathname: string, method = "GET") {
  return { nextUrl: { pathname }, method };
}

describe("shouldEnforceAccessBlockIp", () => {
  const origPublic = process.env.ACCESS_BLOCK_PUBLIC;

  afterEach(() => {
    if (origPublic === undefined) delete process.env.ACCESS_BLOCK_PUBLIC;
    else process.env.ACCESS_BLOCK_PUBLIC = origPublic;
  });

  it("enforces every path when ACCESS_BLOCK_PUBLIC=1", () => {
    process.env.ACCESS_BLOCK_PUBLIC = "1";
    expect(shouldEnforceAccessBlockIp(req("/"))).toBe(true);
    expect(shouldEnforceAccessBlockIp(req("/blog"))).toBe(true);
    expect(shouldEnforceAccessBlockIp(req("/api/posts", "GET"))).toBe(true);
  });

  it("enforces dashboard, editor, auth, and non-public API", () => {
    expect(shouldEnforceAccessBlockIp(req("/dashboard"))).toBe(true);
    expect(shouldEnforceAccessBlockIp(req("/editor/home"))).toBe(true);
    expect(shouldEnforceAccessBlockIp(req("/auth/signin"))).toBe(true);
    expect(shouldEnforceAccessBlockIp(req("/api/upload", "POST"))).toBe(true);
    expect(shouldEnforceAccessBlockIp(req("/api/analytics/stats", "GET"))).toBe(true);
  });

  it("does not enforce public pages or blog list APIs", () => {
    expect(shouldEnforceAccessBlockIp(req("/blog"))).toBe(false);
    expect(shouldEnforceAccessBlockIp(req("/blog/my-post"))).toBe(false);
    expect(shouldEnforceAccessBlockIp(req("/api/posts", "GET"))).toBe(false);
    expect(shouldEnforceAccessBlockIp(req("/api/tags", "GET"))).toBe(false);
    expect(shouldEnforceAccessBlockIp(req("/"))).toBe(false);
  });
});
