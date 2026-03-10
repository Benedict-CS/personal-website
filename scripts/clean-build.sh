#!/bin/bash

# Clean build: full rebuild with no cache. SITE IS DOWN for the whole duration (down → build → up).
# For minimal downtime use quick-build.sh instead (build while app runs, then restart only).

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🧹 Clean build (site will be down until build and startup finish)..."

# 1. Stop all containers
echo "📦 Stopping all containers..."
sudo docker compose down

# 2. Remove old app image
echo "🗑️  Removing old app image..."
sudo docker rmi personal-website-app 2>/dev/null || true

# 3. Prune build cache
echo "🧹 Pruning build cache..."
sudo docker builder prune -f

# 4. Build app with no cache
echo "🔨 Building app (no cache)..."
sudo docker compose build --no-cache app

# 5. Initialize RustFS if needed
if [ ! -d "./rustfs-data" ]; then
    echo "🔧 Initializing RustFS..."
    ./scripts/init-rustfs.sh
fi

# 6. Start all services
echo "🚀 Starting all services..."
sudo docker compose up -d

# 7. Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 20

# 8. Check service status
echo "📊 Service status:"
sudo docker compose ps

# 9. Show app logs
echo "📋 Recent app logs:"
sudo docker compose logs app --tail 20

echo ""
echo "✅ Clean build completed."
echo ""
echo "💡 Next steps:"
echo "   - Check health: sudo docker compose ps"
echo "   - Tail logs: sudo docker compose logs -f app"
echo "   - Open site: http://localhost:3000"
