import { z } from "zod";
import { NOTICE_CATEGORIES } from "../../constants/admin-notice";
import { paginationQuery } from "../../utils/pagination";

const categories = Object.keys(NOTICE_CATEGORIES) as [keyof typeof NOTICE_CATEGORIES, ...(keyof typeof NOTICE_CATEGORIES)[]];

const filter = {
  important: z.enum(["true", "false"]).optional(),
  category: z.enum(categories).optional(),
};

export const listNoticesQuery = paginationQuery.extend({ status: z.enum(["unread", "all"]).default("unread"), ...filter });
export const readAllNoticesBody = z.object({ important: z.boolean().optional(), category: z.enum(categories).optional() });
export const setNoticeReadBody = z.object({ read: z.boolean("Trạng thái không hợp lệ") });

export type ListNoticesQuery = z.infer<typeof listNoticesQuery>;
export type ReadAllNoticesBody = z.infer<typeof readAllNoticesBody>;
export type SetNoticeReadBody = z.infer<typeof setNoticeReadBody>;
