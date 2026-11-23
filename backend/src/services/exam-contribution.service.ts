import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { storageDir } from "../configs/env";
import { prisma } from "../configs/prisma";
import {
  CONTRIBUTION_IMAGE_MAX_SIDE,
  CONTRIBUTION_INPUT_MAX_PIXELS,
  CONTRIBUTION_MAX_PENDING_PER_USER,
  CONTRIBUTION_STORAGE_DIR,
  CONTRIBUTION_WEBP_QUALITY,
} from "../constants/exam-contribution";
import { HTTP_STATUS } from "../constants/httpStatus";
import { examContributionRepository } from "../repositories/exam-contribution.repository";
import { subjectRepository } from "../repositories/subject.repository";
import { AppError } from "../rules/error";
import { badgeService } from "./badge.service";
import type { CreateContributionBody, ListContributionsQuery, ReviewContributionBody } from "../rules/requests/exam-contribution.request";
import { contributionDirRel, contributionFileName, contributionImageRel, isAllowedImageSignature } from "../utils/exam-contribution";
import { resolveInside } from "../utils/exam-zip";
import { toMeta, type PaginationQuery } from "../utils/pagination";

const ROOT = path.join(storageDir, CONTRIBUTION_STORAGE_DIR);
const dirOf = (id: string) => path.join(storageDir, contributionDirRel(id));
const removeDir = (dir: string) => fs.rm(dir, { recursive: true, force: true }).catch((err: Error) => console.error(`[contribution] không xoá được thư mục ảnh: ${err.message}`));

const tooManyPending = () => AppError.conflict("Bạn đang có nhiều đóng góp chờ duyệt. Hãy đợi admin duyệt xong rồi gửi tiếp.");
const invalidImage = (n: number) => new AppError(`Ảnh thứ ${n} không hợp lệ`, HTTP_STATUS.BAD_REQUEST);
const notPending = () => AppError.conflict("Đóng góp không còn ở trạng thái chờ duyệt");

// Một ảnh -> WebP (xoay theo EXIF, thu nhỏ cạnh dài). Lỗi giải mã = ảnh không hợp lệ; lỗi ghi đĩa (có code) ném nguyên
async function toWebp(buf: Buffer, dest: string, n: number) {
  if (!isAllowedImageSignature(buf)) throw invalidImage(n);
  try {
    await sharp(buf, { limitInputPixels: CONTRIBUTION_INPUT_MAX_PIXELS, failOn: "error" })
      .rotate()
      .resize({ width: CONTRIBUTION_IMAGE_MAX_SIDE, height: CONTRIBUTION_IMAGE_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: CONTRIBUTION_WEBP_QUALITY })
      .toFile(dest);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code) throw err;
    throw invalidImage(n);
  }
}

export const examContributionService = {
  /** Kiểm tra rẻ trước khi multer đọc ảnh: đã đủ số đóng góp chờ duyệt thì từ chối ngay. */
  async assertCanSubmit(userId: string) {
    if ((await examContributionRepository.countPendingByUser(prisma, userId)) >= CONTRIBUTION_MAX_PENDING_PER_USER) throw tooManyPending();
  },

  /**
   * Ảnh được chuyển lần lượt (từng ảnh một để giữ RAM thấp) vào thư mục tạm, rồi trong một transaction: tạo dòng + đổi tên thư mục.
   * Lỗi ở bất kỳ bước nào thì xoá thư mục tạm/thư mục đích: không bao giờ còn nửa đóng góp.
   */
  async create(userId: string, body: CreateContributionBody, files: Express.Multer.File[]) {
    if (files.length === 0) throw new AppError("Vui lòng chọn ít nhất một ảnh đề thi", HTTP_STATUS.BAD_REQUEST, { images: "Chưa có ảnh" });
    if (!(await subjectRepository.findByCode(body.subjectCode))) {
      throw new AppError("Không tìm thấy môn học này", HTTP_STATUS.BAD_REQUEST, { subjectCode: "Môn học không tồn tại" });
    }
    await examContributionService.assertCanSubmit(userId);

    const tmp = path.join(ROOT, `.tmp-${randomUUID()}`);
    const moved = { dir: "" };
    await fs.mkdir(tmp, { recursive: true });
    try {
      for (const [i, file] of files.entries()) await toWebp(file.buffer, path.join(tmp, contributionFileName(i + 1)), i + 1);
      // Đếm lại trong transaction; hai lần gửi cùng lúc của một tài khoản đã bị chặn bởi onePerUser ở route
      return await prisma.$transaction(async (tx) => {
        if ((await examContributionRepository.countPendingByUser(tx, userId)) >= CONTRIBUTION_MAX_PENDING_PER_USER) throw tooManyPending();
        const row = await examContributionRepository.create(tx, { userId, ...body, imageCount: files.length });
        moved.dir = dirOf(row.id);
        await fs.rename(tmp, moved.dir);
        return row;
      });
    } catch (err) {
      await removeDir(tmp);
      if (moved.dir) await removeDir(moved.dir); // transaction lỗi sau khi đã đổi tên thư mục
      throw err;
    }
  },

  async mine(userId: string, query: PaginationQuery) {
    const { items, total } = await examContributionRepository.listByUser(userId, query);
    return { items, meta: toMeta(query, total) };
  },

  // ----- Admin
  async list(query: ListContributionsQuery) {
    const { status, ...page } = query;
    const { items, total } = await examContributionRepository.listAdmin(page, status);
    return { items, meta: toMeta(page, total) };
  },

  /** Đường dẫn tuyệt đối của ảnh thứ `index` (đếm từ 1). Đóng góp bị từ chối thì ảnh đã bị xoá. */
  async imagePath(id: string, index: number) {
    const row = await examContributionRepository.findImageCount(id);
    if (!row || row.status === "REJECTED" || index > row.imageCount) throw AppError.notFound("Không tìm thấy ảnh");
    const abs = resolveInside(storageDir, contributionImageRel(id, index));
    if (!abs) throw AppError.notFound("Không tìm thấy ảnh");
    return abs;
  },

  async approve(adminId: string, id: string, { note }: ReviewContributionBody) {
    if (!(await examContributionRepository.review(id, { status: "APPROVED", reviewNote: note, reviewedById: adminId }))) throw notPending();
    void examContributionRepository.findUserId(id).then((r) => r && badgeService.evaluate(r.userId)).catch(() => undefined);
    return { id, status: "APPROVED" as const };
  },

  async reject(adminId: string, id: string, { note }: ReviewContributionBody) {
    if (!(await examContributionRepository.review(id, { status: "REJECTED", reviewNote: note, reviewedById: adminId }))) throw notPending();
    await removeDir(dirOf(id));
    return { id, status: "REJECTED" as const };
  },

  countPending: () => examContributionRepository.countPending(),
};
