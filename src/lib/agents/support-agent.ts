import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { prisma } from "@/lib/prisma";

type SupportReply = {
  to: string;
  subject: string;
  html: string;
};

function buildKnowledgeContext(products: Array<{ title: string; description: string | null }>): string {
  return products
    .slice(0, 20)
    .map((p) => `${p.title}: ${p.description ?? "No description provided."}`)
    .join("\n");
}

function generateReply(question: string, context: string): string {
  const first = question.trim() || "Thank you for contacting us.";
  return [
    `<p>Thanks for reaching out.</p>`,
    `<p>We received your request: <strong>${first}</strong></p>`,
    `<p>Based on our product knowledge, here is the best next step:</p>`,
    `<pre style="background:#f8fafc;padding:12px;border-radius:8px;">${context.slice(0, 1500)}</pre>`,
    `<p>If you share your exact use case, we can provide a precise recommendation.</p>`,
  ].join("");
}

async function sendViaSes(reply: SupportReply) {
  const region = process.env.AWS_REGION || "us-east-1";
  const from = process.env.SES_FROM_EMAIL || "support@example.com";
  const ses = new SESClient({ region });
  const cmd = new SendEmailCommand({
    Destination: { ToAddresses: [reply.to] },
    Message: {
      Subject: { Charset: "UTF-8", Data: reply.subject },
      Body: { Html: { Charset: "UTF-8", Data: reply.html } },
    },
    Source: from,
  });
  await ses.send(cmd);
}

export async function runSupportAgent(siteId: string): Promise<{ replies: number }> {
  const submissions = await prisma.formSubmission.findMany({
    where: { siteId },
    include: { contact: true },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  if (submissions.length === 0) return { replies: 0 };

  const products = await prisma.product.findMany({
    where: { siteId, status: "ACTIVE" },
    select: { title: true, description: true },
    take: 100,
  });
  const context = buildKnowledgeContext(products);

  let replies = 0;
  for (const submission of submissions) {
    const contactEmail = submission.contact?.email;
    if (!contactEmail) continue;
    const payload = (submission.payload ?? {}) as Record<string, unknown>;
    const question = typeof payload.message === "string" ? payload.message : "General inquiry";
    const reply: SupportReply = {
      to: contactEmail,
      subject: "Support update from your request",
      html: generateReply(question, context),
    };
    try {
      await sendViaSes(reply);
      replies += 1;
    } catch {
      // Continue processing other submissions even if one email fails.
    }
  }

  return { replies };
}

