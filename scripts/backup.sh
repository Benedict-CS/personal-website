#!/bin/bash
# Backup DB, public/about, cv.pdf, rustfs-data. Output: backups/backup-YYYYMMDD-HHMM.tar.gz
# Run from cron as the project user (no sudo). Ensure user is in docker group and can read rustfs-data.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Resolve compose file for pg_dump
if [ -f "docker-compose.yml" ]; then
  export COMPOSE_FILE="docker-compose.yml"
elif [ -f "docker-compose.example.yml" ]; then
  export COMPOSE_FILE="docker-compose.example.yml"
else
  echo "Error: docker-compose config not found"
  exit 1
fi

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
  echo "Error: pg_dump failed (ensure postgres container is running and user is in docker group: groups)"
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

echo "5. Keeping latest 10 backups, removing older ones..."
ls -t "$BACKUPS_DIR"/backup-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f

echo "Done: $BACKUPS_DIR/$NAME.tar.gz"
