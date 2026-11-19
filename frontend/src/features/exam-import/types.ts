import type { AnswerSource, Question } from "@/features/practice/types";

export type CrawlJobStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";

export interface CrawlJob {
  id: number;
  status: CrawlJobStatus;
  stage: string | null; // bước đang làm, ví dụ "Đang tải ảnh 12/50"
  error: string | null;
  examId: string | null;
  ahead: number; // số lượt phía trước trong hàng đợi (khi QUEUED)
}

// POST /crawl-jobs: đề đã có thì trả examId ngay, chưa có thì trả job để theo dõi
export type SubmitResult = { existed: true; examId: string; title: string; free?: boolean } | { existed: false; job: CrawlJob };

// Loại đề; máy chủ cũ không trả về thì coi là FE
export type ExamKind = "FE" | "PE" | "QUIZ" | "OTHER";

export interface ImportedExam {
  id: string;
  title: string;
  kind?: ExamKind;
  answerStatus: AnswerSource; // PENDING = AI đang phân tích đáp án
  totalQuestions: number; // lớn hơn questions.length = đề còn đang được lấy về, các câu sau đến qua socket
  questions: Question[];
  attachments?: ExamAttachment[]; // tệp không phải ảnh (pdf, zip...); máy chủ cũ không trả về. Đề chỉ có tệp thì questions rỗng
}

// Tệp đính kèm của đề. url công khai, mở thẳng bằng <a href>; thêm download=1 để tải về
export interface ExamAttachment {
  id: number;
  name: string;
  mime: string;
  sizeBytes: number;
  kind: "pdf" | "archive" | "text" | "video" | "audio" | "other";
  url: string;
}

// Sự kiện realtime "exam:attachments": cả danh sách tệp đính kèm của đề
export interface ExamAttachmentsPayload {
  examId: string;
  attachments: ExamAttachment[];
}

// Đề chỉ có tệp đính kèm, không có câu hỏi để làm trên web
export const isFilesOnly = (e: ImportedExam) => e.totalQuestions === 0 && e.questions.length === 0 && (e.attachments?.length ?? 0) > 0;

// Chỉ đề FE có từ chừng này ảnh câu hỏi mới luyện/thi được trên web; đề khác chỉ xem trước
export const MIN_PLAYABLE_QUESTIONS = 20;
export const canPractice = (kind: ExamKind | undefined, totalQuestions: number) => (kind ?? "FE") === "FE" && totalQuestions >= MIN_PLAYABLE_QUESTIONS;

// Sự kiện realtime "exam:answers" (cũng là kết quả GET /exams/:id/answers, không có examId)
export interface ExamAnswersPayload {
  examId: string;
  status: AnswerSource; // PENDING = đang giải, FAILED = lỗi, còn lại = đã có đáp án
  answerError: string | null; // lời nhắn cho người dùng khi lỗi
  answers: { number: number; correct: string[]; topic?: string | null }[];
  references?: number[]; // số câu là tài liệu tham khảo (không phải câu hỏi)
}

// Sự kiện realtime "exam:questions": các câu đã có ảnh của đề đang được lấy về (gộp theo số câu)
export interface ExamQuestionsPayload {
  examId: string;
  total: number;
  questions: { number: number; imageUrl: string; correct: string[] }[];
}
