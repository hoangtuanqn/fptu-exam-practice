import type { AnswerSource, Question } from "@/features/practice/types";

// Loại đề; máy chủ cũ không trả về thì coi là FE
export type ExamKind = "FE" | "PE" | "QUIZ" | "OTHER";

export interface ImportedExam {
  id: string;
  title: string;
  kind?: ExamKind;
  answerStatus: AnswerSource; // PENDING = AI đang phân tích đáp án
  totalQuestions: number; // lớn hơn questions.length = đề còn đang được xử lý, các câu sau đến qua socket
  questions: Question[];
  attachments?: ExamAttachment[]; // tệp không phải ảnh (pdf, zip...); máy chủ cũ không trả về. Đề chỉ có tệp thì questions rỗng
  trial?: { locked: number; attempts?: number }; // có khi bạn chưa mở khoá đề: chỉ có vài câu đầu, locked = số câu còn khoá, attempts = số lượt đã làm đề này (đếm thật)
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

// Đề FE có từ chừng này ảnh câu hỏi, hoặc đề có đáp án admin đưa vào (ans.json, nguồn MANUAL) thì luyện/thi được trên web; đề khác, và đề chưa có đáp án (DEFAULT), chỉ xem trước
export const MIN_PLAYABLE_QUESTIONS = 20;
export const canPractice = (kind: ExamKind | undefined, totalQuestions: number, answerSource?: AnswerSource) =>
  totalQuestions > 0 && answerSource !== "DEFAULT" && (answerSource === "MANUAL" || ((kind ?? "FE") === "FE" && totalQuestions >= MIN_PLAYABLE_QUESTIONS));
// Địa chỉ mở một đề: đề làm được trên web mở thẳng hộp chọn Luyện đề / Thi rồi làm bài; đề khác chỉ xem trước. Chưa biết nguồn đáp án (danh sách kho đề) mà có câu thì mở trang làm bài, trang đó tự chuyển sang xem trước nếu không làm được.
export const examOpenPath = (e: { id: string; kind?: ExamKind; totalQuestions?: number | null; answerSource?: AnswerSource }) => {
  const total = e.totalQuestions ?? 0;
  return canPractice(e.kind, total, e.answerSource) || (e.answerSource === undefined && total > 0) ? `/exam/${e.id}` : `/exam/${e.id}/preview`;
};

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
