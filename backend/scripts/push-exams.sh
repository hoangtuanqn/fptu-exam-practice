#!/usr/bin/env bash
# Đẩy các đề chỉ có ở local lên VPS. Chạy ở máy bạn (Git Bash), trong thư mục backend:
#   bash scripts/push-exams.sh --dry-run   xem sẽ thêm đề nào, không ghi gì lên VPS
#   bash scripts/push-exams.sh             xem trước, hỏi xác nhận, backup DB rồi nhập thật
# SSH: dùng alias `fepass-vps2` trong ~/.ssh/config (xem workspace/vps2.md), hoặc đặt VPS_SSH="-i ~/.ssh/fepass fepass@<ip>".
set -euo pipefail
cd "$(dirname "$0")/.."

SSH_ARGS=${VPS_SSH:-fepass-vps2}
HOST=${SSH_ARGS##* }                       # phần cuối: user@ip hoặc alias
OPTS=""; [ "$HOST" != "$SSH_ARGS" ] && OPTS=${SSH_ARGS% *}
run() { ssh $OPTS "$HOST" "$@"; }
put() { scp -q $OPTS "$1" "$HOST:$2"; }
dry=false; [ "${1:-}" = "--dry-run" ] && dry=true

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

echo "== Lấy danh sách đề đã có trên VPS"
run 'mysql -N -e "SELECT thread_id FROM exam_practice.exams"' > "$tmp/ids.txt"
echo "VPS có $(wc -l < "$tmp/ids.txt") đề"

echo "== Xuất các đề chỉ có ở local"
npm run -s sync:exams -- export "$tmp/bundle" --exclude "$tmp/ids.txt" | grep -v '^\[db\]'
if ! grep -q '"threadId"' "$tmp/bundle/exams.json"; then echo "Không có đề mới."; exit 0; fi

echo "== Gửi lên VPS"
tar czf "$tmp/b.tgz" -C "$tmp/bundle" .
put "$tmp/b.tgz" exam-bundle.tgz
cleanup='rm -rf ~/exam-bundle ~/exam-bundle.tgz'
# Script chưa có trên VPS (chưa merge/deploy) thì chép tạm rồi xóa, tránh vướng git pull sau này
temp_script=false
run '[ -f ~/app/backend/scripts/sync-exams.ts ]' || { put scripts/sync-exams.ts app/backend/scripts/sync-exams.ts; temp_script=true; }
$temp_script && cleanup="$cleanup ~/app/backend/scripts/sync-exams.ts"
trap 'run "'"$cleanup"'" || true; rm -rf "$tmp"' EXIT

run 'rm -rf ~/exam-bundle; mkdir ~/exam-bundle && tar xzf ~/exam-bundle.tgz -C ~/exam-bundle'
IMPORT='cd ~/app/backend && npx tsx scripts/sync-exams.ts import ~/exam-bundle'

echo "== Xem trước"
run "$IMPORT --dry-run"
$dry && exit 0

read -r -p "Nhập thật các đề trên vào production? [y/N] " ok
[ "$ok" = "y" ] || { echo "Đã hủy, chưa ghi gì."; exit 0; }

echo "== Backup DB rồi nhập thật"
run 'cd ~/app && bash deploy/backup-db.sh | tail -1'
run "$IMPORT | tail -2"
run 'mysql -N -e "SELECT COUNT(*) FROM exam_practice.exams"; curl -s -o /dev/null -w "health: %{http_code}\n" localhost:8000/api/v1/health'
