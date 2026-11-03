#!/usr/bin/env bash
# Sao lưu MySQL (nén gzip), giữ 7 ngày. Mật khẩu đọc từ ~/.my.cnf. Cron gọi lúc 3:30 mỗi đêm.
# Bản sao nằm cùng máy chủ: hãy định kỳ tải về máy khác (scp/rsync) để phòng mất cả VPS.
set -euo pipefail

DIR="${BACKUP_DIR:-/home/fepass/backups}"
DB="${DB_NAME:-exam_practice}"
mkdir -p "$DIR"

FILE="$DIR/${DB}_$(date +%F_%H%M).sql.gz"
mysqldump --single-transaction --quick --routines "$DB" | gzip > "$FILE"
find "$DIR" -name "${DB}_*.sql.gz" -mtime +7 -delete
echo "$(date '+%F %T') đã sao lưu: $FILE ($(du -h "$FILE" | cut -f1))"
