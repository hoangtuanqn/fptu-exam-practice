# FePass: tiện ích Chrome cho FuOverflow

Thêm nút **“Làm đề thi trên fepass.top”** (kèm phí, ví dụ `500đ`) cạnh các bài có nhãn **Đề Thi FE** trên FuOverflow:

- Trang danh sách: `https://fuoverflow.com/forums/OSG202/`
- Trang chi tiết bài: `https://fuoverflow.com/threads/osg202-su26-re.7168/`

Bấm nút sẽ mở `fepass.top` ở tab mới và hiện hộp **xác nhận lấy đề** (số credit sẽ bị trừ, số dư hiện tại, số dư sau khi trừ).
**Chỉ khi người dùng bấm “Trả …” mới bị trừ credit.** Đề đã lấy trước đó thì mở lại miễn phí; đề lỗi được hoàn phí như bình thường.

## Cài đặt (chế độ nhà phát triển)

1. Mở `chrome://extensions`, bật **Developer mode** (góc trên bên phải).
2. Bấm **Load unpacked** và chọn thư mục `chrome-extension` này.
3. Vào một chuyên mục FuOverflow có đề FE, nút xuất hiện cạnh tiêu đề bài.

Sửa code xong chỉ cần bấm nút tải lại (⟳) ở thẻ tiện ích trong `chrome://extensions`, rồi tải lại trang FuOverflow.

## Cách hoạt động

| File | Việc |
|---|---|
| `manifest.json` | Manifest V3. Chỉ chạy trên `fuoverflow.com`; quyền: `storage`, và gọi API `api.fepass.top` (cùng `localhost` để chạy thử). |
| `content.js`, `content.css` | Quét trang, tìm bài có nhãn “Đề Thi FE” (danh sách `.structItem-title`, trang bài `h1.p-title-value`), chèn nút. Có theo dõi thay đổi DOM để nút vẫn hiện khi trang nạp thêm nội dung. |
| `background.js` | Lấy phí lấy đề từ `GET /api/v1/crawl-jobs/price` (endpoint công khai) và nhớ 10 phút. Gọi ở đây vì trang FuOverflow không được phép gọi chéo tên miền. |
| `popup.html/js/css` | Bật/tắt nút; mục “Nâng cao” để trỏ sang môi trường chạy thử. |
| `shared.js` | Cấu hình mặc định + kiểm tra địa chỉ (chỉ `https`, hoặc `http://localhost`). |

Liên kết nút trỏ tới: `https://fepass.top/?link=<link bài>&confirm=1&src=ext`.
Phía website (`frontend/src/features/exam-import/components/LinkImport.tsx`) đọc `link` và `confirm=1` để điền sẵn link rồi mở hộp xác nhận. Trang **không tự lấy đề**: luôn chờ người dùng bấm xác nhận.

## Đồng bộ điểm FAP (từ bản 1.4.0)

Chỉ hoạt động khi sinh viên tự bật **Đồng bộ điểm FAP** ở trang *Điểm FAP* trên fepass.top (mặc định tắt).

- `fap-parser.js`: phân tích trang `fap.fpt.edu.vn/Report/Grade` (học kỳ, môn, bảng điểm, trạng thái). Hàm thuần, kiểm thử được với HTML lưu sẵn.
- `fap.js`: chạy trên `fap.fpt.edu.vn`. Dùng phiên đăng nhập FAP của chính sinh viên để đọc điểm từng môn (có nghỉ giữa các yêu cầu), lưu vào `chrome.storage.local`. Gặp trang Cloudflare hoặc trang đăng nhập thì nhắc sinh viên hoàn thành kiểm tra, đăng nhập rồi mở lại Báo cáo điểm.
- `site.js`: cầu nối với website. Website công bố công tắc qua `data-fepass-grade-sync`; tiện ích trả điểm qua sự kiện `fepass:grades` (chuỗi JSON) và website đang đăng nhập tự gửi lên `POST /grades/sync`. Tiện ích không giữ token, không tự gọi API bằng tài khoản người dùng.
- Lịch thi: `parseExamSchedule` đọc trang `fap.fpt.edu.vn/ExamSchedule` (mở thẳng trang đó hoặc đọc kèm lúc đồng bộ điểm). Loại thi FE, PE, 2NDFE; 2NDFE là lượt thi lần 2 (thi lại hoặc thi cải thiện); qua hay trượt chỉ xem ở bảng điểm, không suy ra từ lịch thi.
- Tắt công tắc: tiện ích xoá điểm đã đọc, server xoá điểm đã lưu.

Điểm cần đạt tính ở backend (`backend/src/utils/grade-advice.ts`) từ điểm thành phần, trọng số, `MinAvgMarkToPass` và điều kiện của bài thi cuối kỳ lấy từ syllabus (crawler `tools/flm-crawler`). Phần thi lại (Resit) thay cho lần trước.

## Quyền riêng tư

Tiện ích không đọc nội dung bài viết ngoài tiêu đề/nhãn, không lưu tài khoản hay mật khẩu. Trên FuOverflow chỉ gọi một endpoint công khai để lấy giá. Điểm FAP chỉ được đọc khi sinh viên bật đồng bộ, và chỉ gửi lên tài khoản fepass.top của chính họ.

## Chạy thử với máy local

Mở popup > Nâng cao, đặt **Địa chỉ website** `http://localhost:5173` và **Địa chỉ API** `http://localhost:8000` (đổi theo cổng backend của bạn), bấm Lưu. Nút trên FuOverflow sẽ trỏ về website local.

## Đưa lên Chrome Web Store (tùy chọn)

Cần tài khoản nhà phát triển và một trang chính sách quyền riêng tư. Đóng gói bằng cách nén **nội dung** thư mục này (không nén cả thư mục cha). Không cần build.
