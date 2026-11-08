import { examAttemptRepository } from "../repositories/exam-attempt.repository";
import { examRepository } from "../repositories/exam.repository";
import { AppError } from "../rules/error";
import type { ListAttemptsQuery, SubmitAttemptBody } from "../rules/requests/attempt.request";
import { isMember, type Actor } from "../utils/actor";
import { toMeta } from "../utils/pagination";
import { examService } from "./exam.service";
import { gradeAttempt, type GradedQuestion } from "./grading.service";
import { reviewService } from "./review.service";
import { studyService } from "./study.service";
import { topicsOfAttempt } from "./topic-stats.service";

export const attemptService = {
  // Nhận đáp án người dùng chọn, chấm theo đáp án trong DB rồi lưu lịch sử
  async submit(actor: Actor, examId: number, body: SubmitAttemptBody, perks: { unlimitedReview?: boolean; topicReport?: boolean } = {}) {
    if (!isMember(actor.owner)) throw AppError.unauthorized(); // lịch sử chỉ dành cho thành viên
    await examService.assertAccess(actor, examId);
    // AI chưa phân tích xong thì chưa chấm được: bắt giao diện chờ rồi gửi lại, không ghi điểm sai vào lịch sử
    if ((await examRepository.findAnswerSource(examId))?.answerSource === "PENDING") {
      throw AppError.conflict("Đáp án đang được AI phân tích, vui lòng thử lại sau ít phút");
    }
    const all = await examRepository.findQuestionsForGrading(examId);
    const only = body.only && body.only.length > 0 ? new Set(body.only) : null;
    const questions = only ? all.filter((q) => only.has(q.number)) : all;
    if (questions.length === 0) throw AppError.notFound("Không tìm thấy đề");

    const grade = gradeAttempt(questions, body.answers);
    const attempt = await examAttemptRepository.create({
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

    // Sổ câu sai và chuỗi ngày học: việc phụ, lỗi ở đây không được làm mất bài đã nộp
    const userId = actor.owner.userId;
    let review = { added: 0, capped: 0 };
    try {
      review = await reviewService.recordAttempt(userId, examId, grade.items, body.flagged ?? [], !!perks.unlimitedReview);
      if (grade.totalGraded > 0 && grade.correct + grade.wrong >= grade.totalGraded / 2) await studyService.bump(userId, { attempts: 1 });
    } catch (err) {
      console.error("[review] recordAttempt lỗi:", err);
    }
    // Kết quả theo chủ đề của bài vừa nộp (việc phụ: lỗi thì bỏ qua)
    const topics = await topicsOfAttempt(examId, grade.items, !!perks.topicReport).catch(() => ({ topics: [], hidden: 0 }));
    return { ...attempt, review, topics: topics.topics, topicsHidden: topics.hidden };
  },

  async listMine(userId: number, query: ListAttemptsQuery) {
    const { items, total } = await examAttemptRepository.list(userId, query, query.examId);
    return { items, meta: toMeta(query, total) };
  },

  summary: (userId: number, examId: number) => examAttemptRepository.summaryOfExam(userId, examId),

  // Chỉ chủ bài làm được xem (admin cũng không xem bài của người khác)
  async getMine(userId: number, id: number) {
    const attempt = await examAttemptRepository.findOfUser(id, userId);
    if (!attempt) throw AppError.notFound("Không tìm thấy bài làm");
    return { ...attempt, details: attempt.details as unknown as GradedQuestion[] };
  },
};
