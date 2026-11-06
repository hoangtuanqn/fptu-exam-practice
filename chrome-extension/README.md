# FePass: tiện ích Chrome cho FuOverflow

Thêm nút **“Làm đề thi trên fepass.top”** (kèm phí, ví dụ `500đ`) cạnh các bài có nhãn **Đề Thi FE** trên FuOverflow:

- Trang danh sách: `https://fuoverflow.com/forums/OSG202/`
- Trang chi tiết bài: `https://fuoverflow.com/threads/osg202-su26-re.7168/`

Bấm nút sẽ mở `fepass.top` ở tab mới và hiện hộp **xác nhận lấy đề** (số credit sẽ bị trừ, số dư hiện tại, số dư sau khi trừ).
**Chỉ khi người dùng bấm “Trả …” mới bị trừ credit.** Đề đã lấy trước đó thì mở lại miễn phí; đề lỗi được hoàn phí như bình thường.

## Cài đặt (chế độ nhà phát triển)

1. Mở `chrome://extensions`, bật **Developer mode** (góc trên bên phải).
2. Bấm **Load unpacked** và chọn thư mục `chrome-extension` này.
3. Vào một chuyên mục FuOverflow có đề FE, nút xuất hiện cạnh tiêu đề bài.

Sửa code xong chỉ cần bấm nút tải lại (⟳) ở thẻ tiện ích trong `chrome://extensions`, rồi tải lại trang FuOverflow.

## Cách hoạt động

| File | Việc |
|---|---|
| `manifest.json` | Manifest V3. Chỉ chạy trên `fuoverflow.com`; quyền: `storage`, và gọi API `api.fepass.top` (cùng `localhost` để chạy thử). |
| `content.js`, `content.css` | Quét trang, tìm bài có nhãn “Đề Thi FE” (danh sách `.structItem-title`, trang bài `h1.p-title-value`), chèn nút. Có theo dõi thay đổi DOM để nút vẫn hiện khi trang nạp thêm nội dung. |
| `background.js` | Lấy phí lấy đề từ `GET /api/v1/crawl-jobs/price` (endpoint công khai) và nhớ 10 phút. Gọi ở đây vì trang FuOverflow không được phép gọi chéo tên miền. |
| `popup.html/js/css` | Bật/tắt nút; mục “Nâng cao” để trỏ sang môi trường chạy thử. |
| `shared.js` | Cấu hình mặc định + kiểm tra địa chỉ (chỉ `https`, hoặc `http://localhost`). |

Liên kết nút trỏ tới: `https://fepass.top/?link=<link bài>&confirm=1&src=ext`.
Phía website (`frontend/src/features/exam-import/components/LinkImport.tsx`) đọc `link` và `confirm=1` để điền sẵn link rồi mở hộp xác nhận. Trang **không tự lấy đề**: luôn chờ người dùng bấm xác nhận.

## Quyền riêng tư

Tiện ích không đọc nội dung bài viết ngoài tiêu đề/nhãn, không lưu tài khoản hay mật khẩu, không gửi dữ liệu người dùng đi đâu. Chỉ gọi đúng một endpoint công khai để lấy giá.

## Chạy thử với máy local

Mở popup > Nâng cao, đặt **Địa chỉ website** `http://localhost:5173` và **Địa chỉ API** `http://localhost:8000` (đổi theo cổng backend của bạn), bấm Lưu. Nút trên FuOverflow sẽ trỏ về website local.

## Đưa lên Chrome Web Store (tùy chọn)

Cần tài khoản nhà phát triển và một trang chính sách quyền riêng tư. Đóng gói bằng cách nén **nội dung** thư mục này (không nén cả thư mục cha). Không cần build.
