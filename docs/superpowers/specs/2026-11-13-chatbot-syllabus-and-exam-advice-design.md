# Nâng cấp chatbot Cóc Pass: trả lời syllabus đầy đủ và tư vấn đề gần đây

Ngày: 2026-11-13. Quy mô: vừa (chỉ backend). Cách làm đã chọn: **A, chỉnh tại chỗ, giữ Haiku 5.5**.

## Mục đích

Người học hỏi Cóc Pass về syllabus của một môn (cách tính điểm, chương, tài liệu...) thì phải được trả lời rõ và đủ.
Người sắp thi một môn hỏi "nên học đề nào" thì bot liệt kê **các đề gần đây của môn đó** (lời của chủ dự án: "sẽ trả lời những đề PRO192 gần đây").
Mạnh hơn nhưng không làm chi phí tăng đáng kể.

## Mục tiêu / không phải mục tiêu / điều làm hỏng mục tiêu

- Mục tiêu: (1) câu hỏi syllabus được trả lời đủ ý, dạng danh sách/bảng khi cần; (2) hỏi đề gần đây thì có danh sách đề mới nhất kèm trạng thái trong FEPass và link; (3) chi phí trung bình mỗi lượt chat tăng không quá khoảng 15% token vào.
- Không làm: đổi model, bộ định tuyến hai tầng, "thẻ môn" dựng sẵn, thống kê tần suất chủ đề, giảng kiến thức môn (rule 2 giữ nguyên).
- Hỏng nếu: câu hỏi hướng dẫn dùng FEPass bỗng dài ra hoặc đắt hơn; bot khuyên một đề mà dữ liệu không có; bot bịa ngày hoặc điểm.

## Hiện trạng (đã đọc code)

- Model `claude-haiku-5-5`, effort `low`, trần 2000 token ra, prompt hệ thống được cache, cache câu trả lời theo ý (không dùng cho syllabus).
- Syllabus: tìm BM25 + vector (`syllabus-rag.service.ts`), khi biết môn lấy 3 đến 5 đoạn, tối đa 9.000 ký tự. Có sẵn loại đoạn `assessment` ("Cách đánh giá") và nhận diện ý định "cách tính điểm".
- Prompt dặn "thường dưới 120 từ, không tiêu đề": mâu thuẫn với yêu cầu trả lời đầy đủ.
- Công cụ `find_fuo_exams` cào FuOverflow trực tiếp mỗi lần (chậm, tới 15 trang), không biết đề nào đã có trong FEPass.
- `catalogService.exams(code, query, userId)` đã gộp danh mục FuOverflow (bảng `fuo_threads`) với đề hệ thống: có kỳ (`term`), trạng thái `owned/ready/fetch`, số câu, giá lấy đề, sắp mới nhất trước. Chính là dữ liệu cần cho tư vấn.

## Các cách đã cân nhắc

- A. Chỉnh tại chỗ, giữ Haiku (được chọn): sửa prompt, ưu tiên đúng đoạn syllabus, công cụ đọc DB. Chi phí gần như không đổi.
- B. Hai tầng model (Haiku + Sonnet 5.5): chất lượng cao hơn nhưng đắt khoảng 20 lần cho các câu đó, cần bộ phân loại. Để dành, chỉ bật nếu đo thấy Haiku chưa đủ.
- C. "Thẻ môn" dựng sẵn bằng model mạnh một lần: ổn định, rẻ về sau, nhưng việc lớn hơn và phải cập nhật khi syllabus đổi. Cân nhắc sau nếu câu hỏi điểm thành phần vẫn chưa đạt.

## Thiết kế

1. **Công cụ mới `recent_exams`** (backend `chat-tools.service.ts`): nhận `subject` (mã môn), `limit` (mặc định 6, tối đa 10). Gọi `catalogService.exams` (không cào web). "Gần đây" = đề của kỳ hiện tại và kỳ liền trước (cùng quy tắc nhãn "Đề mới": SP tháng 1-4, SU 5-8, FA 9-12, giờ Việt Nam). Trả mảng gọn `[tiêu đề, kỳ, trạng thái, số câu, ngày đăng, link]`, kèm `price` và tổng số đề. Link: đề `ready`/`owned` dẫn `/exam/{threadId}`; đề `fetch` dẫn Kho đề của môn (`/account/exams?tab=subject&subject=CODE`). Không có đề nào trong hai kỳ gần nhất thì trả vài đề mới nhất có kèm ghi chú "không có đề kỳ gần đây". Hàm `isRecentTerm` đặt ở `backend/src/utils/term.ts` (bản backend của logic frontend `term.ts`), có test.
2. **`find_fuo_exams` giữ lại** nhưng mô tả thu hẹp: chỉ dùng cho đề PE, đề cũ hơn, hoặc khi người dùng đòi danh sách đầy đủ ("slow, live"). Prompt dặn ưu tiên `recent_exams` cho "sắp thi", "đề gần đây", "đề mới".
3. **Prompt** (`constants/chat.ts`): câu hỏi syllabus được trả lời đầy đủ, được dùng danh sách hoặc bảng markdown, nêu mã môn và phần đã dùng; câu hướng dẫn FEPass vẫn ngắn như cũ. Thêm quy tắc tư vấn đề: gọi `recent_exams`, xếp mới nhất trước, nói rõ đề nào mở ngay và đề nào tốn credit, không giảng kiến thức, không đoán điểm hay ngày. Cập nhật câu trạng thái công cụ ("Đang xem các đề gần đây của môn...").
4. **Ưu tiên đoạn syllabus**: đo trước bằng `scripts/eval-rag.ts` và vài câu thật. Chỉ nếu đoạn `assessment` không nằm trong các đoạn được chọn khi hỏi cách tính điểm thì mới ghim nó lên đầu (trong ngân sách đoạn cũ). Nếu đã đúng rồi thì bỏ qua bước này.
5. **Theo dõi chi phí**: `chatLog` đã ghi `inputTokens/outputTokens/cacheReadTokens/truncated`. Ghi lại trung bình trước khi sửa và sau vài ngày để so.

## Việc để lại cho người làm

- Chọn giới hạn token ra (đang 2000, có cơ chế cho viết tiếp một lần); tăng nếu thấy `truncated` nhiều ở câu syllabus.
- Chi tiết văn bản prompt và câu trạng thái.
- Chưa kiểm tra: nội dung thật của đoạn `assessment` các môn, và độ mới của bảng `fuo_threads` (được nhập bằng công cụ crawler, có thể cũ hơn danh sách trực tiếp).

## Kiểm chứng

- Test đơn vị cho `isRecentTerm` và hàm chọn đề (kỳ hiện tại, kỳ trước, không có đề gần đây, đề không có kỳ).
- Bộ khoảng 8 câu hỏi mẫu chạy tay trên máy dev: cách tính điểm một môn, các chương, tài liệu, "sắp thi PRO192 nên học đề nào", môn không tồn tại, mã gõ nhầm, câu hướng dẫn FEPass (phải vẫn ngắn), khách chưa đăng nhập.
- `tsc` backend và toàn bộ test backend.
- Triển khai chỉ backend, không đổi API công khai.
