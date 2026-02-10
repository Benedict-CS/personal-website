#!/bin/bash
# Manual run: same jobs as crontab (backup, git push, clean build).
# Usage: ./run-cron-jobs.sh   or   ./run-cron-jobs.sh --no-clean   (skip heavy clean build)
set -e
cd "$(dirname "$0")"
mkdir -p logs

RUN_CLEAN=true
for arg in "$@"; do
  if [ "$arg" = "--no-clean" ]; then RUN_CLEAN=false; fi
done

echo "=== 1. Backup ==="
./backup-data.sh >> logs/backup.log 2>&1
echo "Backup done."

echo "=== 2. Git add / commit / push ==="
git add -A
if git diff --staged --quiet; then
  echo "No changes to commit."
else
  git commit -m "$(date +%Y-%m-%d)"
  git push >> logs/git-push.log 2>&1
fi
echo "Git push step done."

if [ "$RUN_CLEAN" = true ]; then
  echo "=== 3. Clean build ==="
  ./clean-build.sh >> logs/clean-build.log 2>&1
  echo "Clean build done."
else
  echo "=== 3. Clean build (skipped, use without --no-clean to run) ==="
fi

echo "All requested jobs finished."
