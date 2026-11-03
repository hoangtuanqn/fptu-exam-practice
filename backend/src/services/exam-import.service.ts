import type { CrawlJob } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { storageDir } from "../configs/env";
import { EXAM_IMAGES_DIR, EXAM_STORAGE_DIR } from "../constants/crawler";
import { AI_REPORT_FAILED_PREFIX, aiReady } from "../constants/ai";
import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { examRepository, isDuplicateThread } from "../repositories/exam.repository";
import { threadUrl } from "../utils/fuo-url";
import { realtimeHub } from "../realtime/hub";
import { aiSettingService } from "./ai-setting.service";
import { examSolveService } from "./exam-solve.service";
import { writeCommentsFile } from "./crawler/comments-file.service";
import { collectAllComments } from "./crawler/comment-scraper.service";
import { createFuoClient } from "./crawler/fuo-client";
import { downloadAll } from "./crawler/image-downloader.service";
import { collectThread } from "./crawler/thread-scraper.service";
import { crawlerSettingService } from "./crawler-setting.service";

// Đường dẫn ảnh lưu trong DB, tương đối so với STORAGE_DIR (luôn dùng "/"): exams/<threadId>/images/<tên>.webp
const imagePathOf = (threadId: string, file: string) => `${EXAM_STORAGE_DIR}/${threadId}/${EXAM_IMAGES_DIR}/${file}`;

/**
 * Chạy trọn một lượt nhập đề: đọc thread -> tải ảnh -> lấy bình luận (ghi comments.txt) -> ghi DB.
 * AI giải đáp án chạy NỀN sau đó (exam-solve.service), không bắt người dùng chờ.
 *
 * Thư mục của đề: storage/exams/<threadId>/ gồm  images/Q1.webp...  và  comments.txt  (cùng ans.txt, ai-report.md khi AI giải xong).
 * Chỉ ghi DB ở bước cuối nên lỗi giữa chừng không để lại đề dở dang (thư mục đã tạo thì dọn đi).
 */
export const examImportService = {
  async run(job: CrawlJob): Promise<{ examId: number }> {
    const stage = async (text: string) => {
      await crawlJobRepository.setStage(job.id, text);
      void realtimeHub.publishJob(job.id); // người đang chờ thấy bước mới ngay
    };

    const existing = await examRepository.findByThreadId(job.threadId);
    if (existing) return { examId: existing.id }; // có người nhập xong trước đó

    const config = await crawlerSettingService.get();
    if (!config.cookie) throw new Error("Chưa cấu hình cookie FuOverflow. Admin hãy nhập ở Quản trị → Cấu hình lấy đề.");
    const client = createFuoClient(config);

    await stage("Đang đọc thread");
    const thread = await collectThread(client, threadUrl(job.threadId));
    const threadId = thread.threadId ?? job.threadId;
    if (threadId !== job.threadId) throw new Error("Thread trả về không khớp với link đã nhập");

    const dir = path.join(storageDir, EXAM_STORAGE_DIR, threadId);
    try {
      const downloaded = await downloadAll(client, thread.images, path.join(dir, EXAM_IMAGES_DIR), (done, total) =>
        stage(`Đang tải ảnh ${done}/${total}`),
      );
      const withComments = await collectAllComments(client, thread.images, (done, total) =>
        stage(`Đang lấy bình luận ${done}/${total}`),
      );
      const sourceUrl = thread.canonicalUrl ?? threadUrl(threadId);
      await writeCommentsFile(dir, { title: thread.title, url: sourceUrl }, withComments);

      // Đáp án do AI giải NỀN sau khi lưu: đề xem được ngay nhưng chưa làm bài được cho tới khi có đủ đáp án.
      // Không có đáp án giả: AI chưa dùng được thì đề ở trạng thái FAILED (chỉ xem), có thể giải lại sau.
      const ai = await aiSettingService.get();
      const useAi = aiReady(ai);

      await stage("Đang lưu vào cơ sở dữ liệu");
      const exam = await examRepository.create({
        threadId,
        title: thread.title,
        sourceUrl,
        author: thread.author,
        postedAt: thread.postedAt,
        createdById: job.userId ?? undefined,
        answerSource: useAi ? "PENDING" : "FAILED",
        aiReport: useAi ? undefined : `${AI_REPORT_FAILED_PREFIX}AI chưa được bật hoặc chưa có khóa Anthropic`,
        questions: withComments.map(({ image }, i) => ({
          number: i + 1, // thứ tự trong thread = số câu
          name: image.name,
          imagePath: imagePathOf(threadId, downloaded[i]!.file),
          sourceImage: image.url.split("?")[0]!, // bỏ token tạm
          mediaUrl: image.mediaUrl,
          answer: "",
        })),
      });
      if (useAi) examSolveService.enqueue(exam.id); // sau khi đề đã lưu: AI giải trong nền
      return { examId: exam.id };
    } catch (err) {
      if (isDuplicateThread(err)) {
        // Lượt khác vừa lưu xong cùng thread: dùng đề đó, thư mục của lượt này không cần giữ
        const winner = await examRepository.findByThreadId(threadId);
        if (winner) return { examId: winner.id };
      }
      // Dọn thư mục dở dang, trừ khi đề đã được lưu bởi lượt khác (cùng thư mục)
      if (!(await examRepository.findByThreadId(threadId))) await fs.rm(dir, { recursive: true, force: true });
      throw err;
    }
  },
};
