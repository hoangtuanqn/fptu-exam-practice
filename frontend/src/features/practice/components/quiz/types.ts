import type { Question } from "@/features/practice/types.ts";

// Props chung cho mọi nơi hiển thị một câu hỏi và cho phép trả lời
// (khung câu hỏi chính và cửa sổ phóng to ảnh dùng chung)
export interface QuestionViewProps {
  question: Question;
  total: number; // tổng số câu của đề
  selected: string[]; // đáp án đang chọn
  revealed: boolean; // đã hiện kết quả đúng/sai chưa
  canCheck: boolean; // có thể bấm "Xác nhận đáp án" (chế độ luyện tập)
  hasPrev: boolean;
  hasNext: boolean;
  flagged: boolean; // đã đánh dấu xem lại chưa
  onToggleFlag: () => void;
  saved?: boolean; // câu đã có trong "Câu đã lưu"
  onToggleSave?: () => void; // lưu/bỏ lưu câu (chỉ khi đã đăng nhập và là đề của hệ thống)
  onReport?: () => void; // có khi đã có kết quả của câu và người dùng đã đăng nhập (báo cáo đáp án sai)
  onExplain?: () => void; // xem lời giải thích AI của câu (trả phí credit)
  explainBought?: boolean; // đã mua lời giải của câu này (xem lại miễn phí)
  explainFree?: boolean; // còn lượt xem thử miễn phí (nút hiện "Giải thích miễn phí")
  reported?: boolean; // đã gửi báo cáo cho câu này trong phiên làm bài
  onChoose: (option: string) => void;
  onCheck: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit?: () => void; // chỉ có khi được phép nộp bài; ở câu cuối nút "Tiếp" đổi thành "Nộp bài"
}
