#!/bin/bash
# Backup DB, public/about, cv.pdf, rustfs-data. Output: backups/backup-YYYYMMDD-HHMM.tar.gz
# Run from cron as the project user (no sudo). Ensure user is in docker group and can read rustfs-data.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Resolve compose file for pg_dump
if [ -f "docker-compose.yml" ]; then
  export COMPOSE_FILE="docker-compose.yml"
elif [ -f "docker-compose.example.yml" ]; then
  export COMPOSE_FILE="docker-compose.example.yml"
else
  echo "錯誤: 找不到 docker-compose 設定檔"
  exit 1
fi

NAME="backup-$(date +%Y%m%d-%H%M)"
BACKUPS_DIR="backups"
mkdir -p "$BACKUPS_DIR"
mkdir -p "$NAME"

# Clean up temp dir on exit (success or failure)
cleanup() {
  rm -rf "$ROOT/$NAME"
}
trap cleanup EXIT

echo "1. 備份資料庫（含 Post、Tag、AboutConfig、PageView 等）..."
if ! docker compose exec -T postgres pg_dump -U ben blog > "$NAME/backup.sql" 2>/dev/null; then
  echo "錯誤: pg_dump 失敗（請確認 postgres 容器在跑、且目前使用者已在 docker 群組：groups）"
  exit 1
fi
if [ ! -s "$NAME/backup.sql" ]; then
  echo "錯誤: backup.sql 為空"
  exit 1
fi

echo "2. 備份 public/about、cv.pdf..."
mkdir -p "$NAME/public"
cp -r public/about "$NAME/public/" 2>/dev/null || true
cp public/cv.pdf "$NAME/public/" 2>/dev/null || true

echo "3. 備份 RustFS（文章圖片）..."
cp -r rustfs-data "$NAME/" 2>/dev/null || true

echo "4. 打包到 $BACKUPS_DIR/ ..."
tar -czvf "$BACKUPS_DIR/$NAME.tar.gz" "$NAME"

echo "5. 只保留最新 10 份備份，刪除更舊的..."
ls -t "$BACKUPS_DIR"/backup-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f

echo "完成: $BACKUPS_DIR/$NAME.tar.gz"
