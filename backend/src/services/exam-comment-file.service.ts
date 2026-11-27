import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { env, storageDir } from "../configs/env";
import {
  EXAM_COMMENT_FILE_URL_TTL_MS,
  EXAM_COMMENT_FILES_MAX,
  EXAM_COMMENT_IMAGE_INPUT_MAX_PIXELS,
  EXAM_COMMENT_IMAGE_MAX_SIDE,
  EXAM_COMMENT_WEBP_QUALITY,
} from "../constants/exam-comment";
import { HTTP_STATUS } from "../constants/httpStatus";
import { examCommentRepository } from "../repositories/exam-comment.repository";
import { AppError } from "../rules/error";
import { checkCommentFile, COMMENT_FILE_MIME, commentFileDisplayName, commentFileHeaders, commentFileRel, commentFilesDirRel } from "../utils/comment-file";
import { isValidExamFileSignature, signExamFile } from "../utils/exam-path";
import { resolveInside } from "../utils/exam-zip";

// Tệp đính kèm của bình luận trên đĩa (decision 0020): kiểm tra, ghi (trước khi ghi DB), xoá, link ký, phát tệp

export type CommentUpload = { name: string; buffer: Buffer };
export type StoredCommentFile = { name: string; filePath: string; mime: string; sizeBytes: number };

const HOUR_MS = 60 * 60_000;
const invalid = (n: number, total: number, msg: string) => {
  const text = total > 1 ? `Tệp thứ ${n}: ${msg}` : msg;
  return new AppError(text, HTTP_STATUS.UNPROCESSABLE_ENTITY, { files: text });
};
const notFound = () => AppError.notFound("Không tìm thấy tệp");

/** Xoá tệp trên đĩa (chỉ trong STORAGE_DIR; tệp đã mất thì bỏ qua). Không bao giờ ném lỗi: lỗi chỉ ghi log. */
async function removeFiles(rels: readonly string[]) {
  await Promise.all(
    rels.map((rel) => {
      const abs = resolveInside(storageDir, rel);
      return abs ? fs.rm(abs, { force: true }).catch((err: Error) => console.error(`[comment-file] không xoá được tệp: ${err.message}`)) : undefined;
    }),
  );
}

export const examCommentFileService = {
  /**
   * Kiểm tra mọi tệp trước (đuôi, kích thước, byte đầu), rồi mới ghi: ảnh giải mã lại thành WebP (bỏ EXIF/GPS, thu nhỏ), tệp khác ghi nguyên.
   * Lỗi ở bất kỳ tệp nào thì xoá các tệp vừa ghi và ném 422 trên trường `files`.
   */
  async store(examId: string, files: readonly CommentUpload[]): Promise<StoredCommentFile[]> {
    if (files.length > EXAM_COMMENT_FILES_MAX) throw invalid(0, 1, `Mỗi bình luận đính kèm tối đa ${EXAM_COMMENT_FILES_MAX} tệp`);
    const checked = files.map((f, i) => {
      const r = checkCommentFile(f.name, f.buffer);
      if ("error" in r) throw invalid(i + 1, files.length, r.error);
      return { ...f, kind: r.kind };
    });
    if (!checked.length) return [];
    await fs.mkdir(path.join(storageDir, commentFilesDirRel(examId)), { recursive: true });
    const written: StoredCommentFile[] = [];
    try {
      for (const [i, f] of checked.entries()) {
        const filePath = commentFileRel(examId, randomBytes(16).toString("hex"), f.kind);
        const abs = path.join(storageDir, filePath);
        let sizeBytes = f.buffer.length;
        if (f.kind === "image") {
          try {
            const info = await sharp(f.buffer, { limitInputPixels: EXAM_COMMENT_IMAGE_INPUT_MAX_PIXELS, failOn: "error" })
              .rotate()
              .resize({ width: EXAM_COMMENT_IMAGE_MAX_SIDE, height: EXAM_COMMENT_IMAGE_MAX_SIDE, fit: "inside", withoutEnlargement: true })
              .webp({ quality: EXAM_COMMENT_WEBP_QUALITY })
              .toFile(abs);
            sizeBytes = info.size;
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code) throw err; // lỗi ghi đĩa
            await fs.rm(abs, { force: true });
            throw invalid(i + 1, checked.length, "Ảnh bị lỗi hoặc quá lớn, không đọc được");
          }
        } else {
          await fs.writeFile(abs, f.buffer, { flag: "wx" });
        }
        written.push({ name: commentFileDisplayName(f.name, f.kind), filePath, mime: COMMENT_FILE_MIME[f.kind], sizeBytes });
      }
      return written;
    } catch (err) {
      await removeFiles(written.map((w) => w.filePath));
      throw err;
    }
  },

  removeFiles,

  // Xoá đề: xoá cả thư mục tệp bình luận của đề (các dòng đã xoá theo khoá ngoại)
  removeExamDir: (examId: string) =>
    fs.rm(path.join(storageDir, commentFilesDirRel(examId)), { recursive: true, force: true }).catch((err: Error) => console.error(`[comment-file] không xoá được thư mục: ${err.message}`)),

  /** Một tệp cho giao diện: `url` là link ký ngắn hạn gắn với đúng đường dẫn tệp, không cần đăng nhập (dùng được trong <img src>). */
  toDto(examId: string, f: { id: string; name: string; mime: string; sizeBytes: number; filePath: string }, now = Date.now()) {
    const exp = Math.ceil((now + EXAM_COMMENT_FILE_URL_TTL_MS) / HOUR_MS) * HOUR_MS;
    return {
      id: f.id,
      name: f.name,
      mime: f.mime,
      sizeBytes: f.sizeBytes,
      isImage: f.mime.startsWith("image/"),
      url: `${env.API_URL}/api/v1/exams/${examId}/comment-files/${f.id}?${signExamFile(f.filePath, exp, env.JWT_SECRET)}`,
    };
  },

  /** Tệp để phát: chữ ký phải đúng cho đường dẫn của tệp này và còn hạn; mọi lỗi đều là 404. */
  async open(examId: string, fileId: string, e: unknown, s: unknown) {
    const row = await examCommentRepository.findFile(fileId, examId);
    if (!row || !isValidExamFileSignature(row.filePath, e, s, env.JWT_SECRET)) throw notFound();
    const abs = resolveInside(storageDir, row.filePath);
    if (!abs) throw notFound();
    return { abs, headers: commentFileHeaders(row.name, row.mime) };
  },
};
