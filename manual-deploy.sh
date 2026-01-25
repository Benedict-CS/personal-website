#!/bin/bash
# 手動部署腳本（不使用 CI/CD）

set -e

echo "🚀 手動部署腳本"
echo "================"
echo ""

# 檢查是否在專案目錄
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 錯誤：不在專案目錄中"
    echo "   請在 ~/personal-website 目錄執行此腳本"
    exit 1
fi

# 檢查是否有未提交的變更
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  有未提交的變更："
    git status --short
    echo ""
    read -p "是否要先提交這些變更？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "提交訊息: " COMMIT_MSG
        git add .
        git commit -m "$COMMIT_MSG"
        echo "✅ 已提交"
    fi
fi

# 拉取最新代碼
echo ""
echo "📥 拉取最新代碼..."
git pull origin main || {
    echo "⚠️  git pull 失敗，繼續使用本地代碼"
}

# 建置 Docker image
echo ""
echo "🔨 建置 Docker image..."
sudo docker compose build app

# 確保服務已啟動（migrate 需在 app 容器內執行）
echo ""
echo "🔄 確保服務運行中..."
sudo docker compose up -d

# 執行資料庫遷移（必須在 app 容器內執行，使用 docker-compose 的 DATABASE_URL）
echo ""
echo "🗄️  執行資料庫遷移..."
if sudo docker compose exec -T app npx prisma migrate deploy; then
    echo "✅ 遷移完成"
else
    echo "⚠️  遷移失敗或無新遷移，繼續部署（若持續 500 請手動執行 migrate）"
fi

# 重啟 app 以載入新 image
echo ""
echo "🚀 重啟 app 服務..."
sudo docker compose up -d app

# 等待服務啟動
echo ""
echo "⏳ 等待服務啟動..."
sleep 15

# 檢查服務狀態
echo ""
echo "📊 服務狀態："
sudo docker compose ps

# 檢查服務是否正常響應
echo ""
echo "🔍 檢查服務健康..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 服務正常運行！"
else
    echo "⚠️  服務可能尚未完全啟動，請稍後檢查"
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "💡 提示："
echo "   - 查看日誌: sudo docker compose logs -f app"
echo "   - 訪問網站: https://benedict.winlab.tw"
