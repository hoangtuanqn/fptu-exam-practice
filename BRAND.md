# Nhận diện thương hiệu: FEPass (Luyện thi FE FPTU)

Tài liệu này dành cho người và AI sửa giao diện: đọc trước khi chọn màu, font hay logo.

- Sản phẩm: **Luyện thi FE FPTU** (tên ngắn **FEPass**). Slogan: **"Hành trình đi đến điểm 10."**
- Linh vật và logo: **Cóc Pass** (con cóc vàng đội vòng nguyệt quế, cầm bảng "CÓC PASS"). Hình vẽ nằm ở `frontend/src/shared/ui/mascot-art.ts`.
- Công ty phát triển: **MST Software** (MMO Solution). Founder: Phạm Hoàng Tuấn. Co-Founder: Vũ Việt Quang, Mai Trung Hậu. **Chân trang luôn ghi rõ "Phát triển bởi MST Software"** (không bỏ).
- Facebook: https://facebook.com/mstsoftware.vn

## Màu chủ đạo: vàng của mascot

Màu lấy từ chính con Cóc Pass (thân vàng, viền nâu đậm). Đổi cả site chỉ cần sửa bảng `--color-*` ở đầu `frontend/src/index.css`.

| Vai trò | Hex | Token Tailwind | Ghi chú |
| --- | --- | --- | --- |
| Vàng nền | `#ffc61f` | `brand-500` | Nền nút chính, điểm nhấn. **Chữ trên nền này luôn là nâu đậm `brand-900`, không dùng chữ trắng** (trắng trên vàng khó đọc) |
| Vàng sáng | `#ffd033` | `brand-400`, `accent` | Hover nút, đầu sáng của dải chuyển sắc |
| Vàng đậm | `#e29400` | `brand-600` | Viền, biểu tượng, chữ rất lớn. Không dùng làm chữ nhỏ trên nền trắng (chỉ ~2.6:1) |
| **Nâu vàng (chữ nhấn)** | `#a86400` | `brand-700` | Liên kết, nhãn, chữ nhấn trên nền trắng (~4.7:1) |
| Nâu | `#7a4b00` | `brand-800` | Hover khối tối, viền mascot |
| **Nâu đậm** | `#3f2606` | `brand-900` | Chữ tiêu đề, nền tối, nút tối, chữ trên nền vàng |
| Vàng rất nhạt | `#fffbe6` | `brand-50` | Nền vùng nhấn nhẹ |
| Nền trang | `#f6f8fc` | `paper` | Trắng ngà hơi lạnh, để thẻ trắng nổi nhẹ |

Thang đầy đủ: `brand-50 #fffbe6`, `100 #fff4bf`, `200 #ffe88a`, `300 #ffdb57`, `400 #ffd033`, `500 #ffc61f`, `600 #e29400`, `700 #a86400`, `800 #7a4b00`, `900 #3f2606`; `accent #ffd033`, `accent-soft #fff0a0`.

### Gradient thương hiệu

Đi theo chiều **vàng đậm → vàng → vàng nhạt**, giống thân con cóc: `from-brand-600 via-brand-500 to-accent-soft` (vạch, thanh tiến độ), `from-brand-900 via-brand-800 to-brand-600` (thẻ nền tối). Chữ chuyển sắc dùng `.text-gradient` (vàng đậm, đủ tương phản).

### Quy tắc dùng màu

- **Chỉ dùng token**, không viết hex trực tiếp trong component (`bg-brand-500`, `text-brand-700`...).
- Nút chính: `bg-brand-500 text-brand-900`. Nút tối: `bg-brand-900 text-white`. Liên kết/nhãn nhỏ trên nền trắng: `text-brand-700`.
- Trang nền **trắng**, vùng tô nhạt `brand-50`/`paper`, khối nhấn mạnh `brand-900`. Không thêm họ màu mới (tím, xanh dương làm màu thương hiệu).
- Trạng thái nghiệp vụ giữ màu ngữ nghĩa, không phải màu thương hiệu: đúng = emerald, sai = rose. Cảnh báo dùng amber nên **gần với vàng thương hiệu**: ưu tiên nhận biết bằng biểu tượng và chữ, không chỉ bằng màu.
- Chữ thường dùng `slate-900` (tiêu đề) và `slate-500/600` (phụ); trên nền nâu đậm dùng `white` và `brand-200`.

## Font

**Chỉ dùng Inter, ở mọi nơi. Không thêm phông khác** (không chữ có chân, không monospace, không phông trang trí).

- **Website:** nhúng từ Google Fonts trong `frontend/index.html` (độ đậm 400-700, kể cả nghiêng). `frontend/src/index.css` trỏ mọi họ phông về Inter: `font-sans`, `font-serif`, `font-display`, `font-mono` và cả thẻ `<code>`, `<pre>`, `<kbd>` (Tailwind mặc định dùng monospace) đều ra Inter. Các class `font-serif`, `font-display` cũ còn trong code nhưng chỉ là tên, kết quả vẫn là Inter.
- **Tiện ích Chrome:** đóng gói sẵn Inter trong `chrome-extension/fonts/` (latin, latin-ext, tiếng Việt), khai báo `@font-face` ở `popup.css` và `content.css`; không phụ thuộc phông máy người dùng.
- **Email:** `Inter, sans-serif` (Apple Mail, iOS, Outlook.com tải được phông web; Gmail và vài ứng dụng khác bỏ qua phông web nên dùng phông sans-serif mặc định của ứng dụng, không tránh được).
- **Ảnh dựng bằng code** (ảnh bìa email): chữ đổi thành đường nét từ file `backend/assets/fonts/Inter-*.ttf` bằng `backend/scripts/gen-mail-cover.ts`, nên luôn là Inter dù máy dựng ảnh có cài Inter hay không.
- Giấy phép Inter: SIL Open Font License.

## Logo và tài sản

Logo là **con Cóc Pass ngồi trên chữ "FEPass"** (chữ vàng gradient viền nâu, con cóc đứng lên cụm "ss"). Tất cả ảnh thương hiệu được **sinh bằng code** từ hình mascot: sửa mascot hoặc màu rồi chạy lại `cd backend && npx tsx scripts/gen-brand-assets.ts` (chữ trong ảnh là đường nét lấy từ `backend/assets/fonts/Inter-*.ttf`, nên luôn là Inter).

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
