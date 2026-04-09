#!/bin/bash
# Backup DB, public/about, cv.pdf, rustfs-data. Output: backups/backup-YYYYMMDD-HHMM.tar.gz
# Run from cron as the project user (no sudo). Ensure user is in docker group and can read rustfs-data.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NAME="backup-$(date +%Y%m%d-%H%M)"
BACKUPS_DIR="backups"
mkdir -p "$BACKUPS_DIR"
mkdir -p "$NAME"

# Clean up temp dir on exit (success or failure)
cleanup() {
  rm -rf "$ROOT/$NAME"
}
trap cleanup EXIT

echo "1. Backing up database (Post, Tag, AboutConfig, PageView, etc.)..."
if ! docker compose exec -T postgres pg_dump -U ben blog > "$NAME/backup.sql" 2>/dev/null; then
  echo "Error: pg_dump failed (ensure postgres is running and user is in docker group: groups)"
  exit 1
fi
if [ ! -s "$NAME/backup.sql" ]; then
  echo "Error: backup.sql is empty"
  exit 1
fi

echo "2. Backing up public/about, cv.pdf..."
mkdir -p "$NAME/public"
cp -r public/about "$NAME/public/" 2>/dev/null || true
cp public/cv.pdf "$NAME/public/" 2>/dev/null || true

echo "3. Backing up RustFS (media)..."
cp -r rustfs-data "$NAME/" 2>/dev/null || true

echo "4. Archiving to $BACKUPS_DIR/ ..."
tar -czvf "$BACKUPS_DIR/$NAME.tar.gz" "$NAME"

ARCHIVE_PATH="$BACKUPS_DIR/$NAME.tar.gz"

# Optional: push archive to NAS / remote (BACKUP_RSYNC_TARGET from host env, or from Site settings when using POST /api/backup/trigger)
if [ -n "${BACKUP_RSYNC_TARGET:-}" ]; then
  echo "4b. Rsync archive to BACKUP_RSYNC_TARGET..."
  rsync -avz "$ARCHIVE_PATH" "$BACKUP_RSYNC_TARGET" || echo "Warning: rsync failed (check SSH keys and path)."
fi

# Optional: notify self-hosted webhook (Discord, n8n, Home Assistant, etc.)
if [ -n "${BACKUP_POST_HOOK_URL:-}" ]; then
  echo "4c. POST backup notification..."
  curl -sfS -X POST "$BACKUP_POST_HOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"event\":\"backup.completed\",\"version\":1,\"archiveName\":\"$NAME.tar.gz\",\"path\":\"$ARCHIVE_PATH\",\"createdAt\":\"$(date -Iseconds 2>/dev/null || date)\"}" \
    || echo "Warning: backup post-hook request failed."
fi

echo "5. Keeping latest 10 backups, removing older ones..."
ls -t "$BACKUPS_DIR"/backup-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f

echo "Done: $BACKUPS_DIR/$NAME.tar.gz"
