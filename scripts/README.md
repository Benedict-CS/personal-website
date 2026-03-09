# Scripts

All scripts must be run from the **project root** (e.g. `./scripts/backup-data.sh`). They will `cd` to the repo root automatically.

| Script | Purpose |
|--------|---------|
| `backup-data.sh` | Backup DB (incl. analytics), public/about, cv.pdf, rustfs-data → `backups/backup-YYYYMMDD-HHMM.tar.gz` (keeps latest 3) |
| `restore-from-backup.sh` | Restore from `backup.sql` (e.g. `./scripts/restore-from-backup.sh path/to/backup.sql`) |
| `run-cron-jobs.sh` | Manual run: backup + git push + optional clean build (`--no-clean` to skip clean build) |
| `clean-build.sh` | Full clean Docker build (no cache) |
| `quick-build.sh` | Fast rebuild (with cache) |
| `migrate.sh` | Run Prisma migrations in app container |
| `manual-deploy.sh` | Pull, build, migrate, restart app |
| `init-rustfs.sh` | Create rustfs-data dirs and start RustFS |
| `crontab.example` | Cron entries for daily backup / git push; install with `crontab scripts/crontab.example` |

One-off / maintenance: `fix-db-auth.sh`, `cleanup-docker-images.sh`, `cleanup-git-history.sh`.
