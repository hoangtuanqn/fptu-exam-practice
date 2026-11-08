# Hướng dẫn dùng các công cụ lấy dữ liệu (extension) và nhập vào hệ thống

Có **hai extension nội bộ** trong thư mục `tools/`. Chúng chạy trên trình duyệt của bạn, lấy dữ liệu về thành **file JSON**, rồi bạn **nhập file đó vào DB** bằng một lệnh. Không có gì tự chạy; chỉ chạy khi bạn cần (thường đầu mỗi kỳ).

| Extension | Lấy gì | Từ đâu | File JSON | Lệnh nhập vào DB |
|---|---|---|---|---|
| `tools/fuo-crawler` | **Danh sách đề FE** của từng môn (tên đề, ngày đăng). Không tải ảnh | fuoverflow.com | `fuo-catalog-YYYY-MM-DD.json` | `npm run import:fuo-catalog` |
| `tools/flm-crawler` | **Syllabus** của từng môn (tên môn, các chương, chủ đề) | flm.fpt.edu.vn (cần đăng nhập FLM) | `flm-syllabus-YYYY-MM-DD.json` | `npm run import:syllabus` |

Toàn bộ luồng:
```
Extension (trình duyệt)  ->  file .json (máy bạn)  ->  npm run import:...  ->  DB  ->  hiện trên web
```

> Lệnh `npm run ...` luôn chạy trong thư mục **`backend`**. Dùng Git Bash hoặc PowerShell đều được.
> Mọi lệnh nhập đều **chạy lại an toàn nhiều lần** (không nhân đôi dữ liệu) và có chế độ `--dry-run` để xem trước mà không ghi gì.

---

## 1. Cài extension (làm một lần)

1. Mở Chrome, vào `chrome://extensions`.
2. Bật **Chế độ cho nhà phát triển** (góc phải trên).
3. Bấm **Tải tiện ích đã giải nén** (Load unpacked), chọn thư mục `tools/fuo-crawler` (và `tools/flm-crawler` nếu cần syllabus).
4. Bấm biểu tượng mảnh ghép trên thanh Chrome, ghim extension cho dễ thấy.

Sửa code extension xong thì bấm nút làm mới (vòng tròn) ở thẻ extension trong `chrome://extensions`.

---

## 2. Lấy danh sách đề FuOverflow (extension `fuo-crawler`)

Dùng khi muốn **Kho đề > Theo môn** hiện đủ đề có trên FuOverflow (thường đầu mỗi kỳ, hoặc khi thấy thiếu đề mới).

1. Mở https://fuoverflow.com ở một tab. Nếu hiện trang kiểm tra Cloudflare ("Just a moment") thì chờ cho qua. Đăng nhập nếu cần.
2. Bấm biểu tượng extension **FEPass: Lấy danh sách đề từ FuOverflow**. Một tab công cụ mở ra.
3. Bấm **Nạp danh sách môn của FEPass** (điền sẵn mã các môn). Hoặc tự gõ mã môn, cách nhau bằng dấu cách, dấu phẩy hoặc xuống dòng.
4. Chọn ô **Song song** (số yêu cầu gửi cùng lúc, 1 đến 6):
   - Mặc định **3** là hợp lý. Cao hơn thì nhanh hơn nhưng dễ bị FuOverflow chặn, không nên quá 4.
   - Bị báo quá tải thì extension tự giảm. Bị chặn nhiều thì giảm xuống 1 đến 2.
5. Bấm **Bắt đầu lấy**. Bảng bên dưới hiện từng môn: *Đang lấy* → *Xong* (kèm số bài đã quét và số **đề FE** tìm được).
6. Chờ xong (khoảng 15 đến 30 phút cho ~350 môn, ước tính). Có thể bấm **Dừng** rồi chạy tiếp lúc khác: môn đã xong được nhớ, lần sau tự bỏ qua.
7. Bấm **Tải JSON**. Chrome lưu file `fuo-catalog-YYYY-MM-DD.json` vào thư mục Downloads.

Lưu ý:
- Chỉ lấy bài có nhãn **"Đề Thi FE"**. Nhãn khác (Đề Thi PE...) bị bỏ.
- Kết quả được lưu trong trình duyệt, tải lại trang không mất. Tick **Lấy lại cả môn đã có kết quả** nếu muốn làm mới. Nút **Xóa kết quả** xóa sạch để lấy lại từ đầu.
- Môn báo *Không có* nghĩa là FuOverflow không có diễn đàn mã đó. Môn báo *Lỗi* thì bấm **Bắt đầu lấy** lần nữa (chỉ lấy lại môn lỗi).
- Nếu hiện thông báo bị chặn: mở fuoverflow.com ở một tab, vượt kiểm tra Cloudflare, rồi bấm **Bắt đầu lấy** lại. Các môn đã xong vẫn còn.

### Nhập file vào DB

**a) Đặt file ở đâu:** copy file JSON vào thư mục gốc dự án (cạnh `README.md`) cho dễ gõ đường dẫn. **Đừng commit file này lên git.**

**b) Trên máy local (để xem thử, không ảnh hưởng web thật):**
```
cd backend
npm run import:fuo-catalog -- ../fuo-catalog-2026-11-08.json --dry-run    # xem trước, không ghi
npm run import:fuo-catalog -- ../fuo-catalog-2026-11-08.json              # ghi thật
```
Dry-run in ra: số môn trong file, số đề FE hợp lệ, số bài bị bỏ (khác nhãn hoặc sai định dạng), các môn nhiều đề nhất. Lệnh ghi thật in: *đã thêm N đề mới, cập nhật M đề đã có*.

Cần bảng `fuo_threads` đã có trong DB (migration `0037`). Nếu báo lỗi thiếu bảng: tắt backend dev, rồi chạy `npx prisma migrate deploy` và `npx prisma generate` trong `backend`.

**c) Trên web thật (VPS):** DB của web thật nằm trên VPS, nên phải nhập ở đó.
```
# 1. Đưa file lên VPS
scp -i ~/.ssh/fepass -o IdentitiesOnly=yes fuo-catalog-2026-11-08.json fepass@180.93.124.174:~/fuo-catalog.json

# 2. Sao lưu DB rồi xem trước
ssh -i ~/.ssh/fepass -o IdentitiesOnly=yes fepass@180.93.124.174 'cd ~/app && bash deploy/backup-db.sh && cd backend && npm run import:fuo-catalog -- ~/fuo-catalog.json --dry-run'

# 3. Thấy ổn thì ghi thật
ssh -i ~/.ssh/fepass -o IdentitiesOnly=yes fepass@180.93.124.174 'cd ~/app/backend && npm run import:fuo-catalog -- ~/fuo-catalog.json'

# 4. Xóa file tạm trên VPS
ssh -i ~/.ssh/fepass -o IdentitiesOnly=yes fepass@180.93.124.174 'rm -f ~/fuo-catalog.json'
```
Điều kiện: backend trên VPS đã được deploy bản có bảng `fuo_threads` (deploy chạy migrate tự động).

**d) Kiểm tra:** vào web, **Tài khoản > Kho đề > Theo môn**, chọn một môn (ví dụ PRO192) thấy danh sách đề, lọc được theo kỳ. Dữ liệu mới có thể mất tối đa **5 phút** mới hiện (backend nhớ tạm), hoặc ngay khi backend khởi động lại.

Chạy lại nhiều lần được: bài đã có thì cập nhật, bài mới thì thêm. **Không bao giờ xóa** bài nào khỏi DB, nên đề FuOverflow đã gỡ vẫn còn trong danh mục (không ảnh hưởng gì).

---

## 3. Lấy syllabus FLM (extension `flm-crawler`)

Dùng khi nhập môn mới hoặc syllabus đổi (hiếm). Syllabus cho biết **chương và chủ đề** của từng môn, để gắn chủ đề cho câu hỏi và hiện trang SEO của môn.

1. Đăng nhập https://flm.fpt.edu.vn ở một tab (FLM chặn máy chủ nên bắt buộc dùng trình duyệt của bạn).
2. Bấm biểu tượng extension **Lấy syllabus từ FLM**, tab công cụ mở ra.
3. Nhập mã môn (cách nhau bằng dấu cách, dấu phẩy hoặc xuống dòng), bấm **Bắt đầu lấy**. Chỉ lấy môn có Subject Code **trùng hoàn toàn** (OSG202 sẽ không lấy OSG202c). Mỗi môn nghỉ 0,7 giây giữa các yêu cầu.
4. Bấm **Tải JSON** (hoặc **Sao chép JSON**). File tên `flm-syllabus-YYYY-MM-DD.json`.
5. Nhập vào DB (cùng cách như mục 2, chỉ đổi lệnh):
```
cd backend
npm run import:syllabus -- ../flm-syllabus-2026-11-08.json --dry-run
npm run import:syllabus -- ../flm-syllabus-2026-11-08.json
```
Nhập lại một môn thì các chương được **đồng bộ đúng theo file** (chương không còn trong file bị xóa). Môn nào sai định dạng thì bị bỏ qua và báo, không ảnh hưởng môn khác. Trên VPS làm giống phần 2c (scp rồi `ssh ... npm run import:syllabus -- ~/file.json`).

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

## 4. Tóm tắt nhanh

| Việc | Khi nào | Các bước |
|---|---|---|
| Cập nhật danh sách đề FuOverflow | Đầu mỗi kỳ / thấy thiếu đề | Extension `fuo-crawler` → Tải JSON → `import:fuo-catalog` (local rồi VPS) |
| Nhập syllabus môn mới | Có môn mới / syllabus đổi | Extension `flm-crawler` → Tải JSON → `import:syllabus` → `label:topics` → `export:subjects` + build frontend |

## 5. Xử lý sự cố

- **Extension không thấy biểu tượng / không mở được tab công cụ:** vào `chrome://extensions`, kiểm tra extension đang bật, bấm làm mới.
- **Bị chặn (Cloudflare, mã 403/429/503):** mở trang gốc (fuoverflow.com hoặc flm.fpt.edu.vn) ở một tab, vượt kiểm tra, rồi chạy lại. Giảm ô **Song song**. Thử lại sau vài phút.
- **Chạy ra 0 đề ở rất nhiều môn:** có thể FuOverflow đổi giao diện. Cần sửa `tools/fuo-crawler/parser.js` (và báo lại để mình sửa).
- **Import báo "Không thấy file":** đường dẫn sai. Dùng đường dẫn tương đối từ thư mục `backend` (ví dụ `../fuo-catalog-....json`) hoặc đường dẫn đầy đủ trong ngoặc kép.
- **Import báo thiếu bảng `fuo_threads`:** chưa chạy migration. Chạy `npx prisma migrate deploy` (và `npx prisma generate` khi backend dev đã tắt). Trên VPS thì deploy backend.
- **`prisma generate` báo EPERM trên Windows:** backend dev đang chạy và giữ file. Tắt backend dev rồi chạy lại.
- **Nhập xong mà web không đổi:** chờ tối đa 5 phút (cache), hoặc khởi động lại backend. Trên VPS: `pm2 reload` qua `deploy.sh`.
- **Muốn làm lại từ đầu:** bấm **Xóa kết quả** trong extension, rồi lấy lại. Nhập lại vào DB vẫn an toàn.

## 6. Lưu ý

- File JSON chứa dữ liệu công khai (tên đề, mã môn, chương), không có mật khẩu hay khóa nào. Dù vậy **đừng commit** vào git (dung lượng lớn, đổi liên tục).
- Extension dùng phiên đăng nhập sẵn có trong trình duyệt của bạn, không lưu mật khẩu ở đâu cả.
- Danh sách đề chỉ là **tên đề**. Ảnh đề chỉ được tải khi người dùng bấm lấy đề và đồng ý trừ phí, nên việc crawl không tốn tiền và không ảnh hưởng người dùng.
