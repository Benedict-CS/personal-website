import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { siteConfig } from "@/config/site";

const RECIPIENT = process.env.CONTACT_EMAIL || siteConfig.author.email;

// Option 1: Resend (API key) — https://resend.com
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Option 2: SMTP (Gmail, Outlook, etc.) — no API key needed, use your email app password
function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `Contact Form <${user}>`;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

const smtpTransporter = getSmtpTransporter();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    const subjectLine = subject?.trim() || `Message from ${name.trim()}`;
    const textBody = `From: ${name.trim()} <${email.trim()}>\n\n${message.trim()}`;

    // Prefer Resend if configured
    if (resend) {
      const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const { data, error } = await resend.emails.send({
        from,
        to: RECIPIENT,
        replyTo: email,
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
      return NextResponse.json({ success: true, id: data?.id });
    }

    // Fallback: SMTP (Gmail, Outlook, etc.)
    if (smtpTransporter) {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@localhost";
      await smtpTransporter.sendMail({
        from,
        to: RECIPIENT,
        replyTo: email,
        subject: subjectLine,
        text: textBody,
      });
      return NextResponse.json({ success: true });
    }

    // Neither configured
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
