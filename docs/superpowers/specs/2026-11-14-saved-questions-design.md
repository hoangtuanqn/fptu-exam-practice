# Lưu câu hỏi để xem lại (thiết kế ngắn)

Ngày: 2026-11-14. Nhánh: `feat/saved-questions` (từ `main`). Trạng thái: đã duyệt (2026-11-14).

## Ý định

Người dùng yêu cầu: lưu lại một câu hỏi để sau này mở ra xem lại. Chỉ đơn giản là **xem lại**, gắn với tài khoản của từng người (kho cá nhân).

Hiện trạng: nút "Đánh dấu xem lại" (phím M) chỉ sống trong một lượt làm bài, hết lượt là mất. "Sổ câu sai" là kho cá nhân khác: chỉ tự nhận câu làm sai và nhắc ôn theo lịch, người dùng không tự thêm câu vào được, gói miễn phí bị giới hạn số câu.

## Mục tiêu / không phải mục tiêu / phản mục tiêu

- Mục tiêu: một nút "Lưu câu này" trong khu vực làm bài; một trang "Câu đã lưu" liệt kê câu đã lưu để xem lại ảnh đề, đáp án đúng và mở lại đề.
- Không phải mục tiêu: ghi chú, thẻ/thư mục, nhắc ôn theo lịch, chia sẻ, xuất file, làm lại câu đã lưu.
- Phản mục tiêu: biến thành một "Sổ câu sai" thứ hai (không lịch ôn, không chấm điểm); làm rối khu vực làm bài vừa được tinh gọn.

## Các hướng đã cân nhắc

- A. **Kho riêng "Câu đã lưu" (được chọn):** một bảng nhỏ + trang xem lại + một mục trong menu "…". Đơn giản, đúng điều người dùng nói, không đụng vào Sổ câu sai.
- B. Giữ lâu dài nút "Đánh dấu xem lại": một khái niệm nhưng lẫn hai nghĩa (đánh dấu tạm trong lượt làm với lưu lâu dài), và đánh dấu trong chế độ Thi sẽ vô tình thành "lưu".
- C. Thêm vào Sổ câu sai: gán lịch ôn và giới hạn gói miễn phí lên thứ người dùng chỉ muốn xem. Loại.

## Thiết kế

**Dữ liệu (thêm mới, migration riêng):** bảng `saved_questions` (id, user_id, exam_id, question_number, created_at), unique `(user_id, exam_id, question_number)`, chỉ số `(user_id, created_at)`, khoá ngoại xoá theo người dùng và đề. Câu được tham chiếu qua `(exam_id, question_number)` nên ảnh, đáp án, chủ đề luôn là bản mới nhất.

**API (thêm mới, đăng nhập):**
- `POST /api/v1/saved-questions` `{examId, questionNumber}` -> `{saved: true}`; lưu lại một câu đã lưu thì không lỗi (idempotent). Chỉ lưu được câu của đề người dùng đã mở (có trong kho đề của họ). Trần cứng 500 câu mỗi người (lỗi tiếng Việt rõ ràng), không hiện cho người dùng.
- `DELETE /api/v1/saved-questions/:examId/:number` -> bỏ lưu.
- `GET /api/v1/saved-questions/exam/:examId` -> số các câu đã lưu của đề đó (để menu hiện "Bỏ lưu").
- `GET /api/v1/saved-questions?page&limit&subject` -> `{id, examId, examTitle, threadId, subjectCode, number, imageUrl, correct: string[], topic, savedAt}`, mới nhất trước; `correct` chỉ có khi đề đã có đáp án thật (AI hoặc chỉnh tay), ngược lại rỗng.

**Giao diện:**
- Khu vực làm bài: mục "Lưu câu này" / "Bỏ lưu câu này" trong menu "…" (biểu tượng đánh dấu trang, có chấm nhỏ ở nút "…" khi câu đã lưu, như câu đang đánh dấu). Khách chưa đăng nhập: không hiện mục này. Toast "Đã lưu câu N".
- Trang `/account/saved` "Câu đã lưu", đặt cạnh "Sổ câu sai" trong menu tài khoản: lọc theo môn, danh sách phân trang; mỗi thẻ có tên đề, "Câu N", chip chủ đề, ảnh đề (bấm để xem to), dòng "Đáp án: A C" nếu có, nút "Mở đề" (dẫn tới đề đó) và "Bỏ lưu" (có xác nhận). Trạng thái trống: hướng dẫn "Mở menu … ở câu hỏi và chọn Lưu câu này". Thích hợp điện thoại (thẻ một cột).
- Chữ trên giao diện tiếng Việt; không nhắc giới hạn.

## Do người xây quyết định

Tên bảng/cột cụ thể, cách lấy `subjectCode` cho bộ lọc môn, cách xem ảnh to (tái dùng cửa sổ phóng to sẵn có nếu gọn), và test.

## Quyết định tạm của tôi (bạn có thể đổi)

- Không giới hạn riêng cho gói miễn phí (chỉ trần cứng 500 để chống lạm dụng), vì lưu một dòng rất rẻ và đây là yêu cầu của người dùng.
- Không thêm phím tắt mới (tránh đụng các phím A–H, M).
- Khách chưa đăng nhập không lưu được.
