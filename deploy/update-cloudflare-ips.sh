#!/usr/bin/env bash
# Làm mới danh sách IP của Cloudflare (chạy bằng root, thường là cron hằng tuần):
#  1. Nginx: tin header CF-Connecting-IP từ các IP này để lấy IP thật của người dùng (rate limit, log đúng).
#  2. ufw: chỉ cho Cloudflare vào cổng 80/443, người ngoài không gọi thẳng được IP của VPS để né Cloudflare.
# Dùng:  sudo bash update-cloudflare-ips.sh [--no-firewall]
set -euo pipefail

CONF=/etc/nginx/conf.d/cloudflare-realip.conf

V4="$(curl -fsS --max-time 20 https://www.cloudflare.com/ips-v4)"
V6="$(curl -fsS --max-time 20 https://www.cloudflare.com/ips-v6)"
RANGES="$(printf '%s\n%s\n' "$V4" "$V6" | grep -E '^[0-9a-fA-F:.]+/[0-9]+$' || true)"
if [ "$(printf '%s\n' "$RANGES" | wc -l)" -lt 10 ]; then
  echo "Danh sách IP Cloudflare bất thường, bỏ qua (không đổi gì)." >&2
  exit 1
fi

NEW="$(mktemp)"
{ while read -r r; do echo "set_real_ip_from $r;"; done <<< "$RANGES"; echo "real_ip_header CF-Connecting-IP;"; } > "$NEW"
if ! cmp -s "$NEW" "$CONF" 2>/dev/null; then
  [ -f "$CONF" ] && cp -a "$CONF" "$CONF.bak"
  install -m 644 "$NEW" "$CONF"
  if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx
    echo "Đã cập nhật $CONF"
  else
    echo "nginx -t lỗi, khôi phục bản cũ" >&2
    [ -f "$CONF.bak" ] && cp -a "$CONF.bak" "$CONF"
    rm -f "$NEW"
    exit 1
  fi
fi
rm -f "$NEW"

if [ "${1:-}" != "--no-firewall" ] && command -v ufw >/dev/null 2>&1; then
  while read -r r; do
    ufw allow from "$r" to any port 80,443 proto tcp comment cloudflare >/dev/null
  done <<< "$RANGES"
  echo "ufw: đã cho phép $(printf '%s\n' "$RANGES" | wc -l) dải IP Cloudflare vào cổng 80/443"
fi
