import { examAttemptRepository } from "../repositories/exam-attempt.repository";
import { examRepository } from "../repositories/exam.repository";
import { AppError } from "../rules/error";
import type { ListAttemptsQuery, SubmitAttemptBody } from "../rules/requests/attempt.request";
import { isMember, type Actor } from "../utils/actor";
import { toMeta } from "../utils/pagination";
import { examService } from "./exam.service";
import { gradeAttempt, type GradedQuestion } from "./grading.service";

export const attemptService = {
  // Nhận đáp án người dùng chọn, chấm theo đáp án trong DB rồi lưu lịch sử
  async submit(actor: Actor, examId: number, body: SubmitAttemptBody) {
    if (!isMember(actor.owner)) throw AppError.unauthorized(); // lịch sử chỉ dành cho thành viên
    await examService.assertAccess(actor, examId);
    const questions = await examRepository.findQuestionsForGrading(examId);
    if (questions.length === 0) throw AppError.notFound("Không tìm thấy đề");

    const grade = gradeAttempt(questions, body.answers);
    return examAttemptRepository.create({
      userId: actor.owner.userId,
      examId,
      mode: body.mode,
      score: grade.score,
      totalGraded: grade.totalGraded,
      correct: grade.correct,
      wrong: grade.wrong,
      skipped: grade.skipped,
      durationSec: body.durationSec,
      details: grade.items as unknown as object[],
    });
  },

  async listMine(userId: number, query: ListAttemptsQuery) {
    const { items, total } = await examAttemptRepository.list(userId, query, query.examId);
    return { items, meta: toMeta(query, total) };
  },

  // Chỉ chủ bài làm được xem (admin cũng không xem bài của người khác)
  async getMine(userId: number, id: number) {
    const attempt = await examAttemptRepository.findOfUser(id, userId);
    if (!attempt) throw AppError.notFound("Không tìm thấy bài làm");
    return { ...attempt, details: attempt.details as unknown as GradedQuestion[] };
  },
};
