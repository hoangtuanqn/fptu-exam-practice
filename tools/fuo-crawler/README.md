# Tiện ích lấy danh sách đề từ FuOverflow

Công cụ nội bộ (không nằm trong bản phát hành FEPass). Duyệt từng môn trên `fuoverflow.com` và **chỉ lấy danh sách bài**: tên đề, nhãn (Đề Thi FE / Đề Thi PE), ngày đăng, số trả lời. Không tải ảnh đề, không lấy bình luận. Kết quả xuất ra một file JSON để nhập vào FEPass (`npm run import:fuo-catalog`), nhờ đó mục **Kho đề > Theo môn** hiện được toàn bộ đề có trên FuOverflow. Ảnh chỉ được lấy thật khi người dùng bấm lấy đề và đồng ý trừ phí.

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
  "threads": [ { "threadId", "title", "prefix", "postedAt", "replies" } ]
} ] }
```

## Lưu ý
- Nghỉ 0,5 giây giữa hai yêu cầu để không dồn tải lên FuOverflow. 356 môn, mỗi môn vài trang thì mất khoảng một đến hai giờ ở lần đầu.
- Bị Cloudflare chặn (mã 403/429/503 hoặc trang "Just a moment") thì dừng ngay và báo rõ, các môn đã xong vẫn được giữ.
- Bộ phân tích (`parser.js`) dùng cùng bộ chọn với backend (`.structItem--thread`...), đã thử bằng trang mẫu. Nếu FuOverflow đổi giao diện, chỉ cần sửa file này.
- `codes.js` là danh sách mã môn của FEPass lấy từ `frontend/seo.subjects.json`. Tạo lại khi có thêm môn:
  `node -e "const l=require('./frontend/seo.subjects.json').map(s=>s.code);require('fs').writeFileSync('tools/fuo-crawler/codes.js','window.FEPASS_SUBJECT_CODES = '+JSON.stringify(l)+';\n')"` (chạy ở thư mục gốc dự án).
