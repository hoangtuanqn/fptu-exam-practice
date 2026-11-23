import { z } from "zod";
import { CONTRIBUTION_MAX_IMAGES, CONTRIBUTION_NOTE_MAX, CONTRIBUTION_REVIEW_NOTE_MAX, CONTRIBUTION_TERM_MAX, CONTRIBUTION_TITLE_MAX } from "../../constants/exam-contribution";
import { paginationQuery } from "../../utils/pagination";
import { uuidSchema } from "./admin.request";
import { subjectCodeSchema } from "./subject.request";

// Trường chữ của form multipart: chuỗi rỗng coi như không nhập
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((s) => s || undefined);

export const createContributionBody = z.object({
  subjectCode: subjectCodeSchema.transform((s) => s.toUpperCase()),
  title: optionalText(CONTRIBUTION_TITLE_MAX, `Tiêu đề tối đa ${CONTRIBUTION_TITLE_MAX} ký tự`),
  term: optionalText(CONTRIBUTION_TERM_MAX, `Kỳ thi tối đa ${CONTRIBUTION_TERM_MAX} ký tự`),
  note: optionalText(CONTRIBUTION_NOTE_MAX, `Ghi chú tối đa ${CONTRIBUTION_NOTE_MAX} ký tự`),
});

export const listContributionsQuery = paginationQuery.extend({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", ""]).optional().transform((s) => s || undefined),
  q: z.string().trim().max(100).optional(), // tiêu đề, mã môn hoặc email người gửi
});

export const reviewContributionBody = z.object({
  note: z.string().trim().max(CONTRIBUTION_REVIEW_NOTE_MAX, `Ghi chú tối đa ${CONTRIBUTION_REVIEW_NOTE_MAX} ký tự`).optional(),
});

export const contributionImageParam = z.object({
  id: uuidSchema,
  index: z.coerce.number().int().min(1).max(CONTRIBUTION_MAX_IMAGES),
});

export type CreateContributionBody = z.infer<typeof createContributionBody>;
export type ListContributionsQuery = z.infer<typeof listContributionsQuery>;
export type ReviewContributionBody = z.infer<typeof reviewContributionBody>;
export type ContributionImageParam = z.infer<typeof contributionImageParam>;
