import { z } from "zod";
import { uuidSchema } from "./admin.request";
import { subjectCodeSchema } from "./subject.request";

// Mở một đề đã có đủ trong hệ thống (chọn từ Kho đề theo môn)
export const importExamBody = z.object({
  examId: uuidSchema,
  // Tạo bộ đề theo chương: đề phải thuộc đúng môn này (mã môn như PRO192), kiểm trước khi trừ phí
  subject: subjectCodeSchema.transform((s) => s.toUpperCase()).optional(),
  captchaToken: z.string().max(2048).optional(), // khách phải qua captcha khi gửi lấy đề
});

export type ImportExamBody = z.infer<typeof importExamBody>;
