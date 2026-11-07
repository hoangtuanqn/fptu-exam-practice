# FEPass – Hướng dẫn sử dụng hệ thống

> File này có hai vai trò: (1) tài liệu mô tả giao diện và cách dùng FEPass cho người dùng; (2) kho tri thức của chatbot hỗ trợ. Chatbot chia file theo từng mục `##`, tạo embedding cho từng mục rồi tìm mục giống câu hỏi nhất để trả lời.
> Khi giao diện hay quy định đổi, hãy sửa file này rồi bấm "Cập nhật tri thức" ở Quản trị → Chatbot hỗ trợ.
> Các con số do admin cấu hình (giá lấy đề, giá giải thích, mức nạp tối thiểu, thưởng nạp, giảm giá gói...) KHÔNG ghi cứng ở đây: chatbot lấy giá trị hiện hành từ hệ thống.

## FEPass là gì
FEPass (fepass.top) là website luyện thi cho sinh viên FPT (FPTU) trên các đề thi FE đăng ở diễn đàn FuOverflow. Bạn dán link đề, hệ thống tự lấy đề về, bạn làm bài và được chấm điểm thang 10. AI giúp tìm đáp án và giải thích từng câu. Hệ thống dùng đơn vị tiền gọi là credit (1 ₫ nạp vào = 1 credit).
Hệ thống cũng hỗ trợ đề thi PE (thực hành): tải về bộ tài nguyên của đề dưới dạng file zip.

## Ai phát triển và vận hành FEPass
FEPass do Phạm Hoàng Tuấn phát triển và vận hành. Tuấn là Founder của MST Software và là Phó chủ nhiệm học thuật của CLB F-Code, Trường Đại học FPT, nhiệm kỳ thứ 12. Hệ thống được xây dựng để phục vụ sinh viên FPTU luyện thi. Chatbot không có thông tin liên hệ riêng của người phát triển; khi cần hỗ trợ trực tiếp (tiền, tài khoản, lỗi hệ thống), hãy dùng kênh hỗ trợ mà quản trị viên công bố trên website.

## Bản đồ giao diện
- Trang chủ (`/`): giới thiệu, ô dán link đề FuOverflow, vùng kéo thả thư mục đề, các ưu đãi, thanh cài tiện ích Chrome ở trên cùng.
- Trang làm bài (`/exam/<mã đề>`): hiện từng câu hỏi dạng ảnh, thanh chọn đáp án, nút nộp bài.
- Đăng nhập (`/login`), Đăng ký (`/register`), Quên mật khẩu (`/forgot-password`).
- Khu vực tài khoản (`/account`), menu bên trái gồm:
  - Học tập: Tổng quan, Kho đề của tôi, Tải đề thi PE, Báo cáo đáp án, Lịch sử làm bài.
  - Ví: Nạp credit, Giới thiệu bạn bè, Giftcode, Lịch sử giao dịch.
  - Cài đặt: Hồ sơ.
- Trang quản trị (`/admin`) chỉ dành cho quản trị viên, người dùng thường không thấy.

## Cần tài khoản không
Bạn có thể vào trang chủ, lấy đề và làm bài mà không cần đăng ký (khách). Đề của khách lưu theo trình duyệt đang dùng và có giới hạn số lượt lấy đề. Khi đăng ký hoặc đăng nhập, các đề đã lấy khi còn là khách được chuyển vào tài khoản. Muốn dùng các dịch vụ trừ credit (giải thích AI, tải đề PE, nạp tiền, báo cáo đáp án...) thì cần có tài khoản.

## Đăng ký, đăng nhập và quên mật khẩu
- Đăng ký ở `/register` bằng email, họ tên, mật khẩu (tối thiểu 8 ký tự, có chữ cái và chữ số). Có thể đăng nhập nhanh bằng Google hoặc GitHub nếu nút tương ứng hiện trên trang (ảnh đại diện được lấy tự động).
- Sau khi đăng ký, hệ thống gửi email xác minh. Hãy mở thư (kiểm tra cả mục Spam) và bấm liên kết. Chưa xác minh email thì chưa dùng được các dịch vụ trừ credit; nạp credit và nhận credit vẫn bình thường. Chưa nhận được thư thì vào Tài khoản → Hồ sơ để gửi lại.
- Quên mật khẩu: vào `/forgot-password`, nhập email, hệ thống gửi liên kết đặt lại mật khẩu (có hạn dùng, và chỉ gửi lại sau khoảng 1 phút). Đặt lại xong, mọi thiết bị phải đăng nhập lại.
- Đổi mật khẩu khi đang đăng nhập: vào Tài khoản → Hồ sơ.

## Lấy đề từ FuOverflow
1. Mở bài đề thi trên FuOverflow (diễn đàn có gắn nhãn "Đề thi FE") và copy đường link của bài đó (dạng `fuoverflow.com/threads/...`).
2. Ở trang chủ FEPass, dán link vào ô lấy đề rồi bấm lấy đề. Link có dạng `https://fuoverflow.com/threads/pro192-su26-fe.7094/`.
3. Hệ thống đọc bài, tải ảnh từng câu và hiện tiến độ. Bạn có thể bắt đầu làm khi các câu đầu tiên đã sẵn sàng, các câu còn lại hiện dần.
4. Đề vào "Kho đề của tôi" (Tài khoản → Kho đề của tôi) để mở lại bất cứ lúc nào.
Lưu ý: phí lấy đề do admin đặt (xem giá hiện hành ở phần thông tin hệ thống). Đề bạn đã có trong kho hoặc đang được lấy thì không bị tính phí lần nữa. Lấy đề lỗi thì phí được hoàn lại. Đề đã có người khác lấy trước đó thì dùng lại nhanh hơn.

## Tìm đề thi trên FuOverflow (đi từ môn học đến link đề)
FuOverflow (fuoverflow.com) là diễn đàn của sinh viên FPT. Xem đề không cần tài khoản FuOverflow; đăng nhập chỉ cần khi bạn muốn bình luận hay đăng bài.
1. Vào fuoverflow.com. Ở trang chủ (hoặc menu "Diễn đàn") bấm vào mục "TÀI LIỆU CÁC MÔN HỌC" (địa chỉ `fuoverflow.com/categories/subjects/`).
2. Trang này liệt kê các môn theo kỳ: "Tổng hợp - Chưa rõ kỳ", rồi "Kỳ 0" đến "Kỳ 9". Môn nào học ở kỳ nào thì nằm trong kỳ đó, và môn được ghi bằng mã môn (ví dụ PRJ301, PRO192, MAD101, SWP391), chưa thấy tên đầy đủ. Không biết môn thuộc kỳ nào thì tìm trong "Tổng hợp - Chưa rõ kỳ", hoặc dùng ô tìm kiếm của diễn đàn và gõ mã môn.
3. Bấm vào mã môn để vào trang của môn đó (dạng `fuoverflow.com/forums/PRJ301/`). Đây là danh sách các bài đăng của môn, bài mới hoạt động gần đây nằm trên cùng, có thể nhiều trang.
4. Mỗi bài có nhãn phía trước tên: "Đề Thi FE" (đề lý thuyết trắc nghiệm, là loại FEPass làm bài được) và "Đề Thi PE" (đề thực hành). Dùng bộ lọc "Lọc" để chỉ hiện nhãn cần xem, hoặc lật qua các trang để tìm kỳ cũ hơn.
5. Bấm vào một bài "Đề Thi FE" để mở. Trong bài có thông tin Campus, Học kỳ, Loại tài liệu và các ảnh câu hỏi đính kèm (Q1, Q2...).
6. Copy đường link trên thanh địa chỉ (dạng `https://fuoverflow.com/threads/prj301-su26-fe.7117/`) rồi dán vào ô lấy đề ở trang chủ FEPass để làm bài (xem mục "Lấy đề từ FuOverflow"). Nếu đã cài tiện ích Chrome của FEPass thì bài "Đề Thi FE" có sẵn nút "Làm đề", bấm là mở FEPass lấy đề luôn, không cần copy link.
Lưu ý: mục "Suộc" và "Membership" trên FuOverflow là phần bán tài liệu riêng của FuOverflow (tính bằng điểm của họ), không liên quan đến credit của FEPass.

## Đọc tên bài đề thi trên FuOverflow
Tên bài thường theo dạng `MÃ MÔN - KỲ - LOẠI`, ví dụ "PRJ301 - SU26 - FE":
- Mã môn: PRJ301, PRO192...
- Kỳ thi: SP (Spring), SU (Summer), FA (Fall) kèm năm, ví dụ SU26 là Summer 2026, FA25 là Fall 2025. Muốn ôn đề mới nhất thì chọn kỳ có năm lớn nhất.
- Loại: FE là đề thi lý thuyết, PE là thực hành; một số bài ghi thêm đợt (B1, B5...) hoặc "RE" (có vẻ là đề thi lại, bạn xem nội dung bài để chắc).
Một môn có thể có nhiều bài cho cùng một kỳ (nhiều bộ đề), cứ mở từng bài để xem.

## Kéo thả thư mục đề có sẵn
Nếu bạn đã có ảnh đề trên máy, kéo thả cả thư mục vào vùng thả ở trang chủ (hoặc bấm chọn thư mục). Thư mục gồm các ảnh `1.webp`, `2.webp`... mỗi ảnh là một câu, và có thể có file `ans.txt`: dòng N là đáp án câu N (nhiều đáp án cách nhau bằng dấu cách, ví dụ `A C D`). Cách này không qua máy chủ và không tốn credit.

## Làm bài: chế độ Luyện tập và Thi
- Luyện tập: chọn đáp án rồi xác nhận, kết quả đúng sai của từng câu hiện ngay để vừa làm vừa học.
- Thi: làm hết các câu, nộp bài mới chấm điểm, không xem đúng sai trong lúc làm.
- Điểm tính theo thang 10, kèm thời gian làm bài và số câu bỏ trống. Có thể đánh dấu câu muốn xem lại.
- Phím tắt: mũi tên trái/phải để đổi câu, Enter để xác nhận.
- Câu nhiều đáp án đúng thì chọn nhiều chữ cái.
- Bài làm dở được lưu tự động; tải lại trang vẫn làm tiếp được trong vài ngày.
- Nút "Tài liệu" (nếu có) mở các ảnh tài liệu tham khảo của đề, không tính điểm.
- Nộp bài xong, kết quả lưu ở Tài khoản → Lịch sử làm bài, xem lại chi tiết từng câu bất cứ lúc nào.

## Đáp án đang được AI phân tích
Với đề mới lấy về, AI cần một lúc để tìm đáp án. Trong lúc đó bạn vẫn mở và làm được đề, nhưng chưa chấm được và đồng hồ chưa tính giờ cho đến khi có đáp án. Đáp án sẵn sàng thì giao diện tự cập nhật. Nếu AI báo lỗi, đề ở trạng thái chưa có đáp án; bạn có thể bấm thử lại (có khoảng chờ giữa hai lần thử) hoặc báo quản trị viên.

## Giải thích AI từng câu
- Ở mỗi câu có nút "Giải thích". AI chỉ chạy khi bạn bấm nút này, nên không tốn credit nếu bạn không bấm.
- Mỗi câu giải thích tốn một khoản credit (giá hiện hành xem ở thông tin hệ thống). Mua một câu rồi thì xem lại miễn phí mãi mãi. AI không tạo được lời giải thì bạn không bị trừ credit.
- Mỗi tài khoản có một số lượt xem thử miễn phí (số lượt xem ở thông tin hệ thống).
- Nếu ví không đủ credit, hệ thống dẫn bạn sang trang nạp credit với số tiền còn thiếu đã điền sẵn.

## Gói mở khóa toàn bộ lời giải của một đề
Thay vì mua lẻ từng câu, bạn có thể mua gói "Mở khóa toàn bộ lời giải AI" của đề đang làm. Giá gói rẻ hơn mua lẻ theo phần trăm giảm giá hiện hành, chỉ tính các câu bạn chưa mua lẻ. Mua một lần là xem lại không giới hạn cho đề đó. Mua gói không chạy AI ngay: AI chỉ phân tích khi bạn bấm "Giải thích" ở từng câu. Gói hiện ở dải/thẻ phía trên câu hỏi, có thể thu gọn. Ưu đãi giảm giá có thể có hạn chót, khi đó có đồng hồ đếm ngược.

## Báo cáo đáp án sai
Thấy đáp án chính thức của một câu chưa đúng? Dùng nút báo cáo ở câu đó, chọn đáp án bạn cho là đúng và ghi lý do (tối thiểu 10 ký tự). Quản trị viên xem xét; nếu báo cáo đúng, bạn được thưởng 200 credit và đáp án được sửa cho mọi người. Mỗi câu chỉ báo cáo một lần, tối đa 20 báo cáo mỗi ngày, và chỉ báo cáo được khi đề đã có đáp án chính thức. Xem trạng thái ở Tài khoản → Báo cáo đáp án.

## Nạp credit
1. Vào Tài khoản → Nạp credit.
2. Nhập số tiền (có mức tối thiểu, xem ở thông tin hệ thống) rồi tạo lệnh nạp.
3. Chuyển khoản ngân hàng đúng số tiền và đúng nội dung chuyển khoản (mã lệnh) hiển thị trên màn hình, có mã QR để quét.
4. Credit được cộng tự động sau ít phút khi hệ thống nhận được tiền. 1 ₫ = 1 credit.
Lưu ý: lệnh nạp có thời hạn thanh toán; quá hạn thì tạo lệnh mới. Chuyển sai nội dung hoặc sai số tiền có thể không tự khớp lệnh, khi đó hãy liên hệ quản trị viên kèm ảnh giao dịch. Có thể gửi đường link lệnh nạp (`/deposit/<mã>`) cho người khác mở xem để chuyển khoản hộ. Nạp nhiều được thưởng thêm credit theo các mức do admin cấu hình (xem ở thông tin hệ thống). Lịch sử nạp và biến động số dư xem ở Lịch sử giao dịch.

## Điểm danh hằng ngày nhận credit
- Mỗi ngày vào FEPass (đã đăng nhập), một hộp "Điểm danh hằng ngày" hiện ra ngay. Bấm **Nhận** để được tặng **25 credit**.
- Điểm danh đủ **7 ngày liên tiếp**: ngày thứ 7 nhận 25 credit của ngày đó cộng thêm **100 credit** thưởng (tổng 125 credit ở ngày 7). Sau đó vòng mới bắt đầu lại từ ngày 1.
- Bỏ lỡ một ngày thì chuỗi tính lại từ ngày 1. Ngày được tính theo giờ Việt Nam, qua **0h** là sang ngày mới và điểm danh được tiếp.
- Đã nhận trong ngày thì hộp không hiện lại cho tới sau 0h. Nếu lỡ đóng hộp khi chưa nhận, mở lại bằng **avatar (góc phải) → Điểm danh nhận thưởng**.
- Cần email đã xác minh mới nhận được. Credit điểm danh hiện ở Tài khoản → Lịch sử giao dịch với tên "Thưởng điểm danh".

## Giftcode
Có mã quà tặng? Vào Tài khoản → Giftcode, nhập mã để nhận credit. Mỗi mã chỉ dùng được một lần cho mỗi tài khoản, mã có thể hết lượt hoặc hết hạn. Danh sách mã đã nhập hiện ngay bên dưới.

## Giới thiệu bạn bè
Vào Tài khoản → Giới thiệu bạn bè để lấy mã và liên kết giới thiệu của bạn (dạng `fepass.top/register?ref=MÃ`). Bạn bè đăng ký qua liên kết đó thì hai bên có thể nhận thưởng credit, và bạn có thể nhận hoa hồng khi người được giới thiệu nạp tiền (mức thưởng do admin cấu hình). Nếu bạn là người được giới thiệu nhưng quên nhập mã lúc đăng ký, có thể nhập mã ở trang này trong thời hạn cho phép; quá hạn thì không nhập được nữa.

## Tải đề thi PE
Đề thi PE (thực hành) là bài đăng ở FuOverflow gắn nhãn "Đề Thi PE", chứa bộ tài nguyên đính kèm thay vì ảnh câu hỏi.
1. Vào Tài khoản → Tải đề thi PE (hoặc dùng nút "Tải đề PE" của tiện ích Chrome).
2. Dán link bài PE rồi xác nhận.
3. Hệ thống gom các file đính kèm thành một file zip, tên file là tiêu đề bài; trình duyệt tải về.
Phí là 50 credit cho mỗi đề, chỉ trả MỘT lần cho mỗi đề: lần sau tải lại miễn phí. Tải lỗi thì được hoàn credit. Lịch sử các đề đã tải nằm ngay trong trang. Nếu bài không có file đính kèm (ví dụ tài nguyên chỉ là link Drive) thì hệ thống báo không có file và không tính phí.

## Tiện ích Chrome FePass
Tiện ích thêm nút ngay trên FuOverflow: với bài "Đề thi FE" có nút "Làm đề" (kèm giá) để mở FEPass và lấy đề, với bài "Đề thi PE" có nút "Tải đề PE". Trước khi trừ credit luôn có hộp xác nhận.
Cách cài (thủ công):
1. Bấm thanh "cài tiện ích" ở đầu trang chủ FEPass (hoặc tải file `fepass_extension.zip`).
2. Giải nén file zip ra một thư mục.
3. Mở Chrome, vào `chrome://extensions`, bật "Chế độ nhà phát triển" (Developer mode).
4. Bấm "Tải tiện ích đã giải nén" (Load unpacked) và chọn thư mục vừa giải nén.
5. Mở FuOverflow, các nút sẽ hiện ở danh sách bài và trong bài.
6. Đăng nhập fepass.top ở cùng trình duyệt để tiện ích dùng được tài khoản của bạn. Chưa đăng nhập thì tiện ích hiện thông báo yêu cầu đăng nhập.
Khi có bản mới, biểu tượng tiện ích hiện dấu "!" và có hướng dẫn cập nhật: tải lại zip, giải nén đè lên thư mục cũ rồi bấm nút tải lại ở trang `chrome://extensions`. Thanh nhắc cài tiện ích ở trang chủ tự ẩn khi bạn đã cài.

## Kho đề của tôi
Tài khoản → Kho đề của tôi liệt kê mọi đề bạn đã lấy. Từ đây bấm vào đề để làm tiếp, xem trạng thái đáp án (AI giải, chỉnh tay, đang phân tích...).

## Lịch sử làm bài và lịch sử giao dịch
- Lịch sử làm bài: mọi lần nộp bài, kèm điểm, số câu đúng/sai/bỏ trống, thời gian; bấm vào để xem chi tiết từng câu với đáp án bạn chọn và đáp án đúng tại thời điểm chấm.
- Lịch sử giao dịch: mọi biến động credit (nạp, thưởng, trừ khi lấy đề/giải thích/tải PE, hoàn tiền...), có ghi chú lý do.

## Hồ sơ cá nhân
Tài khoản → Hồ sơ: đổi họ tên, đổi mật khẩu (nhập mật khẩu hiện tại), xem trạng thái xác minh email và gửi lại thư xác minh, đổi email đăng nhập (email chỉ đổi sau khi bạn bấm liên kết trong thư gửi tới địa chỉ mới).

## Hết credit hoặc không đủ credit
Khi một thao tác cần credit mà ví không đủ, hộp thoại báo số còn thiếu và có nút sang trang nạp credit với số tiền đã điền sẵn; sau khi nạp xong bạn quay lại làm tiếp. Ngoài nạp tiền, bạn có thể nhận credit từ giftcode, giới thiệu bạn bè, báo cáo đáp án đúng, hoặc thưởng khi nạp nhiều.

## Tài khoản bị khoá hoặc không đăng nhập được
Tài khoản bị khoá không đăng nhập được. Hãy liên hệ quản trị viên để biết lý do. Nếu chỉ quên mật khẩu, dùng "Quên mật khẩu". Nếu không nhận được email, kiểm tra thư mục Spam và đúng địa chỉ email đã đăng ký.

## Cóc Pass làm được và không làm được gì
Cóc Pass (chatbot) hướng dẫn cách dùng FEPass. Khi bạn đã đăng nhập, Cóc Pass còn tra cứu giúp dữ liệu của CHÍNH BẠN (chỉ xem, không sửa): số dư và thông tin tài khoản, kho đề, các bài đang làm dở, kết quả các lần nộp bài, lịch sử nạp tiền, biến động số dư, đề PE đã tải, lời giải đã mở khóa, báo cáo đáp án đã gửi, thống kê điểm, giftcode đã nhập. Ngoài ra Cóc Pass tra được danh sách đề của một môn trên FuOverflow (ví dụ "PRO192 có những đề FE nào"), kể cả khi chưa đăng nhập. Ví dụ hỏi "tôi đang làm dở đề nào", "lịch sử nạp của tôi", "số dư còn bao nhiêu". Khách chưa đăng nhập không tra cứu được dữ liệu cá nhân.
Cóc Pass không thao tác thay bạn (không lấy đề, không nạp tiền, không cộng hay hoàn credit, không đổi mật khẩu), không xem được dữ liệu của người khác, không giải bài hay giải thích kiến thức môn học (hãy dùng nút "Giải thích" ở từng câu) và không xử lý khiếu nại giao dịch. Vấn đề về tiền, tài khoản bị khoá hoặc lỗi hệ thống cần báo quản trị viên.
