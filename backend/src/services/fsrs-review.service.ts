import { USABLE_ANSWER_SOURCES } from "../constants/exam";
import { FSRS_DUE_DEFAULT_LIMIT, FSRS_DUE_MAX_LIMIT, FSRS_RATING_SECONDS } from "../constants/fsrs";
import { fsrsCardRepository } from "../repositories/fsrs-card.repository";
import { AppError } from "../rules/error";
import { isMember, type Actor } from "../utils/actor";
import { fileUrlOf } from "../utils/file-url";
import { emptyStoredCard, ratingFromResult, scheduleReview, type Grade } from "../utils/fsrs";
import { examService } from "./exam.service";

// Lịch ôn FSRS theo từng câu (bảng user_question_cards), tách biệt với Sổ câu sai Leitner (review.service).
// Giờ hiện tại luôn truyền vào được (`now`) để test chạy với đồng hồ cố định.

export type ReviewInput = { questionId: number; rating: Grade } | { questionId: number; correct: boolean; seconds: number };

const USABLE = new Set<string>(USABLE_ANSWER_SOURCES);

const memberId = (actor: Actor) => {
  if (!isMember(actor.owner)) throw AppError.unauthorized(); // lịch ôn chỉ dành cho thành viên
  return actor.owner.userId;
};

export const fsrsReviewService = {
  /** Ghi một lần ôn: đọc hoặc tạo thẻ, xếp lịch, lưu thẻ + nhật ký trong một giao dịch; trả hạn ôn kế tiếp. */
  async submitReview(actor: Actor, questionId: number, rating: Grade, now: Date = new Date()) {
    const userId = memberId(actor);
    const question = await fsrsCardRepository.findQuestion(questionId);
    if (!question || question.isReference || !USABLE.has(question.exam.answerSource)) throw AppError.notFound("Không tìm thấy câu hỏi");
    await examService.assertAccess(actor, question.examId); // đề ngoài kho của mình: 404 như mọi API đề khác

    return fsrsCardRepository.review(userId, questionId, emptyStoredCard(now), (current) => {
      const { card, log } = scheduleReview(current, rating, now);
      return {
        card,
        log: {
          rating: log.rating,
          state: log.state,
          due: log.due,
          stability: log.stability,
          difficulty: log.difficulty,
          elapsedDays: log.elapsed_days,
          lastElapsedDays: log.last_elapsed_days,
          scheduledDays: log.scheduled_days,
          learningSteps: log.learning_steps,
          reviewedAt: log.review,
        },
        result: { questionId, rating, due: card.due, state: card.state, scheduledDays: card.scheduledDays, reps: card.reps, lapses: card.lapses },
      };
    });
  },

  /** Body của POST /reviews: có `rating` thì dùng luôn, có `correct` + `seconds` thì suy ra mức nhớ. */
  submit(actor: Actor, input: ReviewInput, now: Date = new Date()) {
    const rating = "rating" in input ? input.rating : ratingFromResult(input, FSRS_RATING_SECONDS);
    return fsrsReviewService.submitReview(actor, input.questionId, rating, now);
  },

  /** Câu đến hạn ôn (due <= now), sớm nhất trước, tối đa FSRS_DUE_MAX_LIMIT câu; chỉ đề còn trong kho của người dùng. */
  async due(actor: Actor, limit: number = FSRS_DUE_DEFAULT_LIMIT, now: Date = new Date()) {
    const userId = memberId(actor);
    const take = Math.max(1, Math.min(FSRS_DUE_MAX_LIMIT, limit));
    const [total, cards] = await Promise.all([fsrsCardRepository.countDue(userId, actor.isAdmin, now), fsrsCardRepository.due(userId, actor.isAdmin, now, take)]);
    return {
      total,
      items: cards.map((c) => ({
        questionId: c.questionId,
        examId: c.question.examId,
        examTitle: c.question.exam.title,
        threadId: c.question.exam.threadId,
        number: c.question.number,
        topic: c.question.topic,
        imageUrl: fileUrlOf(c.question.imagePath),
        due: c.due,
        state: c.state,
        reps: c.reps,
        lapses: c.lapses,
      })),
    };
  },
};
