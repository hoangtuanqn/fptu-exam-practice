import { z } from "zod";
import { COURSERA, COURSERA_STATUSES } from "../../constants/coursera";
import { parseCourseraLink } from "../../utils/coursera-lookup";
import { paginationQuery } from "../../utils/pagination";

export const courseraCoursesQuery = paginationQuery.extend({ q: z.string().trim().max(COURSERA.searchLength).default("") });
export const courseraOrdersQuery = paginationQuery.extend({ status: z.enum(COURSERA_STATUSES).optional() });
// Blank optional catalog fields are stored as NULL (so an admin can clear them and the unique indexes ignore them).
const blankToNull = (value: unknown) => (typeof value === "string" && !value.trim() ? null : value);
const courseraUrl = z.string().trim().url().max(COURSERA.urlLength).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["coursera.org", "www.coursera.org"].includes(url.hostname) && !url.username && !url.password && !url.port;
  } catch { return false; }
}, "Vui lòng nhập liên kết HTTPS của Coursera")
  // Store course links in the canonical form the member link lookup matches on, so a paused or re-priced row cannot be bypassed.
  .transform((value) => parseCourseraLink(value)?.url ?? value);
export const courseraCourseBody = z.object({
  title: z.string().trim().min(1).max(COURSERA.titleLength),
  code: z.preprocess(blankToNull, z.string().trim().max(COURSERA.codeLength).nullable().optional()),
  url: z.preprocess(blankToNull, courseraUrl.nullable().optional()),
  isActive: z.boolean().default(true),
  price: z.number().int().min(0).max(COURSERA.maxPrice).optional(),
  // Omitted on update keeps the current value; link-added courses start unlisted.
  listed: z.boolean().optional(),
});
export const courseraLookupBody = z.object({ url: z.string().trim().min(1).max(COURSERA.urlLength) });
export const courseraOrderBody = z.object({
  requestKey: z.string().uuid(),
  courseId: z.number().int().positive(),
  // Older clients may submit only free orders; never charge an unconfirmed price.
  expectedPrice: z.number().int().min(0).max(COURSERA.maxPrice).default(0),
  email: z.string().trim().email().max(COURSERA.emailLength),
  password: z.string().min(1, "Vui lòng nhập mật khẩu Coursera").max(COURSERA.passwordLength),
  note: z.string().trim().max(COURSERA.noteLength).default(""),
});
export const courseraStatusBody = z.object({
  expectedStatus: z.enum(COURSERA_STATUSES),
  status: z.enum(COURSERA_STATUSES),
  adminNote: z.string().trim().max(COURSERA.noteLength).default(""),
});
export const courseraNoteBody = z.object({ adminNote: z.string().trim().min(1).max(COURSERA.noteLength) });
export type CourseraCoursesQuery =z.infer<typeof courseraCoursesQuery>;
export type CourseraOrdersQuery = z.infer<typeof courseraOrdersQuery>;
export type CourseraCourseBody = z.infer<typeof courseraCourseBody>;
export type CourseraOrderBody = z.infer<typeof courseraOrderBody>;
export type CourseraLookupBody = z.infer<typeof courseraLookupBody>;
export type CourseraStatusBody = z.infer<typeof courseraStatusBody>;
export type CourseraNoteBody = z.infer<typeof courseraNoteBody>;
