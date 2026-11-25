import { z } from "zod";
import { EXAM_GAP_QUERY_MAX, EXAM_RESOURCE_NAME_MAX_BYTES, EXAM_UPLOAD_ANSWERS_MAX_CHARS } from "../../constants/exam-upload";
import { EXAM_KINDS } from "../../utils/exam-kind";
import { paginationQuery } from "../../utils/pagination";
import { uuidSchema } from "./admin.request";
import { subjectCodeSchema } from "./subject.request";

// Trường chữ của form multipart: chuỗi rỗng coi như không nhập
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const answersField = z.preprocess(blankToUndefined, z.string().max(EXAM_UPLOAD_ANSWERS_MAX_CHARS, "Tệp đáp án quá lớn").optional());

export const uploadExamBody = z.object({
  // Tuỳ chọn ở đây để lỗi trả đúng trường title (kiểm tra ở service)
  title: z.preprocess(blankToUndefined, z.string().trim().max(255, "Tiêu đề tối đa 255 ký tự").optional()),
  subjectCode: subjectCodeSchema.transform((s) => s.toUpperCase()),
  kind: z.preprocess(blankToUndefined, z.enum(EXAM_KINDS, "Loại đề không hợp lệ").optional()),
  answers: answersField,
  // Form gửi "1": tên đề đã có thì ghi đè (thay ảnh/tệp) thay vì báo trùng
  overwrite: z.preprocess((v) => v === "1" || v === "true", z.boolean()),
});

export const updateExamImagesBody = z.object({ answers: answersField });

// Tệp đính kèm của đề (đề PE chỉ có tệp): /admin/exams/:id/attachments/:attachmentId
export const attachmentParam = z.object({ id: uuidSchema, attachmentId: z.coerce.number().int().positive() });

// Tên hiển thị mới; service bỏ ký tự cấm bằng cùng quy tắc với lúc tải lên
export const renameAttachmentBody = z.object({
  name: z
    .string("Vui lòng nhập tên tệp")
    .trim()
    .min(1, "Vui lòng nhập tên tệp")
    .refine((s) => Buffer.byteLength(s) <= EXAM_RESOURCE_NAME_MAX_BYTES, "Tên tệp quá dài"),
});

// Form gửi "1": lấy tên của tệp mới làm tên hiển thị (mặc định giữ tên cũ)
export const replaceAttachmentBody = z.object({ rename: z.preprocess((v) => v === "1" || v === "true", z.boolean()) });

// "no_exam" vẫn nhận để giao diện cũ không lỗi 400; luôn trả rỗng (không còn danh mục bài ngoài hệ thống)
export const EXAM_GAPS = ["all", "no_exam", "no_images", "no_answers"] as const;

export const examGapFilter = z.object({
  kind: z.preprocess(blankToUndefined, z.enum(EXAM_KINDS, "Loại đề không hợp lệ").optional()),
  subject: z.preprocess(blankToUndefined, subjectCodeSchema.transform((s) => s.toUpperCase()).optional()),
  q: z.preprocess(blankToUndefined, z.string().trim().max(EXAM_GAP_QUERY_MAX).optional()),
});

export const examGapsQuery = paginationQuery.extend({ gap: z.enum(EXAM_GAPS, "Bộ lọc không hợp lệ").default("all") }).extend(examGapFilter.shape);

export type UploadExamBody = z.infer<typeof uploadExamBody>;
export type UpdateExamImagesBody = z.infer<typeof updateExamImagesBody>;
export type AttachmentParam = z.infer<typeof attachmentParam>;
export type RenameAttachmentBody = z.infer<typeof renameAttachmentBody>;
export type ReplaceAttachmentBody = z.infer<typeof replaceAttachmentBody>;
export type ExamGapFilter = z.infer<typeof examGapFilter>;
export type ExamGapsQuery = z.infer<typeof examGapsQuery>;
