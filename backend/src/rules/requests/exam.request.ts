import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";
import { subjectCodeSchema } from "./subject.request";

// Danh sách đề của tôi; có `subject` thì chỉ lấy đề của môn đó (dùng cho bộ đề theo chương)
export const listExamsQuery = paginationQuery.extend({ subject: subjectCodeSchema.optional() });
export type ListExamsQuery = z.infer<typeof listExamsQuery>;

// GET /exams/:examId/attachments/:attachmentId?download=1
export const attachmentParam = z.object({ examId: z.coerce.number().int().positive(), attachmentId: z.coerce.number().int().positive() });
export const attachmentQuery = z.object({ download: z.enum(["0", "1"]).optional() });
export type AttachmentParam = z.infer<typeof attachmentParam>;
export type AttachmentQuery = z.infer<typeof attachmentQuery>;
