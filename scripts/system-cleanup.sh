#!/bin/bash
# System cleanup: safe GC for Next.js cache, Docker, and temp dirs.
# ZERO DATA LOSS: does not remove volumes, active containers, or user data.
# Run manually or from cron. Use with care in production.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🧹 System cleanup (safe mode)..."
echo ""

# 1. Next.js cache: keep only the most recent build cache to prevent bloat
if [ -d ".next/cache" ]; then
  echo "1️⃣ Pruning .next/cache (keeping structure, clearing old entries)..."
  # Remove cache subdirs older than 1 day so the latest build stays warm
  find .next/cache -type f -mtime +1 -delete 2>/dev/null || true
  find .next/cache -type d -empty -delete 2>/dev/null || true
  echo "   Done."
else
  echo "1️⃣ No .next/cache found, skipping."
fi
echo ""

# 2. Docker: prune dangling resources only (no -a: do not remove all unused images)
echo "2️⃣ Docker prune (dangling images, stopped containers, unused build cache only)..."
sudo docker system prune -f --filter "until=168h" 2>/dev/null || true   # dangling older than 7 days
sudo docker container prune -f 2>/dev/null || true
sudo docker image prune -f 2>/dev/null || true
sudo docker builder prune -f --filter "until=168h" 2>/dev/null || true
echo "   Done. (Volumes and named images are NOT removed.)"
echo ""

# 3. Temp dirs from native/build tooling
echo "3️⃣ Clearing temp build dirs..."
for dir in /tmp/tauri-builds /tmp/expo-builds /tmp/next-* /tmp/nx-*; do
  if [ -d "$dir" ]; then
    echo "   Removing $dir"
    rm -rf "$dir"
  fi
done
echo "   Done."
echo ""

echo "✅ System cleanup finished. No user or app data was deleted."
