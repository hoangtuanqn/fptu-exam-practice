# Luyện đề

Web luyện đề trắc nghiệm từ thư mục ảnh trên máy, kèm tài khoản, ví và nạp tiền qua SePay.

- **Luyện đề** (`/`): chọn thư mục chứa `1.webp, 2.webp, …` và `ans.txt`, làm bài ở chế độ luyện tập hoặc thi thử, chấm điểm thang 10. Không cần đăng nhập.
- **Tài khoản** (`/account`): số dư, nạp tiền bằng QR, lịch sử giao dịch, hồ sơ và đổi mật khẩu.
- **Quản trị** (`/admin`, chỉ ADMIN): thống kê, quản lý thành viên (vai trò, khoá, chỉnh số dư), lệnh nạp, giao dịch ngân hàng, cấu hình SePay và cron đối soát.

## Chạy dự án

Cần Node 20+ và MySQL.

```bash
# 1. Backend (cổng 8000)
cd backend
cp .env.example .env            # sửa DATABASE_URL, JWT_SECRET
npm install
npx prisma generate
npm run prisma:migrate
npm run seed                    # tạo admin theo ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev

# 2. Frontend (cổng 5173), mở terminal khác
cd frontend
npm install
npm run dev
```

## Đổi tên, logo, màu thương hiệu

- **Tên sản phẩm/công ty, mô tả, màu thanh trình duyệt:** sửa `frontend/brand.config.ts` hoặc đặt biến `VITE_*` trong `frontend/.env` (mẫu ở `.env.example`). Sửa một lần là đổi cả tiêu đề tab, thẻ chia sẻ link, header, trang đăng nhập và footer.
- **Logo, favicon, ảnh bìa:** thay file cùng tên trong `frontend/public/` (`brand/logo-*.png`, `favicon.ico`, `icon-*.png`, `og-cover.jpg`).
- **Màu chủ đạo, font, quy tắc dùng logo:** xem [`BRAND.md`](BRAND.md). Sửa bảng `--color-*` ở đầu `frontend/src/index.css`.

Vite chuyển tiếp `/api` sang `localhost:8000` nên không cần cấu hình CORS khi phát triển.

## Bật nạp tiền SePay

1. Đăng nhập admin → **Cấu hình SePay**.
2. Nhập API token, số tài khoản, mã ngân hàng, tiền tố mã nạp; bật cron và lưu.
3. Thành viên vào **Nạp tiền**, tạo lệnh, quét QR. Cron lấy giao dịch từ SePay, thấy mã nạp trong nội dung thì cộng ví và trang thanh toán tự cập nhật.

Chi tiết API và cách đối soát an toàn: xem [`backend/README.md`](backend/README.md).

## Cấu trúc

```
frontend/       Vite + React + TypeScript + Tailwind
  brand.config.ts  tên và thông tin thương hiệu (sửa một nơi)
  public/          logo, favicon, ảnh bìa
  src/
    api/          gọi backend, một file cho mỗi nhóm
    context/      đăng nhập, thông báo
    pages/        auth, account, admin và trang luyện đề
    components/   ui (kit dùng chung), layout, panel, quiz
backend/        Express + Prisma + MySQL
```
