# Documentation Index

This folder contains all project documentation. **User-facing docs are in English.**

---

## User-facing documentation (English)

Start here if you are setting up, deploying, or using the site.

| Document | Description |
|----------|-------------|
| [../README.md](../README.md) | Project overview, features, tech stack, quick start, common commands. |
| [GETTING_STARTED.md](GETTING_STARTED.md) | Step-by-step setup: clone, `.env`, first run, migrations, troubleshooting. |
| [ENVIRONMENT.md](ENVIRONMENT.md) | Every environment variable: required/optional, Docker/DB/RustFS/auth/contact/Sentry. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design: components, data flow, DB schema, why the dashboard is designed this way. |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Docker Compose deploy, Nginx Proxy Manager (SSL), CI (working), CD (optional). |
| [MAINTENANCE.md](MAINTENANCE.md) | Backups (Postgres, RustFS), updates, monitoring, disk cleanup, security. |
| [DASHBOARD_USER_GUIDE.md](DASHBOARD_USER_GUIDE.md) | How to use the dashboard: wizard, site settings, home/about/contact/posts/pages, media, analytics. |
| [BUILDING_MY_PERSONAL_WEBSITE.md](BUILDING_MY_PERSONAL_WEBSITE.md) | **Blog-style post (interview material):** From zero to production—requirements, architecture, tools, dashboard design rationale, security, deployment, maintenance. |

---

## Quick navigation

**I want to...**

- **Set up from scratch** → [GETTING_STARTED.md](GETTING_STARTED.md)
- **Configure environment variables** → [ENVIRONMENT.md](ENVIRONMENT.md)
- **Understand architecture and design** → [ARCHITECTURE.md](ARCHITECTURE.md) and [BUILDING_MY_PERSONAL_WEBSITE.md](BUILDING_MY_PERSONAL_WEBSITE.md)
- **Deploy with Docker and optional SSL** → [DEPLOYMENT.md](DEPLOYMENT.md)
- **Back up or update the system** → [MAINTENANCE.md](MAINTENANCE.md)
- **Use the dashboard without code** → [DASHBOARD_USER_GUIDE.md](DASHBOARD_USER_GUIDE.md)

---

## Internal / reference docs

The following files are development notes, fix logs, or legacy guides. They are **not** required for end users. You can move them to an `archive/` or `internal/` subfolder if you prefer to keep only user-facing docs in the main list.

| File | Purpose |
|------|---------|
| BUILD_GUIDE.md | Build options and troubleshooting. |
| SETUP.md | Older setup guide (superseded by GETTING_STARTED.md for new users). |
| DATA_MANAGEMENT.md, BACKUP_AND_MIGRATION.md | Backup and migration details (overlap with MAINTENANCE.md). |
| CI_CD.md, CI_CD_GUIDE.md, NEXT_STEPS_CRON_AND_CICD.md | CI/CD and cron notes (see DEPLOYMENT.md for current CI/CD). |
| DEV_NOTES.md | Prisma, Next.js, auth implementation notes. |
| MINIO_ALTERNATIVES.md | Why RustFS replaced MinIO; migration context. |
| FIX_*.md, WHY_*.md | One-off fix or root-cause notes. |
| NON_TECHNICAL_USER_GUIDE.md | Superseded by DASHBOARD_USER_GUIDE.md for user-facing content. |
| blog.md | Older blog draft (e.g. Chinese); interview-style post is BUILDING_MY_PERSONAL_WEBSITE.md. |

Other docs (e.g. CUSTOM_PAGES, EDITABLE_SITE_ROADMAP, MONITORING, RECOMMENDATIONS, VERSION_CONTROL) are optional reference; link to them from the main docs where relevant.

---

## What else can be done

- **[WHATS_NEXT.md](WHATS_NEXT.md)** — CI, tests, docs, CD, backup, security, roadmap.
- **[IDEAS_AND_OPTIMIZATIONS.md](IDEAS_AND_OPTIMIZATIONS.md)** — Backlog of **new features**, **management/ops**, **performance**, **UI/UX** (dashboard + public site), **security**, and **quick wins**. Use it when you want to add practical functionality or polish.
