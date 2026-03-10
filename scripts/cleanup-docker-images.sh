#!/bin/bash

# Remove unused Docker images (MinIO, SeaweedFS, Garage, etc.).

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🧹 Cleaning unused Docker images..."
echo ""

# 1. List images to remove
echo "1️⃣ Finding unused images..."
IMAGES_TO_REMOVE=(
    "minio/minio"
    "chrislusf/seaweedfs"
    "dxflrs/garage"
)

FOUND_IMAGES=()
for img in "${IMAGES_TO_REMOVE[@]}"; do
    if sudo docker images --format "{{.Repository}}" | grep -q "^${img}"; then
        FOUND_IMAGES+=("$img")
        echo "   ✓ Found: $img"
    fi
done

if [ ${#FOUND_IMAGES[@]} -eq 0 ]; then
    echo "   ℹ️  No images to remove"
    exit 0
fi
echo ""

# 2. Confirm removal
echo "2️⃣ Images to remove:"
for img in "${FOUND_IMAGES[@]}"; do
    echo "   - $img"
done
echo ""

read -p "   Remove these images? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "   Cancelled"
    exit 0
fi
echo ""

# 3. Remove images
echo "3️⃣ Removing images..."
for img in "${FOUND_IMAGES[@]}"; do
    echo "   Removing: $img"
    sudo docker images "$img" --format "{{.ID}}" | while read id; do
        if [ -n "$id" ]; then
            sudo docker rmi "$id" 2>/dev/null || echo "      ⚠️  Could not remove $id (may be in use)"
        fi
    done
done
echo ""

# 4. Prune unused images
echo "4️⃣ Pruning unused images..."
sudo docker image prune -f
echo ""

# 5. Show disk usage
echo "5️⃣ Docker disk usage:"
sudo docker system df
echo ""

echo "✅ Cleanup done."
