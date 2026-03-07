# Pre-push checklist

Quick reference for consistency, language, and structure before `git push`.

---

## 1. Code consistency

- **Comments:** All code comments in `src/` are in **English** (per project rule).
- **API error messages:** User-facing API errors are in English (e.g. version restore: "Version history is not enabled. Run: npx prisma migrate deploy").
- **Dashboard UI:** Content → About editor still shows a few **Chinese** strings ("未儲存", "部分區塊有未儲存的變更..."). Optional to translate to English later if you want the dashboard fully in English.

---

## 2. Markdown / docs language

- **User-facing docs** (per `docs/README.md`): **English** — GETTING_STARTED, ENVIRONMENT, ARCHITECTURE, DEPLOYMENT, MAINTENANCE, DASHBOARD_USER_GUIDE, etc.
- **Internal / reference docs:** Some are **繁體中文** (e.g. DEV_NOTES, WHY_FILES_DISAPPEARED, FIX_P1000_POSTGRES_AUTH, HARBOR_PUSH_SETUP, ENV_SETUP, SETUP, NEXT_STEPS_CRON_AND_CICD, blog.md). Kept as-is for internal use; can move to `docs/internal/` or translate later if desired.

---

## 3. Architecture and folders

- **Layout:** Next.js App Router — `src/app/` (pages, API routes, layouts), `src/components/`, `src/lib/`, `src/config/`, `src/contexts/`, `src/types/`, `src/__tests__/`.
- **API:** Routes under `src/app/api/` (contact, auth, posts, tags, media, analytics, backup, health, etc.). Naming and structure are consistent.
- **Scripts:** `scripts/` for backup, migrate, cron, deploy. No misplaced files.

---

## 4. Build and tests

- **Build:** `npm run build` — should pass.
- **Lint:** `npm run lint` — there are existing ESLint findings (e.g. `@ts-ignore` → `@ts-expect-error`, unused vars, some React effect/setState rules). Safe to push; fix in a follow-up if you want a clean lint.

---

## 5. Before you push

- [ ] `npm run build` passes.
- [ ] No unintended changes in `.env` (never commit `.env`).
- [ ] `.env.example` is up to date (see ENVIRONMENT.md).
- [ ] Optional: run tests with `npm test`.
