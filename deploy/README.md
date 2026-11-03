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

Script cài: swap 2 GB, Node 22, PM2, MySQL (đã giảm RAM), Nginx, tường lửa (22/80/443), backup hằng đêm, tạo user `fepass`, rồi **tắt đăng nhập mật khẩu và đăng nhập root**.

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

## Vận hành

| Việc | Lệnh |
|---|---|
| Cập nhật phiên bản mới | `bash ~/app/deploy/deploy.sh` |
| Xem log | `pm2 logs fepass-api --lines 100` |
| Trạng thái, RAM | `pm2 status`, `free -h`, `df -h` |
| Khởi động lại | `pm2 restart fepass-api` |
| Backup thủ công | `bash ~/app/deploy/backup-db.sh` (file ở `~/backups`, giữ 7 ngày) |
| Khôi phục | `gunzip < file.sql.gz \| mysql exam_practice` |

Nên định kỳ tải thư mục `~/backups` về máy khác. Ảnh đề ở `~/storage` có thể lấy lại bằng cách crawl, nhưng backup cùng lúc cho chắc.

Cổng 8000 không mở ra ngoài (tường lửa chỉ cho 22/80/443); chỉ Nginx gọi vào được.
