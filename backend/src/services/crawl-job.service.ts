import { PRO_BENEFITS } from "../constants/plan";
import { planService } from "./plan.service";
import type { ExamKind } from "@prisma/client";
import { CATALOG_ANSWER_SOURCES } from "../constants/exam";
import { PE_PRICE } from "../constants/pe";
import { prisma } from "../configs/prisma";
import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { subjectService } from "./subject.service";
import { examRepository } from "../repositories/exam.repository";
import { userExamRepository } from "../repositories/user-exam.repository";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AppError } from "../rules/error";
import type { ImportExamBody } from "../rules/requests/crawl.request";
import { isMember, type Actor } from "../utils/actor";
import { subjectOfExam } from "../utils/subject-code";
import { startOfVnDay } from "../utils/time";
import { crawlerSettingService } from "./crawler-setting.service";
import { examService } from "./exam.service";
import { notificationService } from "./notification.service";
import { walletService } from "./wallet.service";

const GUEST_DAILY_LIMIT = 1;
export const GUEST_LIMIT_MESSAGE =
  "Bạn đã hết lượt lấy đề miễn phí hôm nay. Đăng ký tài khoản để lấy thêm đề, lưu kho riêng và theo dõi lịch sử làm bài nhé!";

export const EXAM_NOT_READY = "Không tìm thấy đề này hoặc đề chưa sẵn sàng. Hãy tải lại Kho đề rồi thử lại.";
// Có mã EXAM_NOT_READY để giao diện nhận ra và tải lại Kho đề
const notReady = () => new AppError(EXAM_NOT_READY, HTTP_STATUS.NOT_FOUND, undefined, "EXAM_NOT_READY");

// Đề PE có giá riêng
const fetchPriceOf = async (exam: { kind: ExamKind | null }) => (exam.kind === "PE" ? PE_PRICE : (await crawlerSettingService.get()).fetchPrice);

// Tạo bộ đề theo chương: đề phải đúng môn đã chọn (mã đã lưu, rồi tiêu đề). Kiểm trước khi trừ phí.
async function assertSubject(subject: string | undefined, exam: { subjectCode: string | null; title: string }) {
  if (!subject) return;
  // Môn chưa có tên chương thì không làm được bộ đề theo chương: chặn trước khi trừ phí (và ghi báo cáo cho admin)
  const ready = await subjectService.chapterSetReady(subject);
  if (!ready.ok) throw new AppError(ready.message!, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  const code = subjectOfExam(exam);
  if (!code) throw new AppError("Không xác định được môn học của bài này từ tiêu đề, nên không thể tạo bộ đề theo chương", HTTP_STATUS.UNPROCESSABLE_ENTITY);
  if (code !== subject) throw new AppError(`Bài này là đề môn ${code}, không phải môn ${subject} bạn đã chọn`, HTTP_STATUS.UNPROCESSABLE_ENTITY);
}

// Chỉ đề đang bày trong Kho đề (không phải đề chờ/lỗi AI) và đã đủ câu
async function examOf(examId: string) {
  const exam = await examRepository.findById(examId);
  if (!exam || !CATALOG_ANSWER_SOURCES.includes(exam.answerSource) || !(await examRepository.isComplete(exam))) throw notReady();
  return exam;
}

export const crawlJobService = {
  // Phí mở một đề, để giao diện báo trước cho người dùng
  // Khách còn kèm số lượt miễn phí còn lại hôm nay để giao diện báo trước (thay vì đợi hết lượt mới biết)
  async getPrice(actor?: Actor) {
    const price = (await crawlerSettingService.get()).fetchPrice;
    if (!actor || isMember(actor.owner)) return { price, pePrice: PE_PRICE };
    const used = await crawlJobRepository.countGuestFetchesSince(actor.owner.guestId, startOfVnDay());
    return { price, pePrice: PE_PRICE, guestLimit: GUEST_DAILY_LIMIT, guestRemaining: Math.max(0, GUEST_DAILY_LIMIT - used) };
  },

  // Phí thực tế của lần mở này. Đề người này đã có trong kho thì miễn phí; Pro miễn phí. Khách không bị tính phí.
  async quote(actor: Actor, body: ImportExamBody) {
    const { owner } = actor;
    const exam = await examOf(body.examId);
    const price = isMember(owner) ? await fetchPriceOf(exam) : 0;
    const owned = await userExamRepository.has(owner, exam.id);
    await assertSubject(body.subject, exam);
    const pro = isMember(owner) && PRO_BENEFITS.freeFetch && (await planService.isPro(owner.userId));
    const free = isMember(owner) && price > 0 && (pro || owned);
    return { price, fee: free ? 0 : price, free, reason: free ? (pro ? ("pro" as const) : ("owned" as const)) : null, title: owned ? exam.title : null };
  },

  /**
   * Mở một đề có sẵn trong hệ thống: trừ phí (admin cấu hình, PE giá riêng) trừ khi đề đã trong kho của người này hoặc là Pro,
   * rồi thêm vào kho. Trừ tiền và thêm vào kho nằm trong cùng một transaction: không đủ tiền thì không có gì được tạo.
   */
  async submit(actor: Actor, body: ImportExamBody) {
    const { owner } = actor;
    const exam = await examOf(body.examId);
    const threadId = exam.threadId;

    // Khách: miễn phí nhưng chỉ 1 lượt mỗi ngày, hết lượt thì mời đăng ký
    if (!isMember(owner)) {
      const used = await crawlJobRepository.countGuestFetchesSince(owner.guestId, startOfVnDay());
      if (used >= GUEST_DAILY_LIMIT) throw new AppError(GUEST_LIMIT_MESSAGE, HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    await assertSubject(body.subject, exam);
    // Đã có đề này trong kho của mình thì mở lại miễn phí
    const alreadyOwned = isMember(owner) && (await userExamRepository.has(owner, exam.id));
    // Pro: mở đề không bị trừ phí (vẫn lưu vào kho)
    const isPro = isMember(owner) && PRO_BENEFITS.freeFetch && (await planService.isPro(owner.userId));
    const fetchPrice = isMember(owner) && !alreadyOwned && !isPro ? await fetchPriceOf(exam) : 0;

    let balanceAfter: number | null = null; // số dư sau khi trừ phí, để báo qua email
    const result = await prisma.$transaction(async (tx) => {
      if (fetchPrice > 0 && isMember(owner)) {
        const entry = await walletService.charge(tx, { userId: owner.userId, amount: fetchPrice, type: "CRAWL_CHARGE", note: `Lấy đề thread ${threadId}` });
        balanceAfter = entry.balanceAfter;
      }
      await examService.addToLibrary(owner, exam.id, tx, isPro && fetchPrice === 0 && !alreadyOwned); // Pro mở free thì khoá lại khi hết Pro; có trả phí thì giữ vĩnh viễn
      // Ghi lại lượt mở của khách để đếm giới hạn ngày
      if (!isMember(owner)) await crawlJobRepository.create({ threadId, ...owner, chargedAmount: 0, status: "DONE", examId: exam.id, finishedAt: new Date() }, tx);
      return { existed: true as const, examId: exam.id, title: exam.title, charged: fetchPrice, free: alreadyOwned };
    });

    // Mỗi lần bị trừ phí đều báo qua email (sau khi transaction đã commit)
    if (isMember(owner) && fetchPrice > 0 && balanceAfter !== null) {
      notificationService.fetchCharged({ userId: owner.userId, amount: fetchPrice, balanceAfter, examId: exam.id, examTitle: exam.title });
    }
    return result;
  },
};
