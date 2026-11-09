import { z } from "zod";
import { subjectCodeSchema } from "./subject.request";

const score = z.number().min(0).max(10).nullable();

export const gradeComponentSchema = z.object({
  group: z.string().trim().min(1).max(80),
  name: z.string().trim().max(120),
  weight: z.number().min(0).max(100),
  score,
});

export const gradeCourseSchema = z.object({
  courseId: z.string().trim().min(8).max(40),
  subjectCode: subjectCodeSchema,
  subjectName: z.string().trim().min(1).max(200),
  termName: z.string().trim().min(1).max(40),
  classCode: z.string().trim().max(60).default(""),
  status: z.enum(["studying", "passed", "failed", "unknown"]),
  average: score,
  components: z.array(gradeComponentSchema).max(80),
});

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const clock = z.string().regex(/^\d{2}:\d{2}$/);

// Một buổi thi trong Lịch thi trên FAP (loại thi: FE, PE, 2NDFE...)
export const examSlotSchema = z.object({
  date: day,
  start: clock,
  end: clock,
  room: z.string().trim().max(20).default(""),
  subjectCode: subjectCodeSchema,
  subjectName: z.string().trim().min(1).max(200),
  format: z.string().trim().max(30),
  kind: z.string().trim().min(1).max(12),
  resultDate: day.nullable().default(null),
  note: z.string().trim().max(200).default(""),
});

export const gradeSyncBody = z
  .object({ courses: z.array(gradeCourseSchema).max(60).default([]), exams: z.array(examSlotSchema).max(120).optional() })
  .refine((b) => b.courses.length > 0 || (b.exams?.length ?? 0) > 0, "Không có dữ liệu để đồng bộ");
export const gradeSettingBody = z.object({ enabled: z.boolean() });

export type GradeSyncBody = z.infer<typeof gradeSyncBody>;
export type GradeSettingBody = z.infer<typeof gradeSettingBody>;
