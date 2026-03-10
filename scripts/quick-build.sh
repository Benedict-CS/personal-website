#!/bin/bash

# Quick build: NO downtime during build. Only a short downtime when restarting the app.
# - Step 1: Build new image only. Does NOT stop or restart the running container. Site stays up.
# - Step 2: Recreate app container (new image). Downtime = only this step (~5–15s until new container is ready).

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "⚡ Quick build: build first (no downtime), then restart (brief downtime only)..."

# 1) Build new image only. Running app container is NOT touched. Site remains available.
echo "🔨 Building app image (current app keeps running, no restart yet)..."
sudo docker compose build app

# 2) Recreate app container with new image. ONLY here does the site have ~5–15s downtime.
echo "🔄 Restarting app container (downtime only now: ~5-15 seconds)..."
sudo docker compose up -d app

# 3) Wait for startup.
echo "⏳ Waiting for app startup..."
sleep 10

# 4) Check service status.
echo "📊 Service status:"
sudo docker compose ps

# 5) Show recent logs.
echo "📋 Recent app logs:"
sudo docker compose logs app --tail 20

echo ""
echo "✅ Quick build completed."
echo ""
echo "💡 Next steps:"
echo "   - Open site: http://localhost:3000"
echo "   - Tail logs: sudo docker compose logs -f app"
