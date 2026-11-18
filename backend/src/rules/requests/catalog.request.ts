import { z } from "zod";
import { EXAM_KINDS } from "../../utils/exam-kind";
import { paginationQuery } from "../../utils/pagination";
import { subjectCodeSchema } from "./subject.request";

// Đề của một môn trong Kho đề: lọc theo từ khoá, kỳ học và loại đề (FE, PE, QUIZ, OTHER)
export const catalogExamsQuery = paginationQuery.extend({
  subject: subjectCodeSchema,
  q: z.string().trim().max(60).optional(),
  term: z.string().regex(/^(SP|SU|FA)\d{2}$/i, "Kỳ không hợp lệ").transform((t) => t.toUpperCase()).optional(),
  kind: z.enum(EXAM_KINDS, "Loại đề không hợp lệ").optional(),
});
export type CatalogExamsQuery = z.infer<typeof catalogExamsQuery>;
