import { GET } from "@/app/.well-known/security.txt/route";

describe("GET /.well-known/security.txt", () => {
  const prevContact = process.env.SECURITY_TXT_CONTACT;
  const prevPolicy = process.env.SECURITY_TXT_POLICY;

  afterEach(() => {
    if (prevContact === undefined) delete process.env.SECURITY_TXT_CONTACT;
    else process.env.SECURITY_TXT_CONTACT = prevContact;
    if (prevPolicy === undefined) delete process.env.SECURITY_TXT_POLICY;
    else process.env.SECURITY_TXT_POLICY = prevPolicy;
  });

  it("returns text/plain and Preferred-Languages", async () => {
    delete process.env.SECURITY_TXT_CONTACT;
    delete process.env.SECURITY_TXT_POLICY;
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const text = await res.text();
    expect(text).toContain("Preferred-Languages: en");
  });

  it("includes Contact and Policy when env is set", async () => {
    process.env.SECURITY_TXT_CONTACT = "mailto:test@example.com";
    process.env.SECURITY_TXT_POLICY = "https://example.com/policy";
    const res = await GET();
    const text = await res.text();
    expect(text).toContain("Contact: mailto:test@example.com");
    expect(text).toContain("Policy: https://example.com/policy");
  });
});
