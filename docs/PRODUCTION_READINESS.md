# Production Readiness Index

This page is the **single entry point** for operations, quality gates, and roadmap documentation. The UI is **light-theme only** (no dark mode).

---

## Required checks before deploy

| Step | Command / action |
|------|-------------------|
| Install | `npm ci` (CI uses the same) |
| Prisma Client | `npx prisma generate` |
| Full gate | `npm run verify` → ESLint, `tsc --noEmit`, Jest, production build |
| Container smoke | `./scripts/verify-health.sh` (GET + `HEAD` on `/api/live` and `/api/health`; Python 3 validates readiness JSON) |
| Node.js | **20.x** (see `package.json` `engines` and `.nvmrc`) |

---

## Roadmap docs (by phase)

| Phase | Doc | Topics |
|-------|-----|--------|
| 1 | [PHASE1_ARCHITECTURE.md](PHASE1_ARCHITECTURE.md) | Docker (OCI labels), health probes, `instrumentation.ts`, `x-request-id`, errors, `verify` |
| 2 | [PHASE2_CMS.md](PHASE2_CMS.md) | Draft preview URLs, CMS notes, RWD |
| 3 | [PHASE3_OBSERVABILITY_AND_SECURITY.md](PHASE3_OBSERVABILITY_AND_SECURITY.md) | Logging, security headers, rate limits, CI/CD |
| 4 | [PHASE4_UI_AND_SEO.md](PHASE4_UI_AND_SEO.md) | SEO (sitemap, robots, meta), typography |

Supporting references: [FEATURES.md](FEATURES.md), [OPERATIONS_QUICK_REFERENCE.md](OPERATIONS_QUICK_REFERENCE.md), [MIGRATION_CHECKLIST.md](MIGRATION_CHECKLIST.md), [TROUBLESHOOTING.md](TROUBLESHOOTING.md), [Security policy](../.github/SECURITY.md), [OPERATIONS_AND_RELIABILITY.md](OPERATIONS_AND_RELIABILITY.md), [CI_CD.md](CI_CD.md), [ENVIRONMENT.md](ENVIRONMENT.md), [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Automation

- **GitHub:** `.github/workflows/ci.yml` runs `npm run verify` on pull requests to `test`.
- **Deploy:** `.github/workflows/deploy.yml` runs the same verify step before SSH deploy (secrets required).

---

## Related

- [README.md](../README.md) — project overview and documentation table
