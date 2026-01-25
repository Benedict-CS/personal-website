#!/bin/bash
# 清理 Git 歷史中的敏感資訊
# 使用前請先備份！

set -e

echo "⚠️  警告：此腳本會重寫 Git 歷史！"
echo "📋 請確認："
echo "   1. 已備份 repository"
echo "   2. 已通知所有協作者"
echo "   3. 已修改所有密碼"
echo ""
read -p "繼續執行？(yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ 已取消"
  exit 1
fi

# 檢查是否安裝 git-filter-repo
if ! command -v git-filter-repo &> /dev/null; then
  echo "❌ git-filter-repo 未安裝"
  echo "📦 安裝方法："
  echo "   Ubuntu/Debian: sudo apt install git-filter-repo"
  echo "   或: pip install git-filter-repo"
  exit 1
fi

echo ""
echo "🔍 檢查當前狀態..."
git status

echo ""
echo "🧹 開始清理 docker-compose.yml..."

# 創建替換規則檔案
cat > /tmp/replace-rules.txt << 'EOF'
POSTGRES_PASSWORD=password==>POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
RUSTFS_ROOT_PASSWORD=rustfsadmin==>RUSTFS_ROOT_PASSWORD=${RUSTFS_ROOT_PASSWORD}
ben:password@postgres==>${POSTGRES_USER:-ben}:${POSTGRES_PASSWORD}@postgres
ADMIN_PASSWORD=${ADMIN_PASSWORD:-benedict123}==>ADMIN_PASSWORD=${ADMIN_PASSWORD}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-change-me-in-production}==>NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
S3_ACCESS_KEY=${S3_ACCESS_KEY:-rustfsadmin}==>S3_ACCESS_KEY=${S3_ACCESS_KEY}
S3_SECRET_KEY=${S3_SECRET_KEY:-rustfsadmin}==>S3_SECRET_KEY=${S3_SECRET_KEY}
EOF

# 執行清理
git filter-repo \
  --path docker-compose.yml \
  --replace-text /tmp/replace-rules.txt \
  --force

echo ""
echo "🧹 清理 src/lib/s3.ts..."

# 清理 s3.ts（需要手動處理，因為有多個匹配）
# 這裡我們直接替換整個檔案在歷史中的版本
git filter-repo \
  --path src/lib/s3.ts \
  --replace-text <(echo '"rustfsadmin"==>process.env.S3_ACCESS_KEY || process.env.S3_SECRET_KEY') \
  --force || echo "⚠️  s3.ts 清理可能需要手動處理"

echo ""
echo "✅ 清理完成！"
echo ""
echo "📋 下一步："
echo "   1. 檢查清理結果："
echo "      git log --all --full-history -p | grep -i password"
echo ""
echo "   2. 強制推送（⚠️  危險操作）："
echo "      git push origin --force --all"
echo "      git push origin --force --tags"
echo ""
echo "   3. 通知所有協作者重新 clone repository"
