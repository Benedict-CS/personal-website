# Monitoring & Health

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
