import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { EXAM_STORAGE_DIR } from "../constants/crawler";
import { isAttachmentStaticPath } from "./attachment";

const EXAMS_PREFIX = new RegExp(`^/${EXAM_STORAGE_DIR}/([^/]+)(?:/|$)`, "i");

/**
 * Phân tích đường dẫn tĩnh (req.path) dưới exams/<threadId>/...: giải mã, đổi \ thành /, chuẩn hoá ./ ../ // rồi mới so,
 * để không lách được bằng cách mã hoá hay viết hoa. null = không thuộc exams/. "blocked" = thuộc exams/ nhưng không được phục vụ qua đây
 * (URL mã hoá lỗi, hoặc thư mục tệp đính kèm files/ chỉ đi qua /exams/:id/attachments/:id để có Content-Type/Disposition an toàn).
 */
export function examRelPath(p: string): { rel: string; threadId: string } | "blocked" | null {
  if (isAttachmentStaticPath(p)) return "blocked";
  try {
    const rel = path.posix.normalize(`/${decodeURIComponent(p).replace(/\\/g, "/")}`);
    const m = EXAMS_PREFIX.exec(rel);
    return m ? { rel: rel.slice(1), threadId: m[1]! } : null;
  } catch {
    return "blocked";
  }
}

// Link ký ngắn hạn cho đúng MỘT ảnh (trang "Câu hay ra" lấy ảnh từ đề mới nhất của môn, thường không nằm trong kho của người xem).
// Chữ ký gắn với đường dẫn và hạn dùng, không dùng được cho ảnh khác. `bind` (ví dụ ID người xem) buộc link vào đúng một người: gửi link cho người khác thì vô dụng.
const macOf = (rel: string, exp: number, secret: string, bind?: string) => createHmac("sha256", secret).update(`exam-file:${rel}:${exp}${bind ? `:${bind}` : ""}`).digest("hex").slice(0, 32);

export const signExamFile = (rel: string, exp: number, secret: string, bind?: string) => `e=${exp}&s=${macOf(rel, exp, secret, bind)}`;

export function isValidExamFileSignature(rel: string, exp: unknown, sig: unknown, secret: string, now = Date.now(), bind?: string): boolean {
  const e = Number(exp);
  if (!Number.isInteger(e) || e < now || typeof sig !== "string" || sig.length !== 32) return false;
  const want = Buffer.from(macOf(rel, e, secret, bind));
  const got = Buffer.from(sig);
  return got.length === want.length && timingSafeEqual(got, want);
}
