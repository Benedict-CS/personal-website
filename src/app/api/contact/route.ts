import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { checkRateLimitAsync, getClientIP } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { postContactWebhook } from "@/lib/contact-webhook";
import { siteUrl } from "@/config/site";

const CC = process.env.CONTACT_CC ? process.env.CONTACT_CC.split(",").map((e) => e.trim()).filter(Boolean) : undefined;
const BCC = process.env.CONTACT_BCC ? process.env.CONTACT_BCC.split(",").map((e) => e.trim()).filter(Boolean) : undefined;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

const smtpTransporter = getSmtpTransporter();

/**
 * Resolve the recipient for contact form emails: tenant contactEmail from DB, then footer/author email, then env fallback.
 */
async function getContactRecipient(): Promise<string | null> {
  const row = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: { contactEmail: true, links: true, tenantSiteId: true },
  });
  if (!row) return process.env.CONTACT_EMAIL ?? null;
  const contactEmail = (row as { contactEmail?: string | null }).contactEmail ?? null;
  if (contactEmail?.trim()) return contactEmail.trim();
  const links = (row.links as Record<string, string>) ?? {};
  const footerEmail = links.email?.trim();
  if (footerEmail) return footerEmail;
  return process.env.CONTACT_EMAIL ?? null;
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { ok: allowed, remaining } = await checkRateLimitAsync(ip, "contact");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "Retry-After": "60",
          "Cache-Control": "no-store, private",
        },
      }
    );
  }
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }
    const rateLimitHeaders = { "X-RateLimit-Remaining": String(remaining - 1) };

    const configRow = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { tenantSiteId: true, contactEmail: true, links: true, contactWebhookUrl: true },
    });
    const tenantSiteId = configRow?.tenantSiteId ?? null;

    if (tenantSiteId) {
      await prisma.formSubmission.create({
        data: {
          siteId: tenantSiteId,
          pageSlug: "contact",
          formName: "contact",
          payload: {
            name: name.trim(),
            email: email.trim(),
            subject: subject?.trim() ?? "",
            message: message.trim(),
          },
        },
      });
    }

    const recipient = await getContactRecipient();
    if (!recipient) {
      return NextResponse.json(
        {
          error:
            "Contact form is not configured. Set a contact email in Dashboard → Content → Site settings → Contact form, or set CONTACT_EMAIL in .env.",
        },
        { status: 503 }
      );
    }

    const subjectLine = subject?.trim() || `Message from ${name.trim()}`;
    const textBody = `From: ${name.trim()} <${email.trim()}>\n\n${message.trim()}`;
    const visitorEmail = email.trim();

    if (resend) {
      const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const { data, error } = await resend.emails.send({
        from,
        to: recipient,
        replyTo: visitorEmail,
        cc: CC,
        bcc: BCC,
        subject: subjectLine,
        text: textBody,
      });
      if (error) {
        console.error("Resend error:", error);
        return NextResponse.json(
          { error: error.message || "Failed to send message." },
          { status: 500 }
        );
      }
      void postContactWebhook(configRow?.contactWebhookUrl, {
        event: "contact.form_submitted",
        version: 1,
        submittedAt: new Date().toISOString(),
        source: "contact",
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || siteUrl,
        data: {
          name: name.trim(),
          email: email.trim(),
          subject: subject?.trim() ?? "",
          message: message.trim(),
        },
      });
      return NextResponse.json({ success: true, id: data?.id }, { headers: rateLimitHeaders });
    }

    if (smtpTransporter) {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@localhost";
      await smtpTransporter.sendMail({
        from,
        to: recipient,
        replyTo: visitorEmail,
        cc: CC,
        bcc: BCC,
        subject: subjectLine,
        text: textBody,
      });
      void postContactWebhook(configRow?.contactWebhookUrl, {
        event: "contact.form_submitted",
        version: 1,
        submittedAt: new Date().toISOString(),
        source: "contact",
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || siteUrl,
        data: {
          name: name.trim(),
          email: email.trim(),
          subject: subject?.trim() ?? "",
          message: message.trim(),
        },
      });
      return NextResponse.json({ success: true }, { headers: rateLimitHeaders });
    }

    console.error("Contact form: neither RESEND_API_KEY nor SMTP_* configured.");
    return NextResponse.json(
      {
        error:
          "Contact form is not configured. Set RESEND_API_KEY (Resend) or SMTP_HOST/SMTP_USER/SMTP_PASS (e.g. Gmail) in .env.",
      },
      { status: 503 }
    );
  } catch (e) {
    console.error("Contact API error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
