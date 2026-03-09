# Security Audit

Last updated: 2026-03-09

This report summarizes the security review and hardening pass performed on the codebase.

---

## Scope

- API authorization coverage (unauthorized access risks)
- Sensitive data exposure checks
- CSP / CSRF / rate-limit controls
- Dependency vulnerability audit
- Build/test verification after fixes

---

## Key fixes applied

### 1) Closed unauthenticated upload path

- File: `src/app/api/upload/route.ts`
- Change: added `requireSession()` guard
- Risk reduced: anonymous users can no longer upload arbitrary files to storage.

### 2) Closed unauthenticated media index path

- File: `src/app/api/media/route.ts`
- Change: added `requireSession()` guard
- Risk reduced: anonymous users can no longer enumerate stored media object names.

### 3) CAPTCHA + lockout hardening on login

- Files:
  - `src/app/auth/signin/page.tsx`
  - `src/lib/auth.ts`
  - `src/lib/login-rate-limit.ts`
  - `src/lib/verify-turnstile.ts`
  - `src/app/api/auth/captcha-required/route.ts`
- Change: require Turnstile CAPTCHA after repeated failed attempts; keep lockout/rate-limit behavior.

### 4) Markdown HTML sanitization

- File: `src/components/markdown-renderer.tsx`
- Change: added `rehype-sanitize` after `rehype-raw`.
- Risk reduced: stronger XSS protection for rendered user-authored markdown/HTML.

### 5) Enforced CSP (not report-only)

- File: `next.config.ts`
- Change: switched from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.

### 6) Dependency vulnerabilities remediated

- Action: `npm audit fix`
- Result: `0` known vulnerabilities (`low/moderate/high/critical` all zero).

---

## Current control status

### Authentication / authorization

- Admin-sensitive routes are protected by `requireSession()` (content CRUD, media delete/cleanup, import/export, backup trigger, analytics clear/stats, site config/content, tags merge/cleanup, about upload/config/cleanup, custom pages mutation, CV upload, post version operations, etc.).
- Public routes intentionally open:
  - Health: `/api/health`, `/api/v1/health`
  - Search/read routes needed by public UI
  - Content read endpoints used by public pages

### Rate limiting

- Contact API: IP-based limiter (`checkRateLimit`).
- Login: attempt tracking + lockout, plus CAPTCHA escalation after repeated failures.

### CSRF / origin checks

- `analytics/view` and `analytics/leave` include origin checks and middleware-secret flow.
- Session-based protected APIs rely on NextAuth session cookie; many mutation endpoints are dashboard-only.

### Headers / browser security

- CSP enforced
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- strict referrer and permissions policy

---

## Residual risks / follow-ups

1. Some warnings remain in lint output (unused vars / dependency-array hygiene). No current build blocker, but recommended cleanup.
2. `middleware.ts` deprecation warning from Next.js 16 suggests migration to `proxy` convention in future update.
3. Optional hardening:
   - Add explicit CSRF token validation for all authenticated mutating APIs.
   - Add request body size limits on all upload-like endpoints.
   - Add structured security logging for auth failures and suspicious access patterns.

---

## Verification evidence

- `npm run build` passes.
- `npm test -- --runInBand` passes (7 suites).
- `npm audit` reports zero vulnerabilities.

