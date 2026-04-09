# API Reference

This document lists REST API routes and their intended use. All routes are under the base URL (e.g. `https://yoursite.com`).

---

## Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/site-config` | Site config for render (nav, meta, logo). Cached. |
| GET | `/api/site-content?page=home` | Home page content (sections, CTAs). |
| GET | `/api/site-content?page=contact` | Contact page content. |
| GET | `/api/custom-pages/slug/[slug]` | Custom page by slug (public). |
| GET | `/api/custom-pages/preview` | Preview token validation (query). |
| POST | `/api/contact` | Contact form submit. Rate limited per IP; **429** returns `Retry-After: 60`, `Cache-Control: no-store`, `X-RateLimit-Remaining`. |
| GET | `/api/search` | Global search (posts, pages). |
| GET | `/.well-known/security.txt` | Security contact hints (RFC 9116); set `SECURITY_TXT_CONTACT` / `SECURITY_TXT_POLICY`. |
| GET, HEAD | `/api/live` | Liveness (no DB). `HEAD` returns status only. |
| GET, HEAD | `/api/health` | Readiness (DB ping). JSON includes `uptimeSeconds`, `node` (Node.js version), and may include `appVersion` (`APP_VERSION` / `GIT_COMMIT`). `Cache-Control: no-store`. |
| GET, HEAD | `/api/v1/health` | Same as `/api/health`; `GET` JSON includes `version: "v1"` plus optional `appVersion` and `node`. |
| GET | `/api/giscus-config` | Giscus comment widget config. |
| POST | `/api/analytics/view` | Page view (requires `X-Analytics-Secret`). |
| POST | `/api/analytics/leave` | Leave event (duration). |
| GET | `/api/media/serve/[filename]` | Serve uploaded media by filename. |
| GET | `/api/about/serve/[filename]` | Serve About section image. |

---

## Auth (NextAuth)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/auth/*` | NextAuth (signin, signout, session, csrf). |
| GET | `/api/auth/captcha-required` | Whether CAPTCHA is required for sign-in. |

---

## Dashboard (session required)

All routes below require a valid NextAuth session (cookie). Return `401 Unauthorized` otherwise.

### Site and content

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/site-config` | Update site config (nav, meta, contact email). |
| PATCH | `/api/site-content` | Update home or contact content. |
| GET/PATCH | `/api/custom-pages/*` | CRUD and reorder custom pages. |
| GET/POST/PATCH | `/api/about/config` | About config. |
| POST | `/api/about/upload` | Upload About image. |
| GET | `/api/about/cleanup` | List or delete unused About images. |

### Posts and tags

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/posts` | List or create posts. |
| GET/PATCH/DELETE | `/api/posts/[id]` | Single post. |
| POST | `/api/posts/[id]/duplicate` | Duplicate post. |
| POST | `/api/posts/bulk` | Bulk actions. |
| GET/POST | `/api/posts/[id]/versions` | Version history. |
| POST | `/api/posts/[id]/versions/[versionId]/restore` | Restore version. |
| GET/POST | `/api/posts/[id]/preview-token` | Create preview token. |
| GET/PATCH | `/api/tags` | Tags. |
| POST | `/api/tags/merge` | Merge tags. |
| POST | `/api/tags/cleanup` | Cleanup unused tags. |

### Media

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/media` | List media. |
| POST | `/api/upload` | Upload file. |
| DELETE | `/api/media/delete` | Delete media. |
| GET | `/api/media/usage` | Usage and unused file analysis. |
| POST | `/api/media/optimize` | Optimize images (dry-run or execute). |
| POST | `/api/media/cleanup` | Delete unused media. |

### Editor and CV

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/editor/inline-content` | Inline editor save (home/contact). |
| GET/POST | `/api/editor/revisions` | List or create revision. |
| GET | `/api/editor/revisions/[id]` | Single revision. |
| POST | `/api/cv/upload` | Upload CV PDF. |
| GET | `/api/cv/download` | Download CV. |

### Audit and analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/audit` | Audit log (filtered). |
| GET | `/api/analytics/stats` | Analytics stats. |
| POST | `/api/analytics/clear` | Clear analytics. |

### Backup and export/import

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/backup/trigger` | Trigger backup (returns instructions). |
| POST | `/api/export` | Export data. |
| POST | `/api/import` | Import data. |

---

## SaaS / multi-tenant (when enabled)

Routes under `/api/saas/sites/[siteId]/*` and `/api/builder/*` are used by the SaaS and builder layers (sites, pages, commerce, CRM, media, infra, AI, showroom). They require appropriate auth and tenant context.

### Billing and locale (Phase 5)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/saas/sites/[siteId]/billing` | Plan, `billingProvider`, usage vs limits (session + tenant). |
| PATCH | `/api/saas/sites/[siteId]/locale` | Body `{ "defaultLocale": "en" \| "es" \| "de" \| "ja" }` — storefront `lang` default. |
| POST | `/api/saas/billing/checkout` | Body `{ siteId, targetPlan: "PRO" \| "BUSINESS" \| "ENTERPRISE", provider?: "stripe" \| "lemon_squeezy" }` — Stripe Checkout URL or Lemon redirect URL. |
| POST | `/api/saas/billing/webhooks/stripe` | Stripe signed webhook (no session; uses `STRIPE_WEBHOOK_SECRET`). |
| POST | `/api/saas/billing/webhooks/lemon-squeezy` | Lemon Squeezy `X-Signature` webhook (`LEMON_SQUEEZY_WEBHOOK_SECRET`). |

See [PHASE5_SAAS_I18N_AND_BILLING.md](PHASE5_SAAS_I18N_AND_BILLING.md).

---

## Cron and agents

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/agents/marketing/cron` | `X-Agent-Cron-Secret` | Marketing agent cron. |
| POST | `/api/agents/support/cron` | `X-Agent-Cron-Secret` | Support agent cron. |

Set `AGENT_CRON_SECRET` and send it in the header for cron routes.

---

## Rate limiting and security

- **Contact form:** Rate limited by IP.
- **Sign-in:** Rate limited; CAPTCHA required after N failures (see login-rate-limit).
- **APIs:** Session required for write and dashboard endpoints; validate and sanitize all inputs; Prisma parameterizes queries.

### Middleware (`src/proxy.ts`)

Responses may include **`x-request-id`** for log correlation. SaaS builder and tenant paths (`/dashboard/sites*`, `/s/*`) may set the **`saas_locale`** cookie (first visit) for UI language negotiation.

| Situation | Status | Notable headers |
|-----------|--------|-----------------|
| IP blocked (`ACCESS_BLOCK_IP_PREFIXES` / `ACCESS_ALLOW_IPS`; optional **`ACCESS_BLOCK_PUBLIC=1`** for 403 on all routes) | **403** (selective by default; see [ENVIRONMENT.md](ENVIRONMENT.md)) | `Cache-Control: no-store, private` |
| SaaS tenant rate limit (custom host → `/api/infra/edge` returns 429) | **429** | `Cache-Control: no-store, private`, **`Retry-After: 60`** |

**HSTS:** `Strict-Transport-Security` is added by middleware only when **`ENABLE_HSTS=true`** and the request is served over HTTPS (see [ENVIRONMENT.md](ENVIRONMENT.md)). This matches `next.config.ts` static headers.
