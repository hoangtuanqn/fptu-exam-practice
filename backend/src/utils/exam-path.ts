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
