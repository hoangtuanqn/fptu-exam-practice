import path from "node:path";
import { COMMENT_FILES_STORAGE_DIR, EXAM_COMMENT_FILE_MAX_BYTES, EXAM_COMMENT_FILE_NAME_MAX, EXAM_COMMENT_IMAGE_MAX_BYTES } from "../constants/exam-comment";
import { attachmentHeaders } from "./attachment";
import { isAllowedImageSignature } from "./exam-contribution";

// Tệp đính kèm của bình luận (decision 0020): loại theo đuôi tên, rồi kiểm tra byte đầu (mimetype trình duyệt khai không tin được)

export type CommentFileKind = "image" | "pdf" | "zip" | "txt";

const KIND_OF_EXT: Record<string, CommentFileKind> = { jpg: "image", jpeg: "image", png: "image", webp: "image", pdf: "pdf", zip: "zip", txt: "txt" };
export const COMMENT_FILE_MIME: Record<CommentFileKind, string> = { image: "image/webp", pdf: "application/pdf", zip: "application/zip", txt: "text/plain" };

const extOf = (name: string) => path.extname(name).slice(1).toLowerCase();

/**
 * Loại của một tệp tải lên, hoặc lời nhắn lỗi (tiếng Việt, cho trường `files`). Ảnh còn phải giải mã được bằng sharp ở service.
 * zip: chữ ký PK\x03\x04 hoặc zip rỗng PK\x05\x06; txt: không có byte NUL.
 */
export function checkCommentFile(name: string, buf: Buffer): { kind: CommentFileKind } | { error: string } {
  const kind = KIND_OF_EXT[extOf(name)];
  if (!kind) return { error: "Chỉ đính kèm được ảnh JPG, PNG, WebP hoặc tệp PDF, ZIP, TXT" };
  if (buf.length === 0) return { error: "Tệp rỗng" };
  if (buf.length > (kind === "image" ? EXAM_COMMENT_IMAGE_MAX_BYTES : EXAM_COMMENT_FILE_MAX_BYTES)) return { error: kind === "image" ? "Ảnh quá lớn" : "Tệp quá lớn" };
  const ok =
    kind === "image"
      ? isAllowedImageSignature(buf)
      : kind === "pdf"
        ? buf.toString("latin1", 0, 5) === "%PDF-"
        : kind === "zip"
          ? buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && ((buf[2] === 3 && buf[3] === 4) || (buf[2] === 5 && buf[3] === 6))
          : !buf.includes(0);
  return ok ? { kind } : { error: "Nội dung tệp không đúng với loại tệp" };
}

/** Tên hiển thị an toàn: bỏ đường dẫn, ký tự điều khiển và ký tự đảo chiều chữ, cắt ngắn; ảnh đổi đuôi thành .webp (đã chuyển định dạng). */
export function commentFileDisplayName(raw: string, kind: CommentFileKind) {
  const base = (raw.split(/[\\/]/).pop() ?? "").replace(/[\u0000-\u001F\u007F-\u009F‎‏‪-‮⁦-⁩]/g, "").trim();
  const ext = kind === "image" ? "webp" : kind;
  const stem = (base.slice(0, base.length - path.extname(base).length).trim() || "tep").slice(0, EXAM_COMMENT_FILE_NAME_MAX - ext.length - 1);
  return `${stem}.${ext}`;
}

/** Đường dẫn tương đối trong STORAGE_DIR (dùng "/"), cũng là thứ được ký. `random` = tên ngẫu nhiên không đoán được. */
export const commentFileRel = (examId: string, random: string, kind: CommentFileKind) => `${COMMENT_FILES_STORAGE_DIR}/${examId}/${random}.${kind === "image" ? "webp" : kind}`;
export const commentFilesDirRel = (examId: string) => `${COMMENT_FILES_STORAGE_DIR}/${examId}`;

const STATIC_PREFIX = new RegExp(`^/${COMMENT_FILES_STORAGE_DIR}(?:/|$)`, "i");

/** Đường dẫn tĩnh (req.path) thuộc comments/: giải mã, chuẩn hoá rồi mới so. Lỗi giải mã coi như thuộc (chặn). */
export function isCommentFileStaticPath(p: string): boolean {
  try {
    return STATIC_PREFIX.test(path.posix.normalize(`/${decodeURIComponent(p).replace(/\\/g, "/")}`));
  } catch {
    return true;
  }
}

/** Header khi phát tệp: ảnh (luôn là WebP đã chuyển) mở ngay, mọi loại khác luôn tải về; nosniff và chặn mọi nội dung chạy được. */
export function commentFileHeaders(name: string, mime: string) {
  const isImage = mime === COMMENT_FILE_MIME.image;
  const base = attachmentHeaders(name, name, true); // attachment + tên đã mã hoá
  return {
    "Content-Type": isImage ? mime : base["Content-Type"],
    "Content-Disposition": isImage ? base["Content-Disposition"].replace(/^attachment/, "inline") : base["Content-Disposition"],
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  };
}
