#!/bin/bash

# RustFS initialization: create dirs, set permissions, start service.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🚀 Initializing RustFS..."
echo ""

# 1. Create data and log directories
echo "1️⃣ Creating data and log directories..."
mkdir -p ./rustfs-data ./rustfs-logs
echo "✅ Directories created"
echo ""

# 2. Set directory ownership (RustFS runs as UID 10001)
echo "2️⃣ Setting directory ownership (UID 10001)..."
sudo chown -R 10001:10001 ./rustfs-data ./rustfs-logs 2>/dev/null || {
    echo "⚠️  Could not set ownership (may need sudo)"
    echo "   Run manually: sudo chown -R 10001:10001 ./rustfs-data ./rustfs-logs"
}
echo ""

# 3. Start RustFS service
echo "3️⃣ Starting RustFS service..."
sudo docker compose up -d rustfs
echo ""

# 4. Wait for service to be ready
echo "4️⃣ Waiting for RustFS to be ready..."
sleep 10

# 5. Check service status
echo "5️⃣ Checking service status..."
if docker ps | grep -q "personal-website-rustfs"; then
    echo "✅ RustFS is running"
    echo ""
    echo "📝 Access:"
    echo "   - Console: http://localhost:9001"
    echo "   - Default user: rustfsadmin"
    echo "   - Default password: rustfsadmin"
    echo "   - S3 API: http://localhost:9000"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Open Console and create 'uploads' bucket"
    echo "   2. Or let the app create it on first upload"
else
    echo "❌ RustFS is not running"
    echo "   Check logs: sudo docker compose logs rustfs"
fi
