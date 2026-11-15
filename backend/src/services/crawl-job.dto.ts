import type { CrawlJob } from "@prisma/client";

// Lỗi lưu ở job là chi tiết kỹ thuật cho admin (cookie, HTTP, đường dẫn tệp...). Người dùng chỉ thấy câu dễ hiểu;
// riêng lỗi do chính bài viết (thiếu nhãn) thì giữ nguyên vì người dùng tự xử lý được.
const USER_SAFE_ERRORS = [/^Chỉ lấy được các bài có nhãn/];
export const JOB_FAILED_MESSAGE =
  "Chưa lấy được đề này, không phải do bạn. Nếu đã trả phí, credit đã được hoàn lại. Vui lòng thử lại sau ít phút; nếu vẫn lỗi hãy liên hệ hỗ trợ và gửi kèm link đề.";
export const userJobError = (error: string | null) => (error === null ? null : USER_SAFE_ERRORS.some((re) => re.test(error)) ? error : JOB_FAILED_MESSAGE);

// Dạng job trả cho giao diện (API và sự kiện realtime dùng chung)
export const toJobDto = (job: CrawlJob, ahead = 0) => ({
  id: job.id,
  status: job.status,
  stage: job.stage,
  error: userJobError(job.error),
  examId: job.examId,
  ahead, // số lượt phía trước trong hàng đợi (chỉ có nghĩa khi QUEUED)
});
