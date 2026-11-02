import type { CrawlJob } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { storageDir } from "../configs/env";
import { DEFAULT_ANSWER, EXAM_STORAGE_DIR } from "../constants/crawler";
import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { examRepository, isDuplicateThread } from "../repositories/exam.repository";
import { threadUrl } from "../utils/fuo-url";
import { collectAllComments } from "./crawler/comment-scraper.service";
import { createFuoClient } from "./crawler/fuo-client";
import { downloadAll } from "./crawler/image-downloader.service";
import { collectThread } from "./crawler/thread-scraper.service";
import { crawlerSettingService } from "./crawler-setting.service";

// Đường dẫn ảnh lưu trong DB, tương đối so với STORAGE_DIR (luôn dùng "/")
const imagePathOf = (threadId: string, file: string) => `${EXAM_STORAGE_DIR}/${threadId}/${file}`;

/**
 * Chạy trọn một lượt nhập đề: đọc thread -> tải ảnh -> lấy bình luận -> ghi DB.
 * Chỉ ghi DB ở bước cuối nên lỗi giữa chừng không để lại đề dở dang (ảnh đã tải thì dọn đi).
 */
export const examImportService = {
  async run(job: CrawlJob): Promise<{ examId: number }> {
    const stage = (text: string) => crawlJobRepository.setStage(job.id, text);

    const existing = await examRepository.findByThreadId(job.threadId);
    if (existing) return { examId: existing.id }; // có người nhập xong trước đó

    const config = await crawlerSettingService.get();
    if (!config.cookie) throw new Error("Chưa cấu hình cookie FuOverflow. Admin hãy nhập ở Quản trị → Cấu hình crawl.");
    const client = createFuoClient(config);

    await stage("Đang đọc thread");
    const thread = await collectThread(client, threadUrl(job.threadId));
    const threadId = thread.threadId ?? job.threadId;
    if (threadId !== job.threadId) throw new Error("Thread trả về không khớp với link đã nhập");

    const dir = path.join(storageDir, EXAM_STORAGE_DIR, threadId);
    try {
      const downloaded = await downloadAll(client, thread.images, dir, (done, total) =>
        stage(`Đang tải ảnh ${done}/${total}`),
      );
      const withComments = await collectAllComments(client, thread.images, (done, total) =>
        stage(`Đang lấy bình luận ${done}/${total}`),
      );

      await stage("Đang lưu vào cơ sở dữ liệu");
      const exam = await examRepository.create({
        threadId,
        title: thread.title,
        sourceUrl: thread.canonicalUrl ?? threadUrl(threadId),
        author: thread.author,
        postedAt: thread.postedAt,
        createdById: job.userId,
        questions: withComments.map(({ image, comments }, i) => ({
          number: i + 1, // thứ tự trong thread = số câu
          name: image.name,
          imagePath: imagePathOf(threadId, downloaded[i]!.file),
          sourceImage: image.url.split("?")[0]!, // bỏ token tạm
          mediaUrl: image.mediaUrl,
          answer: DEFAULT_ANSWER,
          comments: comments.map((c) => ({ ...c, externalId: c.id })),
        })),
      });
      return { examId: exam.id };
    } catch (err) {
      if (isDuplicateThread(err)) {
        // Lượt khác vừa lưu xong cùng thread: dùng đề đó, ảnh của lượt này không cần giữ
        const winner = await examRepository.findByThreadId(threadId);
        if (winner) return { examId: winner.id };
      }
      // Dọn ảnh dở dang, trừ khi đề đã được lưu bởi lượt khác (cùng thư mục)
      if (!(await examRepository.findByThreadId(threadId))) await fs.rm(dir, { recursive: true, force: true });
      throw err;
    }
  },
};
