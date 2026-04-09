#!/bin/bash

# Quick build: NO downtime during build. Only a short downtime when restarting the app.
# - Step 1: Build new image only. Does NOT stop or restart the running container. Site stays up.
# - Step 2: Recreate app container (new image). Downtime = only this step (~5–15s until new container is ready).

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load .env values (including APP_HOST_PORT) for preflight checks and messages.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

APP_PORT="${APP_HOST_PORT:-3000}"

echo "⚡ Quick build: build first (no downtime), then restart (brief downtime only)..."

# If app already publishes APP_PORT, this is expected for zero-downtime build.
APP_CURRENT_PORT=""
if PUBLISHED=$(sudo docker compose port app 3000 2>/dev/null); then
  APP_CURRENT_PORT="${PUBLISHED##*:}"
fi

# Fail early only when APP_PORT is occupied by something other than current compose app.
if ss -ltn "sport = :$APP_PORT" | awk 'NR > 1 {found=1} END {exit !found}'; then
  if [ "$APP_CURRENT_PORT" = "$APP_PORT" ]; then
    echo "ℹ️  Host port $APP_PORT is currently used by compose app (expected). Continuing..."
  else
    echo "❌ Host port $APP_PORT is already in use."
    echo "   Please stop the process using it, or set APP_HOST_PORT to a free port in .env."
    echo "   Current listener(s):"
    ss -tlnp | awk -v target=":$APP_PORT" '$4 ~ (target "$") {print "   " $0}'
    exit 1
  fi
fi

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
echo "   - Open site: http://localhost:$APP_PORT"
echo "   - Tail logs: sudo docker compose logs -f app"
