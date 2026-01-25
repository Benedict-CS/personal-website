#!/bin/bash
# Fix DB auth: 徹底清除 postgres 資料、重建、跑 migrate、重啟 app

set -e
cd "$(dirname "$0")"

echo "1. 停止所有服務..."
sudo docker compose down

echo "2. 徹底刪除 postgres-data（整個目錄）..."
sudo rm -rf postgres-data
sudo mkdir -p postgres-data

echo "3. 啟動 postgres，等 healthy..."
sudo docker compose up -d postgres
for i in {1..30}; do
  if sudo docker compose exec -T postgres pg_isready -U ben -d blog 2>/dev/null; then
    echo "   postgres ready."
    break
  fi
  sleep 1
done

echo "4. 啟動所有服務..."
sudo docker compose up -d

echo "5. 建立 DB 表格（用 init-db.sql，不依賴 Prisma CLI）..."
sudo docker compose exec -T postgres psql -U ben -d blog -v ON_ERROR_STOP=1 -f - < prisma/init-db.sql

echo "6. 重啟 app..."
sudo docker compose restart app

echo "7. 檢查 app log..."
sleep 5
sudo docker compose logs app --tail 20

echo ""
echo "若沒有 Authentication failed、沒有 'does not exist'，應該就修好了。"
echo "網站的文章會是空的，需重新建立。"
