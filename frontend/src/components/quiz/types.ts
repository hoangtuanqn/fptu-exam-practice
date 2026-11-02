import type { Question } from "../../types";

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
  onChoose: (option: string) => void;
  onCheck: () => void;
  onPrev: () => void;
  onNext: () => void;
}
