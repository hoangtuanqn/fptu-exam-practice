// Tiêu đề và mô tả riêng cho từng trang (SEO + khi chia sẻ link). Dùng chung cho:
//  - trình duyệt (src/shared/seo/PageMeta.tsx cập nhật khi chuyển trang)
//  - lúc build (vite.config.ts sinh sẵn file HTML cho các trang công khai, để Facebook/Zalo/bot đọc được mà không cần chạy JS)
// Mỗi trang một mô tả khác nhau, vì bot coi các trang trùng mô tả là một trang.

import subjectList from "./seo.subjects.json";

export interface PageSeo {
  title: string; // ngắn gọn, khoảng 60 ký tự trở xuống
  description: string; // khoảng 150 ký tự trở xuống, khác nhau giữa các trang
  index?: boolean; // true = cho phép lên Google (mặc định: không)
}

// Trang công khai, cho phép lên Google. Khoá là đường dẫn.
export const PUBLIC_PAGES: Record<string, PageSeo> = {
  "/": {
    title: "Luyện thi FE FPTU: đề FuOverflow có đáp án AI",
    description: "Dán một link FuOverflow là có ngay đề thi FE kèm đáp án AI, giải thích từng câu, chấm điểm thang 10. Cài tiện ích Chrome, đăng ký tặng credit.",
    index: true,
  },
  "/features": {
    title: "Tính năng nổi bật của Luyện thi FE FPTU",
    description: "Lấy đề bằng link, AI giải đáp án cả đề, giải thích từng câu, tải đề PE, tiện ích Chrome, nạp credit tự động. Xem toàn bộ tính năng tại đây.",
    index: true,
  },
  "/kho-de": {
    title: "Kho đề thi FE của mọi môn, có đáp án AI",
    description: "Xem danh sách đề thi FE của từng môn FPTU theo kỳ. Đăng ký miễn phí rồi mở đề ra luyện, có đáp án AI và chấm điểm thang 10.",
    index: true,
  },
  "/pro": {
    title: "Gói Pro 4 tháng chỉ 99.000đ, không giới hạn lượt",
    description: "Một lần 99.000đ dùng 4 tháng, rẻ hơn 93.000đ so với mua lẻ trên FuOverflow. Không giới hạn lượt lấy đề, giải thích AI và tải đề PE.",
    index: true,
  },
  "/changelog": {
    title: "Có gì mới: lịch sử cập nhật web và tiện ích",
    description: "Danh sách tính năng mới, cải tiến và sửa lỗi theo từng phiên bản của Luyện thi FE FPTU và tiện ích Chrome.",
    index: true,
  },
  "/register": {
    title: "Đăng ký tài khoản, nhận credit miễn phí",
    description: "Tạo tài khoản Luyện thi FE FPTU bằng email, Google hoặc GitHub. Đăng ký lần đầu nhận ngay credit để lấy đề và làm thử không tốn phí.",
    index: true,
  },
  "/login": {
    title: "Đăng nhập Luyện thi FE FPTU",
    description: "Đăng nhập bằng email, Google hoặc GitHub để vào kho đề của bạn, xem lịch sử làm bài và số dư credit.",
    index: true,
  },
};

// Trang không cho lên Google (cần đăng nhập, riêng tư, hoặc không có nội dung). Khoá là đường dẫn.
export const PRIVATE_PAGES: Record<string, PageSeo> = {
  "/forgot-password": { title: "Quên mật khẩu", description: "Nhập email để nhận liên kết đặt lại mật khẩu tài khoản Luyện thi FE FPTU." },
  "/reset-password": { title: "Đặt lại mật khẩu", description: "Tạo mật khẩu mới cho tài khoản Luyện thi FE FPTU của bạn." },
  "/verify-email": { title: "Xác minh email", description: "Xác minh địa chỉ email để mở khoá đầy đủ tính năng tài khoản." },
  "/auth/github/callback": { title: "Đăng nhập bằng GitHub", description: "Đang hoàn tất đăng nhập bằng tài khoản GitHub của bạn." },

  "/account": { title: "Tổng quan tài khoản", description: "Số dư credit, đề đã lấy, lần làm bài gần đây và các lối tắt trong tài khoản của bạn." },
  "/account/exams": { title: "Kho đề", description: "Đề bạn đã lấy và toàn bộ đề FE của từng môn. Bấm vào một đề để luyện tập hoặc thi thử." },
  "/account/catalog": { title: "Kho đề", description: "Chuyển sang Kho đề, tab Theo môn." },
  "/account/frequent": { title: "Câu hay ra", description: "Những câu lặp lại ở nhiều đề của cùng một môn, ôn trước để đạt hiệu quả cao nhất." },
  "/account/chapters": { title: "Bộ đề theo chương", description: "Chọn môn và chương, chỉ luyện các câu thuộc chương bạn đang muốn ôn." },
  "/account/review": { title: "Sổ câu sai", description: "Các câu bạn từng làm sai, tự nhắc ôn lại đúng lúc để nhớ lâu." },
  "/account/review/practice": { title: "Ôn câu sai", description: "Ôn lần lượt các câu đến hạn trong sổ câu sai của bạn." },
  "/account/pe": { title: "Tải đề thi PE", description: "Tải trọn bộ tài nguyên đề thi PE thành một file zip." },
  "/account/reports": { title: "Báo cáo đáp án", description: "Theo dõi các báo cáo đáp án sai bạn đã gửi và trạng thái xử lý." },
  "/account/nhan-luot": { title: "Nhận lượt giải thích", description: "Nhận lượt giải thích AI miễn phí sau khi vượt link." },
  "/account/grades": { title: "Điểm FAP", description: "Điểm trung bình từng kỳ, lịch thi và điểm cần đạt ở bài thi cuối kỳ để qua từng môn, lấy từ FAP khi bạn bật đồng bộ." },
  "/account/attempts": { title: "Lịch sử làm bài", description: "Xem lại các lần luyện tập, thi thử cùng điểm số từng lần." },
  "/account/deposit": { title: "Nạp credit", description: "Chuyển khoản qua mã QR để nạp credit, credit được cộng tự động." },
  "/account/referral": { title: "Giới thiệu bạn bè", description: "Mời bạn bè bằng mã giới thiệu, cả hai cùng nhận thưởng credit." },
  "/account/giftcode": { title: "Nhập giftcode", description: "Nhập mã quà tặng để nhận thêm credit vào tài khoản." },
  "/account/transactions": { title: "Lịch sử giao dịch", description: "Toàn bộ biến động credit: nạp, thưởng, mua đề và hoàn tiền." },
  "/account/profile": { title: "Hồ sơ cá nhân", description: "Đổi ảnh đại diện, tên hiển thị, mật khẩu và kết nối đăng nhập." },

  "/admin": { title: "Quản trị: tổng quan", description: "Số liệu tổng quan hệ thống dành cho quản trị viên." },
  "/admin/users": { title: "Quản trị: thành viên", description: "Danh sách và quản lý thành viên." },
  "/admin/referrals": { title: "Quản trị: giới thiệu", description: "Theo dõi lượt giới thiệu và thưởng." },
  "/admin/account-settings": { title: "Quản trị: cấu hình đăng ký", description: "Thiết lập tặng credit và quy tắc đăng ký." },
  "/admin/promotions": { title: "Quản trị: ưu đãi và khuyến mãi", description: "Cấu hình mốc thưởng nạp tiền và ưu đãi." },
  "/admin/wallet": { title: "Quản trị: biến động số dư", description: "Lịch sử cộng trừ credit của toàn bộ thành viên." },
  "/admin/crawl-jobs": { title: "Quản trị: lịch sử lấy đề", description: "Các lượt lấy đề từ link và trạng thái từng lượt." },
  "/admin/attempts": { title: "Quản trị: lịch sử làm bài", description: "Các lượt làm bài của thành viên." },
  "/admin/purchases": { title: "Quản trị: lịch sử mua", description: "Các lượt mua đề và mua gói." },
  "/admin/deposits": { title: "Quản trị: lệnh nạp tiền", description: "Danh sách lệnh nạp và trạng thái đối soát." },
  "/admin/bank-transactions": { title: "Quản trị: giao dịch ngân hàng", description: "Giao dịch ngân hàng nhận từ SePay." },
  "/admin/gift-codes": { title: "Quản trị: giftcode", description: "Tạo và quản lý mã quà tặng." },
  "/admin/sepay": { title: "Quản trị: cấu hình SePay", description: "Thiết lập kết nối cổng thanh toán SePay." },
  "/admin/exams": { title: "Quản trị: đề thi", description: "Quản lý kho đề thi và chỉnh sửa câu hỏi." },
  "/admin/reports": { title: "Quản trị: báo cáo đáp án", description: "Xử lý báo cáo đáp án sai từ người dùng." },
  "/admin/subject-issues": { title: "Quản trị: môn thiếu dữ liệu", description: "Các môn syllabus chưa có tên chương." },
  "/admin/link-rewards": { title: "Quản trị: vượt link", description: "Cấu hình và số liệu vượt link nhận lượt giải thích miễn phí." },
  "/admin/library": { title: "Quản trị: thư viện đề thi", description: "Cấu hình đề miễn phí và kỳ học của môn." },
  "/admin/crawler": { title: "Quản trị: cấu hình lấy đề", description: "Thiết lập bộ lấy đề từ FuOverflow." },
  "/admin/ai": { title: "Quản trị: AI giải đáp án", description: "Thiết lập mô hình AI giải đáp án và giải thích." },
  "/admin/funnel": { title: "Quản trị: phễu người dùng", description: "Người đăng ký đi được tới đâu: lấy đề, nộp bài, nạp tiền, mua Pro." },
  "/admin/quality": { title: "Quản trị: chất lượng đề", description: "Câu nhiều người sai và đáp án có thể sai theo bài làm thực tế." },
  "/admin/chatbot": { title: "Quản trị: chatbot hỗ trợ", description: "Cấu hình trợ lý Cóc Pass." },
};

// Trang có tham số trên đường dẫn (khớp theo mẫu)
export const PATTERN_PAGES: { test: RegExp; seo: PageSeo }[] = [
  { test: /^\/exam\/[^/]+$/, seo: { title: "Làm đề thi FE", description: "Làm đề thi FE với đáp án, giải thích AI và chấm điểm thang 10." } },
  { test: /^\/deposit\/[^/]+$/, seo: { title: "Thanh toán nạp credit", description: "Quét mã QR để chuyển khoản cho lệnh nạp credit này." } },
  { test: /^\/account\/attempts\/[^/]+$/, seo: { title: "Chi tiết lần làm bài", description: "Xem lại từng câu, đáp án đã chọn và điểm của lần làm bài này." } },
  { test: /^\/account\/deposit\/[^/]+$/, seo: { title: "Chi tiết lệnh nạp", description: "Theo dõi trạng thái và mã QR của lệnh nạp credit." } },
  { test: /^\/admin\/users\/[^/]+$/, seo: { title: "Quản trị: chi tiết thành viên", description: "Thông tin, ví và hoạt động của một thành viên." } },
  { test: /^\/admin\/exams\/[^/]+$/, seo: { title: "Quản trị: sửa đề thi", description: "Chỉnh sửa câu hỏi và đáp án của một đề thi." } },
];

export const NOT_FOUND_SEO: PageSeo = { title: "Không tìm thấy trang", description: "Địa chỉ này không tồn tại hoặc đã được chuyển đi. Quay về trang chủ để tiếp tục luyện đề." };

// Trang SEO của từng môn: /mon/<mã môn viết thường>. Danh sách lấy từ seo.subjects.json (npm run export:subjects ở backend).
export const SUBJECTS: { code: string; name: string }[] = subjectList;
const subjectByPath = new Map(SUBJECTS.map((s) => [`/mon/${s.code.toLowerCase()}`, s]));

export const subjectPath = (code: string) => `/mon/${code.toLowerCase()}`;

// Mỗi môn một tiêu đề và mô tả riêng (có mã môn và tên môn), nên không trùng nhau giữa 300+ trang
export function subjectSeo(s: { code: string; name: string }): PageSeo {
  return {
    title: `Đề thi FE ${s.code}: ${s.name}`,
    description: `Luyện đề thi FE môn ${s.code} (${s.name}) tại FEPass: đề có đáp án AI, giải thích từng câu, câu hay ra qua các kỳ thi, chấm điểm thang 10.`,
    index: true,
  };
}

export function seoFor(pathname: string): PageSeo {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const subject = subjectByPath.get(path.toLowerCase());
  if (subject) return subjectSeo(subject);
  return PUBLIC_PAGES[path] ?? PRIVATE_PAGES[path] ?? PATTERN_PAGES.find((p) => p.test.test(path))?.seo ?? NOT_FOUND_SEO;
}

export const TITLE_SUFFIX = " | FEPass";

// Tiêu đề hiển thị trên tab và kết quả tìm kiếm: trang chủ giữ nguyên, các trang khác thêm hậu tố thương hiệu
export function fullTitle(pathname: string, seo: PageSeo): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return path === "/" ? seo.title : seo.title + TITLE_SUFFIX;
}
