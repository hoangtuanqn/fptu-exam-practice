# Nhận diện thương hiệu: FEPass (Luyện thi FE FPTU)

Tài liệu này dành cho người và AI sửa giao diện: đọc trước khi chọn màu, font hay logo.

- Sản phẩm: **Luyện thi FE FPTU** (tên ngắn **FEPass**). Slogan: **"Hành trình đi đến điểm 10."**
- Linh vật và logo: **Cóc Pass** (con cóc vàng đội vòng nguyệt quế, cầm bảng "CÓC PASS"). Hình vẽ nằm ở `frontend/src/shared/ui/mascot-art.ts`.
- Công ty phát triển: **MST Software** (MMO Solution). Founder: Phạm Hoàng Tuấn. Co-Founder: Vũ Việt Quang, Mai Trung Hậu. **Chân trang luôn ghi rõ "Phát triển bởi MST Software"** (không bỏ).
- Facebook: https://facebook.com/mstsoftware.vn

## Màu chủ đạo: vàng của mascot (Material Design 3)

Màu giờ do **hệ token Material Design 3** quản lý, sinh từ MỘT màu seed là vàng của con Cóc Pass (`#ffc61f`) bằng thuật toán HCT của Google, có cả chủ đề sáng và tối. **Đọc `docs/material3.md` trước khi làm giao diện.**

- Nguồn: `frontend/scripts/gen-m3-tokens.mjs` (đổi `SEED` rồi `npx tsx scripts/gen-m3-tokens.mjs`), sinh `frontend/src/styles/m3-tokens.css`. Không sửa tay file sinh ra.
- Dùng vai trò, không dùng hex: `bg-primary text-on-primary` (hành động chính), `bg-primary-container text-on-primary-container` (khối nhấn, vàng nhạt), `bg-secondary-container` (mục đang chọn), `bg-surface`, `text-on-surface`, `border-outline-variant`...
- Vàng sáng nhận diện `#ffc61f` nay chỉ còn ở logo, ảnh thương hiệu và là hạt giống của bảng màu; nút chính dùng `primary` (vàng nâu đậm) để đạt tương phản AA.
- Các tên cũ `brand-*`, `slate-*`, `emerald/rose/amber-*` vẫn chạy nhờ lớp tương thích tạm (ánh xạ về vai trò M3); **không dùng cho mã mới**.
- Trạng thái nghiệp vụ: đúng = `success`, sai/lỗi = `error`, cảnh báo = `warning`; luôn kèm biểu tượng hoặc chữ, không chỉ màu.

## Font

**Chữ trong giao diện, email, tiện ích: chỉ dùng Inter. Không thêm phông khác** (không chữ có chân, không monospace, không phông trang trí).

**Ngoại lệ duy nhất: chữ "FEPass" trong logo** (ảnh, không phải chữ giao diện) dùng phông **Lilita One** (SIL OFL), file `backend/assets/fonts/LilitaOne-Regular.ttf`, cho hợp phong cách hoạt hình của con Cóc Pass. Phông này chỉ được dùng để dựng ảnh logo và ảnh chia sẻ/ảnh email có chữ FEPass, không dùng làm phông chạy trên web.

- **Website:** nhúng từ Google Fonts trong `frontend/index.html` (độ đậm 400-700, kể cả nghiêng). `frontend/src/index.css` trỏ mọi họ phông về Inter: `font-sans`, `font-serif`, `font-display`, `font-mono` và cả thẻ `<code>`, `<pre>`, `<kbd>` (Tailwind mặc định dùng monospace) đều ra Inter. Các class `font-serif`, `font-display` cũ còn trong code nhưng chỉ là tên, kết quả vẫn là Inter.
- **Tiện ích Chrome:** đóng gói sẵn Inter trong `chrome-extension/fonts/` (latin, latin-ext, tiếng Việt), khai báo `@font-face` ở `popup.css` và `content.css`; không phụ thuộc phông máy người dùng.
- **Email:** `Inter, sans-serif` (Apple Mail, iOS, Outlook.com tải được phông web; Gmail và vài ứng dụng khác bỏ qua phông web nên dùng phông sans-serif mặc định của ứng dụng, không tránh được).
- **Ảnh dựng bằng code** (ảnh bìa email): chữ đổi thành đường nét từ file `backend/assets/fonts/Inter-*.ttf` bằng `backend/scripts/gen-mail-cover.ts`, nên luôn là Inter dù máy dựng ảnh có cài Inter hay không.
- Giấy phép Inter: SIL Open Font License.

## Logo và tài sản

Logo là **con Cóc Pass ngồi trên chữ "FEPass"** (chữ phông Lilita One, vàng gradient viền nâu có khối nổi, con cóc đứng lên cụm "ss", kèm ánh lấp lánh). Tất cả ảnh thương hiệu được **sinh bằng code** từ hình mascot: sửa mascot hoặc màu rồi chạy lại `cd backend && npx tsx scripts/gen-brand-assets.ts` (chữ trong ảnh là đường nét lấy từ file phông trong `backend/assets/fonts/`: Lilita One cho chữ logo, Inter cho chữ còn lại).

| File | Dùng ở đâu |
| --- | --- |
| `frontend/public/brand/logo-full.png` | Logo chính (cóc + chữ FEPass), dùng ở header, thanh bên, trang đăng nhập (nền sáng) |
| `frontend/public/brand/logo-full-light.png` | Cùng logo cho nền tối |
| `frontend/public/brand/logo-mark.png` | Chỉ con Cóc Pass, dùng ở chân trang |
| `favicon.ico`, `favicon-32.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Favicon và icon: mascot trên nền nâu đậm bo góc |
| `frontend/public/og-cover.jpg` | Ảnh chia sẻ link 1200×630 |
| `backend/assets/mail/cover.png`, `logo.png` | Ảnh bìa và logo trong email |
| `chrome-extension/icons/icon*.png` | Icon tiện ích Chrome |
| `frontend/public/brand/mst-logo-*.png` | Logo công ty MST Software (bản cũ, giữ để dùng khi cần ghi nhận nhà phát triển) |
| `frontend/public/brand/fuoverflow.webp` | Logo đối tác kho đề FuOverflow |

Dùng component `Logo` (`src/shared/brand/Logo.tsx`), không gắn `<img>` logo trực tiếp.
**Watermark** đóng lên ảnh đề (`backend/assets/brand/watermark.png`) là tài sản riêng, không thuộc bộ logo này và không đổi theo thương hiệu.

## Nơi đổi thông tin chữ

`frontend/brand.config.ts` (hoặc biến `VITE_*` trong `frontend/.env`, mẫu ở `.env.example`): tên công ty, tên sản phẩm, slogan, mô tả, founder, co-founder, Facebook, đối tác. Đổi một lần là cập nhật tiêu đề tab, header, trang chủ, trang đăng nhập và footer.

## Giọng văn

Tiếng Việt, ngắn gọn, học thuật nhưng thân thiện. Không khoe số liệu hay đánh giá người dùng khi chưa có thật. Không hứa tính năng chưa xây.
