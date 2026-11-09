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

export const gradeSyncBody = z.object({ courses: z.array(gradeCourseSchema).min(1).max(60) });
export const gradeSettingBody = z.object({ enabled: z.boolean() });

export type GradeSyncBody = z.infer<typeof gradeSyncBody>;
export type GradeSettingBody = z.infer<typeof gradeSettingBody>;
