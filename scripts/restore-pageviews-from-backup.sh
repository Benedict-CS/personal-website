#!/bin/bash
# Restore only the PageView table from a daily backup archive (posts/notes untouched).
# Usage:
#   ./scripts/restore-pageviews-from-backup.sh
#   ./scripts/restore-pageviews-from-backup.sh backups/backup-20260522-0000.tar.gz
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ARCHIVE="${1:-backups/backup-20260523-0000.tar.gz}"
if [ ! -f "$ARCHIVE" ]; then
  echo "Backup not found: $ARCHIVE"
  echo "Available:"
  ls -1 backups/backup-*.tar.gz 2>/dev/null | tail -5 || true
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "Using archive: $ARCHIVE"
tar -xzf "$ARCHIVE" -C "$WORKDIR"
SQL="$(find "$WORKDIR" -name backup.sql | head -1)"
if [ -z "$SQL" ]; then
  echo "No backup.sql inside archive"
  exit 1
fi

BEFORE="$(docker compose exec -T postgres psql -U ben -d blog -tAc 'SELECT COUNT(*) FROM "PageView";' | tr -d ' ')"
BACKUP_ROWS="$(sed -n '/^COPY public."PageView"/,/^\\.$/p' "$SQL" | grep -v '^COPY\|^\\\.' | wc -l | tr -d ' ')"
echo "Current PageView rows: $BEFORE"
echo "Rows in backup:        $BACKUP_ROWS"

if [ "$BACKUP_ROWS" -lt 1 ]; then
  echo "Backup has no PageView data — pick another archive."
  exit 1
fi

echo "Truncating PageView and restoring from backup..."
{
  echo 'TRUNCATE TABLE "PageView";'
  sed -n '/^COPY public."PageView"/,/^\\.$/p' "$SQL"
} | docker compose exec -T postgres psql -U ben -d blog -v ON_ERROR_STOP=1 -f - >/dev/null

AFTER="$(docker compose exec -T postgres psql -U ben -d blog -tAc 'SELECT COUNT(*) FROM "PageView";' | tr -d ' ')"
LINKEDIN="$(docker compose exec -T postgres psql -U ben -d blog -tAc "SELECT COUNT(*) FROM \"PageView\" WHERE referrer ILIKE '%linkedin%';" | tr -d ' ')"

echo ""
echo "Restore complete."
echo "  PageView rows: $BEFORE -> $AFTER"
echo "  LinkedIn referrer rows: $LINKEDIN"
echo "Refresh the Analytics dashboard."
