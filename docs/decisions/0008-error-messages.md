# Error messages users can act on

- Context: users saw vague text ("Thử quá nhiều lần, vui lòng quay lại sau", "Dữ liệu không hợp lệ", "Đã có lỗi xảy ra", English zod defaults, "Không tìm thấy GET /api/..."), and some internal details reached users (FuOverflow cookie hints in PE downloads and failed crawl jobs).
- Decision: every message says what happened, why (when the user can act on it) and what to do next. Status codes, `code`, `errors` keys and the `{ status:false, message, errors?, code?, data? }` shape stay the same; new `code`/`data` values are additive.

## Where messages come from

| Source | Place |
|---|---|
| Business errors | `AppError` (`rules/error.ts`) in services/controllers/middlewares |
| Validation | zod schemas in `rules/requests/*`; defaults translated by `configs/zod.ts` (`z.config({ customError })`, loaded by `error.middlewares.ts`) |
| Rate limits | `makeLimiter` (`middlewares/rateLimit.middlewares.ts`), route limiters pass only the cause |
| Generic | `error.middlewares.ts`: zod 422, P2002 409, multer 400, JSON 400, body too large 413, 404 route, 500 |
| Background jobs | crawl job `error` goes through `userJobError` (`crawl-job.dto.ts`) before reaching the user |

## Mechanisms

- 429: `makeLimiter({ message })` takes the cause sentence; the limiter appends "Vui lòng thử lại sau N giây/phút/giờ." computed from `req.rateLimit.resetTime`, adds `code: "RATE_LIMITED"` and `data.retryAfter` (seconds), and `Retry-After` is always sent. Limit numbers and windows are never shown. `authLimiter` names the action from the path (register, reset password, Google, GitHub, verify email).
- 422: `message` = the only field error, or "Có N thông tin chưa hợp lệ, xem từng ô bên dưới". `errors` is unchanged.
- zod defaults: Vietnamese with a field label from the path (`FIELD_LABELS`); schema-level messages still win.
- P2002: exact known constraint names only (`users_email_key`, `users_referral_code_key`, `gift_codes_code_key`, `coursera_courses_code_key`, `coursera_courses_url_key`) get a specific message; only email also sets `errors.email`. Anything else (subject codes, composite keys, generated codes) gets a generic "already done, reload" text.
- Service 429s that state a wait time (login lock, verify-email resend) carry `data.retryAfter` (seconds) and the error handler then sets `Retry-After`.
- Login: wrong email/password share one 401 (`code: INVALID_CREDENTIALS`, no email enumeration) with recovery hints; captcha still signalled by `errors.captcha`; lock = 429 `LOGIN_LOCKED` with the real remaining time; banned = 403 `ACCOUNT_BANNED` (`AppError.banned()`), captcha failures carry `code: CAPTCHA_REQUIRED`.
- No request-id mechanism exists, so 5xx responses do not carry one; the 500 text asks the user to send the time of the error.

## Changed messages (before -> after, short)

| Area | Before | After |
|---|---|---|
| 429 login | Thử quá nhiều lần, vui lòng quay lại sau | Bạn đã thử đăng nhập quá nhiều lần từ mạng này. Nếu dùng wifi chung hãy thử 4G. Vui lòng thử lại sau N phút. |
| 429 register/reset/Google/GitHub/verify | Thử quá nhiều lần, vui lòng quay lại sau | Có quá nhiều lượt <thao tác> từ mạng bạn đang dùng... thử lại sau N |
| 429 forgot password | Bạn yêu cầu quá nhiều lần... | ...gửi thư đặt lại mật khẩu quá nhiều lần. Kiểm tra hộp thư (cả Spam)... thử lại sau N |
| 429 others (chat, AI, import, quote, PE, extension, session save, upload, Coursera, link reward, grades, deposit lookup, chapter check, gift code, default) | "... quá nhanh, vui lòng thử lại sau" | names the action + real wait time |
| Login lock | Bạn đã nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút | Đăng nhập bằng email này đang tạm khoá vì nhập sai nhiều lần. Thử lại sau N; dùng Quên mật khẩu trong lúc chờ. |
| Wrong login | Email hoặc mật khẩu không đúng | + Kiểm tra lại, hoặc bấm Quên mật khẩu; từng dùng Google/GitHub thì dùng lại nút đó. |
| Banned | Tài khoản đã bị khoá | Tài khoản này đã bị khoá. Nếu nhầm lẫn hãy liên hệ hỗ trợ kèm email đăng ký. |
| 401 default | Chưa đăng nhập hoặc phiên đã hết hạn | Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại. |
| Captcha | Vui lòng xác thực captcha | missing: hoàn thành bước xác minh captcha; failed: không thành công hoặc hết hạn, làm lại |
| Google/GitHub | Không xác thực được tài khoản X, vui lòng thử lại | X chưa xác nhận phiên đăng nhập (hết hạn/bị huỷ). Bấm lại; vẫn lỗi thì dùng email + mật khẩu. Google no email: cho phép quyền xem email. |
| Social login off | Đăng nhập bằng X chưa được cấu hình | ...tạm thời chưa dùng được. Hãy đăng nhập bằng email và mật khẩu. |
| Reset / verify link | Liên kết ... không hợp lệ hoặc đã hết hạn / Liên kết không hợp lệ | ...đã hết hạn hoặc đã được dùng. Yêu cầu liên kết mới (Quên mật khẩu / gửi lại ở Hồ sơ). |
| Register email taken | Email đã được sử dụng | Email này đã có tài khoản. Hãy đăng nhập, hoặc Quên mật khẩu. |
| Verify cooldown | Vui lòng đợi N giây rồi gửi lại | Thư xác minh vừa được gửi. Kiểm tra hộp thư (cả Spam), hoặc đợi N rồi gửi lại. |
| 422 top-level | Dữ liệu không hợp lệ | the one field error, or Có N thông tin chưa hợp lệ, xem từng ô bên dưới |
| zod defaults | English ("Invalid input", "Too small...") | Vietnamese per rule + field label |
| 404 route | Không tìm thấy GET /api/v1/... | Không tìm thấy trang hoặc chức năng này. Kiểm tra đường dẫn hoặc tải lại trang. |
| P2002 | Dữ liệu đã tồn tại | email / referral / gift code / Coursera code+url specific, else "Thao tác này đã được thực hiện trước đó... tải lại trang" |
| 500 (prod) | Đã có lỗi xảy ra | Hệ thống gặp sự cố, không phải do bạn. Thử lại sau ít phút; vẫn lỗi thì liên hệ hỗ trợ kèm thời gian. |
| JSON parse | Body không phải JSON hợp lệ | Dữ liệu gửi lên bị lỗi định dạng. Tải lại trang rồi thử lại. |
| Body too large | (500) | 413 Nội dung gửi lên quá dài. Hãy rút gọn rồi thử lại. |
| Multer | Tệp tải lên không hợp lệ | one file per upload / cannot read file, choose again |
| Exam not found (member) | Không tìm thấy đề | Không tìm thấy đề này... mở lại từ Kho đề hoặc lấy đề bằng link. |
| FuOverflow link | Link không hợp lệ / Link không đúng dạng ... | Link chưa đúng dạng link bài viết FuOverflow. Sao chép link trên thanh địa chỉ, ví dụ ... |
| PE download, FuOverflow session broken | Cookie FuOverflow đã hết hạn... Admin hãy cập nhật ... | Hệ thống tạm thời chưa tải được dữ liệu từ FuOverflow, không phải do bạn. Quản trị viên đã được báo. (admin notice keeps the cookie hint) |
| Crawl job `error` | raw technical error | Chưa lấy được đề này, không phải do bạn. Credit đã được hoàn nếu đã trả... (label errors kept) |
| Gift code | Mã không hợp lệ hoặc không còn hiệu lực / Mã đã hết hạn / hết lượt | + check characters (O/0, I/1); "Mã này đã hết hạn sử dụng"; "đã hết lượt" |
| Link reward claim | Mã không hợp lệ / Liên kết nhận lượt không hợp lệ (...) | open the exact link shown after the shortener; log in with the account that created it |
| Deposit | Chức năng nạp tiền chưa được cấu hình / quá nhiều lệnh nạp | Nạp tiền đang tạm dừng, số dư không ảnh hưởng / pay a pending order on Nạp credit or wait for it to expire |
| Coursera generic | Không thể xử lý yêu cầu Coursera lúc này | Hệ thống chưa xử lý được..., không phải do bạn. Thử lại; vẫn lỗi liên hệ hỗ trợ. |
| Misc | Thiếu mã môn / Mục tiêu không hợp lệ / Tin nhắn quá dài / Số dư không đủ / Không tìm thấy dữ liệu / Liên kết không hợp lệ (unsubscribe) | choose a subject first / choose a goal from the list / shorten and resend / top up credit / may be deleted, reload / unsubscribe from Hồ sơ |

## Checklist for a new message

1. Says the specific cause, in plain Vietnamese, no English, no codes, no stack/Prisma/SQL/paths.
2. Says what to do next (wait N, check X, go to page Y, contact support with Z).
3. Never reveals limits, windows, internal tools, infra, or whether an email exists (when anti-enumeration applies).
4. Rate limit: pass only the cause to `makeLimiter`; it adds the wait time.
5. Field errors go in `errors[field]` (the 422 top message is derived); keep `code` stable once the frontend reads it.
6. Errors from background jobs or external sites are mapped to a user sentence; keep the raw text for admin notices only.
