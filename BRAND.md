# Nhận diện thương hiệu: MST Software

Tài liệu này dành cho người và AI sửa giao diện: đọc trước khi chọn màu, font hay logo.

- Công ty: **MST Software** (MMO Solution). Founder: Phạm Hoàng Tuấn. Co-Founder: Vũ Việt Quang, Mai Trung Hậu.
- Sản phẩm: **Luyện thi FE FPTU**. Slogan: **"Hành trình đi đến điểm 10."**
- Facebook: https://facebook.com/mstsoftware.vn
- Logo gốc (nguồn màu): `C:\Users\ad\Desktop\Workspace\04-mst-software\01-logo\` (LOGO.png, LogoTitle Black.png, LogoTitle White.png, mockup nền tối).

## Màu chủ đạo

Màu **đo trực tiếp từ file logo**, không phải ước chừng. Logo là chữ M-S-T chuyển sắc **xanh hoàng gia → cyan → cyan nhạt**, có các ô vuông pixel xanh nhạt ở góc.

| Vai trò | Hex | Token Tailwind | Ghi chú |
| --- | --- | --- | --- |
| **Xanh chính** | `#0066ff` | `brand-600` | Màu đậm nhất của logo. Liên kết, nhấn mạnh, đầu dải gradient |
| Xanh nhạt pixel | `#3399ff` | `brand-400` | Các ô vuông ở góc trên logo |
| **Cyan nhấn** | `#00c8ff` | `accent` | Giữa dải gradient logo. Dùng tiết kiệm: vạch, chấm, nhãn nhỏ trên nền tối |
| Cyan nhạt | `#90e5ff` | `accent-soft` | Đầu cuối nhạt của dải gradient |
| **Navy nền tối** | `#0b1730` | `brand-900` | Nền khối tối, nút chính, favicon. Hợp với nền ảnh mockup logo |
| Chữ đen logo | `#101010` | `ink` | Chữ SOFTWARE.VN trên bản logo nền sáng |
| Nền vùng nhạt | `#f0f6ff` | `paper` | Nền các khối xanh nhạt xen kẽ trắng |

Thang xanh đầy đủ: `brand-50 #eef6ff`, `100 #d9ebff`, `200 #b3d6ff`, `300 #80b8ff`, `400 #3399ff`, `500 #1a80ff`, `600 #0066ff`, `700 #0052cc`, `800 #0f3a8a`, `900 #0b1730`.

### Gradient thương hiệu

Luôn đi theo chiều **xanh chính → cyan → cyan nhạt**, giống logo:

```
from-brand-600 via-accent to-accent-soft      /* vạch, đường kẻ */
from-brand-600 to-accent                      /* nút chính, biểu tượng nổi */
from-brand-900 via-brand-800 to-brand-600     /* thẻ nền tối */
```

### Quy tắc dùng màu

- **Chỉ dùng token**, không viết hex trực tiếp trong component (`bg-brand-600`, `text-accent`...). Muốn đổi màu cả site, sửa bảng `--color-*` ở đầu `frontend/src/index.css`.
- Trang nền **trắng**, vùng tô nhạt dùng `paper`, khối nhấn mạnh dùng `brand-900`. Không thêm họ màu mới (tím, cam, xanh lá làm màu thương hiệu).
- Trạng thái nghiệp vụ giữ màu ngữ nghĩa, không phải màu thương hiệu: đúng = emerald, sai = rose, cảnh báo = amber.
- Cyan `accent` chỉ là điểm nhấn, không dùng làm nền lớn hay chữ dài trên nền trắng (độ tương phản thấp).
- Chữ thường dùng `slate-900` (tiêu đề) và `slate-500/600` (phụ); trên nền navy dùng `white` và `brand-200`.

## Font

- **Inter** cho toàn bộ giao diện (nhúng từ Google Fonts trong `frontend/index.html`, các độ đậm 400, 500, 600, 700, có tiếng Việt).
- Token `font-serif` được trỏ về Inter để tiêu đề cũ không cần sửa. Không dùng font khác.

## Logo và tài sản

Nằm trong `frontend/public/`, thay file cùng tên là đổi toàn site:

| File | Dùng ở đâu |
| --- | --- |
| `brand/logo-mark.png` | Chữ MST, header, footer, trang đăng nhập (mobile) |
| `brand/logo-full.png` | Có chữ SOFTWARE.VN đen, cho nền sáng |
| `brand/logo-full-light.png` | Chữ trắng, cho nền tối (cột trái trang đăng nhập) |
| `favicon.ico`, `favicon-32.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Favicon và icon: logo MST trên nền navy bo góc |
| `og-cover.jpg` | Ảnh chia sẻ link 1200×630, cắt từ ảnh mockup nền tối |
| `brand/fuoverflow.webp` | Logo đối tác kho đề FuOverflow (không phải logo MST) |

Dùng component `Logo` (`src/components/brand/Logo.tsx`), không gắn `<img>` logo trực tiếp.

## Nơi đổi thông tin chữ

`frontend/brand.config.ts` (hoặc biến `VITE_*` trong `frontend/.env`, mẫu ở `.env.example`): tên công ty, tên sản phẩm, slogan, mô tả, founder, co-founder, Facebook, đối tác. Đổi một lần là cập nhật tiêu đề tab, header, trang chủ, trang đăng nhập và footer.

## Giọng văn

Tiếng Việt, ngắn gọn, học thuật nhưng thân thiện. Không khoe số liệu hay đánh giá người dùng khi chưa có thật. Không hứa tính năng chưa xây.
