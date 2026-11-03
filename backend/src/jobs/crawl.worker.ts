import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { crawlJobService } from "../services/crawl-job.service";
import { examService } from "../services/exam.service";
import { examImportService } from "../services/exam-import.service";

let draining = false;

// Lấy từng job đang chờ ra chạy, lần lượt từng cái (không dồn dập request sang FuOverflow).
// Chạy nền trong tiến trình server nhưng không chặn request: mọi bước đều là I/O bất đồng bộ.
const drain = async () => {
  if (draining) return;
  draining = true;
  try {
    for (let job = await crawlJobRepository.claimNext(); job; job = await crawlJobRepository.claimNext()) {
      try {
        const { examId } = await examImportService.run(job);
        await examService.addToLibrary(job.userId !== null ? { userId: job.userId } : { guestId: job.guestId! }, examId); // đề vào thư viện của người nhập
        await crawlJobRepository.finish(job.id, { status: "DONE", examId });
        console.log(`[crawl-worker] job ${job.id} (thread ${job.threadId}) xong -> đề ${examId}`);
      } catch (err) {
        const message = (err as Error).message;
        await crawlJobService.fail(job, message); // đánh dấu lỗi + hoàn phí
        console.error(`[crawl-worker] job ${job.id} lỗi: ${message}`);
      }
    }
  } finally {
    draining = false;
  }
};

// Gọi một lần khi khởi động: xếp lại job dở dang do lần tắt trước, rồi chạy mỗi khi có job mới
export const startCrawlWorker = async () => {
  crawlJobService.onEnqueued(() => void drain());
  await crawlJobRepository.requeueRunning();
  void drain();
};
