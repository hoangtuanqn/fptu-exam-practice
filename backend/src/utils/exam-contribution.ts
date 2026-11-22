import path from "node:path";
import { CONTRIBUTION_STORAGE_DIR } from "../constants/exam-contribution";

/** Tên ảnh thứ `index` (đếm từ 1): 001.webp, 002.webp ... */
export const contributionFileName = (index: number) => `${String(index).padStart(3, "0")}.webp`;

/** Đường dẫn tương đối trong STORAGE_DIR (dùng "/"). */
export const contributionDirRel = (id: string) => `${CONTRIBUTION_STORAGE_DIR}/${id}`;
export const contributionImageRel = (id: string, index: number) => `${contributionDirRel(id)}/${contributionFileName(index)}`;

/** Byte đầu của tệp là JPEG, PNG hoặc WebP (mimetype do trình duyệt khai nên không tin được). */
export function isAllowedImageSignature(buf: Buffer): boolean {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true;
  return buf.length >= 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP";
}

const STATIC_PREFIX = new RegExp(`^/${CONTRIBUTION_STORAGE_DIR}(?:/|$)`, "i");

/** Đường dẫn tĩnh (req.path) thuộc contributions/: giải mã, chuẩn hoá rồi mới so. Lỗi giải mã coi như thuộc (chặn). */
export function isContributionStaticPath(p: string): boolean {
  try {
    return STATIC_PREFIX.test(path.posix.normalize(`/${decodeURIComponent(p).replace(/\\/g, "/")}`));
  } catch {
    return true;
  }
}
