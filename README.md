# Personal Website Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Production-ready personal website and CMS with a commercial-style dashboard and visual editor. Next.js 16, React 19, Prisma, PostgreSQL, S3-compatible storage.

---

## Core Capabilities

- Public site pages: Home, About, Blog, Contact, and custom pages (`/page/[slug]`).
- **Site settings** (Dashboard → Content → Site settings): site name, logo, favicon, meta, navbar, footer, copyright, social links, OG image, Google Analytics. See [Site settings](docs/SITE_SETTINGS.md) for what each option affects.
- Dashboard management for site settings, content pages, home sections (add/remove/reorder), posts, tags, media, analytics, audit logs, and setup.
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

| Doc | Description |
|-----|-------------|
| [GETTING_STARTED.md](docs/GETTING_STARTED.md) | First-time setup |
| [ENVIRONMENT.md](docs/ENVIRONMENT.md) | Environment variables |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and data flow |
| [API.md](docs/API.md) | REST API reference |
| [DASHBOARD_USER_GUIDE.md](docs/DASHBOARD_USER_GUIDE.md) | Dashboard usage |
| [CUSTOM_PAGES.md](docs/CUSTOM_PAGES.md) | Custom pages and scheduling |
| [SITE_SETTINGS.md](docs/SITE_SETTINGS.md) | What site settings affect (navbar, footer, meta, GA) |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md), [MAINTENANCE.md](docs/MAINTENANCE.md), [RUNBOOK.md](docs/RUNBOOK.md) | Deploy and operations |

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
