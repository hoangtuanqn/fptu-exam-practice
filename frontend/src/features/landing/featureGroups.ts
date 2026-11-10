import { BarChart3, Bot, CalendarCheck, Crown, FileDown, GraduationCap, Link2, MessageCircleQuestion, Puzzle, Save, Sparkles, Timer, Wallet, type LucideIcon } from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
  pro?: boolean; // tính năng có ưu đãi riêng cho gói Pro
}
export interface FeatureGroup {
  icon: LucideIcon;
  title: string;
  tag: string;
  features: Feature[];
}

// Bảng tính năng chính của hệ thống (trang chủ + trang /features). Chỉ giữ những thứ quan trọng nhất, mỗi nhóm 3 mục.
export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    icon: Link2,
    title: "Lấy đề và làm bài",
    tag: "Cốt lõi",
    features: [
      { icon: Link2, title: "Lấy đề bằng một link", text: "Dán link FuOverflow, hệ thống tự lấy ảnh và lưu vào kho riêng của bạn.", pro: true },
      { icon: Timer, title: "Luyện tập và Thi thử", text: "Xem đúng sai từng câu, hoặc thi có đếm ngược và tự nộp khi hết giờ." },
      { icon: BarChart3, title: "Chấm điểm thang 10", text: "Điểm tính tự động, kèm lịch sử từng lần làm và điểm cao nhất." },
    ],
  },
  {
    icon: Bot,
    title: "AI đồng hành",
    tag: "Thông minh",
    features: [
      { icon: Bot, title: "AI giải đáp án cả đề", text: "Mỗi đề có đáp án do AI giải, đối chiếu cả bình luận trên FuOverflow.", pro: true },
      { icon: Sparkles, title: "Giải thích từng câu", text: "Bấm vào câu bất kỳ để biết vì sao đúng, vì sao các lựa chọn kia sai.", pro: true },
      { icon: MessageCircleQuestion, title: "Trợ lý Cóc Pass", text: "Hỏi cách dùng web, tra đề theo môn, xem dữ liệu tài khoản của bạn." },
    ],
  },
  {
    icon: Puzzle,
    title: "Tiện ích và tài nguyên",
    tag: "Tiện lợi",
    features: [
      { icon: Puzzle, title: "Tiện ích Chrome", text: "Nút làm đề ngay cạnh bài “Đề Thi FE” trên FuOverflow, bấm là mở sang FEPass. Bật đồng bộ điểm FAP để biết cần bao nhiêu điểm thi cuối kỳ." },
      { icon: FileDown, title: "Tải đề PE trọn bộ", text: "Tải toàn bộ tài nguyên đề PE thành một file zip.", pro: true },
      { icon: Save, title: "Làm dở, làm tiếp", text: "Bài đang làm được lưu lại, vào lại là tiếp tục đúng chỗ đã dừng." },
      { icon: GraduationCap, title: "Kết nối trực tiếp với FLM", text: "Syllabus của FPTU được tích hợp vào hệ thống: câu hỏi gắn theo chương và chủ đề của từng môn." },
    ],
  },
  {
    icon: Wallet,
    title: "Credit và ưu đãi",
    tag: "Tiết kiệm",
    features: [
      { icon: Wallet, title: "Nạp credit tự động", text: "Chuyển khoản qua mã QR, credit cộng tự động, nạp càng nhiều thưởng càng lớn." },
      { icon: CalendarCheck, title: "Điểm danh và giới thiệu", text: "Điểm danh mỗi ngày nhận credit, mời bạn bè cả hai cùng có thưởng." },
      { icon: Crown, title: "Gói Pro 4 tháng", text: "99.000đ, không giới hạn lượt lấy đề, giải thích AI và tải đề PE." },
    ],
  },
];
