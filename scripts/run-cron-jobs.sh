#!/bin/bash
# Manual run: same jobs as crontab (backup, git push, clean build).
# Usage: ./scripts/run-cron-jobs.sh   or   ./scripts/run-cron-jobs.sh --no-clean   (skip heavy clean build)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p logs

RUN_CLEAN=true
for arg in "$@"; do
  if [ "$arg" = "--no-clean" ]; then RUN_CLEAN=false; fi
done

log_time() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

echo "=== 1. Backup ==="
log_time "Backup start" >> logs/backup.log
if ./scripts/backup-data.sh >> logs/backup.log 2>&1; then
  log_time "Backup OK" >> logs/backup.log
  echo "Backup done."
else
  log_time "Backup FAILED (exit $?)" >> logs/backup.log
  echo "Backup failed. See logs/backup.log (ensure Docker is running and user is in docker group)"
fi

echo "=== 2. Git add / commit / push ==="
log_time "Git step start" >> logs/git-push.log
git add -A
if git diff --staged --quiet; then
  log_time "No changes to commit" >> logs/git-push.log
  echo "No changes to commit."
else
  git commit -m "backup $(date +%Y-%m-%d)" || true
  if git push >> logs/git-push.log 2>&1; then
    log_time "Git push OK" >> logs/git-push.log
    echo "Git push done."
  else
    log_time "Git push FAILED (exit $?)" >> logs/git-push.log
    echo "Git push failed. See logs/git-push.log (cron needs SSH key or credential configured)"
    exit 1
  fi
fi

if [ "$RUN_CLEAN" = true ]; then
  echo "=== 3. Clean build ==="
  ./scripts/clean-build.sh >> logs/clean-build.log 2>&1
  echo "Clean build done."
else
  echo "=== 3. Clean build (skipped, use without --no-clean to run) ==="
fi

echo "All requested jobs finished."
