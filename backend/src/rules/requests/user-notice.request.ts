import { randomUUID } from "node:crypto";
import { z } from "zod";
import { USER_NOTICE_BODY_MAX, USER_NOTICE_LEVELS, USER_NOTICE_LINK_MAX, USER_NOTICE_READ_MAX_IDS, USER_NOTICE_TITLE_MAX } from "../../constants/user-notice";
import { uuidSchema } from "./admin.request";

// Dùng cho cả chuông của thành viên và chuông admin
export const readNoticeIdsBody = z.object({
  ids: z.array(uuidSchema, "Danh sách thông báo không hợp lệ").min(1, "Chưa chọn thông báo nào").max(USER_NOTICE_READ_MAX_IDS, "Chọn quá nhiều thông báo một lần"),
});

export const systemNoticeBody = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề").max(USER_NOTICE_TITLE_MAX, "Tiêu đề quá dài"),
  body: z.string().trim().max(USER_NOTICE_BODY_MAX, "Nội dung quá dài").optional().transform((v) => v || undefined),
  // Chỉ đường dẫn trong trang (bắt đầu bằng một "/"), không cho "//host" hay "/\host" dẫn ra ngoài
  link: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z
      .string()
      .max(USER_NOTICE_LINK_MAX, "Đường dẫn quá dài")
      .regex(/^\/(?![/\\])\S*$/, "Đường dẫn phải là trang trong web, bắt đầu bằng /")
      .optional(),
  ),
  level: z.enum(USER_NOTICE_LEVELS).default("info"),
  // Khoá chống gửi trùng: gửi lại cùng khoá chỉ ghi cho người còn thiếu. Không gửi thì server tự tạo (mỗi lần một khoá mới).
  key: uuidSchema.default(() => randomUUID()),
});

export type ReadNoticeIdsBody = z.infer<typeof readNoticeIdsBody>;
export type SystemNoticeBody = z.infer<typeof systemNoticeBody>;
