import { z } from "zod";
import type { PageMeta } from "../rules/response";

// Query phân trang dùng chung; schema khác chỉ cần .extend()
export const DEFAULT_PAGE_SIZE = 20; // mọi bảng hiển thị 20 dòng mỗi trang
export const MAX_PAGE_SIZE = 50; // chặn client xin quá nhiều dòng một lần

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;

export const toSkipTake = ({ page, limit }: PaginationQuery) => ({ skip: (page - 1) * limit, take: limit });

export const toMeta = ({ page, limit }: PaginationQuery, total: number): PageMeta => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
