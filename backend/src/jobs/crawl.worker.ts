import { adminNoticeService } from "../services/admin-notice.service";
import { realtimeHub } from "../realtime/hub";
import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { crawlJobService } from "../services/crawl-job.service";
import { examService } from "../services/exam.service";
import { examImportService } from "../services/exam-import.service";
import { fuoSessionService, isFuoAuthFailure } from "../services/crawler/fuo-session.service";

let draining = false;

// Lấy từng job đang chờ ra chạy, lần lượt từng cái (không dồn dập request sang FuOverflow).
// Chạy nền trong tiến trình server nhưng không chặn request: mọi bước đều là I/O bất đồng bộ.
const drain = async () => {
  if (draining) return;
  draining = true;
  try {
    for (let job = await crawlJobRepository.claimNext(); job; job = await crawlJobRepository.claimNext()) {
      void realtimeHub.publishJob(job.id); // QUEUED -> RUNNING
      try {
        // Chủ job đọc lại mỗi lần cần: khách có thể đăng nhập trong lúc chờ (job được chuyển sang tài khoản),
        // lúc đó đề phải vào kho của tài khoản chứ không phải kho khách cũ
        const ownerOf = async () => {
          const fresh = (await crawlJobRepository.findById(job.id)) ?? job;
          return fresh.userId !== null ? { userId: fresh.userId } : { guestId: fresh.guestId! };
        };
        const hooks = {
          // Đã có ảnh đầu tiên: cho người dùng mở đề ngay, các câu sau hiện dần
          onReady: async (readyExamId: number) => {
            await examService.addToLibrary(await ownerOf(), readyExamId);
            await crawlJobRepository.setExam(job.id, readyExamId);
            void realtimeHub.publishJob(job.id);
          },
        };
        // Chưa có cookie mà đã lưu tài khoản: tự đăng nhập trước. Phiên hết hạn giữa chừng: đăng nhập lại rồi chạy lại một lần.
        await fuoSessionService.ensureCookie();
        let result;
        try {
          result = await examImportService.run(job, hooks);
        } catch (err) {
          if (!isFuoAuthFailure(err) || !(await fuoSessionService.login()).ok) throw err;
          result = await examImportService.run(job, hooks);
        }
        const { examId } = result;
        // Đề vào kho TRƯỚC khi báo DONE để người dùng mở được ngay khi thấy xong
        const before = await ownerOf();
        await examService.addToLibrary(before, examId);
        await crawlJobRepository.finish(job.id, { status: "DONE", examId });
        // Khách đăng nhập đúng lúc này: chủ job đổi sau lần đọc trên, thêm đề cho chủ mới
        const after = await ownerOf();
        if (JSON.stringify(after) !== JSON.stringify(before)) await examService.addToLibrary(after, examId);
        void realtimeHub.publishJob(job.id);
        console.log(`[crawl-worker] job ${job.id} (thread ${job.threadId}) xong -> đề ${examId}`);
        adminNoticeService.push("fetch.done", { title: `Lấy đề thành công: thread ${job.threadId}`, userId: job.userId, link: `/admin/exams/${examId}` });
      } catch (err) {
        const message = (err as Error).message;
        await crawlJobService.fail(job, message); // đánh dấu lỗi + hoàn phí
        void realtimeHub.publishJob(job.id);
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
