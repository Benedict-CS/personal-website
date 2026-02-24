# Recommendations: What You Can Do Next

Ideas across **frontend**, **backend**, **database**, **portability**, **CI/CD**, **automation**, and **UX**. Pick what fits your goals.

---

## Done in This Repo (Reference)

- **Health check**: `GET /api/health` — use in Docker healthcheck or uptime monitors.
- **Back to top**: Blog post page has a floating “Back to top” button after scroll.
- **Analytics CSV export**: Dashboard → Analytics → “Export CSV” for current date range.
- **404**: Custom not-found page with links to Home, Blog, About, Contact, Search.

---

## Frontend & UX

| Item | Effort | Notes |
|------|--------|------|
| **Breadcrumbs on public site** | Low | e.g. Home → Blog → Post title (SEO + navigation). |
| **Back to top on About / long pages** | Low | Reuse `<BackToTop />` in about or layout. |
| **Contact form: focus and success state** | Low | Clear focus ring, success icon or message animation. |
| **Global search: keyboard shortcut** | Low | e.g. Ctrl+K opens search (without conflicting dashboard ⌘K). |
| **RSS autodiscovery** | Low | Add `<link rel="alternate" type="application/rss+xml" href="/feed.xml">` (e.g. via a layout that injects into head or a small script in `app/layout.tsx` that appends the link). |
| **PWA / offline** | Medium | next-pwa or similar for installable site. |

---

## Dashboard & Management

| Item | Effort | Notes |
|------|--------|------|
| **Posts: responsive card list** | Medium | On small screens, show cards instead of table for easier management. |
| **Posts: bulk edit category or tags** | Medium | Extend bulk actions. |
| **Media: bulk delete** | Low | Checkboxes + “Delete selected”. |
| **Session expiry modal** | Low | When SessionCountdown is low, show “Extend session?” or “Log in again”. |
| **Audit log** | High | Log “who published/edited what when” for compliance or debugging. |

---

## Backend & API

| Item | Effort | Notes |
|------|--------|------|
| **Rate limit** | Medium | Contact form and/or auth: e.g. `@upstash/ratelimit` or in-memory per-IP. |
| **Structured logging** | Low | Log request id, path, status, duration (e.g. pino). |
| **API versioning** | Low | e.g. `/api/v1/...` if you add more public APIs later. |

---

## Database

| Item | Effort | Notes |
|------|--------|------|
| **Scheduled backups** | Low–Medium | Cron + `pg_dump` to disk or S3; see `scripts/` and backup docs. |
| **Soft delete for posts** | Medium | `deletedAt` instead of hard delete; hide in UI, keep in DB. |
| **DB connection pooling** | Low | If not already: e.g. PgBouncer or Prisma’s pooling for production. |

---

## Portability & Ops

| Item | Effort | Notes |
|------|--------|------|
| **Docker healthcheck** | Low | In compose: `healthcheck: { test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"], ... }`. |
| **.env validation on startup** | Low | Script or small module: check required vars and exit with clear message. |
| **docker-compose.override.example.yml** | Low | Example overrides for local dev (ports, env file). |

---

## CI/CD & Automation

| Item | Effort | Notes |
|------|--------|------|
| **Lint in CI** | Done | Your CI already runs lint (optional continue-on-error). Consider making it block on main. |
| **Build on PR** | Done | Build step already in CI. |
| **Deploy on tag** | Low | e.g. on push tag `v*`, build and push image or trigger deploy. |
| **E2E smoke test** | Medium | Playwright/Cypress: open home, blog, one post; optional after deploy. |
| **Dependabot / Renovate** | Low | Automated dependency PRs. |

---

## Security & Reliability

| Item | Effort | Notes |
|------|--------|------|
| **CSP header** | Medium | Content-Security-Policy in next.config to reduce XSS risk. |
| **Security headers** | Low | You have some; add HSTS, X-Content-Type-Options if not set. |
| **Secrets in CI** | Low | Use GitHub secrets for Harbor credentials; never log them. |

---

## Quick Wins You Can Add Soon

1. **RSS autodiscovery** in `src/app/layout.tsx`.
2. **Healthcheck** in `docker-compose.yml` using `/api/health`.
3. **Back to top** on About page (same `<BackToTop />` component).
4. **.env.example** note that required vars must be set (already documented in ENV_SETUP).

If you tell me which area you want to focus on (e.g. “CI only” or “dashboard only”), I can outline concrete steps or patches next.
