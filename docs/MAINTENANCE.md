# Maintenance Guide

This runbook covers daily and weekly maintenance for a commercial-grade single-admin deployment.

---

## 1) Backup Policy

Maintain at least:

- Database backups (PostgreSQL dumps)
- Object storage backups (media bucket/data)
- Secure copy of runtime configuration (`.env`) in secret storage

Suggested frequency:

- DB: daily
- Object storage: daily or after large media operations
- Config snapshot: on each environment change

Example DB backup:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "backup-$(date +%F).sql"
```

---

## 2) Restore Drills

Test restore regularly on a staging environment:

1. Restore DB dump.
2. Restore object storage data.
3. Boot app with restored data.
4. Validate key flows (dashboard login, content pages, media, previews).

No backup is valid until restore is verified.

---

## 3) Update Procedure

For regular platform updates:

```bash
git fetch origin main
git checkout main
git pull
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
```

Then run smoke checks:

- `/api/health`
- `/dashboard`
- edit -> save draft -> publish flow
- custom page preview and scheduled publish metadata
- media optimize assessment run
- audit log entry creation

---

## 4) Scheduled Maintenance Checks

### Daily

- Check service health (`docker compose ps`)
- Check app errors (`docker compose logs app --tail=200`)
- Verify backup job status

### Weekly

- Review disk usage for DB and media storage
- Review failed media optimization categories
- Review audit activity anomalies
- Apply safe dependency/image updates if needed

---

## 5) Media Maintenance

Use dashboard media tooling to:

- Analyze unused files before deletion.
- Run optimize assessment (`dryRun`) first.
- Execute optimization in batches.
- Retry failed categories after investigation.

After large optimization batches:

- Re-run candidate assessment and compare delta.
- Export failed items for follow-up.

---

## 6) Audit and Governance

The audit UI is the primary operations timeline.

Recommended routine:

- Filter by recent high-impact actions (`publish`, `custom_page.update`, `media.optimize`).
- Expand payload only for entries requiring investigation.
- Keep operational notes for unexpected changes.

---

## 7) Incident Response Basics

When production behavior is degraded:

1. Check health endpoint and service status.
2. Inspect app logs and DB connectivity.
3. Isolate whether issue is auth, DB, storage, or deployment mismatch.
4. If needed, roll back release and restore last known good backup.
5. Record incident summary and prevention action.

Reference: [`RUNBOOK.md`](RUNBOOK.md), [`MONITORING.md`](MONITORING.md)

---

## 8) Security Maintenance

- Rotate admin/session/storage secrets on schedule.
- Keep OS, Docker, and base images patched.
- Ensure HTTPS remains enforced.
- Restrict infra access to least privilege.
- Review exposed endpoints and disable unused integrations.
