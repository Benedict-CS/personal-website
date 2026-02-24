# Implementation Summary

This document summarizes the features implemented for non-technical users, templates, tests, monitoring, performance, and SEO.

---

## 一、給非技術使用者的體驗

### 1. More FieldHelp
- **Site settings:** Site name (navbar), OG image (social share), Navigation (navbar links) each have a help icon with plain-language explanation.
- **About page:** Country code (Education block) has FieldHelp: "Two-letter country code (e.g. TW, US). Shown as a flag next to the school name."

### 2. Setup wizard copy (conversational)
- Step titles: "Your site name and browser tab title", "Logo and small icon (favicon)", "Top menu links", "Footer: email and social links", "You're done".
- Labels: "Site name (what appears in the top bar)", "Browser tab title (what appears in the tab)", "Logo (shown in the top bar next to your site name)", "Small icon in the browser tab (favicon)".
- Intro: "A few steps to get your site ready. You can change any of this later in Content → Site settings."

### 3. Preview button
- **Custom pages:** When editing a page, a "Preview" button opens the public page in a new tab (uses current slug).
- **Post edit:** Already had a prominent "Preview" button in the toolbar.

### 4. Home section visibility and order
- **Config:** `sectionOrder` and `sectionVisibility` in home site-content JSON.
- **Dashboard:** Content → Home has a "Home page sections" card: drag to reorder Hero, Latest Articles, Technical Skills; checkboxes to show/hide each.
- **Public home:** Renders sections in configured order and skips hidden ones.

### 5. About section visibility
- **Schema:** `AboutConfig` has `sectionOrder` and `sectionVisibility` (migration: `20260131000009_about_section_order_visibility`).
- **API:** GET/POST `/api/about/config` include and accept `sectionOrder`, `sectionVisibility`.
- **Dashboard:** Content → About has "About page sections" card with checkboxes (Education, Experience, Projects, Skills, Achievements) and "Save section visibility".
- **Public about:** Each section is rendered only if `sectionVisibility[id] !== false`.

**Migration:** Run `npx prisma migrate deploy` (or `prisma migrate dev`) so the new About columns exist.

---

## 三、內容與版型自由度

### 6. Templates (one-click apply)
- **Site settings:** "Templates" card with three buttons: **Personal**, **Portfolio**, **Blog**.
- Each applies: nav items (and order), `templateId` (default / card / minimal), and home `sectionOrder` + `sectionVisibility`. Existing home content (hero title, skills, etc.) is preserved; only section order/visibility and nav are updated.

### 7. Custom page: insert image and insert button
- **Custom pages:** When editing a page, above the content textarea there are "Insert image" and "Insert button" buttons.
- **Insert image:** Opens Media picker; on select, appends Markdown `![name](url)` to the content.
- **Insert button:** Opens Media picker; on select, appends Markdown `[Button](url)` (user can edit the text in the editor).

---

## 四、技術與維運

### 8. Tests
- **`src/__tests__/api-site-config.test.ts`:** GET `/api/site-config` returns default config when no row, and returns stored config when row exists (with mocked Prisma).
- **Run:** `npm test`

### 9. Error monitoring (Sentry)
- **Package:** `@sentry/nextjs` installed.
- **Config:** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` initialize Sentry when DSN is set.
- **Next:** `next.config.ts` uses `withSentryConfig(nextConfig, { silent: !process.env.SENTRY_DSN, org, project })`.
- **To enable:** Set `SENTRY_DSN` (and optionally `NEXT_PUBLIC_SENTRY_DSN` for client, `SENTRY_ORG`, `SENTRY_PROJECT`) in `.env`. Without DSN, Sentry is silent and the app runs as before.

### 10. Performance (pagination)
- **Dashboard Posts:** List is paginated: 20 posts per page. URL params `page`, `status`, `sort`, `order`, `q` are preserved. "Previous / Page X of Y / Next" links below the table when there are multiple pages.
- **Media:** Still loads all objects from S3; virtual scroll or API pagination can be added later if needed.
- **Next/Image:** Already used where applicable; ensure `sizes` are set on high-traffic images if you tune further.

### 11. SEO
- **Sitemap:** `src/app/sitemap.ts` – dynamic; includes home, about, blog, contact, all published posts, all published custom pages. `changeFrequency` and `priority` set.
- **Robots:** `src/app/robots.ts` – allows `/`, disallows `/dashboard/`, `/api/`, points to `sitemap.xml`.
- **Canonical / structured data:** Already present in layout and blog post metadata (e.g. `alternates.canonical`, `openGraph`, Article JSON-LD). No changes made in this pass.

---

## Files touched (overview)

- **FieldHelp / copy:** `src/app/dashboard/content/site/page.tsx`, `src/app/dashboard/content/about/page.tsx`, `src/app/dashboard/setup/page.tsx`
- **Preview:** `src/app/dashboard/content/pages/page.tsx`
- **Home sections:** `src/app/page.tsx`, `src/app/dashboard/content/home/page.tsx`
- **About sections:** `prisma/schema.prisma`, `prisma/migrations/20260131000009_about_section_order_visibility/migration.sql`, `src/app/api/about/config/route.ts`, `src/app/about/page.tsx`, `src/app/dashboard/content/about/page.tsx`
- **Templates:** `src/app/dashboard/content/site/page.tsx`
- **Insert image/button:** `src/app/dashboard/content/pages/page.tsx` (+ `InsertMediaModal`)
- **Tests:** `src/__tests__/api-site-config.test.ts`
- **Sentry:** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `next.config.ts`, `package.json`
- **Pagination:** `src/app/dashboard/posts/page.tsx`
