# Phase 5 — SaaS i18n and billing (scaffold)

This document describes the Phase 5 implementation: **platform i18n** for the multi-tenant builder and storefronts, **plan limits**, and **billing integrations** (Stripe Checkout + webhooks, Lemon Squeezy webhook-ready).

## Internationalization (routing and UX)

- **Locales:** `en`, `es`, `de`, `ja` (BCP 47 language tags). Default: `en`.
- **Cookie:** `saas_locale` is set by the edge proxy (`src/proxy.ts`) on first visits to `/s/*` and `/dashboard/sites*` using `Accept-Language` negotiation (`src/i18n/platform.ts`).
- **Tenant storefront:** `TenantSite.defaultLocale` drives the wrapper `lang` attribute on public tenant pages (`src/app/s/[siteSlug]/layout.tsx`). Update via `PATCH /api/saas/sites/[siteId]/locale`.
- **Dashboard copy:** The SaaS sites index (`src/app/dashboard/sites/page.tsx`) uses message bundles in `src/i18n/messages/` and `PlatformLocaleSwitcher` so operators can switch UI language without a separate `[locale]` URL segment (scalable default; URL-prefixed locales can be added later).

## Billing architecture

- **Prisma:** `Subscription.billingProvider` (`NONE` | `STRIPE` | `LEMON_SQUEEZY`), optional Lemon identifiers, and existing Stripe fields. `TenantSite.defaultLocale` for storefront language.
- **Plan tiers:** `SitePlan` enum (`FREE`, `PRO`, `BUSINESS`, `ENTERPRISE`) with numeric caps in `src/lib/saas/plan-limits.ts` (pages, products, vector documents).
- **Entitlements:** `src/lib/saas/entitlements.ts` resolves the active subscription per site and enforces page limits on `POST /api/saas/sites/[siteId]/pages`.
- **Stripe:** `stripe` npm package; `getStripe()` in `src/lib/saas/stripe-server.ts`. Checkout: `POST /api/saas/billing/checkout` with `{ siteId, targetPlan, provider: "stripe" }`. Webhook: `POST /api/saas/billing/webhooks/stripe` (configure `STRIPE_WEBHOOK_SECRET`; events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`).
- **Lemon Squeezy:** Optional hosted checkout URL from `POST /api/saas/billing/checkout` with `provider: "lemon_squeezy"` when `LEMON_SQUEEZY_VARIANT_ID_PRO` and `LEMON_SQUEEZY_CHECKOUT_BASE_URL` are set. Webhook: `POST /api/saas/billing/webhooks/lemon-squeezy` with `LEMON_SQUEEZY_WEBHOOK_SECRET` and `X-Signature` verification.
- **Operator UI:** `GET /api/saas/sites/[siteId]/billing` and `/dashboard/sites/[siteId]/billing` show plan, usage, and upgrade actions.

## Environment variables

See `.env.example` for `STRIPE_*`, `LEMON_SQUEEZY_*`, and webhook secrets. Run `npx prisma migrate deploy` after pulling to apply `20260406130000_phase5_billing_i18n`.

## Related code

| Area | Location |
|------|----------|
| Plan limits | `src/lib/saas/plan-limits.ts` |
| Entitlements | `src/lib/saas/entitlements.ts` |
| Stripe plan mapping | `src/lib/saas/stripe-plan-map.ts` |
| Locale negotiation | `src/i18n/platform.ts`, `src/proxy.ts` |
| Messages | `src/i18n/messages/` |
