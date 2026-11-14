// Nguồn đáp án của đề hệ thống: PENDING = AI đang phân tích, DEFAULT = tạm (A), AI, MANUAL = chỉnh tay
export type AnswerSource = "PENDING" | "FAILED" | "DEFAULT" | "AI" | "MANUAL";

export interface Question {
  number: number; // số câu (1, 2, 3...)
  imageUrl: string; // blob URL của ảnh
  answerPending?: boolean; // AI chưa phân tích xong: chưa biết câu chọn một hay nhiều, nên tạm cho chọn nhiều
  correct: string[]; // đáp án đúng từ ans.txt, ví dụ ["A"] hoặc ["A","B","C"]; rỗng = không có đáp án
  topic?: string | null; // chủ đề theo syllabus môn học (null/không có = chưa gắn)
  isReference?: boolean; // tài liệu tham khảo (trang công thức...), không phải câu hỏi: không làm, không chấm, nằm trong mục "Tài liệu"
}

// practice: trả lời xong câu nào hiện kết quả câu đó; exam: nộp bài mới chấm điểm
export type Mode = "practice" | "exam";

export type UserAnswers = Record<number, string[]>; // { số câu: các đáp án đã chọn }

// Một lần rời khỏi bài thi (thi thử toàn màn hình): at = giây đã làm lúc rời, sec = số giây ở ngoài
// Server nhận tối đa chừng này lần mỗi bài: gửi quá thì cả lần lưu bị từ chối, nên chỉ gửi các lần đầu
export const MAX_VIOLATIONS = 200;
export interface Violation {
  at: number;
  sec: number;
}
