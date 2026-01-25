#!/bin/bash
# 備份 posts、notes、about、CV、文章圖片。輸出到 backup-YYYYMMDD/
set -e
cd "$(dirname "$0")"

NAME="backup-$(date +%Y%m%d-%H%M)"
mkdir -p "$NAME"

echo "1. 備份資料庫..."
sudo docker compose exec -T postgres pg_dump -U ben blog > "$NAME/backup.sql"

echo "2. 備份 public/about、cv.pdf..."
mkdir -p "$NAME/public"
cp -r public/about "$NAME/public/" 2>/dev/null || true
cp public/cv.pdf "$NAME/public/" 2>/dev/null || true

echo "3. 備份 RustFS（文章圖片）..."
sudo cp -r rustfs-data "$NAME/" 2>/dev/null || true

echo "4. 打包..."
tar -czvf "$NAME.tar.gz" "$NAME"
rm -rf "$NAME"

echo "完成: $NAME.tar.gz"
echo "移機時把此檔 + 專案丟到新 VM，解壓後照步驟做即可。"
