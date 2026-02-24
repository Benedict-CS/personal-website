# Maintenance

This document covers backups, updates, and operational checks for the personal website stack.

---

## Backups

### PostgreSQL

- **What to back up:** The database (all tables: posts, tags, site config, custom pages, about config, analytics, etc.).
- **How:** Use `pg_dump` from the host or a dedicated backup container. Example from host (with `DATABASE_URL` or connection params):

  ```bash
  docker compose exec -T postgres pg_dump -U ben blog > backup_$(date +%Y%m%d).sql
  ```

- **Restore:** Create an empty DB (or drop and recreate), then:
  ```bash
  cat backup_YYYYMMDD.sql | docker compose exec -T postgres psql -U ben blog
  ```

- **Frequency:** Daily or weekly depending on how often you change content. Store backups off the server (e.g. another machine or object storage).

### RustFS (media files)

- **What to back up:** The `rustfs-data` directory (and optionally `rustfs-logs`).
- **How:** Copy or sync the volume (e.g. `rsync`, `rclone`, or tar). Example:
  ```bash
  tar -czvf rustfs-backup-$(date +%Y%m%d).tar.gz -C /path/to/project rustfs-data
  ```
- **Restore:** Stop RustFS, replace `rustfs-data` with the restored copy, then start again.

### Application and config

- **What to back up:** `.env` (secrets; store securely), any customizations under `public/` (e.g. CV), and your repo (code is in Git).
- **Scripts:** If you use `scripts/backup-vm-fresh-start.sh` or similar, ensure it backs up DB dumps and RustFS data (and optionally `.env` in a secure way).

---

## Updates

### Application (Next.js, dependencies)

1. Pull latest code:
   ```bash
   git fetch origin main
   git checkout main
   git pull
   ```
2. Rebuild and restart:
   ```bash
   docker compose build --no-cache app
   docker compose up -d app
   ```
3. Run any new migrations:
   ```bash
   docker compose exec app npx prisma migrate deploy
   ```

### Database migrations

- Always run migrations **after** deploying new code that may introduce new migrations:
  ```bash
  docker compose exec app npx prisma migrate deploy
  ```
- Check status:
  ```bash
  docker compose exec app npx prisma migrate status
  ```

### Docker images (Postgres, RustFS)

- To pull newer base images and recreate containers:
  ```bash
  docker compose pull
  docker compose up -d
  ```
- Test the app and DB after upgrading Postgres; for RustFS, ensure the data directory is compatible with the new version (check release notes).

---

## Monitoring and health

- **Containers:** `docker compose ps` — all services should be “healthy” or “running”.
- **App health:** `curl http://localhost:3000/api/health` (or your public URL). Expect 200 and `{"ok":true,"db":"ok"}` when the app and DB are up.
- **Logs:** `docker compose logs app`, `docker compose logs postgres`, `docker compose logs rustfs`. Use `-f` to follow.
- **Sentry:** If `SENTRY_DSN` is set, errors are reported to Sentry; check the Sentry project for exceptions and performance.

---

## Disk and cleanup

- **Postgres:** Monitor DB size; run `VACUUM` if needed (Prisma/Postgres handle this for normal workloads).
- **RustFS:** Remove unused objects via the dashboard (Media) or RustFS Console; the app’s “cleanup” feature can remove objects not referenced in posts/pages.
- **Docker:** Prune unused images and build cache periodically: `docker system prune -a` (use with care; ensure you do not remove images still in use).

---

## Security

- Rotate `ADMIN_PASSWORD`, `NEXTAUTH_SECRET`, and DB/RustFS passwords periodically; update `.env` and restart the app.
- Keep the server and Docker images updated for security patches.
- If you use a reverse proxy or WAF (e.g. Cloudflare), keep it enabled and configured for your domain.
