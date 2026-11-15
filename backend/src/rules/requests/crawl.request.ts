import { z } from "zod";
import { isFuoThreadUrl } from "../../utils/fuo-url";
import { FUO_LINK_INVALID } from "../../constants/crawler";
import { idParam } from "./admin.request";
import { subjectCodeSchema } from "./subject.request";

// Chỉ nhận link thread của FuOverflow; ID thread lấy được từ link thì mới chấp nhận
export const importExamBody = z.object({
  url: z
    .string("Vui lòng nhập link đề")
    .trim()
    .max(500, FUO_LINK_INVALID)
    .refine(isFuoThreadUrl, FUO_LINK_INVALID),
  // Tạo bộ đề theo chương: đề phải thuộc đúng môn này (mã môn như PRO192), kiểm trước khi trừ phí
  subject: subjectCodeSchema.transform((s) => s.toUpperCase()).optional(),
  captchaToken: z.string().max(2048).optional(), // khách phải qua captcha khi gửi lấy đề
});

export { idParam };
export type ImportExamBody = z.infer<typeof importExamBody>;
