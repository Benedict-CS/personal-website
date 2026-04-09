# Phase 4 — UI/UX, SEO, and Refactoring

This document describes SEO and public-UI conventions for the personal site. The product is **light-theme only** (no dark mode).

---

## SEO (implemented)

| Feature | Location |
|---------|----------|
| **Root metadata** | `src/app/layout.tsx` — `generateMetadata()`: title template, description, Open Graph, Twitter cards, `robots`, icons, optional Google verification |
| **Per-route metadata** | Page modules (e.g. `src/app/page.tsx`, `src/app/blog/page.tsx`, `src/app/blog/archive/page.tsx`, `src/app/blog/tag/[tagSlug]/page.tsx`, `src/app/blog/[slug]/page.tsx`) set canonical URLs, Open Graph `type`, and Twitter cards where applicable; **About** and **Contact** (`src/app/contact/layout.tsx`) match the same pattern |
| **Sitemap** | `src/app/sitemap.ts` — split indexes (static + custom pages; blog posts); `force-dynamic` for fresh URLs; custom pages included when publicly visible (published or schedule already passed — `isCustomPagePublicOnSite`) |
| **Robots** | `src/app/robots.ts` — allows `/`, disallows `/dashboard/`, `/editor/`, and `/api/`; points to `/sitemap.xml` |
| **RSS** | `src/app/feed.xml/route.ts` and tag feeds under `src/app/feed/` |
| **Canonical URLs** | Set via `metadataBase` / `alternates` from site config (`NEXT_PUBLIC_SITE_URL`) |
| **Structured data (blog post)** | `src/app/blog/[slug]/page.tsx` — JSON-LD `@graph` with **Article** and **BreadcrumbList** (Home → Blog → post title) |
| **Meta descriptions** | `src/lib/meta-description.ts` — blog posts and **custom pages** (`/page/[slug]`) use trimmed plain text; Twitter cards include images on posts where configured |
| **Custom page themes** | `site-theme:clean|soft|bold` in custom page Markdown — **bold** uses a light high-contrast frame (no dark background) |

Ensure **`NEXT_PUBLIC_SITE_URL`** matches your public HTTPS origin in production so sitemaps and canonical URLs are correct.

---

## UI / typography

- Global styles: `src/app/globals.css` — CSS variables for light palette, prose, focus rings, reduced-motion support.
- Layout: `container-narrow`, `section-spacing`, responsive nav and footer via `Navbar` / `Footer`.
- **RWD:** Breakpoints use Tailwind (`sm:`, `md:`, `lg:`); dashboard edit pages cap width with `min()` for sidebar-aware layouts.

---

## Quality gate

`npm run verify` runs **ESLint**, **TypeScript (`tsc --noEmit`)**, **Jest**, and **production build** — catch type errors before deploy.

---

## Related

- [SITE_SETTINGS.md](SITE_SETTINGS.md) — meta title, description, keywords, OG image
- [PHASE3_OBSERVABILITY_AND_SECURITY.md](PHASE3_OBSERVABILITY_AND_SECURITY.md)
- [PHASE1_ARCHITECTURE.md](PHASE1_ARCHITECTURE.md)
