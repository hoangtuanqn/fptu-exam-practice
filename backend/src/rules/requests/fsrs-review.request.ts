import { z } from "zod";
import { FSRS_DUE_DEFAULT_LIMIT, FSRS_DUE_MAX_LIMIT, FSRS_MAX_SECONDS } from "../../constants/fsrs";
import type { Grade } from "../../utils/fsrs";

const questionId = z.number().int().positive();

// Đúng MỘT trong hai dạng: { questionId, rating } (1 Again, 2 Hard, 3 Good, 4 Easy) hoặc { questionId, correct, seconds }
export const fsrsReviewBody = z.union([
  z.strictObject({ questionId, rating: z.number().int().min(1).max(4).transform((n) => n as Grade) }),
  z.strictObject({ questionId, correct: z.boolean(), seconds: z.number().min(0).max(FSRS_MAX_SECONDS) }),
]);
export const fsrsDueQuery = z.object({ limit: z.coerce.number().int().min(1).max(FSRS_DUE_MAX_LIMIT).default(FSRS_DUE_DEFAULT_LIMIT) });

export type FsrsReviewBody = z.infer<typeof fsrsReviewBody>;
export type FsrsDueQuery = z.infer<typeof fsrsDueQuery>;
