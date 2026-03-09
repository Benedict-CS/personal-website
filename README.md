# Benedict's Personal Website

Production-ready personal website platform with a commercial-style dashboard and visual editing workflow for non-technical users.

Built with Next.js 16, React 19, Prisma, PostgreSQL, and S3-compatible storage.

---

## Core Capabilities

- Public site pages: Home, About, Blog, Contact, and custom pages (`/page/[slug]`).
- Dashboard management for site settings, content pages, posts, tags, media, analytics, audit logs, and setup.
- Editor workflow with `Save Draft`, `Publish`, undo/redo shortcuts, local recovery, and server revision history.
- Shareable preview links for unpublished content.
- Scheduled publishing for custom pages.
- Media library with usage checks, cleanup analysis, and image optimization (assessment + execution).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Database | PostgreSQL + Prisma |
| Object storage | S3-compatible API (RustFS by default) |
| Authentication | NextAuth credentials session |
| Deployment | Docker Compose |

---

## Quick Start

```bash
git clone <your-repo-url> personal-website
cd personal-website
cp .env.example .env
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
```

Then open:

- Site: `http://localhost:3000`
- Dashboard: `http://localhost:3000/dashboard`

---

## Documentation

- Setup: [`docs/GETTING_STARTED.md`](docs/GETTING_STARTED.md)
- Environment variables: [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md)
- System architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Dashboard user guide: [`docs/DASHBOARD_USER_GUIDE.md`](docs/DASHBOARD_USER_GUIDE.md)
- Custom pages and scheduling: [`docs/CUSTOM_PAGES.md`](docs/CUSTOM_PAGES.md)
- Feature implementation status: [`docs/FEATURE_STATUS.md`](docs/FEATURE_STATUS.md)
- Deploy and operations: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md), [`docs/RUNBOOK.md`](docs/RUNBOOK.md)

---

## Development Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Tests | `npm test` |
| Prisma generate | `npx prisma generate` |
| Prisma migrate deploy | `docker compose exec app npx prisma migrate deploy` |

---

## License

[MIT](LICENSE)
