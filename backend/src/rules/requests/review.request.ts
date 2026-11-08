import { z } from "zod";
import { STUDY_GOAL_CHOICES } from "../../constants/review";
import { paginationQuery } from "../../utils/pagination";

export const reviewQueueQuery = z.object({
  all: z.enum(["0", "1"]).default("0"),
  subject: z.string().max(20).optional(), // có cả subject và topic = ôn riêng một chủ đề (Pro)
  topic: z.string().max(255).optional(),
});
export const reviewListQuery = paginationQuery.extend({ status: z.enum(["active", "mastered"]).default("active") });
export const reviewAnswerBody = z.object({ chosen: z.array(z.string().regex(/^[A-Z]$/)).max(8) });
export const studyGoalBody = z.object({
  days: z.number().int().refine((d) => (STUDY_GOAL_CHOICES as readonly number[]).includes(d), "Mục tiêu không hợp lệ"),
});

export type ReviewQueueQuery = z.infer<typeof reviewQueueQuery>;
export type ReviewListQuery = z.infer<typeof reviewListQuery>;
export const reminderBody = z.object({
  enabled: z.boolean(),
  examDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày thi không hợp lệ")
    .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && Date.parse(`${s}T00:00:00Z`) < Date.now() + 3 * 365 * 86_400_000, "Ngày thi không hợp lệ")
    .nullable(),
});

export type ReviewAnswerBody = z.infer<typeof reviewAnswerBody>;
export type ReminderBody = z.infer<typeof reminderBody>;
export type StudyGoalBody = z.infer<typeof studyGoalBody>;
