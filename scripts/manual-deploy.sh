#!/bin/bash
# Deploy script (manual or CI/CD; set CI=1 for non-interactive mode).

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🚀 Manual deploy"
echo "================"
echo ""

# Ensure we are in project directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: not in project directory"
    echo "   Run this script from ~/personal-website"
    exit 1
fi

# CI/non-interactive mode: no prompts, force clean from origin/main
if [ -n "${CI:-}" ] || [ -n "${NONINTERACTIVE:-}" ]; then
    echo "📥 CI mode: fetch and reset to origin/main..."
    git fetch origin main
    git reset --hard origin/main
    git clean -fd
else
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        echo "⚠️  Uncommitted changes:"
        git status --short
        echo ""
        read -p "Commit these changes first? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Commit message: " COMMIT_MSG
            git add .
            git commit -m "$COMMIT_MSG"
            echo "✅ Committed"
        fi
    fi

    echo ""
    echo "📥 Pulling latest code..."
    git pull origin main || {
        echo "⚠️  git pull failed, continuing with local code"
    }
fi

# Build Docker image
echo ""
echo "🔨 Building Docker image..."
sudo docker compose build app

# Ensure services are up (migrate runs inside app container)
echo ""
echo "🔄 Ensuring services are up..."
sudo docker compose up -d

# Run database migrations (must run inside app container with compose DATABASE_URL)
echo ""
echo "🗄️  Running database migrations..."
if sudo docker compose exec -T app npx prisma migrate deploy; then
    echo "✅ Migrations done"
else
    echo "⚠️  Migration failed or no new migrations; continuing (if 500 errors persist, run migrate manually)"
fi

# Restart app to load new image
echo ""
echo "🚀 Restarting app..."
sudo docker compose up -d app

echo ""
echo "⏳ Waiting for app to start..."
sleep 15

echo ""
echo "📊 Service status:"
sudo docker compose ps

echo ""
echo "🔍 Checking health..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Service is up."
else
    echo "⚠️  Service may not be ready yet; check again shortly."
fi

echo ""
echo "✅ Deploy complete."
echo ""
echo "💡 Next:"
echo "   - Logs: sudo docker compose logs -f app"
echo "   - Site: https://benedict.winlab.tw"
