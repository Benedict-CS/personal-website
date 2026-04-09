/**
 * Optional POST to a site-owner webhook when the contact form receives a submission.
 * Payload is JSON for Discord / Telegram / LINE bridges or custom automation.
 */

export type ContactWebhookPayload = {
  event: "contact.form_submitted";
  version: 1;
  submittedAt: string;
  source: "contact";
  siteUrl?: string;
  data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  };
};

function isAllowedWebhookUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Fire-and-forget POST. Does not throw; logs errors.
 */
export async function postContactWebhook(
  webhookUrl: string | null | undefined,
  payload: ContactWebhookPayload
): Promise<void> {
  const url = webhookUrl?.trim();
  if (!url || !isAllowedWebhookUrl(url)) return;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PersonalSite-ContactWebhook/1.0",
        "X-Webhook-Event": payload.event,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn("[contact-webhook] Non-OK response:", res.status, url.slice(0, 64));
    }
  } catch (e) {
    console.warn("[contact-webhook] Request failed:", e);
  } finally {
    clearTimeout(t);
  }
}
