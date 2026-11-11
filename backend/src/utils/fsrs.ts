import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade, type ReviewLog, type State } from "ts-fsrs";
import { FSRS_PARAMS, FSRS_RATING_SECONDS, type RatingThresholds } from "../constants/fsrs";

// Lịch ôn FSRS: phần thuần (không đụng DB, giờ hiện tại truyền vào) để test được với đồng hồ cố định.

export { Rating, type Grade };

const scheduler = fsrs(generatorParameters(FSRS_PARAMS));

/** Các cột của user_question_cards đủ để dựng lại thẻ của ts-fsrs. */
export interface StoredCard {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: Date | null;
}

/** Kết quả làm câu -> mức nhớ: sai = Again; đúng chậm hơn slow giây = Hard; đúng nhanh hơn fast giây = Easy; còn lại Good. */
export function ratingFromResult({ correct, seconds }: { correct: boolean; seconds: number }, thresholds: RatingThresholds = FSRS_RATING_SECONDS): Grade {
  if (!correct) return Rating.Again;
  if (seconds > thresholds.slow) return Rating.Hard;
  if (seconds < thresholds.fast) return Rating.Easy;
  return Rating.Good;
}

export const toFsrsCard = (s: StoredCard): Card => ({
  due: s.due,
  stability: s.stability,
  difficulty: s.difficulty,
  elapsed_days: s.elapsedDays,
  scheduled_days: s.scheduledDays,
  learning_steps: s.learningSteps,
  reps: s.reps,
  lapses: s.lapses,
  state: s.state as State,
  last_review: s.lastReview ?? undefined,
});

export const fromFsrsCard = (c: Card): StoredCard => ({
  due: c.due,
  stability: c.stability,
  difficulty: c.difficulty,
  elapsedDays: c.elapsed_days,
  scheduledDays: c.scheduled_days,
  learningSteps: c.learning_steps,
  reps: c.reps,
  lapses: c.lapses,
  state: c.state,
  lastReview: c.last_review ?? null,
});

/** Thẻ mới (chưa ôn lần nào) tạo tại `now`, dạng cột của user_question_cards. */
export const emptyStoredCard = (now: Date): StoredCard => fromFsrsCard(createEmptyCard(now));

/** Xếp lịch cho một lần ôn: thẻ chưa có (null) thì tạo thẻ mới tại `now`. */
export function scheduleReview(stored: StoredCard | null, rating: Grade, now: Date): { card: StoredCard; log: ReviewLog } {
  const card = stored ? toFsrsCard(stored) : createEmptyCard(now);
  const next = scheduler.next(card, now, rating);
  return { card: fromFsrsCard(next.card), log: next.log };
}
