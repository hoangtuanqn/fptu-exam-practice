import { z } from "zod";
import { isFuoThreadUrl } from "../../utils/fuo-url";
import { idParam } from "./admin.request";

// Chỉ nhận link thread của FuOverflow; ID thread lấy được từ link thì mới chấp nhận
export const importExamBody = z.object({
  url: z
    .string("Vui lòng nhập link đề")
    .trim()
    .max(500)
    .refine(isFuoThreadUrl, "Link không đúng dạng https://fuoverflow.com/threads/ten-de.1234/"),
  // Tạo bộ đề theo chương: đề phải thuộc đúng môn này (mã môn như PRO192), kiểm trước khi trừ phí
  subject: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/, "Mã môn không hợp lệ")
    .transform((s) => s.toUpperCase())
    .optional(),
});

export { idParam };
export type ImportExamBody = z.infer<typeof importExamBody>;
