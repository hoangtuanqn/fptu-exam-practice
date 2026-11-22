import type { FuoCatalogRun } from "@prisma/client";
import { FUO_CATALOG_BUSY_WAIT_MS, FUO_CATALOG_COOLDOWNS_MAX, FUO_CATALOG_ERROR_MAX, FUO_CATALOG_LOGIN_STREAK_MAX, FUO_CATALOG_SUBJECT_CONCURRENCY } from "../constants/fuo-catalog";
import { realtimeHub } from "../realtime/hub";
import { fuoCatalogRepository } from "../repositories/fuo-catalog.repository";
import { adminNoticeService } from "../services/admin-notice.service";
import { anonFuoLimiter, isLoginRequired, onAnonCooldown } from "../services/crawler/fuo-anon-client";
import { fuoCatalogService } from "../services/fuo-catalog.service";
import { fuoSourceService } from "../services/fuo-source.service";
import { createStreak } from "../utils/adaptive-limiter";
import { sleep } from "../utils/sleep";

const ADMIN_PAGE = "/admin/fuo-catalog";
const SOURCES_PAGE = "/admin/fuo-sources";
const NOTICE_SUBJECTS = 10; // số môn có đề mới kể tên trong thông báo admin
const LOGIN_STREAK_STOP = "Nhiều môn liền nhau cần đăng nhập FuOverflow mới xem được nên đã dừng kiểm tra. Hệ thống không dùng tài khoản để thử lại; hãy thử lại sau.";
const COOLDOWN_STOP = "FuOverflow hạn chế truy cập kéo dài nên đã dừng kiểm tra để tránh bị chặn. Hãy bấm lại sau ít phút.";
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

/**
 * Quét các môn của lượt, FUO_CATALOG_SUBJECT_CONCURRENCY môn cùng lúc, chỉ bằng client ẩn danh (không cookie, không đăng nhập).
 * Môn lỗi (kể cả trang cần đăng nhập) được ghi lỗi rồi quét tiếp. Dừng sớm (FAILED) khi FUO_CATALOG_LOGIN_STREAK_MAX môn liền nhau
 * cần đăng nhập, hoặc bộ giới hạn chung phải nghỉ dài quá FUO_CATALOG_COOLDOWNS_MAX lần; môn chưa quét ở lại hàng chờ.
 */
async function runOnce(run: FuoCatalogRun) {
  let fatal: string | null = null;
  const loginStreak = createStreak(FUO_CATALOG_LOGIN_STREAK_MAX);
  const cooldownsAtStart = anonFuoLimiter.state().cooldowns;

  if (run.subjectsTotal === 0) {
    try {
      await fuoCatalogRepository.queueSubjects(run.id, await fuoCatalogService.subjectCodes());
    } catch (err) {
      fatal = errorText(err);
    }
    publish();
  }

  const work = async () => {
    while (!fatal) {
      if (anonFuoLimiter.state().cooldowns - cooldownsAtStart >= FUO_CATALOG_COOLDOWNS_MAX) {
        fatal = COOLDOWN_STOP;
        break;
      }
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
        loginStreak(false);
      } catch (err) {
        const message = errorText(err);
        await fuoCatalogRepository.failSubject(run.id, subject.id, message);
        console.error(`[fuo-catalog] môn ${subject.code} lỗi: ${message}`);
        if (loginStreak(isLoginRequired(err))) fatal ??= LOGIN_STREAK_STOP;
      }
      publish();
    }
  };
  if (!fatal) {
    // Chờ mọi luồng dừng hẳn rồi mới báo lỗi DB (nếu có), để không có hai lượt chạy chồng nhau
    const results = await Promise.allSettled(Array.from({ length: FUO_CATALOG_SUBJECT_CONCURRENCY }, work));
    const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failure) throw failure.reason;
  }

  const done = await fuoCatalogRepository.finishRun(run.id, fatal ? "FAILED" : "DONE", fatal ?? undefined);
  publish();
  console.log(`[fuo-catalog] lượt ${run.id} ${done.status}: ${done.subjectsDone}/${done.subjectsTotal} môn (${done.subjectsFailed} lỗi), ${done.threadsFound} bài, ${done.threadsNew} mới, ${done.threadsUpdated} cập nhật`);
  const link = run.autoImport ? SOURCES_PAGE : ADMIN_PAGE;
  if (fatal) {
    adminNoticeService.push("catalog.failed", { title: "Quét danh mục FuOverflow thất bại", body: fatal, link });
    return;
  }
  if (run.autoImport) {
    // "Load dữ liệu mới" chỉ ghi tên/thông tin đề mới (đã có trong kho đề); không tải hay nạp đề vì việc đó cần đăng nhập
    try {
      await fuoSourceService.afterScan();
    } catch (err) {
      console.error("[fuo-catalog] không cập nhật được danh sách link sau khi quét:", (err as Error).message);
    }
    const [subjects, count] = await fuoCatalogRepository.findNewBySubject(run.id);
    const named = subjects.slice(0, NOTICE_SUBJECTS).map((s) => `${s.code} (${s.threadsNew})`);
    adminNoticeService.push("catalog.done", {
      title: `Tải dữ liệu mới xong: ${done.threadsNew} đề mới`,
      body: count ? `Có đề mới ở ${count} môn: ${named.join(", ")}${count > named.length ? ` và ${count - named.length} môn khác` : ""}.` : "Không có đề mới.",
      link,
    });
    publish();
    return;
  }
  adminNoticeService.push("catalog.done", {
    title: `Quét danh mục FuOverflow xong: ${done.threadsNew} bài mới, ${done.threadsUpdated} bài cập nhật`,
    body: `${done.subjectsDone}/${done.subjectsTotal} môn, ${done.threadsFound} bài${done.subjectsFailed ? `, ${done.subjectsFailed} môn lỗi` : ""}.`,
    link: ADMIN_PAGE,
  });
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
  onAnonCooldown(() => publish()); // hiện trạng thái nghỉ dài ngay, không đợi môn kế tiếp xong
  void drain();
};
