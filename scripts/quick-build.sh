#!/bin/bash

# Quick build script for small changes
# Build first (app keeps running), then restart → downtime = restart only (~5–15s)

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "⚡ Quick build (build first, then restart for minimal downtime)..."

# 1) Build a new image while the current app stays online.
echo "🔨 Building app image with cache (site remains available)..."
sudo docker compose build app

# 2) Restart app container (downtime only in this step).
echo "🔄 Restarting app (expected downtime: ~5-15 seconds)..."
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
