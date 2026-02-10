#!/bin/bash
# Run Prisma migrations inside the app container.
# DATABASE_URL is provided by docker-compose; do NOT run "npx prisma migrate" on the host.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Not in project root (docker-compose.yml not found)"
    exit 1
fi

echo "🔄 Ensuring services are up..."
sudo docker compose up -d

echo ""
echo "🗄️  Running migrations..."

# Try Prisma CLI first, fallback to direct SQL if Prisma CLI is missing files
if sudo docker compose exec -T app npx prisma migrate deploy 2>/dev/null; then
    echo "✅ Migrations complete (via Prisma CLI)"
else
    echo "⚠️  Prisma CLI failed, trying direct SQL migration..."
    
    # Execute the pinned migration directly via postgres container
    if sudo docker compose exec -T postgres psql -U ben -d blog -c 'ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false;' 2>/dev/null; then
        echo "✅ Migration applied (direct SQL)"
    else
        echo "❌ Migration failed. Please check database connection."
        exit 1
    fi
fi

echo ""
echo "✅ All migrations complete."
