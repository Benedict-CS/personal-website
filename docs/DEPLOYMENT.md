# Deployment Guide

This guide covers production deployment for the current platform version, including custom-page preview links, scheduled publish behavior, media optimization endpoints, and audit visibility.

---

## 1) Recommended Production Topology

```text
Internet
  -> Reverse proxy (HTTPS, 80/443)
  -> Next.js app container (3000)
  -> PostgreSQL + S3-compatible storage (internal network)
```

Minimum services:

- `app` (Next.js)
- `postgres`
- `rustfs` (or another S3-compatible object store)

---

## 2) Environment Checklist

Before first production boot:

- Set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to your final HTTPS domain.
- Set strong secrets: `ADMIN_PASSWORD`, `NEXTAUTH_SECRET`, DB and S3 credentials.
- Verify `DATABASE_URL` points to the production database.
- Verify S3 values (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`).
- Configure email provider vars for contact form if used.

Reference: [`ENVIRONMENT.md`](ENVIRONMENT.md)

---

## 3) Deploy with Docker Compose

From project root:

```bash
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
```

Post-deploy checks:

```bash
docker compose ps
curl -fsS http://localhost:3000/api/health
```

The health endpoint should return success and DB connectivity.

---

## 4) Reverse Proxy and TLS

Use your preferred reverse proxy (Nginx Proxy Manager, Nginx, Caddy, Traefik).

Required behavior:

- Route your domain to app port `3000`.
- Terminate TLS at proxy.
- Redirect HTTP to HTTPS.
- Forward `Host` and `X-Forwarded-*` headers.

After TLS is active, confirm:

- Login/session callbacks work under HTTPS.
- Preview routes (for posts/custom pages) open correctly.
- Public custom pages behave correctly with scheduled publish.

---

## 5) CI and Optional CD

### CI (required)

Current CI should run:

- install (`npm ci`)
- type/lint checks
- build

### CD (optional)

Enable auto-deploy only when SSH/security policy is ready.

Recommended CD flow:

1. Pull latest `main`
2. Build images
3. Run `prisma migrate deploy`
4. Restart containers
5. Run health check

Do not enable destructive deployment commands without backup strategy.

---

## 6) Release Checklist (Production)

Before release:

- `npm run build` passes.
- Prisma migrations are reviewed.
- Docs are updated for behavior changes.

After release:

- Open `/dashboard` and verify auth.
- Verify editor actions: save draft, publish, undo/redo.
- Verify custom pages: preview token + scheduled publish state.
- Verify media optimization endpoint is reachable from dashboard.
- Verify audit log shows recent operations.

---

## 7) Rollback Strategy

If a release regresses behavior:

1. Roll back to previous image/commit.
2. Restore DB/object backups if data integrity is affected.
3. Re-run health and dashboard smoke checks.
4. Record root cause and remediation in runbook.

For schema-breaking migrations, always define rollback/restore procedure before release.

---

## 8) Common Deployment Issues

- **Auth loop after deploy**: `NEXTAUTH_URL` mismatch (HTTP vs HTTPS, wrong domain).
- **404 on preview route**: invalid/expired preview token or route/env mismatch.
- **Scheduled page not visible**: schedule timestamp still in future or timezone mismatch.
- **Media optimize failures**: storage credentials/permissions/content-type incompatibility.
- **Audit page empty**: verify audit writes are enabled and DB migration is current.
