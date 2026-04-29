# Personal Website as a Full-Stack Platform

## Introduction

Most personal websites are static portfolios: a homepage, an about page, and a blog powered by a third-party CMS.

I chose a different path.

I engineered my site as a **full-stack publishing and operations platform** — with a production-style dashboard, an immersive visual editor, structured content workflows, media management, analytics, access controls, and deployment-ready infrastructure from day one.

This isn't a "it works on my machine" side project. It is a real system I can iterate, monitor, and extend — and this post documents exactly how it's built.

---

<!-- TODO: replace ./images/fig2-tech-stack.png with the uploaded /api/media/serve/... URL once the asset is moved into the media library. -->
![Tech stack map](./images/fig2-tech-stack.png)
*(Full technology stack — UI, App, Data, and Infrastructure layers.)*

---

## 1. Why This Architecture?

A personal site can be one of two things:

- A one-time front-facing page you rarely touch, or
- A long-term platform you iterate like a real product.

I built for option two. The design goals were clear from the start:

| Goal | What It Means in Practice |
|---|---|
| **Fast public UX** | Reader-first, SEO-first, server-rendered by default |
| **Strong authoring workflow** | Dashboard + visual editor, no redeploy needed for content changes |
| **Operational control** | Health endpoints, audit logs, runtime error monitoring |
| **Extensibility** | S3-compatible storage, integration hooks, site-scoped modules |

The decision that shaped everything else:

> *Changing the menu or turning off a page section should not require a deploy.*

This led to a **configuration-as-data** design — navigation, page sections, and layout controls all live in the database. The site behaves like a product, not a hardcoded template.

---

## 2. System Architecture

The platform has two distinct user flows.

### Visitor (Public) Flow

![fig1a visitor flow](/api/media/serve/1777383390138-fig1a-visitor-flow.webp#rs=640w=%2Fapi%2Fmedia%2Fserve%2F1777383390138-fig1a-visitor-flow-w640.webp "880x570")

Public traffic enters through Cloudflare, hits the Next.js App Router for server-side rendering using React Server Components, then reads from PostgreSQL via Prisma for content and RustFS for media assets. SEO signals (sitemap, RSS, Open Graph, JSON-LD) are all generated server-side.

### Admin (Management) Flow

![fig1b admin flow](/api/media/serve/1777383407147-fig1b-admin-flow.webp#rs=640w=%2Fapi%2Fmedia%2Fserve%2F1777383407147-fig1b-admin-flow-w640.webp "880x600")

Admin traffic is gated by NextAuth session validation. Dashboard and Editor routes are kept intentionally separate — the Editor lives at `/editor/*` to provide a focused, distraction-free authoring context. All mutations go through typed API routes, which write to the database, trigger the media pipeline, and log to the audit trail.

---

## 3. Core Stack

| Layer | Technology | Why |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server-first rendering, file-based routing, collocated API routes |
| **Language** | TypeScript | End-to-end type safety across UI, API, and data access |
| **UI** | React 19 + Tailwind CSS 4 + design tokens | Scalable component system with semantic, consistent styling |
| **Data Access** | Prisma ORM | Type-safe queries, structured migrations, clear schema |
| **Auth** | NextAuth | Session management and route protection |
| **Abuse Protection** | Cloudflare Turnstile + rate limiting | CAPTCHA on sign-in; per-endpoint limits on public APIs |
| **Content** | Markdown + MDX pipeline | Rich article rendering with embedded dynamic blocks |
| **Media** | Upload + `sharp` optimization | Image resizing and format conversion on ingest |
| **Storage** | PostgreSQL + RustFS (S3-compatible) | Relational content in Postgres; binary assets in RustFS |
| **Observability** | Sentry + health endpoints | Runtime error capture and uptime diagnostics |
| **Testing** | Jest + Playwright | Unit/integration tests + E2E smoke coverage |
| **Infra** | Docker / Docker Compose | Reproducible local environment and production deployment |
| **Security** | CSP, strict headers, `security.txt` | Browser hardening and XSS/clickjacking protection |

---

## 4. Public-Site Features (Reader Experience)

### What the reader sees

- Home, About, Blog, Contact, and configurable Custom Pages
- Archive and tag-based blog exploration (`/blog/tag/[tagSlug]`, `/blog/archive`)
- Reading progress bar and sticky reading chrome
- Table of Contents with scroll-linked active-section highlighting
- Copy/share actions — Web Share API, social deep-links, URL copy fallback
- Related post recommendations at article end

### SEO & Discoverability

Every route generates:

```
/sitemap.xml          → Full site map, auto-generated
/robots.txt           → Crawler rules
/feed.xml             → RSS (all posts)
/feed/tag/[tag]       → Per-tag RSS feeds
```

Plus per-route **Open Graph**, **Twitter Cards**, and **JSON-LD** structured data (`Article` / `WebPage` schema). Unpublished drafts can be shared via expiring preview tokens — no authentication needed for the reviewer.

![Reader experience](/api/media/serve/1777383579790-Reader_experience.webp#rs=640w=%2Fapi%2Fmedia%2Fserve%2F1777383579790-Reader_experience-w640.webp&1280w=%2Fapi%2Fmedia%2Fserve%2F1777383579790-Reader_experience-w1280.webp "1917x753")

### Rendering Strategy

| Mode | Where Used |
|---|---|
| Server Components (RSC) | All content-heavy public pages |
| Client Components | Interactive islands only (TOC scroll, share actions) |
| ISR / Edge Cache | Blog index, tag pages |
| Bundle analysis | `npm run analyze` for optimization |

---

## 5. Dashboard & Admin Features (Operator Experience)

This is where the site behaves like a product.

### Content Lifecycle

The post lifecycle mirrors a real editorial workflow:

```
Draft → Review → Scheduled → Published → Archived
```

Key capabilities:
- **Post versioning** — every save creates a snapshot; restore to any point
- **Scheduled publishing** — set a future `publishedAt`, auto-promoted by the system
- **Notes/drafts separation** — lightweight scratch pad separate from the formal post pipeline
- **Tag management** — create, merge, and remove orphaned tags
- **Custom pages CRUD** — arbitrary pages with ordering and visibility controls

### Editing Surface

Two modes, each for a different purpose:

| Mode | Use Case |
|---|---|
| **Builder mode** | Drag-and-drop sections, toggle visibility, reorder blocks |
| **Raw markdown mode** | Direct authoring with a live preview |

In-context editing covers Home, About, Contact, and all custom pages. Section ordering and show/hide controls write directly to the database — **no redeploy required**.

### Operational Panels

- **Analytics dashboard** — page views, event breakdown, per-path traffic
- **Audit log** — records every mutation (useful for debugging unexpected changes)
- **Health checks** — `/api/live` (liveness, no DB) and `/api/health` (readiness + DB ping)
- **Media operations** — upload, optimize, track usage, clean up orphans
- **Content find-and-replace** — bulk edits across all posts (great for URL migrations)

![Dashboard overview](/api/media/serve/1777383698122-Dashboard_overview.webp#rs=640w=%2Fapi%2Fmedia%2Fserve%2F1777383698122-Dashboard_overview-w640.webp&1280w=%2Fapi%2Fmedia%2Fserve%2F1777383698122-Dashboard_overview-w1280.webp "1913x853")

---

## 6. Storage Architecture: Why RustFS?

The key storage decision was treating object storage as an **interface**, not an implementation.

![fig5 storage abstraction](/api/media/serve/1777383448362-fig5-storage-abstraction.webp#rs=640w=%2Fapi%2Fmedia%2Fserve%2F1777383448362-fig5-storage-abstraction-w640.webp "820x530")

The application uses the **AWS S3 SDK** as its only storage interface. Switching from MinIO (development) to RustFS (production) required exactly one thing: a configuration change. Zero application code was touched.

This is the interface abstraction principle applied to infrastructure:

> *Code to the interface, not the implementation.*

RustFS was chosen for production because it is more lightweight than MinIO while remaining fully S3-compatible and self-hostable on a single VM — no distributed storage cluster required.

---

## 7. CI/CD, Verification, and Reliability

Every change goes through a composite quality gate before it reaches production.

![fig6 cicd pipeline](/api/media/serve/1777383459249-fig6-cicd-pipeline.webp#rs=640w=%2Fapi%2Fmedia%2Fserve%2F1777383459249-fig6-cicd-pipeline-w640.webp "1060x600")

### Quality Gates

| Gate | Tool | What It Catches |
|---|---|---|
| Lint | ESLint | Code style, unused vars, import order |
| Type check | `tsc --noEmit` | Type errors, without emitting output |
| Unit tests | Jest | Logic correctness, component behavior |
| Build | `next build` | Bundling errors, missing environment variables |
| E2E smoke | Playwright | Critical user paths in a real browser |
| Security audit | `npm audit` | Known CVEs in dependencies (informational) |

### Playwright E2E Coverage

Current smoke tests cover:
- `/` — Home page renders
- `/blog` — Blog index loads
- `/contact` — Contact form is interactive
- `/auth/signin` — Auth entry renders correctly
- `/dashboard` — Redirect behavior for unauthenticated users

### Runtime Hardening

Secure HTTP headers configured in `next.config`:

```
Content-Security-Policy   — prevents XSS and inline script injection
X-Frame-Options           — clickjacking protection
Referrer-Policy           — controls referrer leakage
Permissions-Policy        — restricts browser feature access
Strict-Transport-Security — HSTS toggle for HTTPS production
```

Sentry captures runtime exceptions in both server and client contexts, with source maps for readable stack traces in production.

---

## 8. Design System & UI Engineering

I recently completed a significant UI architecture uplift:

| Before | After |
|---|---|
| Hardcoded Tailwind color classes | Semantic design tokens (`--color-surface`, `--color-text-primary`) |
| One-off page layouts | Shared primitives: `PublicPageShell`, `PublicSection`, `DashboardPageHeader` |
| Inconsistent empty states | Standardized `EmptyState` component |

**Light-only design is intentional.** Dark mode adds significant ongoing maintenance cost — every token needs a dark variant, every image needs consideration. For a personal site optimized for readability, the tradeoff clearly favors one well-crafted light theme.

---

## 9. What This Website Is (And Is Not)

| This website **is** | This website **is not** |
|---|---|
| A personal brand surface | A static one-time portfolio |
| A technical writing platform | A no-code template |
| A lightweight CMS + visual editing system | A front-end-only project |
| A production-practice sandbox | A throwaway prototype |

---

## 10. What's Next

**Near-Term**
- Expand Playwright smoke suite across more dashboard and editor paths
- Add stricter accessibility checks in CI (axe-core)
- Monitor Core Web Vitals continuously — LCP and CLS budgets

**Mid-Term**
- Deeper bundle splitting for heavy client islands
- Structured SEO templates for topic clusters
- Better analytics attribution for contact and conversion paths

**Long-Term**
- Turn selected internal modules into reusable starter kits
- Add personalization and recommendation layers
- Evolve from personal site to reusable content platform architecture

---

## Conclusion

I built this project to prove a point:

> **A personal website can be treated with the same engineering rigor as a production product.**

By combining modern web architecture (Next.js App Router, React Server Components), a robust admin and visual editor workflow, S3-abstracted object storage, a full CI/CD pipeline with quality gates, and systematic observability — this platform became more than a portfolio.

It became a **living full-stack system** that I can iterate, monitor, and extend like any real product I'd ship professionally.

If you're building your own site, my biggest recommendation is simple:

> *Don't just design pages. Design workflows, reliability, and iteration velocity. That's where long-term value compounds.*
