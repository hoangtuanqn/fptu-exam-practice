import type { CrawlJob } from "@prisma/client";
import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { examRepository } from "../repositories/exam.repository";
import { AppError } from "../rules/error";
import type { ImportExamBody } from "../rules/requests/crawl.request";
import { parseThreadId } from "../utils/fuo-url";

type Listener = () => void;
const listeners: Listener[] = [];

const toDto = (job: CrawlJob) => ({
  id: job.id,
  status: job.status,
  stage: job.stage,
  error: job.error,
  examId: job.examId,
});

export const crawlJobService = {
  /**
   * Nhận link đề. Trả về ngay, việc crawl do worker nền làm:
   * - đề đã có trong DB (cùng thread ID, dù link khác) -> trả luôn examId, không crawl lại
   * - đang có lượt crawl cùng thread -> dùng lại lượt đó
   * - ngược lại -> tạo job mới và đánh thức worker
   */
  async submit(userId: number, { url }: ImportExamBody) {
    const threadId = parseThreadId(url);
    if (!threadId) throw new AppError("Link không hợp lệ"); // đã được validate, giữ để thu hẹp kiểu

    const exam = await examRepository.findByThreadId(threadId);
    if (exam) return { existed: true as const, examId: exam.id, title: exam.title };

    const active = await crawlJobRepository.findActive(threadId);
    if (active) return { existed: false as const, job: toDto(active) };

    const job = await crawlJobRepository.create({ threadId, userId });
    listeners.forEach((fn) => fn());
    return { existed: false as const, job: toDto(job) };
  },

  // Chỉ chủ job (hoặc admin) được xem tiến độ
  async getForUser(id: number, user: { id: number; role: string }) {
    const job = await crawlJobRepository.findById(id);
    if (!job || (job.userId !== user.id && user.role !== "ADMIN")) throw AppError.notFound("Không tìm thấy tiến trình");
    return toDto(job);
  },

  // Worker đăng ký để được đánh thức khi có job mới
  onEnqueued: (fn: Listener) => void listeners.push(fn),
};
