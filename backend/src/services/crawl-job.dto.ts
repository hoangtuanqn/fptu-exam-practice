import type { CrawlJob } from "@prisma/client";

// Dạng job trả cho giao diện (API và sự kiện realtime dùng chung)
export const toJobDto = (job: CrawlJob, ahead = 0) => ({
  id: job.id,
  status: job.status,
  stage: job.stage,
  error: job.error,
  examId: job.examId,
  ahead, // số lượt phía trước trong hàng đợi (chỉ có nghĩa khi QUEUED)
});
