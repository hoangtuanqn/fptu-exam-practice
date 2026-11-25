// Nội dung các trang chính sách. Ghi {email} ở đâu thì trang tự thay bằng email liên hệ (brand.contactEmail).
// Đổi nội dung quan trọng thì cập nhật `updated` để người dùng biết bản mới.

export interface LegalSection {
  title: string;
  items: string[]; // mỗi mục là một gạch đầu dòng
}

export interface LegalDoc {
  slug: string; // đường dẫn: /<slug>
  title: string;
  summary: string; // mô tả ngắn ở trang chính sách và trên đầu trang
  updated: string;
  sections: LegalSection[];
}

export const TERMS: LegalDoc = {
  slug: "dieu-khoan",
  title: "Điều khoản sử dụng",
  summary: "Quy định khi bạn tạo tài khoản và dùng FEPass.",
  updated: "25/11/2026",
  sections: [
    {
      title: "1. Về FEPass",
      items: [
        "FEPass là nền tảng độc lập giúp sinh viên luyện đề thi FE. FEPass không trực thuộc, không đại diện và không có liên kết chính thức với Đại học FPT hay bất kỳ trường nào.",
        "Đề thi do thành viên và đối tác chia sẻ, chỉ dùng để tham khảo, ôn tập cá nhân.",
        "Đáp án và lời giải do AI tạo ra có thể sai. FEPass không bảo đảm kết quả thi của bạn.",
      ],
    },
    {
      title: "2. Tài khoản",
      items: [
        "Bạn chịu trách nhiệm về mọi hoạt động trên tài khoản của mình và cần giữ mật khẩu an toàn.",
        "Mỗi người một tài khoản. Không cho mượn, dùng chung, mua bán tài khoản.",
        "Thông tin bạn cung cấp (email, tên) cần chính xác. Dịch vụ dành cho người từ 16 tuổi trở lên.",
        "Bạn có thể đăng ký bằng email, Google hoặc GitHub.",
      ],
    },
    {
      title: "3. Những việc không được làm",
      items: [
        "Dùng bot, script hay công cụ tự động để tải, sao chép đề hoặc nội dung trên FEPass, hoặc làm chậm hệ thống.",
        "Bán lại, đăng lại hàng loạt đề và đáp án lấy từ FEPass.",
        "Lạm dụng giftcode, mã giới thiệu, ưu đãi: tạo nhiều tài khoản để nhận thưởng, tự giới thiệu chính mình.",
        "Dùng FEPass để gian lận trong kỳ thi đang diễn ra hoặc vi phạm quy chế thi của trường.",
        "Tìm cách vượt qua các biện pháp bảo vệ, truy cập dữ liệu của người khác.",
      ],
    },
    {
      title: "4. Credit, gói Pro và thanh toán",
      items: [
        "Một số tính năng dùng credit hoặc gói Pro. Giá và quyền lợi hiển thị trước khi bạn trả.",
        "Quy định nạp tiền, hạn dùng và hoàn tiền nằm ở trang Thanh toán và hoàn tiền.",
      ],
    },
    {
      title: "5. Nội dung bạn gửi",
      items: [
        "Bạn giữ quyền với nội dung mình gửi (ảnh đề thi đóng góp, báo cáo đáp án, tin nhắn) và cho phép FEPass lưu trữ, xử lý, hiển thị nội dung đó để vận hành dịch vụ.",
        "Chỉ gửi nội dung bạn có quyền chia sẻ. Không gửi nội dung vi phạm pháp luật hoặc chứa thông tin cá nhân của người khác.",
        "FEPass có thể ẩn hoặc gỡ nội dung vi phạm mà không cần báo trước.",
      ],
    },
    {
      title: "6. Bản quyền",
      items: [
        "Nếu bạn là chủ sở hữu bản quyền hoặc người đại diện hợp pháp và thấy nội dung vi phạm, hãy gửi email tới {email} kèm thông tin liên hệ, đường dẫn tới nội dung và bằng chứng quyền sở hữu.",
        "Yêu cầu hợp lệ sẽ được xử lý bằng cách gỡ, chỉnh sửa hoặc ẩn nội dung liên quan.",
      ],
    },
    {
      title: "7. Xử lý vi phạm",
      items: [
        "Tuỳ mức độ, FEPass có thể cảnh cáo, hạn chế tính năng hoặc khoá tài khoản.",
        "Tài khoản bị khoá do vi phạm không được hoàn credit, gói Pro hay các khoản đã thanh toán.",
      ],
    },
    {
      title: "8. Giới hạn trách nhiệm",
      items: [
        "Dịch vụ được cung cấp trên cơ sở “hiện có”. FEPass cố gắng hoạt động ổn định nhưng không bảo đảm không gián đoạn hay không có lỗi.",
        "Trong phạm vi pháp luật cho phép, trách nhiệm của FEPass với bạn không vượt quá số tiền bạn đã thanh toán trong 12 tháng gần nhất.",
      ],
    },
    {
      title: "9. Luật áp dụng và thay đổi",
      items: [
        "Điều khoản này theo pháp luật Việt Nam. Tranh chấp ưu tiên giải quyết bằng thương lượng, nếu không được thì đưa ra cơ quan có thẩm quyền tại Việt Nam.",
        "FEPass có thể cập nhật điều khoản, ngày cập nhật ghi ở đầu trang. Tiếp tục dùng sau khi cập nhật nghĩa là bạn đồng ý bản mới.",
        "Câu hỏi về điều khoản: {email}.",
      ],
    },
  ],
};

export const PRIVACY: LegalDoc = {
  slug: "bao-mat",
  title: "Chính sách bảo mật",
  summary: "FEPass thu thập dữ liệu nào, dùng ra sao và bạn có quyền gì.",
  updated: "25/11/2026",
  sections: [
    {
      title: "1. Dữ liệu chúng tôi thu thập",
      items: [
        "Tài khoản: email, tên, mật khẩu (chỉ lưu dạng băm), mã định danh khi bạn đăng nhập bằng Google hoặc GitHub, ảnh đại diện nếu bạn tải lên.",
        "Học tập: đề bạn đã mở, bài làm và điểm, câu đã lưu, sổ câu sai, mục tiêu học, huy hiệu.",
        "Giao dịch: lệnh nạp, số dư credit, lịch sử mua, giftcode đã dùng, mã giới thiệu.",
        "Nội dung bạn gửi: ảnh đề đóng góp, báo cáo đáp án, tin nhắn với trợ lý, slide bạn tải lên để phân tích.",
        "Kỹ thuật: địa chỉ IP, trình duyệt, thiết bị và thời điểm truy cập, dùng để bảo mật và chống lạm dụng.",
        "Tiện ích Chrome: chỉ khi bạn tự bật đồng bộ điểm FAP, tiện ích đọc bảng điểm và lịch thi trên trang FAP bằng phiên đăng nhập của chính bạn rồi gửi lên tài khoản FEPass. Tắt đồng bộ thì dữ liệu này bị xoá.",
      ],
    },
    {
      title: "2. Mục đích sử dụng",
      items: [
        "Vận hành dịch vụ: đăng nhập, mở đề, chấm điểm, nhắc ôn, hỗ trợ.",
        "Xử lý thanh toán và đối soát credit.",
        "Gửi email cần thiết (xác minh, đặt lại mật khẩu, giao dịch) và email gợi ý ôn tập, ưu đãi nếu bạn không từ chối.",
        "Bảo vệ hệ thống: phát hiện đăng nhập bất thường, spam, gian lận.",
        "Cải thiện dịch vụ dựa trên số liệu tổng hợp. FEPass không bán dữ liệu cá nhân của bạn.",
      ],
    },
    {
      title: "3. Bên thứ ba xử lý dữ liệu",
      items: [
        "Nhà cung cấp AI (Anthropic, OpenAI): nhận nội dung câu hỏi, tin nhắn với trợ lý và slide bạn gửi để tạo lời giải. Chúng tôi không gửi email hay mật khẩu của bạn.",
        "Google và GitHub: xác thực khi bạn chọn đăng nhập bằng họ.",
        "Cloudflare Turnstile: kiểm tra chống bot ở một số biểu mẫu.",
        "SePay và ngân hàng: xử lý chuyển khoản nạp credit.",
        "Nhà cung cấp email: gửi thư hệ thống tới bạn.",
        "Google Tag Manager: đo lường lượt truy cập ở dạng tổng hợp.",
        "Một số bên ở nước ngoài, nên dữ liệu có thể được xử lý ngoài Việt Nam.",
      ],
    },
    {
      title: "4. Ai thấy dữ liệu của bạn",
      items: [
        "Email, bài làm và dữ liệu giao dịch không hiện công khai.",
        "Đội ngũ quản trị chỉ xem dữ liệu của bạn khi cần hỗ trợ, xử lý báo cáo hoặc chống gian lận.",
        "Chúng tôi chỉ cung cấp dữ liệu cho cơ quan nhà nước khi có yêu cầu hợp pháp.",
      ],
    },
    {
      title: "5. Lưu trữ và bảo mật",
      items: [
        "Mật khẩu được băm một chiều. Kết nối tới FEPass dùng HTTPS.",
        "Dữ liệu được giữ trong thời gian tài khoản còn hoạt động. Khi bạn xoá tài khoản, phần được giữ lại ghi ở mục 7.",
        "Không có hệ thống nào an toàn tuyệt đối. Nếu phát hiện sự cố liên quan tới bạn, chúng tôi sẽ thông báo theo quy định.",
      ],
    },
    {
      title: "6. Quyền của bạn",
      items: [
        "Xem và sửa thông tin cá nhân, đổi mật khẩu trong mục Hồ sơ.",
        "Từ chối email gợi ý và ưu đãi bằng liên kết trong thư. Thư về tài khoản và giao dịch vẫn được gửi.",
        "Tự xoá tài khoản trong mục Hồ sơ (xem mục 7). Hỏi về dữ liệu của bạn: gửi email tới {email}.",
      ],
    },
    {
      title: "7. Xoá tài khoản",
      items: [
        "Vào Hồ sơ, chọn Xoá tài khoản rồi xác nhận bằng mật khẩu, hoặc bằng email nếu bạn đăng nhập bằng Google hay GitHub. Không vào được tài khoản thì gửi email tới {email}.",
        "Cần chờ đơn Coursera đang xử lý và lệnh nạp đang chờ thanh toán kết thúc trước khi gửi yêu cầu.",
        "Tài khoản đóng ngay và mọi thiết bị bị đăng xuất. Đăng nhập lại trong vòng 14 ngày là huỷ yêu cầu.",
        "Sau 14 ngày không khôi phục được: tên, email, ảnh đại diện, liên kết Google hoặc GitHub, câu đã lưu, sổ câu sai, lịch ôn, huy hiệu, bảng điểm và lịch thi đã đồng bộ, slide đã tải lên, câu bạn hỏi trợ lý được xoá hoặc ẩn danh. Số dư credit và gói Pro còn lại bị huỷ, không hoàn tiền.",
        "Chúng tôi vẫn giữ: lịch sử nạp tiền, chuyển khoản và biến động credit (phục vụ kế toán, đối soát), kết quả bài làm, nội dung bạn đã đóng góp hoặc bình luận. Một số ghi chép cũ, ví dụ thưởng giới thiệu trong lịch sử của người khác, có thể vẫn nhắc tên bạn.",
        "Chúng tôi lưu mã băm của email đã xoá để việc đăng ký lại không nhận quà đăng ký và thưởng giới thiệu lần nữa. Bạn vẫn đăng ký lại được bằng email đó.",
      ],
    },
    {
      title: "8. Cookie và bộ nhớ trình duyệt",
      items: [
        "FEPass lưu thông tin đăng nhập, giao diện sáng/tối và mã giới thiệu trong trình duyệt để dịch vụ hoạt động.",
        "Công cụ đo lường (Google Tag Manager) có thể đặt cookie của họ. Bạn có thể chặn cookie trong trình duyệt, nhưng một số tính năng có thể không dùng được.",
      ],
    },
    {
      title: "9. Thay đổi và liên hệ",
      items: [
        "Ngày cập nhật ghi ở đầu trang. Thay đổi quan trọng sẽ được thông báo trên website.",
        "Liên hệ về dữ liệu cá nhân: {email}.",
      ],
    },
  ],
};

export const REFUND: LegalDoc = {
  slug: "thanh-toan-hoan-tien",
  title: "Thanh toán và hoàn tiền",
  summary: "Cách nạp credit, mua gói Pro và khi nào được hoàn.",
  updated: "25/11/2026",
  sections: [
    {
      title: "1. Credit",
      items: [
        "Credit dùng để mở đề và dùng các tính năng AI. Credit không đổi thành tiền mặt và không chuyển cho người khác.",
        "Credit tặng (đăng ký, giftcode, thưởng) có thể có hạn dùng, hiển thị trong lịch sử giao dịch.",
      ],
    },
    {
      title: "2. Nạp tiền",
      items: [
        "Nạp bằng chuyển khoản theo mã QR, giữ nguyên nội dung chuyển khoản để hệ thống cộng credit tự động.",
        "Đã chuyển khoản nhưng chưa thấy credit: gửi email tới {email} kèm mã lệnh nạp và ảnh giao dịch.",
      ],
    },
    {
      title: "3. Gói Pro",
      items: [
        "Gói Pro tính theo thời hạn hiển thị ở trang Pro tại thời điểm mua.",
        "Hết hạn thì quyền lợi Pro dừng, dữ liệu học của bạn vẫn giữ nguyên.",
      ],
    },
    {
      title: "4. Hoàn tiền",
      items: [
        "Được xem xét hoàn: bị trừ credit nhưng không nhận được dịch vụ, nạp hoặc thanh toán trùng, lỗi hệ thống khiến dịch vụ không dùng được.",
        "Nhiều trường hợp lỗi (ví dụ AI không giải thích được) được hệ thống hoàn credit tự động.",
        "Không hoàn khi đổi ý sau khi đã mở đề hoặc dùng tính năng, vì nội dung số được cung cấp ngay.",
        "Yêu cầu gửi tới {email} trong vòng 7 ngày kể từ giao dịch. Khoản hoàn được trả về số dư credit.",
      ],
    },
    {
      title: "5. Tài khoản bị khoá",
      items: ["Tài khoản bị khoá do vi phạm Điều khoản sử dụng không được hoàn credit, gói Pro hay khoản đã thanh toán."],
    },
  ],
};

export const LEGAL_DOCS = [TERMS, PRIVACY, REFUND];
