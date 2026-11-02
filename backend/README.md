# Backend – Luyện đề

Express 5 + TypeScript + Prisma (MySQL). Đăng ký/đăng nhập JWT, phân quyền USER/ADMIN, ví tiền và nạp tiền qua SePay (đối soát bằng cron job).

## Chạy thử

```bash
cd backend
cp .env.example .env          # sửa DATABASE_URL, JWT_SECRET
npm install
npx prisma generate
npm run prisma:migrate        # áp dụng prisma/migrations vào MySQL
npm run seed                  # tạo admin từ ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev                   # http://localhost:8000/api/v1/health
```

## Cấu trúc

```
src/
  configs/       env (zod), prisma client
  constants/     http status, mặc định cấu hình SePay
  routes/        khai báo URL + gắn middleware
  middlewares/   auth, phân quyền, validate, rate limit, xử lý lỗi
  controllers/   đọc request đã validate → gọi service → trả response
  services/      nghiệp vụ (đăng nhập, ví, nạp tiền, đối soát SePay)
  repositories/  truy vấn Prisma, không chứa nghiệp vụ
  rules/         zod schema của request, AppError, ResponseClient
  jobs/          cron job
  seeders/       tạo admin đầu tiên
```

Luồng một request: `route → middleware (auth, validate) → controller → service → repository → MySQL`.
Lỗi nghiệp vụ ném `AppError`, `error.middlewares.ts` đổi thành response thống nhất.

## API (`/api/v1`)

Response: `{ status, message, data, meta? }`. Gửi token bằng header `Authorization: Bearer <token>`.

| Nhóm | Endpoint |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| User | `GET/PATCH /users/me`, `PATCH /users/me/password`, `GET /users/me/transactions` |
| Nạp tiền | `GET /deposits/info`, `POST /deposits {amount}`, `GET /deposits`, `GET /deposits/:id` |
| Admin | `GET /admin/dashboard` |
| | `GET /admin/users`, `GET/PATCH /admin/users/:id`, `POST /admin/users/:id/balance` |
| | `GET /admin/deposits`, `GET /admin/bank-transactions` |
| | `GET/PUT /admin/settings/sepay`, `GET /admin/sepay/status`, `POST /admin/sepay/sync` |

## Nạp tiền SePay

1. Admin đăng nhập → `PUT /admin/settings/sepay`: API token (SePay → Cài đặt → API Access), số tài khoản, mã ngân hàng, tiền tố mã nạp, lịch cron, bật `cronEnabled`.
2. User gọi `POST /deposits {amount}` → nhận `payment.qrUrl` và nội dung chuyển khoản (`payment.content`, ví dụ `NAPK3F9X2QA`).
3. Cron (mặc định mỗi phút) gọi API SePay lấy giao dịch tiền vào, tìm mã nạp trong nội dung rồi cộng ví. User poll `GET /deposits/:id` đến khi `status = PAID`.
4. Tiền vào không khớp lệnh nào được lưu `UNMATCHED` (xem ở `/admin/bank-transactions`) để admin xử lý tay bằng `POST /admin/users/:id/balance`.

An toàn tiền bạc:
- `bank_transactions.sepay_id` là unique → một giao dịch không bao giờ được cộng hai lần, dù cron và nút "Chạy ngay" chạy cùng lúc.
- Chiếm lệnh, ghi giao dịch và cộng ví nằm trong một DB transaction; một bước lỗi thì cả ba huỷ.
- Số dư đổi bằng `increment` ở DB và mọi thay đổi đều có một dòng trong `wallet_transactions`.
