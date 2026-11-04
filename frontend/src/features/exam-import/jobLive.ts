import { isRealtimeConnected, onConnectionChange, subscribeRoom } from "@/shared/realtime/socket";
import { EVENTS } from "@/shared/realtime/events";
import { examImportApi } from "./exam-import.api";
import type { CrawlJob } from "./types";

const FALLBACK_POLL_MS = 2500; // chỉ dùng khi mất kết nối realtime
// Dừng chờ khi job xong/lỗi, hoặc khi đề đã có ảnh đầu tiên (examId có giá trị): người dùng mở đề ngay, các câu sau hiện dần
const isFinished = (job: CrawlJob) => job.status === "DONE" || job.status === "FAILED" || job.examId !== null;

/**
 * Chờ một job lấy đề chạy xong, nhận tiến độ qua socket (tức thời). Nếu socket không nối được thì tạm hỏi định kỳ
 * để người dùng vẫn thấy kết quả. `onUpdate` được gọi mỗi khi job đổi bước; kết quả trả về là job đã DONE/FAILED.
 * `signal` hủy việc chờ (người dùng rời trang hoặc bắt đầu lượt khác).
 */
export function waitForJob(initial: CrawlJob, onUpdate: (job: CrawlJob) => void, signal: AbortSignal, timeoutMs: number): Promise<CrawlJob> {
  return new Promise((resolve, reject) => {
    let done = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    const cleanups: (() => void)[] = [];

    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      if (poll) clearInterval(poll);
      cleanups.forEach((c) => c());
      fn();
    };
    const receive = (job: CrawlJob) => {
      if (done || job.id !== initial.id) return;
      onUpdate(job);
      if (isFinished(job)) finish(() => resolve(job));
    };

    const startPolling = () => {
      if (poll) return;
      poll = setInterval(() => void examImportApi.job(initial.id).then(receive).catch(() => undefined), FALLBACK_POLL_MS);
    };
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    cleanups.push(subscribeRoom<CrawlJob>("job", initial.id, EVENTS.jobUpdate, receive));
    cleanups.push(onConnectionChange((connected) => (connected ? stopPolling() : startPolling())));
    if (!isRealtimeConnected()) startPolling();

    const timer = setTimeout(() => finish(() => reject(new Error("Quá thời gian chờ, vui lòng thử lại sau"))), timeoutMs);
    cleanups.push(() => clearTimeout(timer));
    signal.addEventListener("abort", () => finish(() => reject(new DOMException("aborted", "AbortError"))), { once: true });
    receive(initial); // trạng thái ban đầu (job có thể đã xong)
  });
}
