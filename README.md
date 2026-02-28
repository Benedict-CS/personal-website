# Benedict's Personal Website

A full-stack personal website and blog with a **no-code-friendly dashboard**: public site (Home, About, Blog, Contact, custom pages) and an admin backend for content management. Built with Next.js 16 (App Router), React 19, PostgreSQL, and S3-compatible object storage (RustFS).

---

## Features

- **Public site**: Home, About, Blog, Contact, custom Markdown pages, RSS (and per-tag at `/feed/tag/[tag]`), sitemap, search, related posts by tag, reading progress, skip-to-content, print-friendly styles.
- **Dashboard** (no code required): Site settings (name, logo, nav, footer, meta, OG image), first-time setup wizard, Home/About/Contact/Custom pages editing, posts CRUD, media library, tags, analytics, CV upload.
- **Auth**: NextAuth.js (credentials); session expiry and re-login flow.
- **Content**: Posts (Markdown, tags, categories, draft/publish, version history, preview links with optional expiry), custom pages (slug-based), editable About (education/experience/projects/skills/achievements), configurable home sections (order and visibility). Blog list and post pages use ISR (`revalidate = 60`); cache is invalidated on post create/update/delete.
- **Media**: S3-compatible storage (RustFS); upload from dashboard, insert into posts/pages.
- **CI**: GitHub Actions (lint, build, Prisma generate). CD (auto-deploy on push to main) is optional and documented; configure when your server and SSH are ready.

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | Next.js 16 (App Router) | SSR, API routes, static generation, good DX. |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Radix) | Consistent, accessible components; easy theming. |
| Database | PostgreSQL 15, Prisma 5 | Relational data (posts, tags, config, custom pages, analytics). |
| Object storage | RustFS (S3-compatible) | Fast, single-service, Apache 2.0; replaced MinIO. |
| Auth | NextAuth.js v4 | Credentials provider, session, middleware protection. |
| Deployment | Docker Compose | App + Postgres + RustFS; optional Nginx Proxy Manager for SSL. |

---

## Quick Start

**Prerequisites:** Docker and Docker Compose, Git.

```bash
git clone <your-repo-url> personal-website
cd personal-website
cp .env.example .env
# Edit .env: set ADMIN_PASSWORD, NEXTAUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_SITE_URL, POSTGRES_PASSWORD, RUSTFS, S3 keys, etc. See docs/ENVIRONMENT.md.
docker compose up -d --build
# Run migrations inside the app container:
docker compose exec app npx prisma migrate deploy
# Open http://localhost:3000 and log in at /dashboard with ADMIN_PASSWORD.
```

- **Detailed setup (new project, env, first run):** [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)  
- **All environment variables:** [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)  
- **Architecture and design:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)  
- **Deployment and CI/CD:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)  
- **Maintenance (backups, updates):** [docs/MAINTENANCE.md](docs/MAINTENANCE.md)  
- **Dashboard user guide (no-code):** [docs/DASHBOARD_USER_GUIDE.md](docs/DASHBOARD_USER_GUIDE.md)

---

## Project Structure

```
personal-website/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API routes (posts, media, site-config, auth, etc.)
│   │   ├── dashboard/       # Admin UI (protected)
│   │   ├── blog/            # Public blog
│   │   ├── about/           # Public about page
│   │   ├── contact/         # Public contact + form
│   │   └── page/            # Custom pages (e.g. /page/portfolio)
│   ├── components/          # Shared React components
│   ├── lib/                 # DB, auth, S3, site config, utils
│   └── contexts/            # React contexts (toast, leave-guard, breadcrumb)
├── prisma/
│   ├── schema.prisma        # Data model
│   └── migrations/         # SQL migrations
├── public/                  # Static assets (CV, etc.)
├── docs/                    # Documentation (English, user-facing)
├── scripts/                 # Deploy, migrate, backup, init
├── docker-compose.yml       # App + Postgres + RustFS
├── Dockerfile               # Next.js standalone build
└── .github/workflows/       # CI (and optional CD)
```

---

## Common Commands

| Task | Command |
|------|--------|
| Development | `npm run dev` (or `npm run dev -- -H 0.0.0.0` for LAN access) |
| Build | `npm run build` |
| Start (production) | `npm start` |
| Run migrations | `docker compose exec app npx prisma migrate deploy` (or `./scripts/migrate.sh`) |
| DB GUI | `docker compose exec app npx prisma studio` |
| Tests | `npm test` |

---

## Environment Variables (summary)

Required for a working stack (see [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for full reference):

- **Database:** `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- **RustFS:** `RUSTFS_ROOT_USER`, `RUSTFS_ROOT_PASSWORD`; **S3:** `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` (app uses `S3_ENDPOINT` from compose)
- **Auth:** `ADMIN_PASSWORD`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`
- **Contact form:** Either Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) or SMTP; `CONTACT_EMAIL` for recipient

Optional: `ANALYTICS_SECRET`, `ANALYTICS_EXCLUDED_IPS`, `SENTRY_DSN`, etc.

---

## CI/CD

- **CI:** On pull requests (and manual trigger), GitHub Actions runs install, lint, Prisma generate, and build. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- **CD:** Optional. When configured (GitHub Secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `SSH_PRIVATE_KEY`, optional `DEPLOY_PATH`), push to `main` triggers SSH to the server and runs `./scripts/manual-deploy.sh`. CD is documented but can be set up later if your server or SSH is not ready.

---

## Documentation Index

All user-facing documentation is in English:

| Document | Description |
|----------|-------------|
| [GETTING_STARTED.md](docs/GETTING_STARTED.md) | New project setup, step-by-step, first run. |
| [ENVIRONMENT.md](docs/ENVIRONMENT.md) | Every `.env` variable explained. |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, components, data flow, dashboard design. |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker deploy, Nginx/SSL, CI/CD. |
| [MAINTENANCE.md](docs/MAINTENANCE.md) | Backups, updates, monitoring. |
| [DASHBOARD_USER_GUIDE.md](docs/DASHBOARD_USER_GUIDE.md) | How to use the dashboard without writing code. |
| [BUILDING_MY_PERSONAL_WEBSITE.md](docs/BUILDING_MY_PERSONAL_WEBSITE.md) | Blog-style post: from zero to production (system design, tools, maintenance). |

Other files in `docs/` (e.g. BUILD_GUIDE, BACKUP_AND_MIGRATION, CI_CD_GUIDE) are referenced where relevant; internal or fix-specific notes are kept for development reference only.

---

## License

[MIT](LICENSE) — you may use, copy, modify, and distribute this project under the terms of the MIT License. See [LICENSE](LICENSE) for the full text.
