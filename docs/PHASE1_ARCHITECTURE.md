# Phase 1 — Architecture, Reliability, and Portability

This document summarizes production-oriented foundations: containers, health probes, request tracing, and migration posture.

---

## Container model

- **Dockerfile:** Multi-stage build (deps → builder → runner), non-root `nextjs` user, Prisma + standalone output, startup **migration retry loop** then `node server.js`.
- **docker-compose.yml:** PostgreSQL and RustFS with healthchecks; app `depends_on` with `condition: service_healthy`; **`stop_grace_period: 30s`** for graceful shutdown; app healthcheck uses **`GET /api/health`** (readiness + DB).
- **Image HEALTHCHECK:** The Dockerfile includes a default healthcheck for `docker run` without Compose; Compose may override.

---

## Health endpoints

| Endpoint | Role |
|----------|------|
| `GET` / `HEAD /api/live` | Liveness — no database; cheap probe. `HEAD` returns status only. |
| `GET` / `HEAD /api/health` | Readiness — PostgreSQL `SELECT 1`; includes `uptimeSeconds`, **`node`** (Node.js version), optional **`appVersion`** (`APP_VERSION` / `GIT_COMMIT`). `HEAD` mirrors status without a body. |
| `GET` / `HEAD /api/v1/health` | Same as `/api/health` with `version: "v1"` on `GET` for API clients. |

All responses use **`Cache-Control: no-store`** (and related anti-cache headers) so probes are never served from an intermediary cache.

Local verification:

```bash
chmod +x scripts/verify-health.sh
./scripts/verify-health.sh http://127.0.0.1:3000
```

(`curl` must be installed; no other dependencies.)

---

## Request correlation (`x-request-id`)

The proxy middleware assigns **`x-request-id`** on responses:

- Reuses **`x-request-id`**, **`x-correlation-id`**, or **`x-trace-id`** from upstream when valid.
- Otherwise generates a random 32-byte hex id.
- Structured request logs include **`requestId`** for correlation with container logs.
- Applies to **public routes**, **A/B `/s/` routes**, **edge rewrites**, **403/429**, and **authenticated `/dashboard` and `/editor`** (after `withAuth`).

Blocked (403) and tenant rate-limit (429) responses include the same header.

---

## Global error recovery

- **`src/app/error.tsx`:** Segment error boundary with retry and navigation.
- **`src/app/global-error.tsx`:** Root boundary with its own `<html>`; shows **Next.js `digest`** when present for support reference.
- **`src/app/dashboard/error.tsx`:** Dashboard-specific recovery.
- **`src/instrumentation.ts`:** Next.js **`register()`** hook (Node.js runtime only). Reserved for optional server startup wiring (metrics/APM); Sentry remains in `next.config` / Sentry config files.

---

## Portability and migration

- Stateless app tier: configure **`DATABASE_URL`**, S3-compatible storage, **`NEXTAUTH_SECRET`**, public URLs.
- Optional **`REDIS_URL`** for shared rate limits when running multiple replicas.
- See [OPERATIONS_AND_RELIABILITY.md](OPERATIONS_AND_RELIABILITY.md) for backups, PgBouncer, and horizontal scaling.

---

## Completion checklist (Phase 1)

- [x] Multi-stage Dockerfile, non-root user, migrations with retries, optional `HEALTHCHECK`, OCI `LABEL` metadata on the runner image
- [x] Compose: service healthchecks, `depends_on` conditions, `stop_grace_period`, log rotation (`json-file` max-size)
- [x] `/api/health` (readiness) and `/api/live` (liveness); `HEAD` + `Cache-Control: no-store` on probe responses
- [x] `x-request-id` on responses including `withAuth` routes
- [x] Global and segment error boundaries; digest on `global-error`
- [x] `src/instrumentation.ts` with `register()` (Node.js) for future startup hooks
- [x] `scripts/verify-health.sh` for smoke checks
- [x] One-command local release gate: `npm run verify` (lint + typecheck + test + build)

## Related

- [OPERATIONS_AND_RELIABILITY.md](OPERATIONS_AND_RELIABILITY.md)
- [CI_CD.md](CI_CD.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [PHASE2_CMS.md](PHASE2_CMS.md) — dashboard and preview UX (ongoing)
