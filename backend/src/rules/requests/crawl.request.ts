import { z } from "zod";
import { isFuoThreadUrl } from "../../utils/fuo-url";
import { FUO_LINK_INVALID } from "../../constants/crawler";
import { idParam, uuidSchema } from "./admin.request";
import { subjectCodeSchema } from "./subject.request";

// Đúng một trong hai: link thread của FuOverflow (ID thread lấy được từ link thì mới chấp nhận),
// hoặc mã đề đã có đủ trong hệ thống (đề admin tải tay không có link FuOverflow, lấy từ Kho đề theo môn)
export const importExamBody = z
  .object({
    url: z.string("Vui lòng nhập link đề").trim().max(500, FUO_LINK_INVALID).refine(isFuoThreadUrl, FUO_LINK_INVALID).optional(),
    examId: uuidSchema.optional(),
  // Tạo bộ đề theo chương: đề phải thuộc đúng môn này (mã môn như PRO192), kiểm trước khi trừ phí
    subject: subjectCodeSchema.transform((s) => s.toUpperCase()).optional(),
    captchaToken: z.string().max(2048).optional(), // khách phải qua captcha khi gửi lấy đề
  })
  .refine((v) => (v.url === undefined) !== (v.examId === undefined), { message: "Vui lòng nhập link đề (hoặc chọn một đề trong Kho đề)", path: ["url"] });

export { idParam };
export type ImportExamBody = z.infer<typeof importExamBody>;
