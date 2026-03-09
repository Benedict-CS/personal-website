import { generateTenantDockerfile } from "@/lib/infra/dockerfile";

describe("deployment engine dockerfile generator", () => {
  it("generates tenant-specific Dockerfile with required runtime env", () => {
    const dockerfile = generateTenantDockerfile("demo-site", "tenant-demo:latest");
    expect(dockerfile).toContain("TENANT_SITE_SLUG=demo-site");
    expect(dockerfile).toContain("IMAGE_TAG=tenant-demo:latest");
    expect(dockerfile).toContain('CMD ["npm", "run", "start"]');
  });
});

