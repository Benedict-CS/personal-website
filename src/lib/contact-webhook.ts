/**
 * Optional POST to a site-owner webhook when the contact form receives a submission.
 * Payload is JSON for Discord / Telegram / LINE bridges or custom automation.
 */

export type ContactWebhookPayload = {
  event: "contact.form_submitted";
  version: 1;
  eventId: string;
  submittedAt: string;
  source: "contact";
  siteUrl?: string;
  workflow?: {
    submissionId?: string;
    trigger: "contact_form";
  };
  data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  };
};

export type ContactWebhookResult = {
  delivered: boolean;
  attempts: number;
  statusCode: number | null;
  error: string | null;
  targetHost: string | null;
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
): Promise<ContactWebhookResult> {
  const url = webhookUrl?.trim();
  if (!url || !isAllowedWebhookUrl(url)) {
    return {
      delivered: false,
      attempts: 0,
      statusCode: null,
      error: "Webhook URL is missing or invalid",
      targetHost: null,
    };
  }

  const body = JSON.stringify(payload);
  const attempts = [0, 500, 1500];
  const targetHost = new URL(url).host;
  let lastStatusCode: number | null = null;
  let lastError: string | null = null;
  for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
    const delay = attempts[attemptIndex];
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "PersonalSite-ContactWebhook/1.0",
          "X-Webhook-Event": payload.event,
          "X-Webhook-Event-Id": payload.eventId,
          "X-Workflow-Trigger": "contact_form",
        },
        body,
        signal: controller.signal,
      });
      if (res.ok) {
        clearTimeout(t);
        return {
          delivered: true,
          attempts: attemptIndex + 1,
          statusCode: res.status,
          error: null,
          targetHost,
        };
      }
      lastStatusCode = res.status;
      lastError = `Non-OK response ${res.status}`;
      console.warn("[contact-webhook] Non-OK response:", res.status, url.slice(0, 64));
      clearTimeout(t);
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Unknown fetch error";
      console.warn("[contact-webhook] Request failed:", e);
      clearTimeout(t);
    }
  }
  return {
    delivered: false,
    attempts: attempts.length,
    statusCode: lastStatusCode,
    error: lastError,
    targetHost,
  };
}
