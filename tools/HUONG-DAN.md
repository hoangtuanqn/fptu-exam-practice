# Hướng dẫn dùng công cụ lấy syllabus (extension) và nhập vào hệ thống

Có **một extension nội bộ** trong thư mục `tools/`: `tools/flm-crawler`. Nó chạy trên trình duyệt của bạn, lấy **syllabus** của từng môn (tên môn, các chương, chủ đề, điểm trung bình tối thiểu để qua môn và các phần đánh giá) từ flm.fpt.edu.vn (cần đăng nhập FLM) về **file JSON** `flm-syllabus-YYYY-MM-DD.json`, rồi bạn **nhập file đó vào DB** bằng `npm run import:syllabus`. Không có gì tự chạy; chỉ chạy khi bạn cần.

> Lệnh `npm run ...` luôn chạy trong thư mục **`backend`**. Dùng Git Bash hoặc PowerShell đều được.
> Lệnh nhập **chạy lại an toàn nhiều lần** và có chế độ `--dry-run` để xem trước mà không ghi gì.

---

## 1. Cài extension (làm một lần)

1. Mở Chrome, vào `chrome://extensions`.
2. Bật **Chế độ cho nhà phát triển** (góc phải trên).
3. Bấm **Tải tiện ích đã giải nén** (Load unpacked), chọn thư mục `tools/flm-crawler`.
4. Bấm biểu tượng mảnh ghép trên thanh Chrome, ghim extension cho dễ thấy.

Sửa code extension xong thì bấm nút làm mới (vòng tròn) ở thẻ extension trong `chrome://extensions`.

---

## 2. Lấy syllabus FLM (extension `flm-crawler`)

Dùng khi nhập môn mới hoặc syllabus đổi (hiếm). Syllabus cho biết **chương và chủ đề** của từng môn, để gắn chủ đề cho câu hỏi và hiện trang SEO của môn. Từ bản này file còn có `minAvgMarkToPass` và `assessments` (điều kiện bài thi cuối kỳ) để gợi ý điểm cần đạt cho sinh viên đã bật đồng bộ điểm FAP; nhập lại syllabus các môn để có số liệu này.

1. Đăng nhập https://flm.fpt.edu.vn ở một tab (FLM chặn máy chủ nên bắt buộc dùng trình duyệt của bạn).
2. Bấm biểu tượng extension **Lấy syllabus từ FLM**, tab công cụ mở ra.
3. Nhập mã môn (cách nhau bằng dấu cách, dấu phẩy hoặc xuống dòng), bấm **Bắt đầu lấy**. Chỉ lấy môn có Subject Code **trùng hoàn toàn** (OSG202 sẽ không lấy OSG202c). Mỗi môn nghỉ 0,7 giây giữa các yêu cầu.
4. Bấm **Tải JSON** (hoặc **Sao chép JSON**). File tên `flm-syllabus-YYYY-MM-DD.json`.
5. Nhập vào DB :
```
cd backend
npm run import:syllabus -- ../flm-syllabus-2026-11-08.json --dry-run
npm run import:syllabus -- ../flm-syllabus-2026-11-08.json
```
Nhập lại một môn thì các chương được **đồng bộ đúng theo file** (chương không còn trong file bị xóa). Môn nào sai định dạng thì bị bỏ qua và báo, không ảnh hưởng môn khác. Trên VPS: đưa file lên rồi chạy cùng lệnh trong thư mục `backend` (xem `deploy-checklist`).

### Việc làm tiếp sau khi có syllabus mới
1. **Gắn chủ đề cho câu hỏi** (dùng AI, tốn một ít token Claude). Đề mới lấy về được gắn tự động; còn đề cũ thì chạy tay:
```
cd backend
npm run label:topics -- --sample 20     # chạy thử 20 câu, chỉ IN kết quả để xem, không ghi DB
npm run label:topics -- --exam 12       # gắn cho đề có id 12 (ghi DB)
npm run label:topics -- --all           # gắn cho mọi đề (chỉ câu chưa có nhãn)
```
Nên chạy `--sample` trước để xem nhãn có hợp lý không.

2. **Cập nhật trang SEO cho từng môn** (`/mon/<mã>`): sinh lại danh sách môn rồi build lại web.
```
cd backend
npm run export:subjects      # ghi lại frontend/seo.subjects.json từ DB
```
Sau đó commit file `frontend/seo.subjects.json`, chạy `release.cmd` ở thư mục gốc, upload file zip lên hosting và Purge Cloudflare như mọi lần deploy frontend. Muốn đủ mọi môn thì chạy lệnh `export:subjects` với DB đã có đủ syllabus (DB web thật).

---

## 3. Xử lý sự cố

- **Extension không thấy biểu tượng / không mở được tab công cụ:** vào `chrome://extensions`, kiểm tra extension đang bật, bấm làm mới.
- **Bị chặn (mã 403/429/503):** mở flm.fpt.edu.vn ở một tab, đăng nhập, rồi chạy lại. Thử lại sau vài phút.
- **Import báo "Không thấy file":** đường dẫn sai. Dùng đường dẫn tương đối từ thư mục `backend` (ví dụ `../flm-syllabus-....json`) hoặc đường dẫn đầy đủ trong ngoặc kép.
- **`prisma generate` báo EPERM trên Windows:** backend dev đang chạy và giữ file. Tắt backend dev rồi chạy lại.
- **Nhập xong mà web không đổi:** chờ tối đa 5 phút (cache), hoặc khởi động lại backend.

## 4. Lưu ý

- File JSON chứa dữ liệu công khai (mã môn, chương), không có mật khẩu hay khóa nào. Dù vậy **đừng commit** vào git.
- Extension dùng phiên đăng nhập sẵn có trong trình duyệt của bạn, không lưu mật khẩu ở đâu cả.
