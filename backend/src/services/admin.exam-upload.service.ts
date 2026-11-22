import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { storageDir } from "../configs/env";
import { prisma } from "../configs/prisma";
import { EXAM_IMAGES_DIR, EXAM_STORAGE_DIR } from "../constants/crawler";
import {
  EXAM_UPLOAD_INPUT_MAX_PIXELS,
  EXAM_UPLOAD_KEEP_MAX_BYTES,
  EXAM_UPLOAD_KEEP_MAX_SIDE,
  EXAM_UPLOAD_TX_TIMEOUT_MS,
  EXAM_UPLOAD_WEBP_QUALITY,
  MANUAL_THREAD_HEX_BYTES,
  MANUAL_THREAD_PREFIX,
} from "../constants/exam-upload";
import { HTTP_STATUS } from "../constants/httpStatus";
import { realtimeHub } from "../realtime/hub";
import { examGapRepository } from "../repositories/exam-gap.repository";
import { examRepository, isDuplicateThread, type AnswerSource } from "../repositories/exam.repository";
import { fuoCatalogRepository } from "../repositories/fuo-catalog.repository";
import { AppError } from "../rules/error";
import type { ExamGapFilter, ExamGapsQuery, UpdateExamImagesBody, UploadExamBody } from "../rules/requests/exam-upload.request";
import { isWebpSignature } from "../utils/exam-contribution";
import { baseName, parseAnswersJson, planUploadNumbers } from "../utils/exam-upload";
import { resolveInside } from "../utils/exam-zip";
import { threadUrl } from "../utils/fuo-url";
import { toMeta } from "../utils/pagination";
import { examSolveService } from "./exam-solve.service";
import { imagePathOf, withThreadLock } from "./exam-import.service";

type File = Pick<Express.Multer.File, "buffer" | "originalname">;
type Plan = { numbers: number[]; answers: Map<number, string>; ignored: string[] };

const invalid = (message: string, field = "images") => new AppError(message, HTTP_STATUS.BAD_REQUEST, { [field]: message });
const solving = () => AppError.conflict("AI đang giải đề này, hãy chờ AI xong rồi cập nhật");
const removeFiles = (abs: string[]) => Promise.all(abs.map((p) => fs.rm(p, { force: true }).catch((err: Error) => console.error(`[exam-upload] không xoá được ảnh: ${err.message}`))));

/** Kiểm tra tên ảnh + tệp đáp án; lỗi thì 400 trước khi ghi gì ra đĩa */
function plan(files: File[], existingMax: number, rawAnswers: string | undefined): Plan {
  if (files.length === 0) throw invalid("Vui lòng chọn thư mục ảnh đề (images/Q1.webp...)");
  const numbers = planUploadNumbers(
    files.map((f) => f.originalname),
    existingMax,
  );
  if (!numbers.ok) throw invalid(numbers.error);
  const parsed = parseAnswersJson(rawAnswers, numbers.value);
  if (!parsed.ok) throw invalid(parsed.error, "answers");
  return { numbers: numbers.value, ...parsed.value };
}

/** WebP hợp lệ giữ nguyên byte; quá lớn (cạnh hoặc dung lượng) thì thu nhỏ và mã hoá lại. Không phải WebP / không đọc được: 400. */
async function storedWebp(file: File): Promise<Buffer> {
  const name = baseName(file.originalname);
  if (!isWebpSignature(file.buffer)) throw invalid(`Ảnh ${name} không phải tệp WebP`);
  try {
    const img = sharp(file.buffer, { limitInputPixels: EXAM_UPLOAD_INPUT_MAX_PIXELS, failOn: "error" });
    const { width = 0, height = 0 } = await img.metadata();
    if (width > 0 && height > 0 && width <= EXAM_UPLOAD_KEEP_MAX_SIDE && height <= EXAM_UPLOAD_KEEP_MAX_SIDE && file.buffer.length <= EXAM_UPLOAD_KEEP_MAX_BYTES) return file.buffer;
    return await img
      .rotate()
      .resize({ width: EXAM_UPLOAD_KEEP_MAX_SIDE, height: EXAM_UPLOAD_KEEP_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: EXAM_UPLOAD_WEBP_QUALITY })
      .toBuffer();
  } catch {
    throw invalid(`Ảnh ${name} không đọc được`);
  }
}

/**
 * Ghi ảnh vào exams/<threadId>/images/ với tên mới không trùng (Q<số>-<ngẫu nhiên>.webp, cờ "wx": không bao giờ đè ảnh đang dùng).
 * Chưa dòng nào trong DB trỏ tới các tệp này cho tới khi transaction xong, nên lỗi ở đâu cũng chỉ cần xoá đúng các tệp vừa ghi.
 */
async function writeImages(threadId: string, files: File[], numbers: number[], written: string[]) {
  const dir = path.join(storageDir, EXAM_STORAGE_DIR, threadId, EXAM_IMAGES_DIR);
  await fs.mkdir(dir, { recursive: true });
  const rows: { number: number; name: string; imagePath: string }[] = [];
  for (const [i, file] of files.entries()) {
    const number = numbers[i]!;
    const data = await storedWebp(file); // lần lượt từng ảnh để giữ RAM thấp
    const name = `Q${number}-${randomBytes(4).toString("hex")}.webp`;
    const abs = path.join(dir, name);
    await fs.writeFile(abs, data, { flag: "wx" });
    written.push(abs);
    rows.push({ number, name: `Q${number}`, imagePath: imagePathOf(threadId, name) });
  }
  return rows;
}

const oldImages = (questions: { number: number; imagePath: string }[], numbers: Set<number>) =>
  questions.filter((q) => numbers.has(q.number) && q.imagePath).flatMap((q) => resolveInside(storageDir, q.imagePath) ?? []);

async function result(examId: string, created: boolean, p: Plan, replaced: number[]) {
  const exam = await examRepository.findAnswers(examId);
  const target = await examRepository.findUploadTarget(prisma, examId);
  return {
    id: examId,
    threadId: target?.threadId ?? "",
    title: target?.title ?? "",
    created,
    totalQuestions: target?.totalQuestions ?? 0,
    answerSource: exam?.answerSource ?? "DEFAULT",
    questions: exam?.questions.length ?? 0,
    answered: exam?.questions.filter((q) => q.answer !== "").length ?? 0,
    added: p.numbers.filter((n) => !replaced.includes(n)).sort((a, b) => a - b),
    replaced: [...replaced].sort((a, b) => a - b),
    ignoredAnswers: p.ignored,
  };
}

const published = (examId: string) => {
  void realtimeHub.publishExamQuestions(examId);
  void realtimeHub.publishExam(examId);
};

export const adminExamUploadService = {
  /**
   * Tạo đề từ thư mục ảnh tải tay (Q1..QN.webp, đủ 1..N) + ans.json. Gắn bài của danh mục (threadId) thì lấy link, ngày, loại, tiêu đề
   * mặc định từ bài đó; không gắn thì threadId tự sinh "m<hex>" và sourceUrl rỗng (giao diện ẩn link khi rỗng).
   * Có đáp án ít nhất một câu: MANUAL; không có: DEFAULT (chưa có đáp án, không gọi AI ở đây).
   * Đã có đề cùng threadId: dở dang thì điền vào đề đó (giữ id, bỏ câu thừa), đủ rồi thì 409.
   */
  async create(adminId: string, body: UploadExamBody, files: File[]) {
    const thread = body.threadId ? await fuoCatalogRepository.findThread(body.threadId) : null;
    if (body.threadId && !thread) throw AppError.notFound("Không tìm thấy bài này trong danh mục FuOverflow");
    const title = body.title ?? thread?.title;
    if (!title) throw invalid("Vui lòng nhập tiêu đề đề thi", "title");
    const p = plan(files, 0, body.answers);
    const threadId = thread?.threadId ?? `${MANUAL_THREAD_PREFIX}${randomBytes(MANUAL_THREAD_HEX_BYTES).toString("hex")}`;
    const total = p.numbers.length;
    const answerSource: AnswerSource = p.answers.size ? "MANUAL" : "DEFAULT";
    const info = { title, subjectCode: body.subjectCode, kind: body.kind ?? thread?.kind ?? "FE", postedAt: thread?.postedAt ?? null };

    return withThreadLock(threadId, async () => {
      const existing = await examRepository.findByThreadId(threadId);
      if (existing && (await examRepository.isComplete(existing))) {
        throw new AppError("Đề này đã có đủ câu trong hệ thống. Hãy mở đề đó và dùng chức năng cập nhật ảnh, đáp án.", HTTP_STATUS.CONFLICT, undefined, "EXAM_EXISTS", { examId: existing.id });
      }
      if (existing && examSolveService.isBusy(existing.id)) throw solving();
      const before = existing ? await examRepository.findUploadTarget(prisma, existing.id) : null;
      const replaced = before ? before.questions.filter((q) => q.number <= total).map((q) => q.number) : [];

      const written: string[] = [];
      let examId: string;
      try {
        const rows = await writeImages(threadId, files, p.numbers, written);
        examId = await prisma.$transaction(
          async (tx) => {
            const id = existing
              ? (await examRepository.setUploadedInfo(tx, existing.id, { ...info, totalQuestions: total, answerSource, aiReport: null })).id
              : (await examRepository.createUploaded(tx, { ...info, threadId, sourceUrl: thread ? threadUrl(threadId) : "", totalQuestions: total, answerSource, createdById: adminId })).id;
            if (existing) await examRepository.dropQuestionsAfter(tx, id, total);
            await examRepository.saveUploadedQuestions(tx, id, rows, replaced, [...p.answers]);
            return id;
          },
          { timeout: EXAM_UPLOAD_TX_TIMEOUT_MS },
        );
      } catch (err) {
        await removeFiles(written);
        if (isDuplicateThread(err)) throw AppError.conflict("Đề này vừa được tạo bởi một lượt khác, hãy tải lại trang");
        throw err;
      }
      // Ảnh cũ của đề dở dang (câu bị thay hoặc bị bỏ) không còn dòng nào trỏ tới
      if (before) await removeFiles(oldImages(before.questions, new Set(before.questions.map((q) => q.number))));
      console.log(`[admin] #${adminId} tải đề ${existing ? "vào đề dở dang " : ""}#${examId}: ${total} câu, ${p.answers.size} đáp án`);
      published(examId);
      return result(examId, !existing, p, replaced);
    });
  },

  /**
   * Cập nhật ảnh (và đáp án) của đề có sẵn: Q<số> đã có thì thay ảnh (giữ đáp án trừ khi ans.json có), số mới phải nối tiếp
   * số lớn nhất hiện có. Câu bị thay ảnh: bỏ lời giải AI, embedding và dấu vân tay ảnh (viết cho ảnh cũ).
   * totalQuestions chỉ tăng (= max(tổng cũ, số câu lớn nhất)). Có đáp án mới: nguồn đáp án thành MANUAL như khi sửa tay.
   */
  async updateImages(adminId: string, id: string, body: UpdateExamImagesBody, files: File[]) {
    if (examSolveService.isBusy(id)) throw solving();
    const first = await examRepository.findUploadTarget(prisma, id);
    if (!first) throw AppError.notFound("Không tìm thấy đề");

    return withThreadLock(first.threadId, async () => {
      const exam = await examRepository.findUploadTarget(prisma, id);
      if (!exam) throw AppError.notFound("Không tìm thấy đề");
      if (examSolveService.isBusy(id)) throw solving();
      const have = new Set(exam.questions.map((q) => q.number));
      const p = plan(files, Math.max(0, ...have), body.answers);
      const replaced = p.numbers.filter((n) => have.has(n));
      const totalQuestions = Math.max(exam.totalQuestions, ...p.numbers);
      // PENDING mà không có lượt AI nào đang chạy (isBusy ở trên) là trạng thái treo: đưa về DEFAULT
      const answerSource = (p.answers.size ? "MANUAL" : exam.answerSource === "PENDING" ? "DEFAULT" : exam.answerSource) as AnswerSource;

      const written: string[] = [];
      try {
        const rows = await writeImages(exam.threadId, files, p.numbers, written);
        await prisma.$transaction(
          async (tx) => {
            await examRepository.saveUploadedQuestions(tx, id, rows, replaced, [...p.answers]);
            await examRepository.setUploadedInfo(tx, id, { totalQuestions, answerSource });
          },
          { timeout: EXAM_UPLOAD_TX_TIMEOUT_MS },
        );
      } catch (err) {
        await removeFiles(written);
        throw err;
      }
      await removeFiles(oldImages(exam.questions, new Set(replaced)));
      console.log(`[admin] #${adminId} cập nhật ảnh đề #${id}: ${replaced.length} thay, ${p.numbers.length - replaced.length} thêm, ${p.answers.size} đáp án`);
      published(id);
      return result(id, false, p, replaced);
    });
  },

  async gaps(query: ExamGapsQuery) {
    const { gap, kind, subject, q, page, limit } = query;
    const { items, total } = await examGapRepository.list(gap, { kind, subject, q }, { page, limit });
    // Bài chưa có đề: link bài trên FuOverflow dựng từ threadId như mọi chỗ khác; đề tải tay không có link (null)
    return { items: items.map((i) => ({ ...i, sourceUrl: i.sourceUrl ?? (i.examId ? null : threadUrl(i.threadId)) })), meta: toMeta({ page, limit }, total) };
  },

  gapSummary: (filter: ExamGapFilter) => examGapRepository.summary(filter),
};
