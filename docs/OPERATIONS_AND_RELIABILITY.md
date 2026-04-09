# Operations, Reliability, and Portability

This document describes how to run the site for **high availability (HA)**, **reliability**, **observability**, and **easy migration**. It complements [DEPLOYMENT.md](DEPLOYMENT.md), [MAINTENANCE.md](MAINTENANCE.md), and [RUNBOOK.md](RUNBOOK.md).

---

## Design choices (UI and security)

- **Light-only interface:** The public site and dashboard use a single light palette. There is no dark mode toggle; `ThemeApplier` and `color-scheme: light` keep browser chrome consistent. See `src/components/theme-applier.tsx` and `src/app/globals.css`.
- **Security headers:** `next.config.ts` sets CSP, `X-Frame-Options`, `Referrer-Policy`, and related headers for public routes. The proxy also sets **`x-request-id`** on responses for log correlation (see `src/lib/request-id.ts`).
- **Secrets:** Preview tokens and sensitive query parameters are stripped from stored analytics referrers (`src/lib/analytics-referrer.ts`).

## Graceful shutdown (Docker Compose)

- The **`app`** service uses **`stop_grace_period: 30s`** so Node can finish in-flight work before the container receives SIGKILL after the default stop timeout.

## Log rotation (Docker Compose)

- **`postgres`**, **`rustfs`**, and **`app`** use the **`json-file`** logging driver with **`max-size`** / **`max-file`** limits so container logs do not grow without bound on disk.

---

## Health checks and load balancers

- **`GET /api/health`** returns JSON: `{ ok, db, uptimeSeconds?, node? }` (and `version` on `/api/v1/health`). `node` is the Node.js runtime (e.g. `v20.10.0`). HTTP **200** when PostgreSQL is reachable; **503** when the DB check fails. Use for **readiness** (is the app able to serve traffic?) and for Docker Compose healthchecks.
- **`GET /api/live`** returns `{ ok: true, live: true }` with HTTP **200** and does **not** query the database. Use for **liveness** probes that only need to know the Node process is running (cheaper than `/api/health` on every tick).
- **Docker Compose** uses `/api/health` so the container is marked unhealthy if Postgres is down.
- **Kubernetes-style split:** **liveness** → `/api/live`; **readiness** → `/api/health`.
- **Optional HSTS:** Set `ENABLE_HSTS=true` in production **only** when the site is served exclusively over HTTPS (adds `Strict-Transport-Security` via `next.config.ts` and `src/proxy.ts` when `x-forwarded-proto` is `https`). Do not enable on local HTTP dev. Without this flag, middleware does **not** send HSTS even behind HTTPS.

---

## Horizontal scaling (multiple app instances)

- The app is **stateless** at the HTTP layer: sessions use signed cookies (`NEXTAUTH_SECRET`); uploads go to S3-compatible storage (RustFS or AWS).
- **Redis (`REDIS_URL`):** Optional. When set, shared rate limits (contact form, login) and similar features use Redis instead of in-memory stores, so multiple instances behave consistently. See [ENVIRONMENT.md](ENVIRONMENT.md).
- **PostgreSQL:** For many concurrent connections, use `connection_limit` on `DATABASE_URL` or place **PgBouncer** in front of Postgres (see [ENVIRONMENT.md](ENVIRONMENT.md)).
- **Analytics:** Middleware can forward analytics to the app using `ANALYTICS_SECRET` and `INTERNAL_APP_ORIGIN` so internal fetches work behind Docker networking.
- **SaaS edge (optional):** `EDGE_CONTROL_SECRET` — shared between `src/proxy.ts` and `GET/POST /api/infra/edge` for custom-domain tenant routing and rate limiting. Omit on a single-site personal deployment.

---

## Data portability and migration

- **Database:** PostgreSQL + Prisma. Export with `pg_dump`; import on a new host. Run `npx prisma migrate deploy` after restoring schema-compatible dumps.
- **Object storage:** RustFS data lives in the `./rustfs-data` volume (or your S3 bucket). Copy the volume or sync the bucket when migrating.
- **Environment:** Keep `.env` values documented in `.env.example` (never commit real secrets). `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` must match the public URL after migration.

---

## Monitoring and observability

- **Uptime:** HTTP monitors on `/` and `/api/health` (external) and optionally Docker health status (host).
- **Logs:** Container stdout/stderr; optionally forward to your log stack.
- **Errors:** Optional Sentry (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`) in `next.config.ts`.
- **Dashboard:** **Analytics** shows traffic and an **Application health** card that calls `/api/health`. **Site overview** (`/dashboard/overview`) includes **System status** with periodic checks.

---

## Automatic recovery (Docker Compose)

- Services use `restart: unless-stopped`.
- The app container **retries Prisma migrations** on startup (up to 30 attempts) before starting `node server.js`, which reduces transient DB startup races.
- **Not** automatic self-healing of corrupted data: rely on backups and runbook procedures.

---

## Backup checklist

1. PostgreSQL: `pg_dump` of the `blog` (or configured) database.
2. RustFS / S3: snapshot volume or replicate bucket.
3. `public/` on host if you store files there (Compose mounts `./public`).

---

## Related documentation

| Document | Topic |
|----------|--------|
| [ENVIRONMENT.md](ENVIRONMENT.md) | Environment variables |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deploy procedures |
| [RUNBOOK.md](RUNBOOK.md) | Operational tasks |
