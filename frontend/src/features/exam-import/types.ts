import type { AnswerSource, Question } from "@/features/practice/types";

export type CrawlJobStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";

export interface CrawlJob {
  id: number;
  status: CrawlJobStatus;
  stage: string | null; // bước đang làm, ví dụ "Đang tải ảnh 12/50"
  error: string | null;
  examId: number | null;
  ahead: number; // số lượt phía trước trong hàng đợi (khi QUEUED)
}

// POST /crawl-jobs: đề đã có thì trả examId ngay, chưa có thì trả job để theo dõi
export type SubmitResult = { existed: true; examId: number; title: string; free?: boolean } | { existed: false; job: CrawlJob };

export interface ImportedExam {
  id: number;
  threadId: string; // mã thread FuOverflow, dùng trong địa chỉ /exam/:threadId
  title: string;
  answerStatus: AnswerSource; // PENDING = AI đang phân tích đáp án
  totalQuestions: number; // lớn hơn questions.length = đề còn đang được lấy về, các câu sau đến qua socket
  questions: Question[];
}

// Sự kiện realtime "exam:answers" (cũng là kết quả GET /exams/:id/answers, không có examId)
export interface ExamAnswersPayload {
  examId: number;
  status: AnswerSource; // PENDING = đang giải, FAILED = lỗi, còn lại = đã có đáp án
  answerError: string | null; // lời nhắn cho người dùng khi lỗi
  answers: { number: number; correct: string[]; topic?: string | null }[];
  references?: number[]; // số câu là tài liệu tham khảo (không phải câu hỏi)
}

// Sự kiện realtime "exam:questions": các câu đã có ảnh của đề đang được lấy về (gộp theo số câu)
export interface ExamQuestionsPayload {
  examId: number;
  total: number;
  questions: { number: number; imageUrl: string; correct: string[] }[];
}
