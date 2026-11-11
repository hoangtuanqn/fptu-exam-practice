#!/usr/bin/env bash
# Triển khai / cập nhật backend. Chạy bằng user `fepass` (không phải root):  bash ~/app/deploy/deploy.sh
# Lần đầu: tạo backend/.env (điền sẵn DB, JWT, mật khẩu admin) rồi dừng để bạn điền các khóa còn lại, sau đó chạy lại.
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/app}"
BRANCH="${BRANCH:-main}"
SECRETS="$HOME/.secrets"

[ -d "$APP_DIR/.git" ] || { echo "Chưa có mã nguồn ở $APP_DIR. Xem deploy/README.md (bước clone)."; exit 1; }
cd "$APP_DIR"

echo "==> Lấy mã mới ($BRANCH)"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git merge --ff-only "origin/$BRANCH"

cd backend

if [ ! -f .env ]; then
  [ -f "$SECRETS" ] || { echo "Thiếu $SECRETS (chạy setup-server.sh trước)"; exit 1; }
  # shellcheck disable=SC1090
  . "$SECRETS"
  ADMIN_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)Aa1!"
  cp .env.production.example .env
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"mysql://fepass:${DB_PASSWORD}@127.0.0.1:3306/exam_practice\"|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
  sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PASSWORD}|" .env
  chmod 600 .env
  echo
  echo "Đã tạo backend/.env. Mật khẩu admin đã sinh sẵn (đổi lại sau khi đăng nhập): ${ADMIN_PASSWORD}"
  echo "Hãy mở file và điền SMTP, ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID...:  nano $APP_DIR/backend/.env"
  echo "Xong rồi chạy lại: bash $APP_DIR/deploy/deploy.sh"
  exit 0
fi

echo "==> Cài thư viện"
npm ci

echo "==> Prisma: generate và migrate"
npx prisma generate
npx prisma migrate deploy

echo "==> Build"
npm run build

echo "==> Chạy bằng PM2"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "==> Kiểm tra"
sleep 3
code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/api/v1/auth/google/config || true)"
echo "API trả mã HTTP: ${code}"
[ "$code" = "200" ] || { echo "API chưa lên đúng. Xem log:  pm2 logs fepass-api --lines 50"; exit 1; }
echo "OK"
