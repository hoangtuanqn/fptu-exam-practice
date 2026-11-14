# Trang xem đề (chỉ đọc) - thiết kế ngắn

Ngày: 2026-11-14. Nhánh: `feat/exam-view-page` (từ `main`). Trạng thái: đã duyệt (2026-11-14), địa chỉ đổi thành tiếng Anh theo yêu cầu.

## Ý định

"Mở đề" ở trang "Câu đã lưu" (và từ Kho đề) hiện chỉ đưa vào màn hình luyện tập, nơi phải chọn chế độ luyện hoặc thi rồi mới thấy đề. Người dùng chỉ muốn **xem đề**, không muốn bắt đầu làm bài.

## Mục tiêu / không phải mục tiêu / phản mục tiêu

- Mục tiêu: một trang chỉ đọc hiển thị cả đề (ảnh từng câu, đáp án, chủ đề); lưu/bỏ lưu từng câu; nhảy tới câu bất kỳ; từ trang này sang làm bài khi muốn.
- Không phải mục tiêu: chọn đáp án, chấm điểm, đồng hồ, lịch sử làm bài, giải thích AI, báo cáo đáp án.
- Phản mục tiêu: thành một chế độ luyện tập thứ hai; lộ đáp án giả "A" của đề chưa có đáp án thật; lộ đề cho người không có đề trong kho.

## Hướng đã chọn (một hướng hợp lý)

Trang frontend mới, **không đổi backend**: dùng endpoint sẵn có `GET /exams/thread/:threadId` (đã kiểm tra quyền: chỉ chủ kho đề hoặc admin xem được, người khác nhận 404). Không làm thêm "chế độ chỉ xem" trong màn luyện tập vì nó kéo theo hộp chọn chế độ, đồng hồ và chấm điểm không cần cho việc xem.

## Thiết kế

- **Địa chỉ:** `/exam/:threadId/view` (tiếng Anh như các địa chỉ khác). Tham số `?q=N` cuộn tới câu N và làm nổi bật câu đó khoảng vài giây. Công khai như `/exam/:threadId` (khách xem được đề trong kho của chính họ); đề không nằm trong kho thì hiện thông báo "Không tìm thấy đề trong kho của bạn" kèm nút về trang chủ / Kho đề.
- **Đầu trang:** tên đề, số câu, nút **"Làm bài ngay"** (dẫn tới `/exam/:threadId` như cũ), công tắc **"Hiện đáp án"** (mặc định bật, nhớ lựa chọn trong trình duyệt). Công tắc chỉ có tác dụng khi đề có đáp án thật (`answerStatus` là AI hoặc MANUAL); ngược lại ẩn công tắc và hiện ghi chú "Đề này chưa có đáp án".
- **Thân trang:** các câu xếp một cột; mỗi câu một thẻ: "Câu N", chip chủ đề, ảnh rộng vừa chiều ngang tải lười, dòng "Đáp án: A C" (khi bật và có đáp án thật), nút **lưu / bỏ lưu** (chỉ khi đã đăng nhập, dùng API câu đã lưu sẵn có). Tài liệu tham khảo (`isReference`) nằm riêng ở đầu trang.
- **Nhảy tới câu:** máy tính: hàng số câu cố định (sticky) ở đầu; điện thoại: một nút "Câu" mở bảng số câu (dùng lại kiểu bảng sẵn có nếu gọn).
- **Đề còn đang lấy về** (số câu nhận được ít hơn tổng): hiện thanh "Đề đang được lấy về…" và thêm câu mới khi về (dùng lại `useExamQuestionsLive`).
- **Lối vào:** "Mở đề" ở `/account/saved` chuyển sang `/exam/:threadId/view?q=N`; Kho đề (tab "Của tôi", máy tính và điện thoại) thêm nút "Xem đề" cạnh việc mở để làm.
- Giao diện tiếng Việt; thẻ gọn, một cột trên điện thoại; không phím tắt mới.

## Do người xây quyết định

Tên file/thư mục (đề xuất `features/exam-view/`), cách dựng thanh số câu, bố cục điện thoại, kiểu hiệu ứng làm nổi bật, mục `seo.config.ts` cho địa chỉ động (xem `check-seo.mjs`), và chỗ ẩn/hiện các nút nổi (chat, điểm danh) trên đường dẫn `/exam/`.

## Quyết định tạm của tôi

- Công tắc "Hiện đáp án" mặc định bật.
- Chỉ frontend, không migration, không đổi API.
