# Material Design 3 trong FEPass: đặc tả thiết kế cho nhóm

Tài liệu này là quy tắc để mọi người cùng làm giao diện theo Material Design 3 (M3, "Material You"). Đọc trước khi thêm hoặc sửa giao diện.

## 1. Công nghệ

React 18 + Vite + TypeScript + **Tailwind v4** (giữ nguyên). M3 được dựng bằng **biến CSS (token) + các thành phần tự viết trong `frontend/src/shared/ui`**, không dùng MUI hay Material Web:

- MUI v6 vẫn theo Material 2, không phải M3 chuẩn; Material Web đang ở chế độ bảo trì.
- Giữ nguyên API của các thành phần (`Button`, `Modal`, `Input`...) nên hàng trăm chỗ gọi không phải sửa; logic nghiệp vụ và lời gọi API không đổi, chỉ thay lớp trình bày.

## 2. Token (đặt token trước, thành phần chỉ đọc token)

| File | Việc |
| --- | --- |
| `frontend/scripts/gen-m3-tokens.mjs` | **Nguồn duy nhất**. Từ MỘT màu seed (`#ffc61f`, vàng của mascot Cóc Pass) sinh toàn bộ token bằng thuật toán HCT chính thức của Google (`@material/material-color-utilities`, `SchemeTonalSpot`), kiểm tra tương phản WCAG và thoát lỗi nếu có cặp dưới AA |
| `frontend/src/styles/m3-tokens.css` | **TỰ SINH**: token màu sáng + tối, bậc chữ, hình dạng, độ nổi theo tông, trạng thái, chuyển động, khoảng cách, và các lớp `.md-display-large ... .md-label-small` |
| `frontend/src/styles/m3-tailwind.css` | **TỰ SINH**: ánh xạ token thành tiện ích Tailwind (`bg-primary`, `text-on-surface`, `rounded-m3-lg`, `shadow-m3-2`, `ease-m3-standard`...) |
| `frontend/src/styles/m3-base.css` | Viết tay: lớp kích thước cửa sổ, vòng focus, state layer, độ nổi theo tông, chuyển động, giảm chuyển động |

Đổi màu thương hiệu: sửa `SEED` rồi `cd frontend && npx tsx scripts/gen-m3-tokens.mjs`. Không sửa tay hai file tự sinh.

### Chủ đề sáng / tối
Cùng một bộ vai trò. `ThemeProvider` (`shared/theme/ThemeContext.tsx`) đặt `data-theme="light|dark"` lên `<html>`; chọn "Theo hệ thống" thì bỏ thuộc tính và CSS dùng `prefers-color-scheme`. Lựa chọn lưu ở `localStorage` (`fepass.theme`); một đoạn script trong `index.html` áp chủ đề trước khi vẽ để không nháy. Đổi chủ đề: nút ở thanh ứng dụng (`ThemeToggle`) hoặc menu avatar. `meta theme-color` tự đồng bộ.

### Vai trò màu
| Nhóm | Vai trò | Dùng cho |
| --- | --- | --- |
| Primary | `primary`, `on-primary`, `primary-container`, `on-primary-container` | Hành động chính (nút filled), điểm nhấn; container cho khối nhấn nhẹ |
| Secondary | `secondary(-container)`, `on-*` | Hành động phụ: nút tonal, mục đang chọn (tab/chip/điều hướng) |
| Tertiary | `tertiary(-container)`, `on-*` | Nhãn phụ, đối trọng màu (ví dụ nhãn VIP) |
| Error | `error(-container)`, `on-*` | Lỗi, nút nguy hiểm |
| Mở rộng | `success(-container)`, `warning(-container)`, `on-*` | Đúng/sai, thành công, cảnh báo (M3 cho phép màu tuỳ biến, đã hài hoà về màu chính) |
| Surface | `surface`, `surface-dim/bright`, `surface-container-lowest/low/(mặc định)/high/highest`, `on-surface`, `on-surface-variant` | Nền trang và các lớp độ nổi |
| Outline | `outline` (viền điều khiển, >= 3:1), `outline-variant` (đường kẻ mảnh) | Viền, đường phân cách |
| Khác | `inverse-surface/-on-surface/-primary`, `scrim`, `shadow` | Snackbar, lớp phủ hộp thoại |

**Quy tắc:** luôn đi theo cặp (`bg-X` với `text-on-X`). Không viết hex trong component.

### Bậc chữ (phông Inter, xem 7. Chỗ lệch)
Lớp `md-<role>`: `display` 57/45/36, `headline` 32/28/24, `title` 22/16/14, `body` 16/14/12, `label` 14/12/11 (kích thước px; mỗi cỡ có line-height, độ đậm, giãn chữ theo đặc tả). Tiêu đề trang chủ/phần dùng `md-hero-title`, `md-section-title` (co theo lớp kích thước cửa sổ).

### Hình dạng
`rounded-m3-xs/sm/md/lg/xl/full` = 4 / 8 / 12 / 16 / 28 / tròn. Nút = full; thẻ = md (12); hộp thoại = xl (28); menu = sm (8); ô nhập = đầu xs.

### Độ nổi (tông, không đổ bóng nặng)
Mức 0-5 = nền `surface` → `surface-container-low/(mặc định)/high/high/highest` (`.md-elevation-N`). Chỉ vật thể nổi (menu, hộp thoại, snackbar, FAB) có thêm bóng rất nhẹ (`shadow-m3-1..5`).

### Khoảng cách
Lưới 4dp (bội 8dp cho bố cục): thang `--md-sys-spacing-N` = N x 4px, và thang `p-*`/`gap-*` mặc định của Tailwind (1 = 4px) dùng cùng lưới.

### Trạng thái (state layer) và focus
Lớp `.md-state` đặt lên điều khiển: lớp phủ `currentColor` ở **hover 8%, focus 10%, pressed 10%, dragged 16%**; **disabled**: chữ 38%, nền 12% (`disabled:bg-on-surface/12 disabled:text-on-surface/38`). Vòng focus bàn phím (`:focus-visible`) = viền 3dp màu `secondary`, cách 2dp.

### Chuyển động
`--md-sys-motion-easing-*` (standard / emphasized, decelerate / accelerate) và `--md-sys-motion-duration-short1..long2` (50-500ms). Lớp: `.md-motion` (chuyển nền/màu), `.md-enter` (vào của hộp thoại/menu/snackbar), `.md-scrim-in`. Khi người dùng bật **giảm chuyển động**, mọi thời lượng về ~0 và hoạt ảnh trang trí tắt.

## 3. Thành phần và quy tắc dùng

| Thành phần | File | Quy tắc |
| --- | --- | --- |
| Nút | `shared/ui/Button.tsx` | `filled` cho **một** hành động chính mỗi khối; `tonal` cho phụ nổi bật; `outlined` cho phụ; `text` cho ít nhấn (hủy, liên kết); `elevated` khi cần nổi trên nền hoa văn. Tên cũ `primary/secondary/ghost/danger` vẫn dùng được (= filled/outlined/text/filled-error). Vùng chạm luôn >= 48dp |
| Nút biểu tượng | `IconButton` | Bắt buộc `label` (aria-label + tooltip). 40dp nhìn thấy, 48dp chạm |
| FAB | `Fab` | **Chỉ cho hành động chính duy nhất của một màn hình.** Hiện chỉ dùng cho "Vào luyện đề" ở thanh điều hướng dọc |
| Thẻ | `Card` | `outlined` (mặc định), `filled`, `elevated` |
| Chip / nhãn | `Badge`, `Segmented` | Badge = chip trạng thái tĩnh; Segmented = chọn một trong vài lựa chọn (nút phân đoạn) |
| Hộp thoại | `Modal` | Nhốt Tab, Esc đóng, trả focus; nút sát phải: nút phụ `text` bên trái, nút chính `filled` bên phải |
| Snackbar | `ToastContext` | Nền `inverse-surface`, tự tắt 4s, dưới giữa (compact) hoặc dưới trái |
| Ô nhập | `Input`, `PasswordInput` | Kiểu filled, nhãn nổi, lỗi dưới ô (`aria-invalid` + `role=alert`). `inputClass()` cho ô thô |
| Danh sách / menu | `UserMenu` | Mục cao 48dp, điều hướng ↑ ↓ Home End, Esc |
| Tiến trình | `Spinner`, `LinearProgress` | Tròn/tuyến tính, có `role=progressbar` |
| Thanh ứng dụng | `PanelLayout`, `features/practice/components/Header.tsx` | Thanh nhỏ cao 64dp: tiêu đề + hành động |
| Điều hướng | `PanelLayout` | Xem mục 4 |

## 4. Bố cục theo lớp kích thước cửa sổ

Biến thể Tailwind `compact:` (<600px), `medium:` (600-839px), `expanded:` (>=840px).

- **Khung tài khoản/quản trị (`PanelLayout`)**: compact = thanh ứng dụng + ngăn điều hướng mở ra (modal); medium = thanh điều hướng dọc (rail) 80dp; expanded = ngăn điều hướng cố định.
- **Màn làm bài**: bố cục *danh sách - chi tiết*: câu hỏi là khung chính, lưới câu hỏi (sidebar, thành dải ngang ở compact) là khung phụ.
- **Trang chủ**: *feed* một cột, tối đa 768px.

## 5. Truy cập (accessibility)

- **Tương phản:** mọi cặp `on-X` / `X` và `outline` đã được script kiểm tra tự động (>= 4.5:1; viền >= 3:1). Chạy `npx tsx scripts/gen-m3-tokens.mjs` để xem báo cáo.
- **Vùng chạm >= 48x48dp** cho các điều khiển chung (nút, nút biểu tượng, công tắc, chip, ô đáp án, ô câu hỏi, mục menu/điều hướng).
- **HTML ngữ nghĩa + ARIA:** `role=dialog` + `aria-modal`, `radiogroup`/`radio`, `tablist`/`tab` + `aria-selected` + ← →, `menu`/`menuitem`/`menuitemradio`, `progressbar` + `aria-valuenow`, `aria-current`, `aria-pressed`, nhãn cho mọi nút biểu tượng; kết quả đúng/sai có biểu tượng chứ không chỉ màu.
- **Bàn phím:** vòng focus nhìn thấy được, nhốt focus trong hộp thoại, Esc đóng menu/hộp thoại.
- **Giảm chuyển động** được tôn trọng.

## 6. Tình trạng chuyển đổi

**Đã chuyển sang M3 đầy đủ (dùng thẳng token):** token + chủ đề sáng/tối; `Button/IconButton/Fab`, `Card`, `Input/PasswordInput/Select`, `Badge`, `Segmented`, `Switch`, `Modal`, snackbar, `Feedback`; khung `PanelLayout` + `UserMenu` + `Footer`; trang chủ (hero, tab nhập đề, các phần giới thiệu); màn làm bài (đáp án, lưới câu hỏi, tóm tắt, chú thích, hộp thoại bắt đầu, trạng thái đáp án).

**Dùng lớp tương thích tạm** (`@theme` trong `index.css` ánh xạ các tên cũ `brand-*`, `slate-*`, `emerald/rose/amber-*`, `paper`, `ink` về vai trò M3, và `bg-white` → `bg-surface-container-lowest`): các trang còn lại (quản trị, lịch sử, nạp tiền, hồ sơ, chat...). Chúng đã đổi theo chủ đề và đúng bảng màu, nhưng chưa dùng bậc chữ/hình dạng/thành phần M3 và chưa kiểm vùng chạm từng điều khiển. **Việc tiếp theo:** chuyển dần từng trang sang token (`grep -rn "slate-\|brand-\|text-white" frontend/src`), xong thì xoá khối "TƯƠNG THÍCH TẠM" trong `index.css`.

Xem thư viện thành phần: chạy `npm run dev` rồi mở `/dev/m3` (chỉ có ở môi trường dev).

## 7. Danh sách chỗ cố ý lệch khỏi Material Design (và lý do)

- [ ] **Phông Inter thay Roboto.** Quy tắc thương hiệu của FEPass là chỉ dùng Inter (xem `BRAND.md`); thang bậc chữ vẫn đúng kích thước/độ đậm/giãn chữ của M3.
- [ ] **Không dùng thanh điều hướng dưới (navigation bar) ở compact.** Khung tài khoản có 10 đích đến, vượt mức tối đa 5 của thanh điều hướng, nên dùng ngăn điều hướng modal. Medium dùng rail; expanded dùng ngăn cố định rộng 288dp (chuẩn là 360dp) để chừa chỗ cho nội dung.
- [ ] **Nút "Vào luyện đề" ở ngăn điều hướng** là liên kết dạng FAB mở rộng chứ không phải component `Fab`; ở rail mới dùng `Fab`.
- [ ] **Ô nhập chỉ có kiểu filled có nhãn nổi**; ô thô (`inputClass`) theo kiểu outlined không có nhãn nổi, dùng khi cần tự bố cục (ô dán link, ô mã môn).
- [ ] **Nút `filled` dùng `primary` (vàng nâu đậm `#765a0b` ở sáng)** theo đúng thuật toán M3, không phải vàng sáng `#ffc61f` của logo; vàng sáng chỉ xuất hiện ở `primary-container`, logo và ảnh thương hiệu. Đổi lại để đạt tương phản AA.
- [ ] **Vật trang trí thương hiệu không thuộc M3:** mascot Cóc Pass, logo, hiệu ứng pháo giấy/lấp lánh ở hộp điểm danh, thẻ ưu đãi "tờ đề" ở trang chủ.
- [ ] **Màu mở rộng `success`/`warning`** (đúng/sai, cảnh báo) là màu tuỳ biến theo hướng dẫn M3, hài hoà về màu chính.
- [ ] **Bóng rất nhẹ ở mức độ nổi >= 2** cho vật thể nổi (menu, hộp thoại...), ngoài lớp phủ tông, để tách khỏi nền sáng.
- [ ] **Lớp tương thích tạm cho các trang chưa chuyển** (mục 6): chưa thuần token, chưa kiểm vùng chạm 48dp từng điều khiển, chưa soi thủ công ở chủ đề tối.
- [ ] **FAB gần như không dùng:** chưa có màn hình nào có đúng một hành động chính nổi bật cần FAB (hành động chính nằm trong nội dung hoặc thanh ứng dụng).
- [ ] **Chưa có kiểm thử trực quan tự động** (ảnh chụp so sánh) cho hai chủ đề; mới kiểm thủ công trang chủ, đăng nhập, thư viện thành phần.
