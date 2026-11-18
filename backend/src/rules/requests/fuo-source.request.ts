import { z } from "zod";
import { FUO_SOURCE_MAX_CHARS, FUO_SOURCE_MAX_LINES } from "../../constants/fuo-source";
import { paginationQuery } from "../../utils/pagination";

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

export type AddFuoSourcesBody = z.infer<typeof addFuoSourcesBody>;
export type ListFuoSourcesQuery = z.infer<typeof listFuoSourcesQuery>;
