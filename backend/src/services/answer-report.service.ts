import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { ANSWER_REPORT_DAILY_LIMIT, ANSWER_REPORT_REWARD } from "../constants/report";
import { HTTP_STATUS } from "../constants/httpStatus";
import { realtimeHub } from "../realtime/hub";
import { answerReportRepository } from "../repositories/answer-report.repository";
import { examRepository } from "../repositories/exam.repository";
import { AppError } from "../rules/error";
import type { CreateReportBody, ListReportsQuery, ReviewReportBody } from "../rules/requests/answer-report.request";
import type { Actor } from "../utils/actor";
import { fileUrlOf } from "../utils/file-url";
import { startOfVnDay } from "../utils/time";
import { toMeta, type PaginationQuery } from "../utils/pagination";
import { examService } from "./exam.service";
import { notificationService } from "./notification.service";
import { walletService } from "./wallet.service";

// "ACD", "a c d", "C A" -> "A C D": cùng một tập đáp án thì cùng một chuỗi (để so với đáp án đang có)
const normalize = (answer: string) => [...new Set(answer.toUpperCase().replace(/[^A-Z]/g, "").split(""))].sort().join(" ");

const imageUrlOf = fileUrlOf;

export const answerReportService = {
  // ----- Thành viên
  async create(actor: Actor, userId: number, body: CreateReportBody) {
    await examService.assertAccess(actor, body.examId); // chỉ báo cáo đề nằm trong kho của mình

    const source = await examRepository.findAnswerSource(body.examId);
    if (source?.answerSource !== "AI" && source?.answerSource !== "MANUAL") {
      throw new AppError("Đề chưa có đáp án chính thức nên chưa thể báo cáo");
    }
    const question = await examRepository.findQuestionAnswer(body.examId, body.questionNumber);
    if (!question) throw AppError.notFound("Không tìm thấy câu hỏi");

    const proposed = normalize(body.proposedAnswer);
    if (proposed === normalize(question.answer)) {
      throw new AppError("Đáp án bạn đề xuất trùng với đáp án hiện tại", HTTP_STATUS.BAD_REQUEST, { proposedAnswer: "Trùng với đáp án hiện tại" });
    }
    if ((await answerReportRepository.countSince(userId, startOfVnDay())) >= ANSWER_REPORT_DAILY_LIMIT) {
      throw new AppError("Hôm nay bạn đã gửi quá nhiều báo cáo, vui lòng quay lại vào ngày mai", HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    try {
      await answerReportRepository.create({
        examId: body.examId,
        questionNumber: body.questionNumber,
        userId,
        currentAnswer: normalize(question.answer),
        proposedAnswer: proposed,
        reason: body.reason,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw AppError.conflict("Bạn đã báo cáo câu này rồi");
      throw err;
    }
    return { reward: ANSWER_REPORT_REWARD };
  },

  async mine(userId: number, query: PaginationQuery) {
    const { items, total } = await answerReportRepository.listByUser(userId, query);
    return { items, meta: toMeta(query, total) };
  },

  // ----- Admin
  async list(query: ListReportsQuery) {
    const { status, ...page } = query;
    const { items, total } = await answerReportRepository.listAdmin(page, status);
    const images = await answerReportRepository.questionImages(items.map((r) => ({ examId: r.examId, number: r.questionNumber })));
    const imageOf = new Map(images.map((q) => [`${q.examId}:${q.number}`, imageUrlOf(q.imagePath)]));
    return {
      items: items.map((r) => ({ ...r, imageUrl: imageOf.get(`${r.examId}:${r.questionNumber}`) ?? null })),
      meta: toMeta(page, total),
    };
  },

  /**
   * Duyệt đúng: chốt báo cáo (UPDATE có điều kiện), sửa đáp án của câu, thưởng credit cho người báo cáo. Cùng một transaction.
   */
  async approve(adminId: number, id: number, { note }: ReviewReportBody) {
    const result = await prisma.$transaction(async (tx) => {
      const report = await answerReportRepository.findPending(tx, id);
      if (!report) throw AppError.conflict("Báo cáo không còn ở trạng thái chờ duyệt");
      if (!(await answerReportRepository.review(tx, id, { status: "APPROVED", reward: ANSWER_REPORT_REWARD, reviewNote: note, reviewedById: adminId }))) {
        throw AppError.conflict("Báo cáo vừa được xử lý bởi người khác");
      }
      await examRepository.setQuestionAnswer(tx, report.examId, report.questionNumber, report.proposedAnswer);
      await tx.questionExplanation.deleteMany({ where: { examId: report.examId, questionNumber: report.questionNumber } }); // lời giải cũ theo đáp án cũ
      const entry = await walletService.applyChange(tx, {
        userId: report.userId,
        amount: ANSWER_REPORT_REWARD,
        type: "REPORT_REWARD",
        note: `Báo cáo đáp án đúng: ${report.exam.title}, câu ${report.questionNumber}`,
      });
      return { report, balanceAfter: entry.balanceAfter };
    });

    void realtimeHub.publishExam(result.report.examId); // người đang mở đề thấy đáp án mới
    notificationService.reportApproved({
      userId: result.report.userId,
      examTitle: result.report.exam.title,
      questionNumber: result.report.questionNumber,
      reward: ANSWER_REPORT_REWARD,
      balanceAfter: result.balanceAfter,
    });
    return { id, status: "APPROVED" as const, reward: ANSWER_REPORT_REWARD };
  },

  async reject(adminId: number, id: number, { note }: ReviewReportBody) {
    const done = await prisma.$transaction(async (tx) => {
      if (!(await answerReportRepository.findPending(tx, id))) return false;
      return answerReportRepository.review(tx, id, { status: "REJECTED", reward: 0, reviewNote: note, reviewedById: adminId });
    });
    if (!done) throw AppError.conflict("Báo cáo không còn ở trạng thái chờ duyệt");
    return { id, status: "REJECTED" as const, reward: 0 };
  },
};
