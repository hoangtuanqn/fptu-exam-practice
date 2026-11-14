import { z } from "zod";
import { COURSERA, COURSERA_STATUSES } from "../../constants/coursera";
import { paginationQuery } from "../../utils/pagination";

export const courseraCoursesQuery = paginationQuery.extend({ q: z.string().trim().max(COURSERA.searchLength).default("") });
export const courseraOrdersQuery = paginationQuery.extend({ status: z.enum(COURSERA_STATUSES).optional() });
export const courseraCourseBody = z.object({
  title: z.string().trim().min(1).max(COURSERA.titleLength),
  url: z.string().trim().url().max(COURSERA.urlLength).refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && ["coursera.org", "www.coursera.org"].includes(url.hostname) && !url.username && !url.password && !url.port;
    } catch { return false; }
  }, "Vui lòng nhập liên kết HTTPS của Coursera"),
  isActive: z.boolean().default(true),
});
export const courseraOrderBody = z.object({
  requestKey: z.string().uuid(),
  courseId: z.number().int().positive(),
  email: z.string().trim().email().max(COURSERA.emailLength),
  password: z.string().min(1, "Vui lòng nhập mật khẩu Coursera").max(COURSERA.passwordLength),
  note: z.string().trim().max(COURSERA.noteLength).default(""),
});
export const courseraStatusBody = z.object({
  expectedStatus: z.enum(COURSERA_STATUSES),
  status: z.enum(COURSERA_STATUSES),
  adminNote: z.string().trim().max(COURSERA.noteLength).default(""),
});
export type CourseraCoursesQuery = z.infer<typeof courseraCoursesQuery>;
export type CourseraOrdersQuery = z.infer<typeof courseraOrdersQuery>;
export type CourseraCourseBody = z.infer<typeof courseraCourseBody>;
export type CourseraOrderBody = z.infer<typeof courseraOrderBody>;
export type CourseraStatusBody = z.infer<typeof courseraStatusBody>;
