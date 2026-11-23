# FePass: tiện ích Chrome đồng bộ điểm FAP

Đồng bộ điểm và lịch thi trên FAP (khi sinh viên tự bật) để fepass.top gợi ý điểm cần đạt cho từng môn.

## Cài đặt (chế độ nhà phát triển)

1. Mở `chrome://extensions`, bật **Developer mode** (góc trên bên phải).
2. Bấm **Load unpacked** và chọn thư mục `chrome-extension` này.

Sửa code xong chỉ cần bấm nút tải lại (⟳) ở thẻ tiện ích trong `chrome://extensions`.

## Cách hoạt động

| File | Việc |
|---|---|
| `manifest.json` | Manifest V3. Chạy trên `fap.fpt.edu.vn` và fepass.top; quyền: `storage`, `alarms`, và gọi API `api.fepass.top` (cùng `localhost` để chạy thử). |
| `background.js` | Kiểm tra bản mới mỗi ngày và cập nhật dấu “!” trên biểu tượng. |
| `popup.html/js/css` | Popup: thẻ Điểm FAP (trạng thái, nút Đồng bộ ngay, xoá dữ liệu đã đọc); mục “Nâng cao” để trỏ sang môi trường local. |
| `shared.js` | Cấu hình mặc định + kiểm tra địa chỉ (chỉ `https`, hoặc `http://localhost`). |

## Đồng bộ điểm FAP (từ bản 1.4.0)

Chỉ hoạt động khi sinh viên tự bật **Đồng bộ điểm FAP** ở trang *Điểm FAP* trên fepass.top (mặc định tắt).

- `fap-parser.js`: phân tích trang `fap.fpt.edu.vn/Report/Grade` (học kỳ, môn, bảng điểm, trạng thái). Hàm thuần, kiểm thử được với HTML lưu sẵn.
- `fap.js`: chạy trên `fap.fpt.edu.vn`. Dùng phiên đăng nhập FAP của chính sinh viên để đọc điểm từng môn (có nghỉ giữa các yêu cầu), lưu vào `chrome.storage.local`. Gặp trang Cloudflare hoặc trang đăng nhập thì nhắc sinh viên hoàn thành kiểm tra, đăng nhập rồi mở lại Báo cáo điểm.
- `site.js`: cầu nối với website. Website công bố công tắc qua `data-fepass-grade-sync`; tiện ích trả điểm qua sự kiện `fepass:grades` (chuỗi JSON) và website đang đăng nhập tự gửi lên `POST /grades/sync`. Tiện ích không giữ token, không tự gọi API bằng tài khoản người dùng.
- Lịch thi: `parseExamSchedule` đọc trang `fap.fpt.edu.vn/ExamSchedule` (mở thẳng trang đó hoặc đọc kèm lúc đồng bộ điểm). Loại thi FE, PE, 2NDFE; 2NDFE là lượt thi lần 2 (thi lại hoặc thi cải thiện); qua hay trượt chỉ xem ở bảng điểm, không suy ra từ lịch thi.
- Tắt công tắc: tiện ích xoá điểm đã đọc, server xoá điểm đã lưu.

Điểm cần đạt tính ở backend (`backend/src/utils/grade-advice.ts`) từ điểm thành phần, trọng số, `MinAvgMarkToPass` và điều kiện của bài thi cuối kỳ lấy từ syllabus (crawler `tools/flm-crawler`). Phần thi lại (Resit) thay cho lần trước.

### Từ bản 1.5.0

- **Đồng bộ ngay** (popup): gửi tin `fepass:sync` cho tab FAP đang mở; nếu không phải trang Báo cáo điểm thì mở `Report/Grade#fepass-sync` (địa chỉ có `#fepass-sync` làm `fap.js` đọc ngay, bỏ qua giới hạn 30 phút). Không cần thêm quyền nào.
- Tiến độ và kết quả nằm trong `chrome.storage.local.fapSync` (`state`: running, done, error), popup tự cập nhật.
- Thông báo trên FAP vẽ bằng Shadow DOM (CSS của FAP không ảnh hưởng). Nút ✕ lưu `fapNoticeUntil` (24 giờ) để ẩn; lỗi và tiến độ vẫn hiện khi sinh viên chủ động bấm Đồng bộ ngay.
- `site.js` đọc thời điểm website đã gửi điểm (`localStorage fepass.grades.uploadedAt`) và lưu `fapUploadedAt` để popup hiện “Đã gửi lên FePass”.
- `background.js`: dấu “!” trên biểu tượng khi có bản mới hoặc điểm đã đọc quá 14 ngày.
- **Công tắc đồng bộ trong popup:** extension không có token nên không tự đổi cài đặt trên máy chủ. Popup gửi tin `fepass:set-sync` tới tab fepass.top đang mở; `site.js` phát sự kiện `fepass:set-sync` cho website (`GradeBridgeHost`), website gọi API rồi trả `fepass:set-sync-result`. Không có tab nào trả lời thì popup mở `/account/grades?sync=on|off` và website hỏi xác nhận. Tắt luôn có bước xác nhận vì dữ liệu đã lưu bị xoá.
- Website chạy cầu nối ở mọi trang (không chỉ trang Điểm FAP), nên điểm tự gửi lên khi có bất kỳ tab FePass nào đang mở.

## Quyền riêng tư

Tiện ích không lưu tài khoản hay mật khẩu. Điểm FAP chỉ được đọc khi sinh viên bật đồng bộ, và chỉ gửi lên tài khoản fepass.top của chính họ.

## Chạy thử với máy local

Mở popup > Nâng cao, đặt **Địa chỉ website** `http://localhost:5173` và **Địa chỉ API** `http://localhost:8000` (đổi theo cổng backend của bạn), bấm Lưu. Tiện ích sẽ làm việc với website local.

## Đưa lên Chrome Web Store (tùy chọn)

Cần tài khoản nhà phát triển và một trang chính sách quyền riêng tư. Đóng gói bằng cách nén **nội dung** thư mục này (không nén cả thư mục cha). Không cần build.
