# Operations Runbook

Last updated: 2026-03-09

Practical runbook for deploy, validation, rollback, and incident handling.

---

## 1) Pre-deploy checklist

- Pull latest code and verify branch:
  - `git status`
  - `git rev-parse --abbrev-ref HEAD`
- Verify environment:
  - `.env` exists and required secrets are set
  - `NEXTAUTH_URL` / `NEXT_PUBLIC_SITE_URL` match production URL
- Validate app before rollout:
  - `npm run lint` (warnings allowed, no errors)
  - `npm test -- --runInBand`
  - `npm run build`
- Backup before major changes:
  - `./scripts/backup-data.sh`
  - Optional: Dashboard Export JSON backup

---

## 2) Standard deploy

```bash
git pull
docker compose build app
docker compose up -d app
docker compose exec app npx prisma migrate deploy
```

Quick health checks:

```bash
docker compose ps
curl -sS http://localhost:3000/api/health
```

Expected health response:

```json
{"ok":true,"db":"ok"}
```

---

## 3) Post-deploy validation

- Public pages:
  - `/`
  - `/blog`
  - `/about`
  - `/contact`
- Admin:
  - `/auth/signin`
  - `/dashboard`
  - Create/edit post flow
  - Media upload/delete
  - Export/import endpoints
- Security sanity:
  - Protected route without session should return 401 or redirect.
  - CSP response header present (enforced CSP).

---

## 4) Rollback

If deployment is bad:

1. Roll back code to previous commit/tag.
2. Rebuild and restart app.
3. If schema mismatch occurred, restore DB from backup:
   - `cat backup.sql | docker compose exec -T postgres psql -U ben blog`

---

## 5) Incident response quick steps

### Suspected compromise / abuse

1. Isolate:
   - Restrict public ingress temporarily.
   - Rotate `ADMIN_PASSWORD`, `NEXTAUTH_SECRET`, DB and S3 credentials.
2. Inspect:
   - `docker compose logs app`
   - `docker compose logs postgres`
   - `docker compose logs rustfs`
3. Contain:
   - Re-deploy from known good commit.
   - Re-run `npm audit` and update dependencies.
4. Recover:
   - Restore data if needed from backup + export snapshot.
5. Postmortem:
   - Document timeline, root cause, and remediation tasks.

---

## 6) Monitoring commands

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f rustfs
curl -sS http://localhost:3000/api/health
curl -sS http://localhost:3000/api/v1/health
```

---

## 7) Backup and restore commands

Backup:

```bash
./scripts/backup-data.sh
```

DB restore:

```bash
cat backup_YYYYMMDD.sql | docker compose exec -T postgres psql -U ben blog
```

Also keep Dashboard Export JSON after important content changes.

