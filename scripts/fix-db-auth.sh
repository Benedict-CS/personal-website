#!/bin/bash
# Fix DB auth: wipe postgres data, recreate, run migrate, restart app.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "1. Stopping all services..."
sudo docker compose down

echo "2. Removing postgres-data directory..."
sudo rm -rf postgres-data
sudo mkdir -p postgres-data

echo "3. Starting postgres, waiting for healthy..."
sudo docker compose up -d postgres
for i in {1..30}; do
  if sudo docker compose exec -T postgres pg_isready -U ben -d blog 2>/dev/null; then
    echo "   postgres ready."
    break
  fi
  sleep 1
done

echo "4. Starting all services..."
sudo docker compose up -d

echo "5. Creating DB schema (init-db.sql, no Prisma CLI)..."
sudo docker compose exec -T postgres psql -U ben -d blog -v ON_ERROR_STOP=1 -f - < prisma/init-db.sql

echo "6. Restarting app..."
sudo docker compose restart app

echo "7. Checking app logs..."
sleep 5
sudo docker compose logs app --tail 20

echo ""
echo "If there are no 'Authentication failed' or 'does not exist' errors, DB auth is fixed."
echo "Site posts will be empty; recreate content as needed."
