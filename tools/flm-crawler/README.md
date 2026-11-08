# Tiện ích lấy syllabus từ FLM

Công cụ nội bộ (không nằm trong bản phát hành FEPass). Lấy tên môn và các chương (kèm chủ đề trong chương) của từng môn từ `flm.fpt.edu.vn` bằng phiên đăng nhập FLM sẵn có trong trình duyệt của bạn. FLM chặn Cloudflare nên không gọi được từ máy chủ, chỉ gọi được từ trình duyệt.

## Cài
1. Mở `chrome://extensions`, bật **Chế độ cho nhà phát triển**.
2. Bấm **Tải tiện ích đã giải nén** và chọn thư mục `tools/flm-crawler`.

## Dùng
1. Đăng nhập FLM ở một tab (https://flm.fpt.edu.vn).
2. Bấm biểu tượng tiện ích, trang công cụ mở ra trong tab mới.
3. Nhập mã môn (cách nhau bằng dấu cách, dấu phẩy hoặc xuống dòng), bấm **Bắt đầu lấy**.
4. Xong bấm **Tải JSON** (hoặc **Sao chép JSON**).

Kết quả được lưu trong trình duyệt, tải lại trang không mất. Môn đã lấy xong sẽ được bỏ qua ở lần chạy sau, trừ khi tick **Lấy lại**.

## Cách chọn môn
Tìm theo mã (`searchOn=Code`) rồi chỉ giữ dòng có Subject Code **trùng hoàn toàn** với mã đã nhập (không phân biệt hoa thường), nên `OSG202` không lấy `OSG202c`. Nếu có nhiều syllabus cùng mã, chọn bản đang dùng và đã duyệt, rồi tới quyết định mới nhất.

## Dạng JSON (chỉ phần cần dùng)
```
{ "source", "exportedAt", "subjects": [ {
  "code", "syllabusId", "subjectName",
  "chapters": [ { "number", "title", "topics": ["1.1. What is an operating system", "..."] } ]
} ] }
```
`chapters` được suy ra từ cột Topic của lịch học ("Chapter N: Tên" mở chương mới, các dòng "N.M ..." thuộc chương N). Không lấy lịch học từng buổi, CLO, đánh giá hay tài liệu.

## Lưu ý
- Giữa hai yêu cầu nghỉ 0,7 giây để không dồn tải lên FLM. Chưa đăng nhập hoặc bị Cloudflare chặn thì dừng ngay và báo rõ.
- Bộ phân tích (`parser.js`) đã thử với trang tìm kiếm và trang chi tiết của OSG202. Nếu FLM đổi giao diện, chỉ cần sửa file này.
