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
frontend/
  brand.config.ts        tên, slogan, founder, đối tác (sửa một nơi)
  public/                logo, favicon, ảnh bìa
  src/
    app/                 App (khai báo route), NotFoundPage
    shared/              dùng chung nhiều tính năng
      ui/                nút, ô nhập, bảng, thẻ, hộp thoại, công tắc...
      layout/            Footer, PanelLayout (khung panel), UserMenu
      brand/             Logo, thông tin thương hiệu
      api/ hooks/ utils/ context/ types/
    features/            mỗi tính năng một module, tự chứa code của nó
      auth/              đăng nhập, đăng ký, AuthContext, chặn route theo quyền
      practice/          làm đề: PracticePage, components/{quiz,sidebar,dialogs}, hooks, chấm điểm
      trial/             khách dùng thử 1 lần, hộp thoại mời đăng ký
      landing/           trang chủ: Landing + components/ (mỗi phần một file) + content.ts (lời)
      account/           panel người dùng: tổng quan, nạp tiền, giao dịch, hồ sơ
      admin/             panel quản trị: thành viên, lệnh nạp, SePay
backend/                 Express + Prisma + MySQL (routes, controllers, services, repositories)
```

Quy ước: dùng alias `@/` cho import (`@/shared/ui/Button`). Một `feature` không import ngược từ `feature` khác
ngoài vài chỗ có chủ đích (ví dụ `landing` dùng `DropZone` của `practice`); code dùng từ hai tính năng trở lên
thì chuyển vào `shared/`. Màu và font xem [`BRAND.md`](BRAND.md).
