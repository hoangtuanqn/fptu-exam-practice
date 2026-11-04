# Prompt AI: hai bộ tách riêng, mỗi bộ theo module

```
prompts/
  solve/                  AI tìm đáp án cho CẢ ĐỀ (nhiều ảnh, trả JSON theo schema)
    base.md               vai trò + nguyên tắc chung, đúng với MỌI môn (ngắn, mục tiêu < 400 từ)
    modules/
      _default.md         dùng khi không xác định được môn
      <MÃ MÔN>.md         mỗi môn đặc thù một file (MAD101.md ...)
    features/
      web-search.md       chỉ ghép khi admin bật tra web
  explain/                AI giải thích MỘT câu (một ảnh, trả Markdown tiếng Việt, định dạng khác hẳn)
    base.md               vai trò, đầu vào và định dạng lời giải thích
    modules/
      _default.md         thân rỗng = không thêm gì
      <MÃ MÔN>.md         luật riêng cho lời giải thích của môn (MAD101: vẽ đồ thị bằng DOT)
src/prompts/index.ts      loader: chọn module và ghép prompt cho từng việc
```

Hai việc dùng **hai lời gọi và hai prompt riêng**: lời gọi giải thích không tốn token cho luật giải 50 câu, lời gọi giải
đề không mang định dạng giải thích. Luật chỉ đúng với một việc (hoặc một môn) thì nằm đúng chỗ của nó, nên môn nào không cần
thì không tốn token (ví dụ luật vẽ đồ thị chỉ có trong `explain/modules/MAD101.md`).

## Cách hoạt động
- **Chọn module** (`resolveModuleKey(việc, ...)`), theo thứ tự: giá trị truyền tường minh (`solveExam({ moduleKey })`) → mã môn ở đầu
  tiêu đề đề thi bằng regex (`MAD101 - SU26 - RE` → `MAD101`) → `_default`. Không gọi AI để chọn. Môn chưa có file của việc đó thì
  dùng `_default` và ghi cảnh báo một lần.
- **Ghép prompt** (`buildSystem(việc, mã)`): mảng `system` theo thứ tự cố định `base` (cache 1 giờ) → `module` (bỏ qua nếu thân rỗng)
  → `features` (nếu bật).
- File được đọc **một lần lúc khởi động**; sửa prompt thì triển khai lại. Thiếu file hoặc front-matter sai thì server báo lỗi ngay.
- `system` **chỉ chứa nội dung tĩnh**. Ngày giờ, ID, tiêu đề đề, bình luận... đều nằm trong `messages` (nếu không, prompt cache hỏng).
  Loader từ chối prompt có chuỗi giống ngày giờ, UUID hay `{{biến}}`.

## Việc nào ở đâu
| Loại | Ở đâu |
|---|---|
| Kiểm tra được bằng logic xác định (định dạng, chuẩn hoá, đếm) | **Code**: `parseOutput`, `tallyOfComments`, kiểm tra đủ câu, thử lại câu thiếu |
| Ràng buộc cấu trúc output của việc giải đề | **Schema** (structured outputs) trong `exam-solver.service.ts` |
| Phán đoán, đúng với mọi môn | `<việc>/base.md` |
| Phán đoán, chỉ đúng với một môn | `<việc>/modules/<MÃ>.md` |

## Thêm một môn
1. Tạo `solve/modules/<MÃ MÔN>.md` (mã in hoa) và/hoặc `explain/modules/<MÃ MÔN>.md`, có front-matter `key` (trùng tên file),
   `description`, `version`, `updated`. Môn chỉ cần module cho việc nào thì tạo cho việc đó.
2. Nội dung: ưu tiên **3-5 ví dụ** (input → cách xử lý đúng → output) và tối đa **5 luật ngắn** thật sự đặc thù. Không lặp lại `base.md`.
3. Thử với vài đề thật của môn đó, xem báo cáo của AI và log `[ai] usage ...`.

## Quy trình sửa prompt
- **Chỉ thêm luật mới khi có một lỗi cụ thể làm AI sai.** Ưu tiên thêm ví dụ hơn thêm luật.
- Định kỳ xem lại và xoá luật không còn cần thiết, để prompt không phình ra.
- Tăng `version` và `updated` trong front-matter khi sửa.

## Prompt caching (Anthropic)
- Thứ tự tiền tố: tools → system → messages. Đổi ở tầng nào thì tầng đó và mọi tầng sau mất cache; giữ `base` thật ổn định.
- Tối đa 4 breakpoint `cache_control` mỗi request (ở đây dùng tối đa 3).
- Block dưới ngưỡng cache tối thiểu của model (512 token với các model 5.5) **không được cache và không báo lỗi**. Tiền tố tính cộng dồn nên
  `base + module` thường đủ ngưỡng.
- Mỗi lượt giải đề ghi log `[ai] usage ...` gồm `cache_read` và `cache_write`. Thấy cả hai bằng 0 là prompt không được cache.
