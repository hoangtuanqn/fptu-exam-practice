import { FUO_SOURCE_BUSY_WAIT_MS, FUO_SOURCE_CONCURRENCY, FUO_SOURCE_ERROR_MAX, FUO_SOURCE_PAUSE_MS } from "../constants/fuo-source";
import { realtimeHub } from "../realtime/hub";
import { fuoSourceRepository } from "../repositories/fuo-source.repository";
import { adminNoticeService } from "../services/admin-notice.service";
import { isFuoAuthFailure } from "../services/crawler/fuo-session.service";
import { fuoSourceService } from "../services/fuo-source.service";
import { sleep } from "../utils/sleep";

const ADMIN_PAGE = "/admin/fuo-sources";
let draining = false;
let wake = false;

const publish = () =>
  void fuoSourceService
    .status()
    .then((s) => realtimeHub.publishFuoSources(s))
    .catch(() => undefined);

// Chạy hết các link của lượt đang chạy, FUO_SOURCE_CONCURRENCY link một lúc. Lỗi đăng nhập: dừng lượt (NEEDS_AUTH), link đó về hàng chờ.
async function runOnce(run: { id: string; createdById: string | null }) {
  let authError: string | null = null;
  const work = async () => {
    while (!authError) {
      // Người dùng đang chờ lấy đề: nhường FuOverflow cho họ, chưa nhận link mới (link chưa nhận vẫn QUEUED)
      if (await fuoSourceService.userImportsWaiting()) {
        await sleep(FUO_SOURCE_BUSY_WAIT_MS);
        continue;
      }
      const source = await fuoSourceRepository.claimNext();
      if (!source) return;
      publish();
      try {
        await fuoSourceRepository.succeed(run.id, source.id, await fuoSourceService.process(source.threadId, run.createdById, source.commentsAt));
      } catch (err) {
        const message = ((err as Error).message || "Lỗi không xác định").slice(0, FUO_SOURCE_ERROR_MAX);
        if (isFuoAuthFailure(err)) {
          authError = message;
          await fuoSourceRepository.requeue(source.id);
        } else {
          await fuoSourceRepository.fail(run.id, source.id, message);
          console.error(`[fuo-source] thread ${source.threadId} lỗi: ${message}`);
        }
      }
      publish();
      if (!authError) await sleep(FUO_SOURCE_PAUSE_MS);
    }
  };
  await Promise.all(Array.from({ length: FUO_SOURCE_CONCURRENCY }, work));

  const done = await fuoSourceRepository.finishRun(run.id, authError ? "NEEDS_AUTH" : "DONE", authError ?? undefined);
  publish();
  console.log(`[fuo-source] lượt ${run.id} ${done.status}: ${done.done}/${done.total} xong (${done.imported} mới, ${done.updated} cập nhật), ${done.failed} lỗi`);
  if (authError) {
    adminNoticeService.push("fetch.failed", { title: "Nạp dữ liệu FuOverflow tạm dừng: cần đăng nhập lại", body: `${authError} Sau khi cập nhật, bấm nạp dữ liệu mới để chạy tiếp.`, link: ADMIN_PAGE });
  } else {
    const sum = await fuoSourceRepository.runSummary(run.id);
    adminNoticeService.push("fetch.done", {
      title: `Nạp dữ liệu FuOverflow xong: ${done.imported} đề mới, ${done.updated} đề cập nhật, ${done.failed} lỗi`,
      body: sum.addedQuestions ? `Đã thêm ${sum.addedQuestions} câu mới vào ${sum.examsWithNewQuestions} đề có sẵn, các câu này chưa có đáp án.` : null,
      link: ADMIN_PAGE,
    });
  }
}

const drain = async () => {
  wake = true;
  if (draining) return;
  draining = true;
  try {
    while (wake) {
      wake = false;
      // Trong tiến trình này không có link nào đang chạy: RUNNING là phần dở dang của lần tắt/lỗi trước
      await fuoSourceRepository.requeueRunning();
      for (let run = await fuoSourceRepository.findActiveRun(); run; run = await fuoSourceRepository.findActiveRun()) await runOnce(run);
    }
  } catch (err) {
    console.error("[fuo-source] hàng đợi lỗi:", (err as Error).message); // lượt vẫn RUNNING: lần bấm bắt đầu kế tiếp hoặc lần khởi động sau chạy tiếp
  } finally {
    draining = false;
  }
};

// Gọi một lần khi khởi động: chạy tiếp lượt dở dang (nếu có), rồi chạy mỗi khi admin bấm bắt đầu
export const startFuoSourceWorker = () => {
  fuoSourceService.onStarted(() => void drain());
  void drain();
};
