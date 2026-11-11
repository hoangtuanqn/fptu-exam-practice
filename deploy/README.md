# Triển khai backend lên VPS

Hai môi trường:

| | Development | Production |
|---|---|---|
| Chạy ở | máy bạn | VPS Ubuntu 22.04 (1 core, 2 GB) |
| Web | `http://localhost:5173` | `https://fepass.top` (frontend deploy chỗ khác) |
| API | `http://localhost:8000` (Vite proxy `/api`) | `https://api.fepass.top` (Nginx → Node cổng 8000) |
| Cấu hình | `backend/.env` (từ `.env.example`) | `backend/.env` trên VPS (từ `.env.production.example`) |
| Tiến trình | `npm run dev` | PM2 (`fepass-api`) |

Khác biệt chính trong `.env` production: `NODE_ENV=production`, `CLIENT_URL=https://fepass.top`, `API_URL=https://api.fepass.top`, `TRUST_PROXY=1`, `STORAGE_DIR=/home/fepass/storage`.

## 0. Một lần: tạo khóa SSH (trên máy bạn)

```bash
ssh-keygen -t ed25519 -C "fepass-vps"      # Enter để dùng đường dẫn mặc định
cat ~/.ssh/id_ed25519.pub                   # chép dòng này (ssh-ed25519 AAAA...)
```

## 1. Trỏ DNS

Ở trang quản lý domain `fepass.top`, thêm bản ghi:

| Loại | Tên | Giá trị |
|---|---|---|
| A | `api` | IP của VPS |

Kiểm tra: `nslookup api.fepass.top` phải ra IP VPS (cần xong trước bước certbot).

## 2. Cài máy chủ (root, một lần)

Trên máy bạn, copy thư mục `deploy` lên VPS rồi chạy:

```bash
scp -r deploy root@<IP>:/root/
ssh root@<IP>
PUBKEY="ssh-ed25519 AAAA... fepass-vps" bash /root/deploy/setup-server.sh
```

Script cài: swap 2 GB, Node 22 (>= 22.13), PM2, MySQL (đã giảm RAM), Nginx, tường lửa (22/80/443), backup hằng đêm, tạo user `fepass`, rồi **tắt đăng nhập mật khẩu và đăng nhập root**.

**Trước khi đóng phiên root**, mở cửa sổ mới thử `ssh fepass@<IP>`. Vào được mới đóng phiên cũ.

## 3. Lấy mã nguồn (user fepass)

```bash
ssh fepass@<IP>
git clone https://github.com/hoangtuanqn/fptu-exam-practice.git ~/app
```

Nếu repo private: tạo deploy key (`ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""`), thêm nội dung `deploy_key.pub` vào GitHub → Settings → Deploy keys (chỉ đọc), rồi clone bằng `git@github.com:...` (thêm `~/.ssh/config` trỏ `IdentityFile ~/.ssh/deploy_key`).

## 4. Deploy lần đầu

```bash
bash ~/app/deploy/deploy.sh      # lần 1: tạo backend/.env rồi dừng
nano ~/app/backend/.env          # điền SMTP, ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID...
bash ~/app/deploy/deploy.sh      # lần 2: cài, migrate, build, chạy PM2
cd ~/app/backend && npm run seed # tạo tài khoản admin (ADMIN_EMAIL / ADMIN_PASSWORD trong .env)
```

Mật khẩu admin do script sinh sẵn và in ra ở lần 1. Đổi lại sau khi đăng nhập.

## 5. HTTPS

Khi DNS đã trỏ đúng:

```bash
sudo certbot --nginx -d api.fepass.top --redirect -m <email của bạn> --agree-tos
```

Certbot tự gia hạn. Kiểm tra: `curl https://api.fepass.top/api/v1/auth/google/config`.

## 6. Frontend (chỗ bạn tự deploy)

Build với biến môi trường: `VITE_API_URL=https://api.fepass.top` và `VITE_SITE_URL=https://fepass.top`. Đổi biến xong phải build lại.

Việc cần làm ở dịch vụ ngoài khi lên domain:
- **Google OAuth:** thêm `https://fepass.top` vào *Authorized JavaScript origins*.
- **Email (SPF/DKIM):** cấu hình bản ghi cho `fepass.top` nếu gửi thư từ domain này, để thư xác minh không vào Spam.

## 7. Cloudflare (chống DDoS)

Đã bật proxy (đám mây cam) cho `fepass.top` và `api.fepass.top`, SSL **Full (strict)**. Phía VPS:

```bash
scp deploy/update-cloudflare-ips.sh fepass@<IP VPS>:/tmp/
ssh fepass@<IP VPS> 'sudo install -m 755 /tmp/update-cloudflare-ips.sh /usr/local/bin/ && sudo /usr/local/bin/update-cloudflare-ips.sh'
echo '0 4 * * 1 root /usr/local/bin/update-cloudflare-ips.sh >> /var/log/cloudflare-ips.log 2>&1' | sudo tee /etc/cron.d/cloudflare-ips
```

Script này (cron chạy mỗi thứ Hai) làm hai việc: Nginx tin header `CF-Connecting-IP` từ các IP Cloudflare để `req.ip` là IP thật của người dùng (giữ `TRUST_PROXY=1`), và `ufw` chỉ cho Cloudflare vào cổng 80/443. Sau khi chạy lần đầu, xoá luật mở 80/443 cho mọi người: `sudo ufw delete allow 80/tcp; sudo ufw delete allow 443/tcp`. Giữ nguyên cổng 22.

Lưu ý:
- Tên `api.fepass.top` giờ trỏ về Cloudflare nên **SSH phải dùng IP gốc của VPS**, không dùng tên miền (Cloudflare không proxy cổng 22).
- Đừng bật *I'm Under Attack Mode* cho cả site: các lời gọi API của frontend không vượt được trang kiểm tra nên web hỏng. Chỉ bật tạm khi đang bị tấn công thật.
- Sau mỗi lần upload frontend mới lên cPanel, vào Cloudflare → Caching → Purge Everything.

## Vận hành

| Việc | Lệnh |
|---|---|
| Cập nhật phiên bản mới | `bash ~/app/deploy/deploy.sh` |
| Xem log | `pm2 logs fepass-api --lines 100` |
| Trạng thái, RAM | `pm2 status`, `free -h`, `df -h` |
| Khởi động lại | `pm2 restart fepass-api` |
| Backup thủ công | `bash ~/app/deploy/backup-db.sh` (file ở `~/backups`, giữ 7 ngày) |
| Khôi phục | `gunzip < file.sql.gz \| mysql exam_practice` |

Trước khi deploy bản có Phân tích slide: `node -v` phải >= 22.13; sau `npm ci`, chạy `node -e "require('@napi-rs/canvas')"` trong `~/app/backend` (không báo lỗi là gói vẽ trang chạy được trên máy này). File `deploy/nginx-api.conf` không tự cập nhật: đổi nó thì copy tay lên `/etc/nginx/sites-available/fepass-api` rồi `sudo nginx -t && sudo systemctl reload nginx`.

Nên định kỳ tải thư mục `~/backups` về máy khác. Ảnh đề ở `~/storage` có thể lấy lại bằng cách crawl, nhưng backup cùng lúc cho chắc.

Cổng 8000 không mở ra ngoài (tường lửa chỉ cho 22/80/443); chỉ Nginx gọi vào được.

## Theo dõi truy vấn chậm

- App tự ghi cảnh báo `[db] truy vấn chậm ...` vào log PM2 khi một truy vấn quá 300ms (đổi bằng biến `SLOW_QUERY_MS`). Xem: `pm2 logs fepass-api --lines 200 | grep "\[db\]"`.
- Số kết nối tối đa của app tới MySQL mặc định 10 (đổi bằng `DB_POOL_SIZE`, hoặc đặt `connection_limit` trong `DATABASE_URL`).
- Máy mới do `setup-server.sh` dựng đã bật sẵn slow query log của MySQL (ngưỡng 0,5 giây, file `/var/log/mysql/slow.log`). Máy cũ bật tay một lần (cần root):
  `sudo mysql -e "SET GLOBAL slow_query_log=ON; SET GLOBAL long_query_time=0.5;"` rồi thêm ba dòng `slow_query_log`, `long_query_time`, `slow_query_log_file` vào `/etc/mysql/mysql.conf.d/99-lowmem.cnf` để giữ sau khi khởi động lại.
