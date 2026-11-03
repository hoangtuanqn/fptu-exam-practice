import type { CrawlJob } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { examRepository } from "../repositories/exam.repository";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AppError } from "../rules/error";
import type { ImportExamBody } from "../rules/requests/crawl.request";
import { isMember, type Actor } from "../utils/actor";
import { parseThreadId } from "../utils/fuo-url";
import { startOfVnDay } from "../utils/time";
import { crawlerSettingService } from "./crawler-setting.service";
import { toJobDto } from "./crawl-job.dto";
import { examService } from "./exam.service";
import { notificationService } from "./notification.service";
import { walletService } from "./wallet.service";

type Listener = () => void;
const listeners: Listener[] = [];

const GUEST_DAILY_LIMIT = 1;
export const GUEST_LIMIT_MESSAGE =
  "Bạn đã hết lượt lấy đề miễn phí hôm nay. Đăng ký tài khoản để lấy thêm đề, lưu kho riêng và theo dõi lịch sử làm bài nhé!";

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
    if (active) return { existed: false as const, job: toJobDto(active), charged: 0 };

    // Khách: miễn phí nhưng chỉ 1 lượt mỗi ngày (tính cả lúc đề đã có sẵn), hết lượt thì mời đăng ký
    if (!isMember(owner)) {
      const used = await crawlJobRepository.countGuestFetchesSince(owner.guestId, startOfVnDay());
      if (used >= GUEST_DAILY_LIMIT) throw new AppError(GUEST_LIMIT_MESSAGE, HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    // Khách chưa có ví nên không bị tính phí
    const fetchPrice = isMember(owner) ? (await crawlerSettingService.get()).fetchPrice : 0;
    const exam = await examRepository.findByThreadId(threadId);

    let balanceAfter: number | null = null; // số dư sau khi trừ phí, để báo qua email
    const result = await prisma.$transaction(async (tx) => {
      if (fetchPrice > 0 && isMember(owner)) {
        const entry = await walletService.charge(tx, {
          userId: owner.userId,
          amount: fetchPrice,
          type: "CRAWL_CHARGE",
          note: `Lấy đề thread ${threadId}`,
        });
        balanceAfter = entry.balanceAfter;
      }
      if (exam) {
        await examService.addToLibrary(owner, exam.id, tx);
        if (!isMember(owner)) {
          // Ghi lại lượt lấy của khách để đếm giới hạn ngày
          await crawlJobRepository.create(
            { threadId, ...owner, chargedAmount: 0, status: "DONE", examId: exam.id, finishedAt: new Date() },
            tx,
          );
        }
        return { existed: true as const, examId: exam.id, title: exam.title, charged: fetchPrice };
      }
      const job = await crawlJobRepository.create({ threadId, ...owner, chargedAmount: fetchPrice }, tx);
      return { existed: false as const, job: toJobDto(job), charged: fetchPrice };
    });

    // Mỗi lần bị trừ phí đều báo qua email (sau khi transaction đã commit)
    if (isMember(owner) && fetchPrice > 0 && balanceAfter !== null) {
      notificationService.fetchCharged({
        userId: owner.userId,
        amount: fetchPrice,
        balanceAfter,
        threadId,
        examTitle: exam?.title,
      });
    }

    if (!result.existed) listeners.forEach((fn) => fn());
    return result;
  },

  // Job lỗi: đánh dấu FAILED và hoàn đúng số tiền đã trừ, cùng một transaction
  async fail(job: CrawlJob, message: string) {
    const refunded = await prisma.$transaction(async (tx) => {
      const claimed = await crawlJobRepository.markFailed(tx, job.id, message);
      if (claimed && job.userId !== null && job.chargedAmount > 0) {
        const entry = await walletService.applyChange(tx, {
          userId: job.userId,
          amount: job.chargedAmount,
          type: "CRAWL_REFUND",
          note: `Hoàn phí lấy đề thread ${job.threadId} (lỗi)`,
        });
        return { userId: job.userId, amount: job.chargedAmount, balanceAfter: entry.balanceAfter, threadId: job.threadId };
      }
      return null;
    });
    // Báo qua email sau khi transaction hoàn phí đã commit
    if (refunded) notificationService.fetchRefunded(refunded);
  },

  // Chỉ chủ job (thành viên hoặc đúng khách đó, hoặc admin) được xem tiến độ
  async getForActor(id: number, actor: Actor) {
    const job = await crawlJobRepository.findById(id);
    const mine = isMember(actor.owner) ? job?.userId === actor.owner.userId : job?.guestId === actor.owner.guestId;
    if (!job || (!mine && !actor.isAdmin)) throw AppError.notFound("Không tìm thấy tiến trình");
    return toJobDto(job, job.status === "QUEUED" ? await crawlJobRepository.countAhead(job.id) : 0);
  },

  // Worker đăng ký để được đánh thức khi có job mới
  onEnqueued: (fn: Listener) => void listeners.push(fn),
};
