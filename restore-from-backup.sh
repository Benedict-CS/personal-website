#!/bin/bash
# 從 backup.sql 還原 Posts、Notes、AboutConfig 等資料
# 檔案（public/about/*、cv.pdf、RustFS 圖片）沒被刪，還原 DB 後就會再顯示

set -e
cd "$(dirname "$0")"

BACKUP="${1:-backup.sql}"
if [ ! -f "$BACKUP" ]; then
  echo "找不到 $BACKUP"
  exit 1
fi

echo "使用備份: $BACKUP"
echo "1. 停止 app（保留 postgres）..."
sudo docker compose stop app

echo "2. 刪除現有表格（保留 postgres 連線）..."
sudo docker compose exec -T postgres psql -U ben -d blog -v ON_ERROR_STOP=1 << 'EOF'
DROP TABLE IF EXISTS "_PostToTag" CASCADE;
DROP TABLE IF EXISTS "PostVersion" CASCADE;
DROP TABLE IF EXISTS "Post" CASCADE;
DROP TABLE IF EXISTS "Tag" CASCADE;
DROP TABLE IF EXISTS "AboutConfig" CASCADE;
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;
EOF

echo "3. 還原備份..."
grep -v '^\\restrict ' "$BACKUP" | sudo docker compose exec -T postgres psql -U ben -d blog -v ON_ERROR_STOP=1 -f - 2>&1 | tail -20

echo "4. 啟動 app..."
sudo docker compose start app

echo "5. 檢查 log..."
sleep 3
sudo docker compose logs app --tail 10

echo ""
echo "還原完成。請重新整理網站確認 posts、notes、about 圖片、CV。"
