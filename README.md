# Personal Website Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![NextAuth](https://img.shields.io/badge/NextAuth-4-000000)](https://next-auth.js.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Production-ready personal website and CMS with a commercial-style dashboard and visual editor. Built with Next.js 16 (App Router), React 19, TypeScript, Prisma, PostgreSQL, and S3-compatible storage.

---

## Core Capabilities

- Public site pages: Home, About, Blog, Contact, and custom pages (`/page/[slug]`).
- **Site settings** (Dashboard → Content → Site settings): site name, logo, favicon, meta, navbar, footer, copyright, social links, OG image, Google Analytics. See [Site settings](docs/SITE_SETTINGS.md) for what each option affects.
- Dashboard management for site settings, content pages, home sections (add/remove/reorder), posts, tags, media, analytics, audit logs, and setup.
- Dashboard analytics (page views, blog view counts, CV downloads); see [Environment](docs/ENVIRONMENT.md) for `ANALYTICS_SECRET` / `ANALYTICS_EXCLUDED_IPS`.
- Editor workflow with `Save Draft`, `Publish`, undo/redo shortcuts, local recovery, and server revision history.
- Shareable preview links for unpublished content.
- Scheduled publishing for custom pages.
- Media library with usage checks, cleanup analysis, and image optimization (assessment + execution).

---

## Tech Stack

### Core

| Layer | Technology | Notes |
|-------|------------|--------|
| **Framework** | [Next.js 16](https://nextjs.org/) | App Router, server components, dynamic OG images |
| **UI** | [React 19](https://reactjs.org/) | Server + client components |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict mode |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first, `@tailwindcss/typography` for prose |
| **Database** | [PostgreSQL](https://www.postgresql.org/) + [Prisma 5](https://www.prisma.io/) | ORM, migrations, type-safe client |
| **Auth** | [NextAuth.js 4](https://next-auth.js.org/) | Credentials provider, session-based |
| **Deployment** | [Docker](https://www.docker.com/) + Compose | Single-service app image |

### Key libraries

| Purpose | Package |
|---------|---------|
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Markdown | [react-markdown](https://github.com/remarkjs/react-markdown), [remark-gfm](https://github.com/remarkjs/remark-gfm), [rehype-highlight](https://github.com/rehypejs/rehype-highlight), [rehype-katex](https://github.com/remarkjs/remark-math) |
| UI primitives | [Radix UI](https://www.radix-ui.com/) (Slot, Tabs) |
| Drag and drop | [@dnd-kit](https://dndkit.com/) |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Email | [Resend](https://resend.com/) or [Nodemailer](https://nodemailer.com/) |
| Object storage | [AWS SDK S3](https://aws.amazon.com/sdk-for-javascript/) (S3-compatible API) |
| Images | [Sharp](https://sharp.pixelplumbing.com/) (optimization, OG) |
| Testing | [Jest](https://jestjs.io/), [Playwright](https://playwright.dev/) |
| Lint / format | [ESLint](https://eslint.org/), [eslint-config-next](https://nextjs.org/docs/app/building-your-application/configuring/eslint) |

---

## Quick Start

```bash
git clone https://github.com/Benedict-CS/personal-website.git personal-website
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
