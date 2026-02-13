#!/bin/bash
# 備份 posts、notes、about、CV、文章圖片。輸出到 backup-YYYYMMDD/
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NAME="backup-$(date +%Y%m%d-%H%M)"
BACKUPS_DIR="backups"
mkdir -p "$BACKUPS_DIR"
mkdir -p "$NAME"

echo "1. 備份資料庫（含 Post、Tag、AboutConfig、PageView 等）..."
sudo docker compose exec -T postgres pg_dump -U ben blog > "$NAME/backup.sql"
if [ ! -s "$NAME/backup.sql" ]; then
  echo "錯誤: backup.sql 為空，pg_dump 可能失敗（請檢查 postgres 容器是否運行、DB 名稱是否為 blog）"
  exit 1
fi

echo "2. 備份 public/about、cv.pdf..."
mkdir -p "$NAME/public"
cp -r public/about "$NAME/public/" 2>/dev/null || true
cp public/cv.pdf "$NAME/public/" 2>/dev/null || true

echo "3. 備份 RustFS（文章圖片）..."
sudo cp -r rustfs-data "$NAME/" 2>/dev/null || true

echo "4. 打包到 $BACKUPS_DIR/ ..."
tar -czvf "$BACKUPS_DIR/$NAME.tar.gz" "$NAME"
echo "5. 清理臨時目錄..."
sudo rm -rf "$NAME"

echo "6. 只保留最新 10 份備份，刪除更舊的..."
ls -t "$BACKUPS_DIR"/backup-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f

echo "完成: $BACKUPS_DIR/$NAME.tar.gz"
echo "移機時把此檔 + 專案丟到新 VM，解壓後照步驟做即可。"
