# Email marketing: giao diện admin, đo lường và trung tâm tuỳ chọn thư (thiết kế)

Ngày: 2026-11-14. Nhánh nền: `feat/email-marketing` (chưa merge; mọi thứ dưới đây xây trên đó).
Trạng thái: đã duyệt (2026-11-14).

## 1. Mục đích

Bộ gửi thư tự động đã có (3 chiến dịch `winback`, `pro_upsell`, `pro_expiry`, mặc định tắt, huỷ đăng ký, chống gửi trùng) nhưng chỉ là bộ gửi, chưa phải công cụ marketing. Admin hiện chỉ có 3 thẻ với công tắc, số người đủ điều kiện và số thư đã gửi. Họ không biết thư có hiệu quả không, không chỉnh được gì nếu không deploy, không xem được thư, không gửi được thông báo riêng, và người dùng chỉ có một công tắc bật/tắt tất cả.

Mục đích: để admin (một người vận hành, không phải đội marketing) tự tin bật, theo dõi, chỉnh và dừng thư mà không cần dev; còn sinh viên nhận ít thư hơn nhưng đúng lúc hơn, và có cách giảm thư thay vì huỷ hết.

Số đo chính (admin xác nhận là giả định, sửa được): **số người mua Pro trong 7 ngày sau thư** và **số người quay lại học trong 7 ngày sau thư**. Ghi rõ trên giao diện là "sau thư", không ghi "nhờ thư", vì chỉ là tương quan.

## 2. Hiểu người dùng (căn cứ cho các quyết định)

- Sinh viên ôn theo đợt thi. Đúng lúc là trước ngày thi; sau khi thi xong gần như không còn nhu cầu. Thư cuối của winback hỏi "bạn thi xong chưa?" rồi dừng.
- Nhạy cảm về tiền, hay trả lẻ. Thư upsell đặt chi tiêu thật của họ cạnh giá Pro; thư hết hạn nhắc thứ sắp mất.
- Dễ bấm báo spam khi thư dày. Dễ huỷ + ít thư + quyền chọn loại thư giữ uy tín tên miền gửi.
- Muốn tự quyết. Một công tắc duy nhất khiến người chỉ muốn bớt thư phải huỷ hết.
- Người vận hành cần yên tâm trước khi bật (biết bao nhiêu người, bao nhiêu ngày) và thấy hiệu quả thật sau đó. Số lượt mở thư bị bỏ vì không đáng tin (Apple chặn ảnh theo dõi).

## 3. Mục tiêu, không phải mục tiêu, phản mục tiêu

Mục tiêu: đo hiệu quả; điều khiển chung (tạm dừng, hạn mức, giờ chạy); chỉnh mốc và hạn mức không cần deploy; xem trước thư; nhật ký; gửi thông báo thủ công có kiểm soát; trung tâm tuỳ chọn thư cho người dùng.

Không phải mục tiêu: theo dõi lượt mở; A/B test; trình soạn thảo kéo thả hoặc HTML tự do; bộ lọc người nhận viết SQL tự do; dịch vụ gửi thư bên thứ ba; gửi theo múi giờ từng người; xuất báo cáo CSV.

Phản mục tiêu (nếu xảy ra thì là thất bại dù chạy đúng): biến thành công cụ gửi spam (không có lối nào vượt hạn mức và giới hạn 1 thư/7 ngày, kể cả gửi thủ công); con số tô hồng (không đếm lượt mở; ghi "sau thư" chứ không "nhờ thư"); lộ hạn mức, mốc ngày hoặc thông tin nội bộ ra giao diện người dùng.

## 4. Các hướng đã cân nhắc

- A. Mở rộng trang hiện tại (thanh trạng thái, tạm dừng, xem thư, nhật ký): nhỏ nhưng không đo hiệu quả, không chỉnh mốc, không gửi thủ công. Bị loại vì thiếu đúng thứ admin cần nhất.
- **B. Bộ marketing đủ, làm 3 đợt: ĐƯỢC CHỌN.** Admin 4 tab, đo bằng lượt bấm và mua Pro, trung tâm tuỳ chọn thư.
- C. Dịch vụ ngoài (Brevo, Mailchimp): có sẵn đo lường nhưng dữ liệu sinh viên nằm ở bên thứ ba, phát sinh chi phí, làm lại phần đã xong. Bị loại.

## 5. Thiết kế

Mọi thay đổi API đều thêm mới (backend và frontend deploy tách rời; backend trước). Mỗi đợt là một nhánh và một PR riêng; đợt sau xây trên đợt trước.

### Đợt 1: đo lường và điều khiển chung

**Theo dõi lượt bấm.** Nút trong thư (CTA) trỏ tới `GET {API}/api/v1/marketing/click?t=<token>`. Token ký HMAC chứa id dòng log. Endpoint ghi `clickedAt` (lần đầu) rồi chuyển hướng 302 tới `CLIENT_URL + target`, trong đó `target` là đường dẫn nội bộ lưu trong dòng log lúc gửi, nên không có chuyển hướng mở tới địa chỉ tuỳ ý. Token sai hoặc dòng log đã xoá thì chuyển về trang chủ. Link huỷ đăng ký không đi qua đường này.
Giới hạn đã biết: trình quét thư có thể tự mở link. Bỏ qua lượt bấm trong vòng 30 giây kể từ lúc gửi. Ghi chú trong code.

**Đo chuyển đổi.**
- "Mua Pro" tính khi đọc: người đó có `PlanPurchase` (tạo bởi mua bằng credit hoặc kích hoạt vé; admin tặng không tính) trong 7 ngày sau `sentAt`. Gia hạn trước khi hết hạn cũng tính. Nếu một người nhận nhiều thư, tính cho thư gần nhất trước lúc mua (last-touch).
- "Quay lại" **phải lưu**, vì `users.last_active_at` chỉ giữ lần hoạt động mới nhất nên không tính ngược được. Thêm cột `returnedAt` trên `email_campaign_logs`: khi `touchActive` ghi hoạt động (tối đa 1 lần/giờ/người), cập nhật `returnedAt = now` cho các dòng log của người đó trong 7 ngày gần nhất mà `returnedAt` còn trống (`WHERE user_id = ? AND returned_at IS NULL AND sent_at >= now - 7 ngày`, dùng chỉ số `(user_id, sent_at)`). Chỉ hiển thị cho `winback`. Thư gửi trước khi tính năng này chạy không có dữ liệu "quay lại".
- Phễu 30 ngày chỉ tính các thư gửi từ 7 ngày trở về trước (đã đủ thời gian ghi nhận); thư gửi trong 7 ngày gần nhất hiện riêng là "đang chờ kết quả: N".

**Điều khiển chung.** Cài đặt `paused` (nút "Tạm dừng tất cả"): cron kiểm tra trước mỗi lượt, không gửi gì khi đang tạm dừng. Trạng thái gửi: số thư hôm nay / hạn mức, giờ chạy kế tiếp, SMTP đã cấu hình chưa, tỷ lệ đã huỷ nhận thư (số `marketingOptOut` trên số người đã xác minh email).

**Hộp xác nhận khi bật chiến dịch** nêu số người đủ điều kiện và số ngày ước tính để gửi hết (`ceil(đủ điều kiện / hạn mức)`).

**Giao diện: trang `/admin/marketing` có tab "Tổng quan" và "Chiến dịch".**
```
Email marketing    [Tổng quan | Chiến dịch | Gửi thủ công | Nhật ký]
┌ Hôm nay 42/150 · Lượt kế tiếp 10:00 · Huỷ nhận 0,8% · SMTP ✓  [Tạm dừng tất cả] ┐
30 ngày qua
┌ Pro hết hạn   [bật]   Gửi 120 → Bấm 31 → Mua Pro 9 (7,5%)      ┐
┌ Gợi ý Pro     [bật]   Gửi 80  → Bấm 14 → Mua Pro 4 (5%)        ┐
┌ Gọi quay lại  [tắt]   Gửi 0                                     ┐
```
Thẻ mỗi chiến dịch: công tắc, phễu Gửi → Bấm → Mua Pro (hoặc Quay lại), đủ điều kiện và số ngày gửi hết, các nút Xem thư, Gửi thử. Đợt 1 chưa có Sửa mốc.
Trên điện thoại: thẻ xếp một cột, thanh trạng thái xuống hàng.

### Đợt 2: chỉnh, xem trước, tuỳ chọn người dùng

**Tham số lưu trong DB** (qua service cài đặt marketing hiện có), thay cho hằng số cứng: các mốc ngày winback, ngưỡng ngày không hoạt động tối đa, khoảng cách tối thiểu giữa hai thư, hạn mức mỗi lượt, số lần mua lẻ tối thiểu và số ngày chờ lặp lại của upsell, số ngày báo trước Pro hết hạn. Backend kiểm tra khoảng giá trị và có **trần cứng trong code** (hạn mức mỗi lượt không quá 300; khoảng cách tối thiểu không dưới 3 ngày) để nhập sai không gây gửi ào ạt. Hằng số hiện tại là giá trị mặc định.

**Xem trước.** `GET /admin/marketing/campaigns/:key/preview?step=n` trả `{subject, html}` dựng bằng dữ liệu mẫu; giao diện hiển thị trong hộp thoại bằng iframe `srcdoc` có `sandbox` (không chạy script). Ảnh nhúng bằng `cid:` trong thư thật cần thay bằng địa chỉ ảnh công khai khi xem trước (người xây quyết định cách làm).

**Trung tâm tuỳ chọn thư của người dùng.** Bốn loại: `review` (nhắc ôn, winback), `offers` (gợi ý Pro), `renewal` (nhắc hết hạn Pro), `news` (thông báo, dùng cho Đợt 3). Lưu dạng bitmask trong một cột mới `marketing_muted_topics` (mặc định 0), thêm `marketing_muted_until` (tạm dừng). `marketingOptOut` giữ nguyên nghĩa "tắt tất cả". Truy vấn chọn người nhận loại người đã tắt loại thư đó hoặc đang tạm dừng.
- Trang Hồ sơ: thẻ hiện tại thành 4 công tắc + nút "Tạm dừng 30 ngày".
- Trang `/unsubscribe` (sau khi bấm xác nhận): thêm lựa chọn "Chỉ tạm dừng 30 ngày" và "Chỉ tắt loại thư này" bên cạnh "Huỷ tất cả". Vẫn phải bấm mới có hiệu lực.
- Link huỷ trong thư thêm tham số `&c=<loại thư>` (không nằm trong token; token vẫn chỉ xác thực người dùng). Thiếu `c` (thư cũ) thì trang hỏi người dùng chọn loại. Link `List-Unsubscribe` một cú nhấp vẫn là tắt tất cả.
- Tạm dừng 30 ngày và tắt loại thư đều được kiểm tra lại ngay trước khi gửi (như opt-out hiện nay).
- Tạm dừng 30 ngày **không chặn** thư nhắc hết hạn Pro; giao diện nói rõ ("Thư nhắc hết hạn Pro vẫn được gửi; tắt riêng loại đó nếu không muốn"). Tắt loại `renewal` hoặc tắt tất cả thì chặn. (Admin đã xác nhận.)
- Không hiện hạn mức hay mốc ngày cho người dùng.

**Giao diện admin:** thẻ chiến dịch có nút "Sửa" mở bảng tham số với giá trị mặc định, khoảng cho phép và nút khôi phục mặc định.

### Đợt 3: gửi thủ công và nhật ký

**Gửi thủ công (`news`).** Bảng `marketing_broadcasts` (id, tiêu đề, nội dung, nhãn nút, đường dẫn nút, nhóm người nhận, trạng thái `DRAFT/SENDING/DONE/CANCELLED`, người tạo, thời điểm). Nội dung là văn bản thường (đoạn cách nhau dòng trống), được escape, không nhận HTML; một nút kêu gọi duy nhất với đường dẫn nội bộ. Nhóm người nhận chọn trong danh sách cố định: tất cả đã xác minh, đang Pro, chưa Pro, không hoạt động từ N ngày (N nhập vào, 7 đến 180), có buổi thi trong 30 ngày. Danh sách người nhận được tính lại mỗi ngày theo nhóm đó, không chụp sẵn: ai đã mua Pro hoặc huỷ giữa chừng tự rơi ra, và con số "N người, X ngày" ở hộp xác nhận chỉ là ước tính. Luôn loại người đã huỷ hoặc tắt `news` hoặc đang tạm dừng.
Quy trình: soạn → xem trước → gửi thử cho tôi → hộp xác nhận nêu số người nhận và số ngày gửi hết, phải gõ "GỬI" → bắt đầu ở lượt 10:00 kế tiếp. Gửi qua đúng hàng đợi và hạn mức hiện có (ghi log `broadcast:<id>`), tính vào giới hạn 1 thư / 7 ngày, có nút Dừng bất cứ lúc nào. Không có lối nào vượt hạn mức. Tối đa 1 đợt gửi thủ công đang chạy.

**Tab Nhật ký.** Danh sách phân trang từ `email_campaign_logs`: thời gian, người nhận (email), chiến dịch/bước, đã bấm, đã mua Pro hoặc quay lại. Lọc theo chiến dịch, khoảng ngày, và tìm theo email. Cần chỉ số mới `(campaign, sent_at)` (hiện chỉ có `(user_id, sent_at)` và `(campaign, step)`); thêm trong migration của Đợt 1 vì phần "hôm nay" và phễu 30 ngày cũng dùng. Các cột mới của log (`clickedAt`, `target`, `returnedAt`) cũng nằm trong migration đó; `claim()` nhận thêm `target` từ lúc dựng thư.

## 6. Ràng buộc

- Mặc định mọi thứ tắt; migration chỉ thêm cột/bảng; API chỉ thêm; backend deploy trước, rồi frontend.
- Chữ trên giao diện, email bằng tiếng Việt; code, commit, PR, nhánh bằng tiếng Anh. Không để bí mật, IP, hạn mức nội bộ trong file commit hoặc giao diện người dùng.
- Theo `fepass-conventions` và `architecture-rules`: tách lớp route → controller → service → repository; dùng lại `shared/ui` (Card, Switch, ConfirmDialog, QueryBoundary); truy vấn theo tập, tham số hoá; mỗi nhánh một việc, commit nhỏ.
- Chạy `verify-changes` trước khi báo xong; dự án chưa có test tự động, nên chạy test DB hiện có và bổ sung test cho phần chuyển hướng bấm, chống gửi vượt hạn mức khi gửi thủ công, và chọn người theo loại thư.

## 7. Giao cho người xây quyết định

Cách thiết kế tab (route con hay trạng thái trong trang); cách xem trước ảnh `cid:`; tên cột/bảng cụ thể; cách lưu tham số trong cài đặt; chi tiết chuyển đổi last-touch khi một người có nhiều thư; giao diện trên điện thoại cho bảng nhật ký.

## 8. Quyết định tạm của tôi (admin có thể đổi)

- Thứ tự ưu tiên trong hạn mức mỗi ngày: nhắc hết hạn Pro, rồi gửi thủ công, rồi gợi ý Pro, rồi winback (loại nhạy thời gian và do admin chủ động đi trước loại tự động lâu dài).
- Giờ chạy (10:00) chỉ hiển thị, không sửa được; "hạn mức mỗi lượt" đổi tên thành "hạn mức mỗi ngày" vì cron chạy một lần mỗi ngày.
- Cửa sổ ghi nhận mua Pro / quay lại là 7 ngày.
- Bỏ lượt bấm trong 30 giây đầu để lọc trình quét thư.
- Trần cứng: hạn mức mỗi lượt ≤ 300; khoảng cách thư ≥ 3 ngày.
- Nội dung gửi thủ công chỉ là văn bản thường, một nút, nhóm người nhận cố định.
- Người dùng chỉ thấy bốn loại thư và tạm dừng 30 ngày; không có tần suất tuỳ chỉnh.
