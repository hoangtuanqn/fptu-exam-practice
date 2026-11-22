import { z } from "zod";
import { FUO_SOURCE_MAX_CHARS, FUO_SOURCE_MAX_LINES, FUO_SOURCE_PICK_MAX } from "../../constants/fuo-source";
import { paginationQuery } from "../../utils/pagination";
import { examGapFilter } from "./exam-upload.request";

// Khối văn bản admin dán vào, mỗi dòng một link (từng dòng được kiểm ở service để báo lỗi theo dòng)
export const addFuoSourcesBody = z.object({
  text: z
    .string("Vui lòng dán danh sách link")
    .max(FUO_SOURCE_MAX_CHARS, "Danh sách quá dài, hãy chia thành nhiều lần dán")
    .refine((t) => t.trim().length > 0, "Vui lòng dán ít nhất một link")
    .refine((t) => t.split(/\r?\n/).length <= FUO_SOURCE_MAX_LINES, `Tối đa ${FUO_SOURCE_MAX_LINES} dòng mỗi lần dán`),
});

export const listFuoSourcesQuery = paginationQuery.extend({
  status: z.enum(["NEW", "QUEUED", "RUNNING", "DONE", "FAILED"]).optional(),
});

// "Lấy hết đề còn thiếu": cùng bộ lọc với trang Đề còn thiếu (kind, subject, q); không gửi body = mọi bài
// threadIds: các đề admin đã tick trong popup; không có thì lấy mọi đề còn thiếu theo bộ lọc
export const fetchMissingBody = examGapFilter.extend({ threadIds: z.array(z.string().regex(/^\d{1,18}$/, "ID bài FuOverflow không hợp lệ")).max(FUO_SOURCE_PICK_MAX).optional() }).default({});
export type FetchMissingBody = z.infer<typeof fetchMissingBody>;

export type AddFuoSourcesBody = z.infer<typeof addFuoSourcesBody>;
export type ListFuoSourcesQuery = z.infer<typeof listFuoSourcesQuery>;
