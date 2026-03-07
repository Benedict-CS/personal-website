# Monitoring & Health

## Logging

- **App and services:** Use `docker compose logs -f app`, `docker compose logs -f postgres`, and `docker compose logs -f rustfs` to inspect stdout/stderr. In production, consider sending these to a log aggregator (e.g. Loki, Datadog, or your host’s log pipeline).
- **What to log:** The app logs errors and, in development, Prisma queries. For more visibility, ensure errors are logged (Sentry captures them when `SENTRY_DSN` is set) and optionally add request logging in your reverse proxy (e.g. Nginx access/error logs).
- **Where:** By default logs go to Docker’s logging driver; configure log rotation and retention in Docker or your orchestrator so disks do not fill up.

## Health check

The app exposes:

- **`GET /api/health`** — Returns `{ ok: true, db: "ok" }` when the app and database are healthy, or `503` with `{ ok: false, db: "error" }` if the DB is unreachable.
- **`GET /api/v1/health`** — Same as above with `version: "v1"` for versioned clients.

### Uptime / external monitoring

You can point an external service at your production URL:

- [Uptime Robot](https://uptimerobot.com/) — Free tier, HTTP(s) monitor.
- [Better Uptime](https://betteruptime.com/) — Incidents and status page.
- [Cronitor](https://cronitor.io/) — Uptime and cron monitoring.

**Suggested setup:**

1. Create an HTTP(S) monitor for `https://your-domain.com/api/health`.
2. Set interval (e.g. 5 minutes) and alert when status is not `200` or body does not contain `"ok":true`.

No code changes are required; the routes are already implemented.
