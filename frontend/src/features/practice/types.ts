export interface Question {
  number: number; // số câu (1, 2, 3...)
  imageUrl: string; // blob URL của ảnh
  answerPending?: boolean; // AI chưa phân tích xong: chưa biết câu chọn một hay nhiều, nên tạm cho chọn nhiều
  correct: string[]; // đáp án đúng từ ans.txt, ví dụ ["A"] hoặc ["A","B","C"]; rỗng = không có đáp án
}

// practice: trả lời xong câu nào hiện kết quả câu đó; exam: nộp bài mới chấm điểm
export type Mode = "practice" | "exam";

export type UserAnswers = Record<number, string[]>; // { số câu: các đáp án đã chọn }
