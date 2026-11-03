#!/usr/bin/env bash
# Cài máy chủ production (Ubuntu 22.04, 1 core / 2 GB RAM) cho backend fepass.
# Chạy MỘT LẦN bằng root:
#   PUBKEY="ssh-ed25519 AAAA... ban@may" bash setup-server.sh
# Script đặt khóa SSH cho user `fepass` rồi mới tắt đăng nhập bằng mật khẩu và đăng nhập root.
# TRƯỚC KHI đóng phiên SSH hiện tại, hãy mở phiên mới đăng nhập thử bằng `ssh fepass@IP`.
set -euo pipefail

APP_USER="fepass"
API_DOMAIN="api.fepass.top"
DB_NAME="exam_practice"
DB_USER="fepass"
HOME_DIR="/home/${APP_USER}"
HERE="$(cd "$(dirname "$0")" && pwd)"

[ "$(id -u)" -eq 0 ] || { echo "Hãy chạy bằng root"; exit 1; }
: "${PUBKEY:?Thiếu PUBKEY. Ví dụ: PUBKEY=\"ssh-ed25519 AAAA... ban@may\" bash setup-server.sh}"
case "$PUBKEY" in ssh-ed25519\ *|ssh-rsa\ *|ecdsa-sha2-*) ;; *) echo "PUBKEY không phải khóa công khai SSH hợp lệ"; exit 1 ;; esac
[ -f "$HERE/nginx-api.conf" ] || { echo "Thiếu $HERE/nginx-api.conf (hãy copy cả thư mục deploy/)"; exit 1; }

export DEBIAN_FRONTEND=noninteractive
step() { printf '\n==> %s\n' "$*"; }

step "Múi giờ và swap 2 GB"
timedatectl set-timezone Asia/Ho_Chi_Minh
if [ -z "$(swapon --show --noheadings)" ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
sysctl -q -p /etc/sysctl.d/99-swappiness.conf

step "Cập nhật hệ thống và cài gói nền"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl ca-certificates gnupg git nginx ufw mysql-server certbot python3-certbot-nginx

step "Cài Node.js 22 (kho NodeSource)"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]; then
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --batch --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update -y
  apt-get install -y nodejs
fi
npm install -g pm2

step "Tạo user ${APP_USER} và khóa SSH"
id "$APP_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$APP_USER"
install -d -m 700 -o "$APP_USER" -g "$APP_USER" "${HOME_DIR}/.ssh"
touch "${HOME_DIR}/.ssh/authorized_keys"
grep -qxF "$PUBKEY" "${HOME_DIR}/.ssh/authorized_keys" || echo "$PUBKEY" >> "${HOME_DIR}/.ssh/authorized_keys"
chown "$APP_USER:$APP_USER" "${HOME_DIR}/.ssh/authorized_keys"
chmod 600 "${HOME_DIR}/.ssh/authorized_keys"
echo "${APP_USER} ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/${APP_USER}"
chmod 440 "/etc/sudoers.d/${APP_USER}"
install -d -o "$APP_USER" -g "$APP_USER" "${HOME_DIR}/storage" "${HOME_DIR}/backups"

step "MySQL: giảm RAM, tạo database và user"
cat > /etc/mysql/mysql.conf.d/99-lowmem.cnf <<'EOF'
[mysqld]
innodb_buffer_pool_size = 192M
innodb_log_file_size    = 64M
performance_schema      = OFF
max_connections         = 60
key_buffer_size         = 8M
tmp_table_size          = 32M
max_heap_table_size     = 32M
skip_name_resolve       = ON
bind-address            = 127.0.0.1
character-set-server    = utf8mb4
collation-server        = utf8mb4_unicode_ci
EOF
systemctl restart mysql
systemctl enable mysql >/dev/null

SECRETS="${HOME_DIR}/.secrets"
if [ ! -f "$SECRETS" ]; then
  umask 077
  printf 'DB_PASSWORD=%s\nJWT_SECRET=%s\n' "$(openssl rand -hex 24)" "$(openssl rand -hex 32)" > "$SECRETS"
  chown "$APP_USER:$APP_USER" "$SECRETS"
fi
# shellcheck disable=SC1090
. "$SECRETS"
mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
# Cho mysqldump (backup) đọc mật khẩu mà không lộ trên dòng lệnh
umask 077
printf '[client]\nuser=%s\npassword=%s\nhost=127.0.0.1\n' "$DB_USER" "$DB_PASSWORD" > "${HOME_DIR}/.my.cnf"
chown "$APP_USER:$APP_USER" "${HOME_DIR}/.my.cnf"
umask 022

step "Nginx cho ${API_DOMAIN}"
cp "$HERE/nginx-api.conf" /etc/nginx/sites-available/fepass-api
ln -sf /etc/nginx/sites-available/fepass-api /etc/nginx/sites-enabled/fepass-api
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx >/dev/null
systemctl reload nginx

step "Tường lửa (chỉ mở 22, 80, 443)"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

step "PM2 tự chạy khi khởi động lại máy"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "$HOME_DIR" >/dev/null

step "Backup MySQL hằng đêm (3:30)"
echo "30 3 * * * ${APP_USER} ${HOME_DIR}/app/deploy/backup-db.sh >> ${HOME_DIR}/backups/backup.log 2>&1" > /etc/cron.d/fepass-backup
chmod 644 /etc/cron.d/fepass-backup

step "Tắt đăng nhập bằng mật khẩu và đăng nhập root qua SSH"
cat > /etc/ssh/sshd_config.d/00-hardening.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
EOF
sshd -t
systemctl reload ssh

cat <<EOF

Xong phần máy chủ.
  - Mở PHIÊN SSH MỚI kiểm tra:   ssh ${APP_USER}@<IP VPS>
  - Mật khẩu DB/JWT đã sinh sẵn tại ${SECRETS} (deploy.sh sẽ dùng, không cần chép tay)
  - Bước tiếp theo: xem deploy/README.md (clone mã nguồn, deploy.sh, trỏ DNS, certbot)
EOF
