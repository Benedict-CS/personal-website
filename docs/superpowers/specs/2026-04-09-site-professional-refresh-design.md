# Design: Site-wide professional UI/UX refresh

**Date:** 2026-04-09  
**Status:** Draft for implementation  
**Constraint:** Light theme only — do **not** add dark mode or `prefers-color-scheme` toggles. Preserve existing `color-scheme: light` and OKLCH palette approach.

## 1. Purpose

Raise perceived quality and maintainability across the **public site**, **Dashboard**, and **Editor** without rewriting the Next.js App Router stack or business logic. Success means clearer hierarchy, consistent spacing and actions, shared primitives, and restrained motion — while keeping accessibility and the current single-theme (light) UX.

## 2. Goals

- **Architecture (presentation layer):** Introduce reusable layout primitives (public `Section` / page chrome; dashboard `DashboardPageHeader` and shared empty/loading patterns) so routes stop duplicating magic numbers and one-off flex/grid stacks.
- **UI/UX:** Enforce readable heading levels, predictable primary/secondary actions, consistent density in lists and forms, and motion limited to navigation, disclosure, and subtle hover.
- **Visual:** Refine spacing, type scale, borders, and shadows within the existing Geist + OKLCH system; optional small token tweaks to primary/muted — **no** new theme variant.

## 3. Non-goals

- Dark mode, high-contrast theme switcher, or multiple color schemes.
- Rewriting auth, Prisma, API contracts, or CMS data models for cosmetic reasons.
- Replacing the entire component library or migrating off Tailwind/shadcn-style patterns.

## 4. Architectural boundaries

| Area | Approach |
|------|----------|
| **Public site** | Keep route-based `layout.tsx` trees. Add thin, reusable **section/page** building blocks so each page expresses “one main topic” with shared max-width, vertical rhythm, and optional eyebrow + title + description. |
| **Dashboard / Editor** | Keep `DashboardShell`. Standardize **content region**: title row, optional toolbar row, shared **empty** and **loading** components; reduce per-page bespoke stacks. |
| **Data & permissions** | No behavioral changes unless a UI bug forces a thin presentation fix (e.g. unified error banner). |

## 5. UI/UX principles (operational)

1. **Hierarchy:** Every page exposes a clear H1; section titles and body copy are visually distinct (size, weight, color token).
2. **Density:** Tables, cards, and forms use aligned gutters and consistent control heights; rules for when to use table vs card are documented in code via shared patterns, not ad hoc.
3. **Predictability:** Primary action in a stable zone (e.g. top-right of tool regions where applicable); secondary uses outline/ghost per existing `Button` variants.
4. **Motion:** Framer Motion and CSS transitions only for nav, drawers, accordions, and light hover — no decorative motion on long-form reading.
5. **Accessibility:** Preserve skip link, visible focus rings, and contrast; new components must not reduce keyboard or screen reader support.

## 6. Visual direction

- Stay on **Geist** (and existing font variables), **OKLCH** tokens in `globals.css`, **light-only** `html { color-scheme: light; }`.
- “Professional” comes from **whitespace, alignment, type scale, border, and shadow tiers** — not from new illustration systems or a full rebrand.
- Explicit exclusion: **no dark mode** implementation in this initiative.

## 7. Delivery order (implementation)

1. **Primitives & tokens:** Section/page primitives for public routes; `DashboardPageHeader` (or equivalent) + shared empty/loading/skeleton patterns for dashboard/editor surfaces; tighten token usage where duplicated literals appear.
2. **Home + global chrome:** Home page sections; `Navbar` and `Footer` alignment with new spacing scale.
3. **Public content routes:** Blog list, post page, About, Contact (and shared markdown/article chrome if applicable).
4. **Dashboard:** By frequency — overview first, then posts, content, and remaining tools/settings.
5. **Editor & immersive editing:** Apply the same content-region and density rules last (highest interaction complexity).

## 8. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Large diff | Land primitives first; migrate routes in the order in §7. |
| Style drift between public and admin | Shared tokens only; avoid one-off hex in new code. |
| Regressions in editor | Test editor flows after dedicated pass; keep changes presentation-only. |

## 9. Approval

Product direction agreed: **full scope** (public + dashboard + editor), **no dark mode**, approach **design tokens + shared primitives first**, then **route rollout** per §7.

---

## Spec self-review (2026-04-09)

- **Placeholders:** None; delivery order is explicit.
- **Consistency:** Non-goals forbid dark mode; §2/§3/§6 align on light-only.
- **Scope:** Single initiative; decomposition is sequential delivery, not separate products.
- **Ambiguity:** “DashboardPageHeader” is a working name — implementors may use the existing dashboard naming convention if a similarly named primitive already exists.
