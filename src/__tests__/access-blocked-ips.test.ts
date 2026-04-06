import { isAccessBlocked } from "@/lib/access-blocked-ips";

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
