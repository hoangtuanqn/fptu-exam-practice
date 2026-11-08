# Tiện ích lấy danh sách đề từ FuOverflow

> Hướng dẫn đầy đủ từ lấy dữ liệu đến nhập vào DB: [../HUONG-DAN.md](../HUONG-DAN.md)

Công cụ nội bộ (không nằm trong bản phát hành FEPass). Duyệt từng môn trên `fuoverflow.com` và **chỉ lấy các bài có nhãn "Đề Thi FE"** (các nhãn khác như Đề Thi PE bị bỏ): tên đề, ngày đăng, số trả lời. Không tải ảnh đề, không lấy bình luận. Kết quả xuất ra một file JSON để nhập vào FEPass (`npm run import:fuo-catalog`), nhờ đó mục **Kho đề > Theo môn** hiện được toàn bộ đề có trên FuOverflow. Ảnh chỉ được lấy thật khi người dùng bấm lấy đề và đồng ý trừ phí.

Chạy thủ công, lâu lâu một lần (ví dụ đầu mỗi kỳ hoặc khi cần thêm đề mới).

## Cài
1. Mở `chrome://extensions`, bật **Chế độ cho nhà phát triển**.
2. Bấm **Tải tiện ích đã giải nén** và chọn thư mục `tools/fuo-crawler`.

## Dùng
1. Mở https://fuoverflow.com ở một tab (đăng nhập nếu cần; nếu hiện trang kiểm tra Cloudflare thì vượt qua).
2. Bấm biểu tượng tiện ích, trang công cụ mở ra trong tab mới.
3. Bấm **Nạp danh sách môn của FEPass** (hoặc tự nhập mã môn), rồi **Bắt đầu lấy**.
4. Xong bấm **Tải JSON**.

Kết quả lưu trong trình duyệt nên tải lại trang không mất, và lần chạy sau tự bỏ qua môn đã có kết quả (tick **Lấy lại** nếu muốn làm mới). Có thể bấm **Dừng** rồi chạy tiếp lúc khác.

## Nhập vào DB
```
cd backend
npm run import:fuo-catalog -- đường/dẫn/fuo-catalog-2026-11-09.json --dry-run   # xem trước
npm run import:fuo-catalog -- đường/dẫn/fuo-catalog-2026-11-09.json             # ghi thật
```

## Dạng JSON
```
{ "source", "exportedAt", "subjects": [ {
  "code", "forumUrl", "pages", "truncated",
  "scanned",   // số bài đã quét (mọi nhãn)
  "threads": [ { "threadId", "title", "prefix": "Đề Thi FE", "postedAt", "replies" } ]   // chỉ đề FE
} ] }
```

## Lưu ý
- Chạy song song có kiểm soát: nhiều môn được lấy cùng lúc, các trang page-2, page-3... của một môn cũng tải cùng lúc. Ô **Song song** (1 đến 6, mặc định 3) là số yêu cầu tối đa đang chạy cùng lúc; hai yêu cầu bắt đầu cách nhau tối thiểu 0,15 giây. Với mặc định 3, lần đầu cho 356 môn mất khoảng 15 đến 30 phút (trước đây một đến hai giờ). Tăng cao hơn thì nhanh hơn nhưng dễ bị FuOverflow chặn; không nên quá 4.
- FuOverflow báo quá tải (429/503) thì tự giảm một nửa số yêu cầu song song và thử lại có chờ. Bị chặn hẳn (403 hoặc trang Cloudflare) thì dừng tất cả; các môn đã xong vẫn được giữ.
- Bộ phân tích (`parser.js`) dùng cùng bộ chọn với backend (`.structItem--thread`...), đã thử bằng trang mẫu. Nếu FuOverflow đổi giao diện, chỉ cần sửa file này.
- `codes.js` là danh sách mã môn của FEPass lấy từ `frontend/seo.subjects.json`. Tạo lại khi có thêm môn:
  `node -e "const l=require('./frontend/seo.subjects.json').map(s=>s.code);require('fs').writeFileSync('tools/fuo-crawler/codes.js','window.FEPASS_SUBJECT_CODES = '+JSON.stringify(l)+';\n')"` (chạy ở thư mục gốc dự án).
