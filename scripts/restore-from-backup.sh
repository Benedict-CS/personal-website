#!/bin/bash
# Restore DB from backup.sql (Posts, Notes, AboutConfig, etc.).
# Files (public/about/*, cv.pdf, RustFS) are not touched; after DB restore they will show again.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BACKUP="${1:-backup.sql}"
if [ ! -f "$BACKUP" ]; then
  echo "File not found: $BACKUP"
  exit 1
fi

echo "Using backup: $BACKUP"
echo "1. Stopping app (keeping postgres)..."
sudo docker compose stop app

echo "2. Dropping existing tables (keeping postgres connection)..."
sudo docker compose exec -T postgres psql -U ben -d blog -v ON_ERROR_STOP=1 << 'EOF'
DROP TABLE IF EXISTS "_PostToTag" CASCADE;
DROP TABLE IF EXISTS "PostVersion" CASCADE;
DROP TABLE IF EXISTS "Post" CASCADE;
DROP TABLE IF EXISTS "Tag" CASCADE;
DROP TABLE IF EXISTS "AboutConfig" CASCADE;
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;
EOF

echo "3. Restoring backup..."
grep -v '^\\restrict ' "$BACKUP" | sudo docker compose exec -T postgres psql -U ben -d blog -v ON_ERROR_STOP=1 -f - 2>&1 | tail -20

echo "4. Starting app..."
sudo docker compose start app

echo "5. Checking logs..."
sleep 3
sudo docker compose logs app --tail 10

echo ""
echo "Restore complete. Refresh the site to verify posts, notes, about images, and CV."
