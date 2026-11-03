import type { CrawlJob } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { examRepository } from "../repositories/exam.repository";
import { AppError } from "../rules/error";
import type { ImportExamBody } from "../rules/requests/crawl.request";
import { isMember, type Actor } from "../utils/actor";
import { parseThreadId } from "../utils/fuo-url";
import { crawlerSettingService } from "./crawler-setting.service";
import { examService } from "./exam.service";
import { walletService } from "./wallet.service";

type Listener = () => void;
const listeners: Listener[] = [];

const toDto = (job: CrawlJob) => ({
  id: job.id,
  status: job.status,
  stage: job.stage,
  error: job.error,
  examId: job.examId,
});

export const crawlJobService = {
  // Phí mỗi lần lấy đề, để giao diện báo trước cho người dùng
  async getPrice() {
    return { price: (await crawlerSettingService.get()).fetchPrice };
  },

  /**
   * Nhận link đề. Mỗi lần lấy đều bị trừ phí (admin cấu hình), kể cả đề đã có sẵn.
   * Trừ tiền và ghi nhận (job hoặc thư viện) nằm trong cùng một transaction: không đủ tiền thì không có gì được tạo.
   * - chính người này đang có lượt cùng thread chưa xong -> dùng lại lượt đó, không trừ thêm
   * - đề đã có trong DB (cùng thread ID, dù link khác) -> thêm vào thư viện, không crawl lại
   * - ngược lại -> tạo job và đánh thức worker nền
   */
  async submit(actor: Actor, { url }: ImportExamBody) {
    const { owner } = actor;
    const threadId = parseThreadId(url);
    if (!threadId) throw new AppError("Link không hợp lệ"); // đã được validate, giữ để thu hẹp kiểu

    const active = await crawlJobRepository.findActive(threadId, owner);
    if (active) return { existed: false as const, job: toDto(active), charged: 0 };

    // Khách chưa có ví nên không bị tính phí (chỉ bị giới hạn số lượt theo IP ở route)
    const fetchPrice = isMember(owner) ? (await crawlerSettingService.get()).fetchPrice : 0;
    const exam = await examRepository.findByThreadId(threadId);

    const result = await prisma.$transaction(async (tx) => {
      if (fetchPrice > 0 && isMember(owner)) {
        await walletService.charge(tx, {
          userId: owner.userId,
          amount: fetchPrice,
          type: "CRAWL_CHARGE",
          note: `Lấy đề thread ${threadId}`,
        });
      }
      if (exam) {
        await examService.addToLibrary(owner, exam.id, tx);
        return { existed: true as const, examId: exam.id, title: exam.title, charged: fetchPrice };
      }
      const job = await crawlJobRepository.create({ threadId, ...owner, chargedAmount: fetchPrice }, tx);
      return { existed: false as const, job: toDto(job), charged: fetchPrice };
    });

    if (!result.existed) listeners.forEach((fn) => fn());
    return result;
  },

  // Job lỗi: đánh dấu FAILED và hoàn đúng số tiền đã trừ, cùng một transaction
  async fail(job: CrawlJob, message: string) {
    await prisma.$transaction(async (tx) => {
      const claimed = await crawlJobRepository.markFailed(tx, job.id, message);
      if (claimed && job.userId !== null && job.chargedAmount > 0) {
        await walletService.applyChange(tx, {
          userId: job.userId,
          amount: job.chargedAmount,
          type: "CRAWL_REFUND",
          note: `Hoàn phí lấy đề thread ${job.threadId} (lỗi)`,
        });
      }
    });
  },

  // Chỉ chủ job (thành viên hoặc đúng khách đó, hoặc admin) được xem tiến độ
  async getForActor(id: number, actor: Actor) {
    const job = await crawlJobRepository.findById(id);
    const mine = isMember(actor.owner) ? job?.userId === actor.owner.userId : job?.guestId === actor.owner.guestId;
    if (!job || (!mine && !actor.isAdmin)) throw AppError.notFound("Không tìm thấy tiến trình");
    return toDto(job);
  },

  // Worker đăng ký để được đánh thức khi có job mới
  onEnqueued: (fn: Listener) => void listeners.push(fn),
};
