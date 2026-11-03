import type { Question } from "@/features/practice/types";

export type CrawlJobStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";

export interface CrawlJob {
  id: number;
  status: CrawlJobStatus;
  stage: string | null; // bước đang làm, ví dụ "Đang tải ảnh 12/50"
  error: string | null;
  examId: number | null;
}

// POST /crawl-jobs: đề đã có thì trả examId ngay, chưa có thì trả job để theo dõi
export type SubmitResult = { existed: true; examId: number; title: string } | { existed: false; job: CrawlJob };

export interface ImportedExam {
  id: number;
  threadId: string; // mã thread FuOverflow, dùng trong địa chỉ /exam/:threadId
  title: string;
  answerStatus: "PENDING" | "DEFAULT" | "AI" | "MANUAL"; // PENDING = AI đang phân tích đáp án
  questions: Question[];
}
