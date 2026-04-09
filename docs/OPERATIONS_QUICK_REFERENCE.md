# Operations Quick Reference

One-page cheat sheet for running, checking, and migrating the site. UI is **light-theme only** (no dark mode). Full detail: [OPERATIONS_AND_RELIABILITY.md](OPERATIONS_AND_RELIABILITY.md), [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Commands

| Task | Command |
|------|---------|
| Full quality gate (same as CI) | `npm run verify` |
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Start (after build) | `npm run start` |
| Prisma client | `npx prisma generate` |
| Migrations (Compose) | `docker compose exec app npx prisma migrate deploy` |
| Health smoke (any base URL) | `./scripts/verify-health.sh https://your-domain.com` |

---

## HTTP endpoints (ops)

| Endpoint | Use |
|----------|-----|
| `GET /api/live` | Liveness — no DB |
| `GET /api/health` | Readiness — DB, `node`, optional `appVersion` |
| `scripts/verify-health.sh` | After deploy: probes live/health; validates `GET /api/health` JSON (`ok`, `node`) via Python 3 |
| `GET /.well-known/security.txt` | Security contact (RFC 9116) |

---

## Key environment variables

| Variable | Role |
|----------|------|
| `DATABASE_URL` | PostgreSQL connection |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL` | Auth and canonical URLs |
| `APP_VERSION` / `GIT_COMMIT` | Shown in `/api/health` as `appVersion` |
| `ANALYTICS_SECRET` | Page view ingestion |
| `REDIS_URL` | Optional shared rate limits (multi-instance) |
| `ENABLE_HSTS` | Optional HSTS (`next.config.ts` + middleware when HTTPS) |

See [ENVIRONMENT.md](ENVIRONMENT.md).

---

## Automation

| Mechanism | Location |
|-----------|----------|
| CI (lint, test, build) | `.github/workflows/ci.yml` |
| Deploy | `.github/workflows/deploy.yml` |
| Harbor image | `.github/workflows/build-push-harbor.yml` |
| Dependency PRs | `.github/dependabot.yml` |

---

## Related

- [RUNBOOK.md](RUNBOOK.md)
- [MIGRATION_CHECKLIST.md](MIGRATION_CHECKLIST.md)
- [CI_CD.md](CI_CD.md)
- [Security policy](../.github/SECURITY.md)
