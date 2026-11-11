import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";
import { subjectCodeSchema } from "./subject.request";

// Danh sách đề của tôi; có `subject` thì chỉ lấy đề của môn đó (dùng cho bộ đề theo chương)
export const listExamsQuery = paginationQuery.extend({ subject: subjectCodeSchema.optional() });
export type ListExamsQuery = z.infer<typeof listExamsQuery>;
