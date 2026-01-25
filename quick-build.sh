#!/bin/bash

# Quick build script for small changes
# Uses cache for faster builds

set -e

echo "⚡ 快速建置（使用快取）..."

# 1. 停止 app 容器（保持其他服務運行）
echo "📦 停止 app 容器..."
sudo docker compose stop app

# 2. 使用快取建置（較快）
echo "🔨 建置 app（使用快取）..."
sudo docker compose build app

# 3. 啟動 app
echo "🚀 啟動 app..."
sudo docker compose up -d app

# 4. 等待啟動
echo "⏳ 等待 app 啟動..."
sleep 10

# 5. 檢查狀態
echo "📊 服務狀態:"
sudo docker compose ps

# 6. 顯示最近日誌
echo "📋 最近 app 日誌:"
sudo docker compose logs app --tail 20

echo ""
echo "✅ 快速建置完成！"
echo ""
echo "💡 下一步："
echo "   - 訪問網站: http://localhost:3000"
echo "   - 查看日誌: sudo docker compose logs -f app"
