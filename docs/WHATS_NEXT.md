# What Else Can Be Done

A checklist of optional improvements. Pick what fits your goals and time.

---

## CI / Quality

- **Run unit tests in CI**  
  Add `npm test` to the GitHub Actions workflow so every PR runs `src/__tests__/*.test.ts`. Right now CI only runs lint and build.

- **Fix CI trigger and typo**  
  - Workflow triggers on `pull_request` to `test` only. Consider adding `main` (or your default branch) if you want CI on every PR.  
  - In `ci.yml`, fix the comment typo: `不會自動運行c'd` → e.g. `不會自動運行` or "does not run automatically".

- **Lint as blocking**  
  `continue-on-error: true` on lint means failed ESLint does not fail the job. When the codebase is clean, set it to `false` so lint must pass.

- **E2E in CI (optional)**  
  Playwright e2e (`npm run test:e2e`) needs a running app. To run in CI: add a job that starts the app (or a Docker stack), then runs Playwright against it. Higher effort; only if you want regression coverage on critical flows.

---

## Tests

- **More unit tests**  
  Added: `lib/utils.test.ts` (stripMarkdown, cn), `api-posts.test.ts` (GET/POST list, auth, validation), `api-site-content.test.ts` (GET/PATCH, auth, invalid page), `api-contact.test.ts` (validation 400), `api-search.test.ts` (empty q, shape, error 500). Run with `npm test`. You can add more for posts/[id], custom-pages, or lib/s3 with mocks.

- **E2E for dashboard flows**  
  Smoke tests cover public pages and health. You could add one or two E2E tests for dashboard: login → open a content page → save (with test credentials from env or a test user). Optional and more maintenance.

---

## Documentation / Repo hygiene

- **Archive internal docs**  
  Move dev-only or fix-specific files to `docs/archive/` or `docs/internal/` (e.g. `FIX_*.md`, `WHY_*.md`, old `SETUP.md`, `NON_TECHNICAL_USER_GUIDE.md`, `blog.md` draft). Keep `docs/README.md` as the index and link “see also archive” if needed.

- **Align .env.example with ENVIRONMENT.md**  
  Add optional variables to `.env.example` (e.g. `SENTRY_DSN`, `ANALYTICS_SECRET`, `ANALYTICS_EXCLUDED_IPS`) with short comments, so new clones have one place to copy from. Prefer English comments in `.env.example` if this repo is user-facing.

- **Single “non-technical” guide**  
  You already have `DASHBOARD_USER_GUIDE.md` as the main user-facing guide. Remove or redirect `NON_TECHNICAL_USER_GUIDE.md` to avoid duplication.

---

## Deployment / Ops

- **CD (continuous deployment)**  
  When the server and SSH are ready: configure GitHub Secrets (`DEPLOY_HOST`, `DEPLOY_USER`, `SSH_PRIVATE_KEY`, optional `DEPLOY_PATH`) and enable the CD workflow (e.g. on push to `main` → SSH and run `./scripts/manual-deploy.sh`). Documented in `docs/DEPLOYMENT.md`.

- **Backup automation**  
  You have `scripts/backup.sh`, `backup-data.sh`, `restore-from-backup.sh`. Add a cron example (e.g. in `scripts/crontab.example`) for daily DB + RustFS backup and document it in `docs/MAINTENANCE.md`.

- **Health in orchestration**  
  Docker Compose already uses `/api/health` for the app. If you use Kubernetes or another orchestrator later, use the same endpoint for readiness/liveness.

---

## Product / Features (from roadmap)

- **Block-based editor**  
  Optional block-based editing for custom pages (heading, text, image, button) alongside or instead of raw Markdown. Larger feature; good for “no-code” storytelling.

- **Monitoring**  
  Optional Prometheus/Grafana or more Sentry usage for errors and performance. Start with Sentry if you only need error tracking.

- **i18n**  
  Add only if you need multiple locales; requires routing and content strategy.

---

## Security / Hardening

- **Rate limiting**  
  Add rate limiting on sensitive routes (e.g. `/api/contact`, `/api/auth/callback`, login form) to reduce abuse. Can be middleware or a small in-memory/Redis limiter.

- **Security headers**  
  Consider CSP, X-Frame-Options, etc. in Next.js config or at the reverse proxy (Nginx). Document in `docs/DEPLOYMENT.md` or `docs/ARCHITECTURE.md`.

---

## Content / Interview

- **Replace diagram placeholders**  
  In `docs/BUILDING_MY_PERSONAL_WEBSITE.md` §9, add real diagrams (draw.io, Excalidraw, or Mermaid exported to PNG) for high-level architecture, request flow, and dashboard IA. Helps in interviews.

- **Trim or tailor the blog post**  
  Shorten or restyle `BUILDING_MY_PERSONAL_WEBSITE.md` to match your voice and the length you want for the live blog post.

---

## Summary table

| Area           | Action                                      | Effort  |
|----------------|---------------------------------------------|---------|
| CI             | Add `npm test`; fix typo; optional lint strict | Low     |
| Tests          | More API/lib unit tests                     | Medium  |
| Docs           | Archive internal docs; align .env.example   | Low     |
| CD             | Enable when server/SSH ready               | Medium  |
| Backup         | Cron example + MAINTENANCE note             | Low     |
| Features       | Block editor, monitoring, i18n             | High    |
| Security       | Rate limiting, security headers            | Low–Med |
| Interview      | Real diagrams; trim blog post              | Low     |

You can do the low-effort items first (CI test + typo, doc archive, .env.example, backup cron note), then tackle CD and tests as needed.
