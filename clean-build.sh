#!/bin/bash

# Clean build script for personal-website
# 完整乾淨建置（清除所有快取）

set -e

echo "🧹 開始乾淨建置..."

# 1. 停止所有容器
echo "📦 停止所有容器..."
sudo docker compose down

# 2. 移除舊的 app image
echo "🗑️  移除舊的 app image..."
sudo docker rmi personal-website-app 2>/dev/null || true

# 3. 清除建置快取
echo "🧹 清除建置快取..."
sudo docker builder prune -f

# 4. 不使用快取建置
echo "🔨 建置 app（無快取）..."
sudo docker compose build --no-cache app

# 5. 初始化 RustFS（如果需要）
if [ ! -d "./rustfs-data" ]; then
    echo "🔧 初始化 RustFS..."
    ./init-rustfs.sh
fi

# 6. 啟動所有服務
echo "🚀 啟動所有服務..."
sudo docker compose up -d

# 7. 等待服務健康
echo "⏳ 等待服務健康..."
sleep 20

# 8. 檢查服務狀態
echo "📊 服務狀態:"
sudo docker compose ps

# 9. 顯示 app 日誌
echo "📋 最近 app 日誌:"
sudo docker compose logs app --tail 20

echo ""
echo "✅ 乾淨建置完成！"
echo ""
echo "💡 下一步："
echo "   - 檢查服務健康: sudo docker compose ps"
echo "   - 查看日誌: sudo docker compose logs -f app"
echo "   - 訪問網站: http://localhost:3000"
