# Phase 3 — Observability, Security, and Automation

This document maps what the codebase already provides and how to operate it in production. It complements [OPERATIONS_AND_RELIABILITY.md](OPERATIONS_AND_RELIABILITY.md) and [CI_CD.md](CI_CD.md).

---

## Observability

| Mechanism | Location / usage |
|-----------|------------------|
| **Structured request logs** | `src/lib/logger.ts` — JSON lines with `requestId` from middleware |
| **Request correlation** | `x-request-id` on responses (`src/proxy.ts`, `src/lib/request-id.ts`) |
| **Health** | `GET /api/health` (DB readiness), `GET /api/live` (process liveness), `GET /api/v1/health` |
| **Dashboard** | Analytics page + system status components |
| **Optional error tracking** | Sentry via `next.config.ts` and `SENTRY_*` env vars ([ENVIRONMENT.md](ENVIRONMENT.md)) |

Smoke-check endpoints locally or on a server:

```bash
./scripts/verify-health.sh https://your-domain.com
```

---

## Security practices (implemented)

| Topic | Implementation |
|-------|----------------|
| **HTTP security headers** | CSP, `X-Frame-Options`, `Referrer-Policy`, etc. in `next.config.ts`; additional headers in `src/proxy.ts` |
| **HSTS** | `Strict-Transport-Security` when **`ENABLE_HSTS=true`** and the request is HTTPS (`x-forwarded-proto: https` in middleware; static responses use `next.config.ts`). See [ENVIRONMENT.md](ENVIRONMENT.md). |
| **Auth** | NextAuth middleware for `/dashboard` and `/editor` |
| **Login rate limiting** | `src/lib/login-rate-limit.ts` — optional **Redis** for multi-instance (`REDIS_URL`) |
| **Contact / API rate limits** | `src/lib/rate-limit.ts` and related API routes |
| **Analytics referrer privacy** | `src/lib/analytics-referrer.ts` strips tokens from stored referrers |
| **IP allow/block** | `ACCESS_BLOCK_IP_PREFIXES`, `ACCESS_ALLOW_IPS` in proxy |
| **security.txt (RFC 9116)** | `GET /.well-known/security.txt` — set `SECURITY_TXT_CONTACT` and optionally `SECURITY_TXT_POLICY` ([ENVIRONMENT.md](ENVIRONMENT.md)) |
| **Disclosure policy** | [.github/SECURITY.md](../.github/SECURITY.md) — how researchers should report vulnerabilities |

---

## Automation (CI/CD)

| Workflow | Purpose |
|----------|---------|
| `.github/workflows/ci.yml` | Lint, unit tests, production build on PRs to `test` |
| `.github/workflows/deploy.yml` | Build gate + SSH deploy (secrets required) |
| `.github/workflows/build-push-harbor.yml` | Container registry push (optional) |

Local gate before pushing or releasing:

```bash
npm run verify
```

This runs **lint**, **TypeScript (`tsc --noEmit`)**, **Jest**, and **production build** (same checks as CI, minus Playwright).

---

## End-to-end tests (optional)

```bash
npm run test:e2e
```

Requires a running app (or Playwright `webServer` when `CI` is set — see `playwright.config.ts`). E2E is not required for `npm run verify`.

---

## Related

- [PHASE1_ARCHITECTURE.md](PHASE1_ARCHITECTURE.md)
- [PHASE2_CMS.md](PHASE2_CMS.md)
- [API.md](API.md)
