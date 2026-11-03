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
  services/      nghiệp vụ (đăng nhập, ví, nạp tiền, đối soát SePay, nhập đề)
    crawler/     scraper FuOverflow (thread, bình luận, tải ảnh WebP), không biết gì về Express hay DB
  repositories/  truy vấn Prisma, không chứa nghiệp vụ
  rules/         zod schema của request, AppError, ResponseClient
  jobs/          cron job đối soát SePay, worker nền crawl đề
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
| Đề thi | `POST /crawl-jobs {url}`, `GET /crawl-jobs/:id` |
| Thư viện | `GET /exams` (đề của tôi), `GET /exams/:id`, `POST /exams/:id/attempts {mode, durationSec, answers}` |
| Lịch sử | `GET /attempts?examId=`, `GET /attempts/:id` (chi tiết từng câu) |
| Admin | `GET /admin/dashboard` |
| | `GET /admin/users`, `GET/PATCH /admin/users/:id`, `POST /admin/users/:id/balance` |
| | `GET /admin/deposits`, `GET /admin/bank-transactions` |
| | `GET/PUT /admin/settings/sepay`, `GET /admin/sepay/status`, `POST /admin/sepay/sync` |
| | `GET/PUT /admin/settings/crawler` |

## Nạp tiền SePay

1. Admin đăng nhập → `PUT /admin/settings/sepay`: API token (SePay → Cài đặt → API Access), số tài khoản, mã ngân hàng, tiền tố mã nạp, lịch cron, bật `cronEnabled`.
2. User gọi `POST /deposits {amount}` → nhận `payment.qrUrl` và nội dung chuyển khoản (`payment.content`, ví dụ `NAPK3F9X2QA`).
3. Cron (mặc định mỗi phút) gọi API SePay lấy giao dịch tiền vào, tìm mã nạp trong nội dung rồi cộng ví. User poll `GET /deposits/:id` đến khi `status = PAID`.
4. Tiền vào không khớp lệnh nào được lưu `UNMATCHED` (xem ở `/admin/bank-transactions`) để admin xử lý tay bằng `POST /admin/users/:id/balance`.

An toàn tiền bạc:
- `bank_transactions.sepay_id` là unique → một giao dịch không bao giờ được cộng hai lần, dù cron và nút "Chạy ngay" chạy cùng lúc.
- Chiếm lệnh, ghi giao dịch và cộng ví nằm trong một DB transaction; một bước lỗi thì cả ba huỷ.
- Số dư đổi bằng `increment` ở DB và mọi thay đổi đều có một dòng trong `wallet_transactions`.

## Nhập đề từ FuOverflow

1. Admin nhập cookie đăng nhập FuOverflow ở `PUT /admin/settings/crawler` (ảnh gốc chỉ tải được khi đã đăng nhập; cookie gắn với IP và User-Agent nên User-Agent phải trùng trình duyệt đã lấy cookie).
2. User gọi `POST /crawl-jobs {url}`. Chữ ký của đề là **thread ID** lấy từ link, nên mọi biến thể link (`?utm=`, `/page-2`, `/latest`, `/threads/7094/`) cùng ra một đề.
   - Đề đã có trong DB → trả `200 {existed: true, examId}`, không crawl lại.
   - Đang có lượt crawl cùng thread → dùng lại lượt đó.
   - Ngược lại tạo `crawl_jobs` (QUEUED), trả `202` ngay.
3. Worker nền (`jobs/crawl.worker.ts`) lấy từng job: đọc thread → tải ảnh, đổi WebP vào `STORAGE_DIR/exams/<threadId>/` → lấy bình luận → ghi `exams`, `exam_questions`, `exam_comments` trong một transaction. Mỗi bước cập nhật `crawl_jobs.stage` để client hiển thị. Server tắt giữa chừng thì job `RUNNING` được xếp lại khi khởi động.
4. Client poll `GET /crawl-jobs/:id` đến khi `DONE`, rồi `GET /exams/:id` (ảnh phục vụ tại `/api/v1/files/...`).

Đáp án: crawler chưa xác định được đáp án đúng nên mọi câu tạm là `A` (`exam_questions.answer`, hằng `DEFAULT_ANSWER`). Bình luận của người dùng FuOverflow đã lưu ở `exam_comments` để làm logic suy ra đáp án sau.

## Thư viện đề và lịch sử làm bài

- Đề là dùng chung (một `thread_id` một bản), còn **thư viện** là liên kết riêng `user_exams`. Nhập link xong, hoặc nhập đề đã có sẵn, đề đều vào thư viện của người nhập; chỉ chủ thư viện (và admin) mở được đề, người khác nhận 404.
- Nộp bài: client gửi đáp án đã chọn, **server tự chấm** theo đáp án trong DB (`services/grading.service.ts`, thang 10, điểm mỗi câu = 10 / số câu có đáp án) rồi lưu `exam_attempts`. Không tin điểm từ client.
- `exam_attempts.details` là ảnh chụp từng câu (đã chọn, đáp án đúng lúc chấm, kết quả) nên xem lại vẫn đúng dù sau này đáp án của đề được sửa.
- Đề mở từ thư mục trên máy không có trong DB nên không ghi lịch sử.

## Phí lấy đề

- Admin đặt `fetchPrice` (VND) ở `PUT /admin/settings/crawler`; `0` = miễn phí. `GET /crawl-jobs/price` cho giao diện báo trước.
- Mỗi lần `POST /crawl-jobs` bị trừ phí, **kể cả đề đã có sẵn** (mở lại từ "Đề của tôi" thì không phải lấy nên không trừ). Trừ tiền và tạo job/thêm vào thư viện nằm trong một DB transaction; không đủ số dư thì `402` và không tạo gì.
- Người đang có job cùng thread chưa xong gửi lại link thì dùng lại job đó, không trừ thêm.
- Job lỗi (cookie hết hạn, thread không có ảnh...) được hoàn đúng số tiền đã trừ (`crawl_jobs.charged_amount`), chỉ một lần nhờ điều kiện `status = RUNNING` ở DB. Sổ cái ví có hai loại `CRAWL_CHARGE` và `CRAWL_REFUND`.

## Khách (chưa đăng nhập) lấy đề

- Trình duyệt tự sinh `guest_id` (localStorage) và gửi header `X-Guest-Id` trong mọi request. Khách dùng `POST /crawl-jobs`, `GET /crawl-jobs/:id`, `GET /exams`, `GET /exams/:id` (middleware `identify`: có token thì phải hợp lệ, không có thì cần `X-Guest-Id`).
- Đề khách lấy nằm trong kho riêng `user_exams.guest_id`; job của khách có `crawl_jobs.guest_id`. Khách **không bị tính phí** (chưa có ví) nhưng chỉ được **1 lượt lấy đề mỗi ngày** (reset 0h giờ Việt Nam, tính cả khi đề đã có sẵn, lượt lỗi không tính), đếm theo `guest_id` từ bảng `crawl_jobs`; hết lượt trả `429` kèm lời mời đăng ký. Thêm lớp chặn theo IP 5 lượt/ngày để chống việc xoá dữ liệu trình duyệt đổi ID khách. Thành viên: mỗi lần lấy trừ phí, giới hạn 10 lượt/giờ/IP.
- Lịch sử làm bài chỉ cho thành viên. Khách nộp bài thì client giữ bài lại, và sau khi đăng ký/đăng nhập: `POST /exams/claim` chuyển các đề của `guest_id` về tài khoản (đã có thì bỏ qua) rồi bài vừa làm được lưu vào lịch sử.
- `guest_id` chỉ là danh tính ẩn danh theo trình duyệt, không phải thông tin bí mật: ai biết ID thì xem được kho đề của ID đó. Xoá dữ liệu trình duyệt thì mất kho đề chưa nhận về tài khoản.

## Quên mật khẩu

- `POST /auth/forgot-password {email}`: luôn trả cùng một thông báo (không lộ email nào đã đăng ký). Nếu có tài khoản: tạo token ngẫu nhiên 32 byte, **chỉ lưu băm SHA-256** vào `password_reset_tokens` (hiệu lực `PASSWORD_RESET_EXPIRES_MIN` phút, mặc định 30), rồi gửi email chứa liên kết `CLIENT_URL/reset-password?token=...` ở nền (không chờ SMTP). Cùng một tài khoản chỉ được gửi lại sau 60 giây; giới hạn 5 yêu cầu / 15 phút / IP.
- `POST /auth/reset-password {token, password}`: token dùng một lần (chiếm bằng điều kiện ở DB nên hai yêu cầu cùng lúc chỉ một cái thành công), đổi mật khẩu và huỷ mọi token còn lại, trong một transaction. Phiên đăng nhập cũ vẫn dùng được tới khi JWT hết hạn.
- SMTP cấu hình trong `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, tuỳ chọn `MAIL_FROM`). Gmail: cần "Mật khẩu ứng dụng". Không cấu hình thì server vẫn chạy, yêu cầu quên mật khẩu chỉ ghi log lỗi.
- Email dựng từ `mail/templates/reset-password.ts` (khung của `FStyle_BTC.html`, đổi sang nhận diện MST Software), banner ở `backend/assets/mail/reset-banner.png` được nhúng thẳng vào thư (cid) nên hiển thị cả khi chạy local.

## Email thông báo và cron theo giây

- Email gửi khi: tạo lệnh nạp (kèm thông tin chuyển khoản và mã QR), tiền nạp khớp lệnh và đã cộng ví, mỗi lần bị trừ phí lấy đề, đặt lại mật khẩu. Tiêu đề dạng `[Luyện thi FE FPTU] Nạp tiền thành công +100.000 ₫ · NAPXXXX` để nhìn hộp thư là biết nội dung chính. Khung chung ở `mail/layout.ts`, nội dung từng thư ở `mail/templates/`, banner ở `assets/mail/`.
- Thư luôn gửi **sau khi** transaction đã commit và chạy nền (`services/notification.service.ts`); gửi lỗi chỉ ghi log, không ảnh hưởng giao dịch.
- Cron đối soát SePay nhận 5 trường (tối thiểu 1 phút) hoặc **6 trường có giây ở đầu**, ví dụ `*/10 * * * * *` = mỗi 10 giây. Với 6 trường bước giây tối thiểu 10 (cố định hoặc `*/N`, N >= 10) để không gọi API SePay dồn dập. Các lượt chạy không bao giờ chồng nhau (đang chạy thì lượt sau bỏ qua).

## Liên kết riêng (deep link)

- **Lệnh nạp:** địa chỉ theo **mã nạp** ngẫu nhiên (`NAPK3F9X2QA`), không dùng ID tăng dần để khỏi lộ số lượng lệnh. `GET /deposits/:code` chỉ trả lệnh của chính người gọi. `GET /public/deposits/:code` **không cần đăng nhập** và chỉ trả mã, số tiền, trạng thái, thời hạn, thông tin tài khoản nhận (khi còn chờ); **không có ID, tên hay email** của người tạo; giới hạn 40 lượt/phút/IP chống dò mã. Frontend: `/deposit/:code` (khách xem bản rút gọn; đã đăng nhập thì chuyển sang `/account/deposit/:code`, nếu không phải chủ lệnh vẫn chỉ thấy bản rút gọn).
- **Đề:** `GET /exams/thread/:threadId` (mã thread FuOverflow, vốn công khai). Frontend `/exam/:threadId` mở đề, `/exam/:threadId?mode=exam|practice` vào thẳng chế độ. Không có đề và có đề nhưng không nằm trong kho của người xem đều trả cùng một lỗi 404.
- Trang và bộ lọc của các danh sách (`?page=2&status=PAID&q=...`) nằm trên URL nên tải lại hoặc gửi liên kết vẫn giữ nguyên. `/?url=<link FuOverflow>` điền sẵn ô nhập link (không tự lấy đề vì có tính phí).

## Thư mục đề và AI giải đáp án

- **Thư mục mỗi đề** (`STORAGE_DIR/exams/<threadId>/`): `images/Q1.webp...`, `comments.txt` (bình luận FuOverflow, định dạng như crawl-fu), và khi AI giải xong thêm `ans.txt` (mỗi dòng một câu) và `ai-report.md`. **Bình luận không lưu vào DB** (bảng `exam_comments` đã bỏ ở migration `0011`). Đề lấy trước khi có bản này vẫn để ảnh thẳng trong `exams/<threadId>/` (đường dẫn ảnh lưu trong DB nên vẫn hiển thị đúng).
- **AI (Gemini):** bật ở Quản trị → Cấu hình crawl (hoặc đặt `GEMINI_API_KEY` trong `.env`). Mỗi đề **mới** lấy về, worker gửi cho Gemini: prompt hệ thống `assets/prompts/huong-dan-giai-de.md` (đổi file bằng `AI_PROMPT_FILE`) + một phần bổ sung cho chế độ API + toàn bộ ảnh theo thứ tự + `comments.txt`. Gemini trả về khối ```` ```ans ```` gồm đúng N dòng, được kiểm tra rồi lưu vào `exam_questions.answer`; phần báo cáo phía trên khối lưu ở `exams.ai_report`.
- Có thể bật tra Google (grounding) theo bước 4 của prompt. Khóa gửi qua header, không nằm trong URL/log.
- **AI lỗi không làm hỏng việc lấy đề:** đề vẫn lưu với đáp án tạm `A` (`answer_source = DEFAULT`) và lý do ghi vào `ai_report`. Người dùng không bị trừ thêm phí vì AI.
- `GET /admin/exams`, `POST /admin/exams/:id/solve` (chạy nền, trả 202), `GET /admin/exams/:id/report`: trang **Đề thi** của quản trị để xem nguồn đáp án và nhờ AI giải lại (dùng cho đề cũ hoặc khi AI lỗi). Đề đã có đáp án rồi (người dùng lấy lại) thì không giải lại.
- Việc AI giải nằm **trong** lượt lấy đề nên có thể mất vài phút; hàng đợi worker chạy từng job một nên các lượt lấy đề khác sẽ chờ trong lúc đó.
