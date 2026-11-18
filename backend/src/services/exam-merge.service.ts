import fs from "node:fs/promises";
import path from "node:path";
import { storageDir } from "../configs/env";
import { EXAM_FILES_DIR, EXAM_IMAGES_DIR, EXAM_STORAGE_DIR } from "../constants/crawler";
import { FUO_SOURCE_COMMENT_REFRESH_DAYS } from "../constants/fuo-source";
import { examAttachmentRepository } from "../repositories/exam-attachment.repository";
import { examRepository } from "../repositories/exam.repository";
import { realtimeHub } from "../realtime/hub";
import { attachmentFileName } from "../utils/attachment";
import { pickNewNames, planQuestionMerge, withoutQuery } from "../utils/exam-merge";
import { threadUrl } from "../utils/fuo-url";
import { createLimiter } from "../utils/limiter";
import { sleep } from "../utils/sleep";
import { downloadAttachment } from "./crawler/attachment-downloader.service";
import { collectComments } from "./crawler/comment-scraper.service";
import { replaceCommentsSections } from "./crawler/comments-file.service";
import { FUO_AUTH_MESSAGE, FuoAuthError, createFuoClient } from "./crawler/fuo-client";
import { downloadImage } from "./crawler/image-downloader.service";
import { collectThread } from "./crawler/thread-scraper.service";
import { crawlerSettingService } from "./crawler-setting.service";
import { filePathOf, imagePathOf, withThreadLock } from "./exam-import.service";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface MergeOutcome {
  examId: string;
  result: "UPDATED" | "UNCHANGED" | "ORDER_CHANGED";
  addedQuestions: number;
  addedFiles: number;
  commentsRefreshed: boolean;
}

// Chờ mọi tác vụ dừng hẳn rồi mới báo lỗi đầu tiên (không còn tác vụ nào ghi đĩa sau khi đã thoát)
async function settle<T>(tasks: Promise<T>[]): Promise<T[]> {
  const results = await Promise.allSettled(tasks);
  const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failure) throw failure.reason;
  return results.map((r) => (r as PromiseFulfilledResult<T>).value);
}

/**
 * Cập nhật "êm" một đề đã có: chỉ THÊM, không xoá, không đánh số lại, không đổi đáp án, không gọi AI.
 * - Câu: thêm ảnh mới ở các vị trí chưa có câu (đáp án để trống cho admin/AI giải sau), nâng totalQuestions.
 *   Tên câu/tệp mới không trùng câu đã lưu hay tệp đã có, ảnh ghi kiểu không-ghi-đè. Thread lệch ảnh hoặc tên: không đụng gì.
 * - Tệp đính kèm: tải và thêm tệp chưa có (so theo link gốc); tệp cũ và id của chúng giữ nguyên.
 * - Bình luận: chỉ lấy lại khi vừa thêm câu hoặc lần lấy trước cũ hơn FUO_SOURCE_COMMENT_REFRESH_DAYS (đỡ tải FuOverflow);
 *   chỉ thay mục của câu nào lấy được ít nhất một bình luận, ghi comments.txt một lần.
 * - Giữ nguyên: id đề và câu, tiêu đề, ảnh và đáp án câu cũ, lời giải thích, lượt làm, phiên, câu đã lưu, thẻ ôn, báo lỗi đáp án, refreshedAt.
 * Mọi request đi qua FuoClient với cùng concurrency/requestDelayMs của cấu hình lấy đề. Ghi DB chỉ sau khi tải xong hết.
 */
async function mergeLocked(threadId: string, commentsAt: Date | null): Promise<MergeOutcome | null> {
  const exam = await examRepository.findByThreadId(threadId);
  if (!exam || !(await examRepository.isComplete(exam))) return null; // chưa có hoặc dở dang: nhập như đề mới

  const config = await crawlerSettingService.get();
  if (!config.cookie) throw new Error(FUO_AUTH_MESSAGE, { cause: new FuoAuthError("no cookie") });
  const client = createFuoClient(config);
  const thread = await collectThread(client, threadUrl(threadId));
  if ((thread.threadId ?? threadId) !== threadId) throw new Error("Thread trả về không khớp với link đã nhập");

  const storedQuestions = await examRepository.findQuestionSources(exam.id);
  const plan = planQuestionMerge(storedQuestions, thread.images);
  const unchanged = { examId: exam.id, addedQuestions: 0, addedFiles: 0, commentsRefreshed: false };
  if (plan.orderChanged) return { ...unchanged, result: "ORDER_CHANGED" };

  const dir = path.join(storageDir, EXAM_STORAGE_DIR, threadId);
  const imagesDir = path.join(dir, EXAM_IMAGES_DIR);
  const filesDir = path.join(dir, EXAM_FILES_DIR);
  const limit = createLimiter(Math.max(1, config.concurrency));
  const throttled = <T>(task: () => Promise<T>) =>
    limit(async () => {
      try {
        return await task();
      } finally {
        if (config.requestDelayMs > 0) await sleep(config.requestDelayMs);
      }
    });

  // Câu mới: tên (cũng là tên tệp) tránh mọi tên câu đã lưu và mọi tệp đang có trong thư mục ảnh
  const onDisk = await fs.readdir(imagesDir).catch(() => [] as string[]);
  const names = pickNewNames(plan.add.map((i) => thread.images[i]!.name), storedQuestions.map((q) => q.name), onDisk);
  const newImages = plan.add.map((i, k) => ({ ...thread.images[i]!, name: names[k]!, fileBase: names[k]! }));

  const stored = await examAttachmentRepository.listByExam(exam.id);
  const knownSources = new Set(stored.map((f) => f.sourceUrl));
  const usedNames = new Set(stored.map((f) => path.posix.parse(f.filePath).name.toLowerCase())); // uniqueName so theo tên không đuôi
  const newFiles = thread.files
    .filter((file) => !knownSources.has(withoutQuery(file.url)))
    .flatMap((file) => {
      const fileName = attachmentFileName(file.name, usedNames);
      return fileName ? [{ file, fileName }] : [];
    });

  const refreshComments = newImages.length > 0 || !commentsAt || Date.now() - commentsAt.getTime() > FUO_SOURCE_COMMENT_REFRESH_DAYS * DAY_MS;
  // Bình luận theo tên câu trong DB (câu cũ giữ tên trên thread, câu mới dùng tên vừa chọn)
  const commentTargets = refreshComments ? [...thread.images.slice(0, storedQuestions.length), ...newImages] : [];

  if (newImages.length) await fs.mkdir(imagesDir, { recursive: true });
  if (newFiles.length) await fs.mkdir(filesDir, { recursive: true });
  const budget = { used: 0 }; // shortcut: budget counts only the new files of this run, not files already stored; enough while threads rarely grow
  const written: string[] = []; // tệp mới đã ghi: lỗi giữa chừng thì gỡ (tệp cũ không bao giờ bị ghi đè)
  try {
    const [images, files, comments] = await Promise.all([
      settle(
        newImages.map((image) =>
          throttled(async () => {
            const d = await downloadImage(client, image, imagesDir, { exclusive: true });
            written.push(path.join(imagesDir, d.file));
            return d;
          }),
        ),
      ),
      settle(
        newFiles.map(({ file, fileName }) =>
          throttled(async () => {
            const f = await downloadAttachment(client, file, fileName, filesDir, budget);
            if (f) written.push(path.join(filesDir, f.fileName));
            return f;
          }),
        ),
      ),
      settle(commentTargets.map((image) => throttled(() => collectComments(client, image)))),
    ]);

    const rows = images.map((d, k) => ({
      number: plan.add[k]! + 1,
      name: d.image.name,
      imagePath: imagePathOf(threadId, d.file),
      sourceImage: withoutQuery(d.image.url),
      mediaUrl: d.image.mediaUrl,
      answer: "",
    }));
    if (rows.length) await examRepository.appendQuestions(exam.id, rows, thread.images.length);
    const committed = rows.length > 0;
    const imageFiles = new Set(images.map((d) => path.join(imagesDir, d.file)));
    written.splice(0, written.length, ...written.filter((f) => !imageFiles.has(f))); // ảnh đã được câu trong DB trỏ tới: không bao giờ gỡ
    // Câu đã vào DB: lỗi ở các bước sau chỉ ghi log, vẫn báo UPDATED kèm số câu (không để worker đánh FAILED và mất addedQuestions)
    const afterCommit = async (step: string, task: () => Promise<void>) => {
      if (!committed) return task();
      try {
        await task();
        return true;
      } catch (err) {
        console.error(`[fuo-source] thread ${threadId}: đã thêm ${rows.length} câu nhưng lỗi khi ${step}: ${(err as Error).message}`);
        return false;
      }
    };

    let kept = files.flatMap((f) => (f ? [f] : []));
    const filesOk = await afterCommit("ghi tệp đính kèm", async () => {
      if (!kept.length) return;
      await examAttachmentRepository.add(
        exam.id,
        kept.map((f) => ({ name: f.file.name, filePath: filePathOf(threadId, f.fileName), mime: f.mime, sizeBytes: f.sizeBytes, sourceUrl: withoutQuery(f.file.url) })),
      );
    });
    if (filesOk === false) {
      await Promise.all(written.map((f) => fs.rm(f, { force: true }))); // tệp đính kèm chưa có dòng DB nào trỏ tới
      kept = [];
    }
    written.length = 0;
    // Lấy lỗi trả rỗng: giữ mục cũ, chỉ thay câu có bình luận
    const commentsOk = await afterCommit("ghi bình luận", () =>
      replaceCommentsSections(dir, { title: exam.title, url: exam.sourceUrl }, comments.filter((c) => c.comments.length)),
    );

    if (rows.length) void realtimeHub.publishExamQuestions(exam.id);
    const changed = rows.length > 0 || kept.length > 0;
    return { examId: exam.id, result: changed ? "UPDATED" : "UNCHANGED", addedQuestions: rows.length, addedFiles: kept.length, commentsRefreshed: refreshComments && commentsOk !== false };
  } catch (err) {
    await Promise.all(written.map((f) => fs.rm(f, { force: true })));
    throw err;
  }
}

export const examMergeService = {
  /**
   * null: đề chưa có hoặc còn dở dang, cần nhập như đề mới (examImportService.run).
   * `commentsAt`: lần gần nhất lượt nạp đã lấy bình luận của thread này (null = chưa từng).
   */
  merge: (threadId: string, commentsAt: Date | null) => withThreadLock(threadId, () => mergeLocked(threadId, commentsAt)),
};
