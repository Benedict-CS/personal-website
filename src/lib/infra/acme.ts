import * as acme from "acme-client";
import { prisma } from "@/lib/prisma";

type CertResult = {
  certificatePem: string;
  privateKeyPem: string;
  expiresAt: Date | null;
};

async function issueWithLetsEncrypt(domain: string): Promise<CertResult> {
  const email = process.env.ACME_CONTACT_EMAIL || "admin@example.com";
  const accountKey = await acme.crypto.createPrivateKey();
  const client = new acme.Client({
    directoryUrl: acme.directory.letsencrypt.production,
    accountKey,
  });

  await client.createAccount({
    termsOfServiceAgreed: true,
    contact: [`mailto:${email}`],
  });

  const [key, csr] = await acme.crypto.createCsr({
    commonName: domain,
    altNames: [domain],
  });

  const cert = await client.auto({
    csr,
    email,
    termsOfServiceAgreed: true,
    challengeCreateFn: async (_authz, challenge, keyAuthorization) => {
      // In production, write this TXT record to DNS provider API.
      // Store challenge payload for operators/automation to complete DNS.
      await prisma.domainCertificate.updateMany({
        where: { domain, status: "pending" },
        data: {
          lastError: `DNS challenge required: _acme-challenge.${domain} token=${challenge.token} keyAuth=${keyAuthorization}`,
        },
      });
    },
    challengeRemoveFn: async () => {
      // no-op for API-driven DNS cleanup
    },
  });

  return {
    certificatePem: cert,
    privateKeyPem: key.toString(),
    expiresAt: null,
  };
}

export async function provisionCertificate(
  siteId: string,
  domain: string
): Promise<{ ok: boolean; status: string; message?: string }> {
  const existing = await prisma.domainCertificate.upsert({
    where: { siteId_domain: { siteId, domain } },
    create: { siteId, domain, provider: "letsencrypt", status: "pending" },
    update: { status: "pending", lastError: null },
  });

  if (process.env.ACME_ENABLED !== "true") {
    await prisma.domainCertificate.update({
      where: { id: existing.id },
      data: {
        status: "issued",
        certificatePem: "mock-certificate",
        privateKeyPem: "mock-private-key",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return { ok: true, status: "issued", message: "Mock certificate issued (ACME disabled)." };
  }

  try {
    const issued = await issueWithLetsEncrypt(domain);
    await prisma.domainCertificate.update({
      where: { id: existing.id },
      data: {
        status: "issued",
        certificatePem: issued.certificatePem,
        privateKeyPem: issued.privateKeyPem,
        expiresAt: issued.expiresAt,
        lastError: null,
      },
    });
    return { ok: true, status: "issued" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Certificate provisioning failed";
    await prisma.domainCertificate.update({
      where: { id: existing.id },
      data: { status: "failed", lastError: message },
    });
    return { ok: false, status: "failed", message };
  }
}

