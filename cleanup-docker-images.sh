#!/bin/bash

# 清理不需要的 Docker images（MinIO, SeaweedFS, Garage）

set -e

echo "🧹 清理不需要的 Docker images..."
echo ""

# 1. 列出將要刪除的 images
echo "1️⃣ 查找不需要的 images..."
IMAGES_TO_REMOVE=(
    "minio/minio"
    "chrislusf/seaweedfs"
    "dxflrs/garage"
)

FOUND_IMAGES=()
for img in "${IMAGES_TO_REMOVE[@]}"; do
    if sudo docker images --format "{{.Repository}}" | grep -q "^${img}"; then
        FOUND_IMAGES+=("$img")
        echo "   ✓ 找到: $img"
    fi
done

if [ ${#FOUND_IMAGES[@]} -eq 0 ]; then
    echo "   ℹ️  沒有找到需要清理的 images"
    exit 0
fi
echo ""

# 2. 確認刪除
echo "2️⃣ 準備刪除以下 images:"
for img in "${FOUND_IMAGES[@]}"; do
    echo "   - $img"
done
echo ""

read -p "   是否要刪除這些 images？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "   取消刪除"
    exit 0
fi
echo ""

# 3. 刪除 images
echo "3️⃣ 刪除 images..."
for img in "${FOUND_IMAGES[@]}"; do
    echo "   刪除: $img"
    sudo docker images "$img" --format "{{.ID}}" | while read id; do
        if [ -n "$id" ]; then
            sudo docker rmi "$id" 2>/dev/null || echo "      ⚠️  無法刪除 $id（可能正在使用）"
        fi
    done
done
echo ""

# 4. 清理未使用的 images
echo "4️⃣ 清理未使用的 images..."
sudo docker image prune -f
echo ""

# 5. 顯示剩餘空間
echo "5️⃣ Docker 使用情況:"
sudo docker system df
echo ""

echo "✅ 清理完成！"
