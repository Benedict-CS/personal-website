#!/bin/bash

# Quick build script for small changes
# Build first (app keeps running), then restart → downtime = restart only (~5–15s)

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "⚡ 快速建置（先建置再重啟，縮短停機時間）..."

# 1. 先建置新 image（app 仍在運行，無停機）
echo "🔨 建置 app（使用快取，此時網站仍可訪問）..."
sudo docker compose build app

# 2. 重啟 app（停機僅發生在這一步，約數秒）
echo "🔄 重啟 app（停機約 5–15 秒）..."
sudo docker compose up -d app

# 3. 等待啟動
echo "⏳ 等待 app 啟動..."
sleep 10

# 4. 檢查狀態
echo "📊 服務狀態:"
sudo docker compose ps

# 5. 顯示最近日誌
echo "📋 最近 app 日誌:"
sudo docker compose logs app --tail 20

echo ""
echo "✅ 快速建置完成！"
echo ""
echo "💡 下一步："
echo "   - 訪問網站: http://localhost:3000"
echo "   - 查看日誌: sudo docker compose logs -f app"
