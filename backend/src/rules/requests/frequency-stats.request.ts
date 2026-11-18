import { z } from "zod";
import { uuidSchema } from "./admin.request";
import { HOT_QUESTIONS_DEFAULT_LIMIT, HOT_QUESTIONS_MAX_LIMIT } from "../../constants/frequency-stats";

// :id của /subjects/:id/chapter-stats và /subjects/:id/hot-questions là id (UUID) của môn
export const subjectIdParam = z.object({ id: uuidSchema });
export const hotQuestionsQuery = z.object({ limit: z.coerce.number().int().min(1).max(HOT_QUESTIONS_MAX_LIMIT).default(HOT_QUESTIONS_DEFAULT_LIMIT) });

export type SubjectIdParam = z.infer<typeof subjectIdParam>;
export type HotQuestionsQuery = z.infer<typeof hotQuestionsQuery>;
