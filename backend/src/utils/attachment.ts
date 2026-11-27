import path from "node:path";
import { EXAM_FILES_DIR, EXAM_STORAGE_DIR } from "../constants/crawler";

export type AttachmentKind = "pdf" | "archive" | "text" | "video" | "audio" | "other";

// Đuôi tệp đính kèm được phép (ảnh đi đường riêng)
const TYPES: Record<string, { mime: string; kind: AttachmentKind }> = {
  pdf: { mime: "application/pdf", kind: "pdf" },
  zip: { mime: "application/zip", kind: "archive" },
  rar: { mime: "application/vnd.rar", kind: "archive" },
  "7z": { mime: "application/x-7z-compressed", kind: "archive" },
  txt: { mime: "text/plain", kind: "text" },
  md: { mime: "text/markdown", kind: "text" },
  mp3: { mime: "audio/mpeg", kind: "audio" },
  wav: { mime: "audio/wav", kind: "audio" },
  ogg: { mime: "audio/ogg", kind: "audio" },
  opus: { mime: "audio/opus", kind: "audio" },
  mp4: { mime: "video/mp4", kind: "video" },
  m4v: { mime: "video/x-m4v", kind: "video" },
  avi: { mime: "video/x-msvideo", kind: "video" },
  mov: { mime: "video/quicktime", kind: "video" },
  mpeg: { mime: "video/mpeg", kind: "video" },
  mpg: { mime: "video/mpeg", kind: "video" },
  ogv: { mime: "video/ogg", kind: "video" },
  webm: { mime: "video/webm", kind: "video" },
};

// Chỉ các loại này mới được mở ngay trên trình duyệt; còn lại luôn tải về
const INLINE_KINDS = new Set<AttachmentKind>(["pdf", "text", "video", "audio"]);

const extOf = (name: string) => path.extname(name).slice(1).toLowerCase();

// Ảnh tải lên làm tệp đính kèm (cùng tập đuôi với isImageFile ở giao diện); không nằm trong TYPES nên cách phát tệp không đổi
const IMAGE_MIMES: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif" };
export const imageMimeOf = (name: string) => IMAGE_MIMES[extOf(name)] ?? null;

/** Tệp đính kèm là ảnh: mime image/* hoặc tệp trên đĩa có đuôi ảnh (dòng cũ tải lên trước khi ghi mime ảnh lưu octet-stream). Chỉ ảnh mới bình luận được. */
export const isImageAttachment = (a: { mime: string; filePath: string }) => a.mime.startsWith("image/") || imageMimeOf(a.filePath) !== null;

/** Mime + loại theo đuôi (không tin content-type của site); null nếu đuôi không được phép. */
export const attachmentType = (name: string) => TYPES[extOf(name)] ?? null;

export const attachmentKind = (name: string): AttachmentKind => attachmentType(name)?.kind ?? "other";

const ATTACHMENTS_PATH = new RegExp(`^/${EXAM_STORAGE_DIR}/[^/]+/${EXAM_FILES_DIR}(/|$)`, "i");

/** Đường dẫn tĩnh (req.path) trỏ vào exams/<id>/files/...: giải mã, đổi \ thành /, chuẩn hoá ./ ../ // rồi mới so. URL mã hoá lỗi coi như bị chặn. */
export function isAttachmentStaticPath(p: string): boolean {
  try {
    return ATTACHMENTS_PATH.test(path.posix.normalize(`/${decodeURIComponent(p).replace(/\\/g, "/")}`));
  } catch {
    return true;
  }
}

// RFC 5987: encodeURIComponent chưa mã hoá ' ( ) *
const encodeRfc5987 = (s: string) => encodeURIComponent(s).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** Content-Type + Content-Disposition khi trả tệp. Loại không nằm trong danh sách mở được thì luôn là octet-stream + attachment. */
export function attachmentHeaders(name: string, filePath: string, download: boolean) {
  const type = attachmentType(filePath);
  const canInline = !!type && INLINE_KINDS.has(type.kind);
  const contentType = !canInline ? "application/octet-stream" : type.kind === "text" ? "text/plain; charset=utf-8" : type.mime;
  const fallback = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return {
    "Content-Type": contentType,
    "Content-Disposition": `${canInline && !download ? "inline" : "attachment"}; filename="${fallback}"; filename*=UTF-8''${encodeRfc5987(name)}`,
  };
}
