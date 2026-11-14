import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";
import { subjectCodeSchema } from "./subject.request";

const INT_MAX = 2_147_483_647; // ngoài khoảng này Prisma không nhét được vào cột INT (sẽ thành lỗi 500)
const id = z.coerce.number().int().positive().max(INT_MAX);

export const saveQuestionBody = z.object({ examId: z.number().int().positive().max(INT_MAX), questionNumber: z.number().int().positive().max(INT_MAX) });
export const savedQuestionParams = z.object({ examId: id, number: id });
export const savedExamParams = z.object({ examId: id });
export const savedListQuery = paginationQuery.extend({ subject: subjectCodeSchema.transform((s) => s.toUpperCase()).optional() });

export type SaveQuestionBody = z.infer<typeof saveQuestionBody>;
export type SavedQuestionParams = z.infer<typeof savedQuestionParams>;
export type SavedExamParams = z.infer<typeof savedExamParams>;
export type SavedListQuery = z.infer<typeof savedListQuery>;
