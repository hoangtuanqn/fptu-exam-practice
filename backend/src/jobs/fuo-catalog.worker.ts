import type { FuoCatalogRun } from "@prisma/client";
import { FUO_CATALOG_BUSY_WAIT_MS, FUO_CATALOG_ERROR_MAX } from "../constants/fuo-catalog";
import { realtimeHub } from "../realtime/hub";
import { fuoCatalogRepository } from "../repositories/fuo-catalog.repository";
import { adminNoticeService } from "../services/admin-notice.service";
import { isFuoAuthFailure } from "../services/crawler/fuo-session.service";
import { fuoCatalogService } from "../services/fuo-catalog.service";
import { fuoSourceService } from "../services/fuo-source.service";
import { sleep } from "../utils/sleep";

const ADMIN_PAGE = "/admin/fuo-catalog";
const SOURCES_PAGE = "/admin/fuo-sources";
let draining = false;
let wake = false;

// Trang nguồn đề cũng hiện tiến độ lượt quét của "Load dữ liệu mới" (trường scan)
const publish = () => {
  void fuoCatalogService
    .status()
    .then((s) => realtimeHub.publishFuoCatalog(s))
    .catch(() => undefined);
  void fuoSourceService
    .status()
    .then((s) => realtimeHub.publishFuoSources(s))
    .catch(() => undefined);
};

const errorText = (err: unknown) => ((err as Error).message || "Lỗi không xác định").slice(0, FUO_CATALOG_ERROR_MAX);

// Quét hết các môn của lượt, từng môn một. Lỗi đăng nhập/Cloudflare: dừng lượt (NEEDS_AUTH), môn đó về hàng chờ. Lỗi khác: ghi lỗi môn đó rồi quét tiếp.
async function runOnce(run: FuoCatalogRun) {
  let authError: string | null = null;
  let fatal: string | null = null;

  if (run.subjectsTotal === 0) {
    try {
      await fuoCatalogRepository.queueSubjects(run.id, await fuoCatalogService.subjectCodes());
    } catch (err) {
      if (isFuoAuthFailure(err)) authError = errorText(err);
      else fatal = errorText(err);
    }
    publish();
  }

  while (!authError && !fatal) {
    // Người dùng đang chờ lấy đề (hoặc lượt nạp dữ liệu đang chạy): chưa nhận môn mới
    if (await fuoCatalogService.busy()) {
      await sleep(FUO_CATALOG_BUSY_WAIT_MS);
      continue;
    }
    const subject = await fuoCatalogRepository.claimNextSubject(run.id);
    if (!subject) break;
    publish();
    try {
      await fuoCatalogService.saveSubject(run.id, subject.id, subject.code, await fuoCatalogService.crawlSubject(subject.code, { incremental: run.autoImport }));
    } catch (err) {
      const message = errorText(err);
      if (isFuoAuthFailure(err)) {
        authError = message;
        await fuoCatalogRepository.requeueSubject(subject.id);
      } else {
        await fuoCatalogRepository.failSubject(run.id, subject.id, message);
        console.error(`[fuo-catalog] môn ${subject.code} lỗi: ${message}`);
      }
    }
    publish();
    if (!authError) await fuoCatalogService.pause();
  }

  const done = await fuoCatalogRepository.finishRun(run.id, authError ? "NEEDS_AUTH" : fatal ? "FAILED" : "DONE", authError ?? fatal ?? undefined);
  publish();
  console.log(`[fuo-catalog] lượt ${run.id} ${done.status}: ${done.subjectsDone}/${done.subjectsTotal} môn (${done.subjectsFailed} lỗi), ${done.threadsFound} bài, ${done.threadsNew} mới, ${done.threadsUpdated} cập nhật`);
  const link = run.autoImport ? SOURCES_PAGE : ADMIN_PAGE;
  if (authError) {
    const again = run.autoImport ? "bấm Load dữ liệu mới" : "bấm quét lại";
    adminNoticeService.push("catalog.failed", { title: "Quét danh mục FuOverflow tạm dừng: cần đăng nhập lại", body: `${authError} Sau khi cập nhật, ${again} để chạy tiếp.`, link });
  } else if (fatal) {
    adminNoticeService.push("catalog.failed", { title: "Quét danh mục FuOverflow thất bại", body: fatal, link });
  } else if (run.autoImport) {
    // Lượt của "Load dữ liệu mới": nạp ngay các đề mới/đổi (lượt nạp tự báo khi xong)
    await fuoSourceService.afterScan(run.createdById);
    publish(); // không để trang nguồn đề tưởng đã dừng trong lúc chuyển từ quét sang nạp
  } else {
    adminNoticeService.push("catalog.done", {
      title: `Quét danh mục FuOverflow xong: ${done.threadsNew} bài mới, ${done.threadsUpdated} bài cập nhật`,
      body: `${done.subjectsDone}/${done.subjectsTotal} môn, ${done.threadsFound} bài${done.subjectsFailed ? `, ${done.subjectsFailed} môn lỗi` : ""}.`,
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
      // Trong tiến trình này không có môn nào đang quét: RUNNING là phần dở dang của lần tắt/lỗi trước
      await fuoCatalogRepository.requeueRunning();
      for (let run = await fuoCatalogRepository.findActiveRun(); run; run = await fuoCatalogRepository.findActiveRun()) await runOnce(run);
    }
  } catch (err) {
    console.error("[fuo-catalog] hàng đợi lỗi:", (err as Error).message); // lượt vẫn RUNNING: lần khởi động sau chạy tiếp
  } finally {
    draining = false;
  }
};

// Gọi một lần khi khởi động: chạy tiếp lượt dở dang (nếu có), rồi chạy mỗi khi admin bấm bắt đầu
export const startFuoCatalogWorker = () => {
  fuoCatalogService.onStarted(() => void drain());
  void drain();
};
