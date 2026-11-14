import type { CrawlJob } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { storageDir } from "../configs/env";
import { EXAM_FILES_DIR, EXAM_IMAGES_DIR, EXAM_STORAGE_DIR } from "../constants/crawler";
import { AI_REPORT_FAILED_PREFIX, aiReady } from "../constants/ai";
import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { examAttachmentRepository } from "../repositories/exam-attachment.repository";
import { examRepository, isDuplicateThread } from "../repositories/exam.repository";
import { attachmentFileName } from "../utils/attachment";
import { threadUrl } from "../utils/fuo-url";
import { createLimiter } from "../utils/limiter";
import { sleep } from "../utils/sleep";
import { realtimeHub } from "../realtime/hub";
import { aiSettingService } from "./ai-setting.service";
import { examSolveService } from "./exam-solve.service";
import { writeCommentsFile } from "./crawler/comments-file.service";
import { collectComments } from "./crawler/comment-scraper.service";
import { downloadAttachment, type DownloadedFile } from "./crawler/attachment-downloader.service";
import { createFuoClient } from "./crawler/fuo-client";
import { downloadImage } from "./crawler/image-downloader.service";
import { collectThread } from "./crawler/thread-scraper.service";
import type { DownloadedImage, QuestionComments } from "./crawler/types";
import { crawlerSettingService } from "./crawler-setting.service";

// Đường dẫn ảnh lưu trong DB, tương đối so với STORAGE_DIR (luôn dùng "/"): exams/<threadId>/images/<tên>.webp
const imagePathOf = (threadId: string, file: string) => `${EXAM_STORAGE_DIR}/${threadId}/${EXAM_IMAGES_DIR}/${file}`;
const filePathOf = (threadId: string, file: string) => `${EXAM_STORAGE_DIR}/${threadId}/${EXAM_FILES_DIR}/${file}`;

// Có chừng này ảnh đầu tiên là người dùng được mở đề ngay (các câu sau hiện dần)
const FIRST_READY = 2;
const STAGE_THROTTLE_MS = 400; // ghi tiến độ tối đa chừng này mỗi lần để không dồn DB/socket

export interface ImportHooks {
  /** Gọi một lần khi đã có ảnh đầu tiên: đưa đề vào kho người nhập để họ mở ngay. */
  onReady: (examId: number) => Promise<void>;
}

const removeDir = (dir: string) => fs.rm(dir, { recursive: true, force: true });

const removeStaleFiles = async (dir: string, keep: Set<string>) => {
  const names = await fs.readdir(dir).catch(() => [] as string[]);
  await Promise.all(names.filter((n) => !keep.has(n)).map((n) => fs.rm(path.join(dir, n), { force: true })));
};

/**
 * Chạy trọn một lượt nhập đề: đọc thread -> tạo đề -> tải ảnh và lấy bình luận (song song, giới hạn số request)
 * -> ghi comments.txt -> nhờ AI giải đáp án (chạy NỀN, exam-solve.service).
 *
 * Câu hỏi được ghi vào DB dần theo thứ tự (số câu liền nhau từ Q1), mỗi lần có thêm câu thì báo qua socket.
 * Nhờ vậy người dùng xem được đề ngay khi có ảnh đầu tiên thay vì chờ tải xong cả đề.
 * Đề chưa đủ câu (totalQuestions) coi như chưa xong. Lỗi giữa chừng thì gỡ hẳn đề và thư mục ảnh để không để lại đề dở dang.
 *
 * Thư mục của đề: storage/exams/<threadId>/ gồm  images/Q1.webp...  và  comments.txt  (cùng ans.txt, ai-report.md khi AI giải xong),
 * files/<tên> là tệp đính kèm không phải ảnh (pdf, zip...), lưu nguyên bản. Thread chỉ có tệp thì thành đề 0 câu, không gọi AI.
 */
export const examImportService = {
  async run(job: CrawlJob, hooks: ImportHooks): Promise<{ examId: number }> {
    let lastStageAt = 0;
    const stage = async (text: string, force = false) => {
      const now = Date.now();
      if (!force && now - lastStageAt < STAGE_THROTTLE_MS) return;
      lastStageAt = now;
      await crawlJobRepository.setStage(job.id, text);
      void realtimeHub.publishJob(job.id); // người đang chờ thấy bước mới ngay
    };

    const existing = await examRepository.findByThreadId(job.threadId);
    let refreshing = false; // làm mới đề cũ tại chỗ: giữ id đề (lịch sử, kho người dùng) và đề vẫn dùng được trong lúc chạy
    if (existing) {
      if (await examRepository.isComplete(existing)) {
        if (!job.refresh) return { examId: existing.id }; // có người nhập xong trước đó
        refreshing = true;
      } else {
        // Lần lấy trước bị ngắt giữa chừng (ví dụ server khởi động lại): bỏ phần dở dang rồi lấy lại từ đầu
        await examRepository.deleteById(existing.id);
        await removeDir(path.join(storageDir, EXAM_STORAGE_DIR, job.threadId));
      }
    }

    const config = await crawlerSettingService.get();
    if (!config.cookie) throw new Error("Chưa cấu hình cookie FuOverflow. Admin hãy nhập ở Quản trị → Cấu hình lấy đề.");
    const client = createFuoClient(config);

    const t0 = Date.now();
    await stage("Đang đọc thread", true);
    const thread = await collectThread(client, threadUrl(job.threadId));
    const threadId = thread.threadId ?? job.threadId;
    if (threadId !== job.threadId) throw new Error("Thread trả về không khớp với link đã nhập");

    const tThread = Date.now() - t0;
    const total = thread.images.length;
    const sourceUrl = thread.canonicalUrl ?? threadUrl(threadId);
    const dir = path.join(storageDir, EXAM_STORAGE_DIR, threadId);
    const imagesDir = path.join(dir, EXAM_IMAGES_DIR);
    const filesDir = path.join(dir, EXAM_FILES_DIR);
    const usedNames = new Set<string>();
    const files = thread.files.flatMap((file) => {
      const fileName = attachmentFileName(file.name, usedNames);
      if (!fileName) console.warn(`[crawl] bỏ qua tệp "${file.name}": loại tệp không được hỗ trợ`);
      return fileName ? [{ file, fileName }] : [];
    });
    const filesOnly = total === 0; // không có câu hỏi: không AI, không bình luận

    // Không có đáp án giả: AI chưa dùng được thì đề ở trạng thái FAILED (chỉ xem), có thể giải lại sau.
    const useAi = aiReady(await aiSettingService.get());

    let exam;
    try {
      if (refreshing && existing) exam = existing;
      else exam = await examRepository.createShell({
        threadId,
        title: thread.title,
        sourceUrl,
        author: thread.author,
        postedAt: thread.postedAt,
        createdById: job.userId ?? undefined,
        totalQuestions: total,
        // Đề chỉ có tệp: MANUAL để không bao giờ chờ/gọi AI (không có câu nào để chấm nên không ảnh hưởng thống kê)
        answerSource: filesOnly ? "MANUAL" : useAi ? "PENDING" : "FAILED",
        aiReport: useAi || filesOnly ? undefined : `${AI_REPORT_FAILED_PREFIX}AI chưa được bật hoặc chưa có khóa Anthropic`,
      });
    } catch (err) {
      // Lượt khác vừa tạo xong cùng thread: dùng đề đó nếu đã đủ
      if (isDuplicateThread(err)) {
        const winner = await examRepository.findByThreadId(threadId);
        if (winner && (await examRepository.isComplete(winner))) return { examId: winner.id };
      }
      throw err;
    }
    const examId = exam.id;
    let ready = refreshing; // đã đưa đề vào kho người nhập (người dùng có thể đang xem); đề làm mới thì đã sẵn có

    try {
      await fs.mkdir(imagesDir, { recursive: true });
      if (files.length) await fs.mkdir(filesDir, { recursive: true });

      const downloaded: (DownloadedImage | undefined)[] = new Array(total);
      const comments: (QuestionComments | undefined)[] = new Array(total);
      let imagesDone = 0;
      let commentsDone = 0;
      let filesDone = 0;
      const savedFiles: (DownloadedFile | null)[] = new Array(files.length).fill(null);
      const fileBudget = { used: 0 };
      let committed = 0; // số câu liền nhau (từ Q1) đã ghi DB
      let aborted = false;
      let flushError: unknown = null;

      // Ghi DB các câu đã tải xong liền nhau từ chỗ đã ghi; chạy lần lượt, không chồng lên nhau
      let chain: Promise<void> = Promise.resolve();
      const flush = () => {
        chain = chain
          .then(async () => {
            let end = committed;
            while (end < total && downloaded[end]) end++;
            if (end === committed) return;
            const batch = thread.images.slice(committed, end).map((image, k) => ({
              number: committed + k + 1, // thứ tự trong thread = số câu
              name: image.name,
              imagePath: imagePathOf(threadId, downloaded[committed + k]!.file),
              sourceImage: image.url.split("?")[0]!, // bỏ token tạm
              mediaUrl: image.mediaUrl,
              answer: "",
            }));
            await (refreshing ? examRepository.upsertQuestions(examId, batch) : examRepository.addQuestions(examId, batch));
            committed = end;
            if (!ready && committed >= Math.min(FIRST_READY, total)) {
              ready = true;
              await hooks.onReady(examId);
            }
            void realtimeHub.publishExamQuestions(examId);
          })
          .catch((err: unknown) => {
            flushError ??= err;
            aborted = true;
          });
        return chain;
      };

      const progress = () =>
        stage(
          imagesDone < total
            ? `Đang tải ảnh ${imagesDone}/${total}`
            : filesDone < files.length
              ? `Đang tải tệp đính kèm ${filesDone + 1}/${files.length}`
              : `Đang lấy bình luận ${commentsDone}/${total}`,
        );

      // Giới hạn số request chạy cùng lúc; mỗi luồng nghỉ requestDelayMs giữa hai request để không bị chặn.
      // Ảnh xếp hàng trước bình luận nên các câu hiện ra sớm nhất có thể.
      const limit = createLimiter(Math.max(1, config.concurrency));
      const rest = () => (config.requestDelayMs > 0 ? sleep(config.requestDelayMs) : Promise.resolve());

      const imageTasks = thread.images.map((image, i) =>
        limit(async () => {
          if (aborted) return;
          try {
            downloaded[i] = await downloadImage(client, image, imagesDir);
          } catch (err) {
            aborted = true; // thiếu một ảnh là đề không dùng được: dừng các tác vụ còn lại
            throw err;
          }
          imagesDone++;
          await progress();
          await flush();
          await rest();
        }),
      );
      // Tệp hỏng/quá lớn thì bỏ qua (null); chỉ lỗi đăng nhập mới dừng cả lượt
      const fileTasks = files.map(({ file, fileName }, i) =>
        limit(async () => {
          if (aborted) return;
          await progress();
          savedFiles[i] = await downloadAttachment(client, file, fileName, filesDir, fileBudget);
          filesDone++;
          await rest();
        }),
      );
      const commentTasks = thread.images.map((image, i) =>
        limit(async () => {
          if (aborted) return;
          comments[i] = await collectComments(client, image);
          commentsDone++;
          await progress();
          await rest();
        }),
      );

      // Chờ tất cả dừng hẳn (kể cả khi có lỗi) rồi mới dọn dẹp, để không còn tác vụ nào ghi vào thư mục đã xóa
      const results = await Promise.allSettled([...imageTasks, ...fileTasks, ...commentTasks]);
      await chain;
      const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      if (failure) throw failure.reason;
      if (flushError) throw flushError;
      if (committed < total) throw new Error("Không tải đủ ảnh của đề");
      const kept = savedFiles.filter((f): f is DownloadedFile => !!f);
      if (filesOnly && !kept.length) throw new Error("Không tải được tệp đính kèm nào của đề");

      const tFetch = Date.now() - t0 - tThread;
      await stage("Đang hoàn tất", true);
      const withComments = thread.images.map((image, i) => comments[i] ?? { image, comments: [] });
      if (!filesOnly) await writeCommentsFile(dir, { title: thread.title, url: sourceUrl }, withComments);
      await examAttachmentRepository.replace(
        examId,
        kept.map((f) => ({ name: f.file.name, filePath: filePathOf(threadId, f.fileName), mime: f.mime, sizeBytes: f.sizeBytes, sourceUrl: f.file.url.split("?")[0]! })),
      );
      if (refreshing) {
        await examRepository.finishRefresh(examId, { title: thread.title, sourceUrl, author: thread.author, postedAt: thread.postedAt, total });
        await removeStaleFiles(filesDir, new Set(kept.map((f) => f.fileName))); // thread bớt tệp: xoá tệp cũ trên đĩa
      }

      // Đáp án do AI giải NỀN sau khi lấy xong cả ảnh và bình luận. Cấu hình AI có thể đã đổi trong lúc lấy đề.
      const aiNow = aiReady(await aiSettingService.get());
      if (filesOnly) {
        if (refreshing) await examRepository.updateAnswers(examId, [], "MANUAL", null); // đề cũ có ảnh, nay chỉ còn tệp
      } else if (aiNow) {
        if (refreshing || exam.answerSource !== "PENDING") await examRepository.markPending(examId); // làm mới: bỏ đáp án cũ, giải lại từ đầu
        examSolveService.enqueue(examId);
      } else if (useAi || refreshing) {
        await examRepository.updateAnswers(examId, Array<string>(total).fill(""), "FAILED", `${AI_REPORT_FAILED_PREFIX}AI chưa được bật hoặc chưa có khóa Anthropic`);
      }
      void realtimeHub.publishExam(examId);
      console.log(`[crawl] thread ${threadId}: ${total} câu, ${kept.length}/${files.length} tệp | đọc thread ${(tThread / 1000).toFixed(1)}s | ảnh+bình luận ${(tFetch / 1000).toFixed(1)}s (${config.concurrency} luồng) | tổng ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      return { examId };
    } catch (err) {
      // Làm mới thất bại: đề cũ vẫn dùng được nên giữ nguyên, không gỡ gì cả
      if (refreshing) throw err;
      // Người dùng đã mở đề thì báo để họ thoát ra, rồi gỡ đề dở dang và thư mục ảnh
      if (ready) realtimeHub.publishExamFailed(examId, (err as Error).message);
      await examRepository.deleteById(examId).catch(() => undefined);
      await removeDir(dir);
      throw err;
    }
  },
};
