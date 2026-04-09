# Troubleshooting Guide

Operational fixes for common production issues. All UI is **light-theme only** (no dark mode). For environment variables see [ENVIRONMENT.md](ENVIRONMENT.md).

---

## Health checks report database errors (`db: "error"` or HTTP 503)

1. **Verify PostgreSQL is reachable** from the app container: `DATABASE_URL` host, port, credentials, and network/firewall.
2. **Run migrations** after deploy: `npx prisma migrate deploy` (Compose runs this in the app startup path; verify logs if the app loops).
3. **Connection limits:** If you use PgBouncer or a small `max_connections`, ensure the app’s pool size matches your [ENVIRONMENT.md](ENVIRONMENT.md) notes.

`GET /api/live` should still return 200 (process up) even when the DB is down; `GET /api/health` reflects readiness.

---

## Deployment version missing in dashboard / `appVersion` is empty

`GET /api/health` returns `appVersion` when **`APP_VERSION`** or **`GIT_COMMIT`** is set in the runtime environment.

- **Docker Compose:** `docker-compose.yml` sets `APP_VERSION` (default `local`). Override in `.env` if needed.
- **Docker build:** The Dockerfile accepts **`APP_VERSION`** as a build arg (default `dev`).
- **CI:** Export `APP_VERSION` in the deploy environment or inject the git SHA in your pipeline.

---

## Analytics counts look wrong or empty

1. Confirm **`ANALYTICS_SECRET`** is set in production (middleware uses it for `/api/analytics/view`).
2. Check **`ANALYTICS_EXCLUDED_IPS`** — your IP may be excluded.
3. Use the dashboard option **“Do not count visits from this browser”** — if enabled, your own views are skipped.
4. Date range filters on the Analytics page only include rows in the selected window.

---

## Draft preview returns 404

1. Token may be **revoked** or **expired** (`previewTokenExpiresAt`). Generate a new link from the post editor.
2. Wrong token in the URL — use **Copy preview link** from the dashboard.

---

## Contact form or login failures under load

1. Optional **`REDIS_URL`** for shared rate limits across multiple app replicas ([OPERATIONS_AND_RELIABILITY.md](OPERATIONS_AND_RELIABILITY.md)).
2. After repeated failed logins, **Turnstile** may be required if keys are configured.

---

## Build or migrate failures locally

```bash
npm ci
npx prisma generate
npm run verify
```

For database issues, confirm `DATABASE_URL` and run `npx prisma migrate status`.

---

## Related

- [MIGRATION_CHECKLIST.md](MIGRATION_CHECKLIST.md)
- [OPERATIONS_AND_RELIABILITY.md](OPERATIONS_AND_RELIABILITY.md)
- [CI_CD.md](CI_CD.md)
- [FEATURES.md](FEATURES.md)
