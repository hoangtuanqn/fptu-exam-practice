import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { storageDir } from "../configs/env";
import { prisma } from "../configs/prisma";
import { EXAM_FILES_DIR, EXAM_IMAGES_DIR, EXAM_STORAGE_DIR } from "../constants/crawler";
import {
  EXAM_RESOURCE_NAME_MAX_BYTES,
  EXAM_UPLOAD_INPUT_MAX_PIXELS,
  EXAM_UPLOAD_KEEP_MAX_BYTES,
  EXAM_UPLOAD_KEEP_MAX_SIDE,
  EXAM_UPLOAD_TX_TIMEOUT_MS,
  EXAM_UPLOAD_WEBP_QUALITY,
  MANUAL_THREAD_HEX_BYTES,
  MANUAL_THREAD_PREFIX,
} from "../constants/exam-upload";
import { HTTP_STATUS } from "../constants/httpStatus";
import { examUploadQueue } from "../jobs/exam-upload.queue";
import { realtimeHub } from "../realtime/hub";
import { examAttachmentRepository, type NewAttachment } from "../repositories/exam-attachment.repository";
import { examGapRepository } from "../repositories/exam-gap.repository";
import { examRepository, isDuplicateThread, type AnswerSource } from "../repositories/exam.repository";
import { AppError } from "../rules/error";
import type { ExamGapFilter, ExamGapsQuery, UpdateExamImagesBody, UploadExamBody } from "../rules/requests/exam-upload.request";
import { isWebpSignature } from "../utils/exam-contribution";
import { attachmentType } from "../utils/attachment";
import { baseName, parseAnswersJson, planUploadNumbers, resourceFileNames } from "../utils/exam-upload";
import { resolveInside } from "../utils/exam-zip";
import { createKeyLock } from "../utils/key-lock";
import type { StagedFile } from "../utils/upload-queue";
import { toMeta } from "../utils/pagination";
import { invalidateCatalogCache } from "./catalog.service";
import { examSolveService } from "./exam-solve.service";

// Mọi lượt ghi cùng một đề (theo threadId) chạy lần lượt, không xoá hay ghi đè ảnh của nhau
const withThreadLock = createKeyLock();
// Đường dẫn ảnh lưu trong DB, tương đối so với STORAGE_DIR (luôn dùng "/"): exams/<threadId>/images/<tên>.webp
const imagePathOf = (threadId: string, file: string) => `${EXAM_STORAGE_DIR}/${threadId}/${EXAM_IMAGES_DIR}/${file}`;

type MemFile = Pick<Express.Multer.File, "buffer" | "originalname">;
type File = MemFile | StagedFile; // trong RAM (gửi thẳng) hoặc tệp tạm trên đĩa (chạy nền)
type Plan = { numbers: number[]; answers: Map<number, string>; ignored: string[] };

const invalid = (message: string, field = "images") => new AppError(message, HTTP_STATUS.BAD_REQUEST, { [field]: message });
const solving = () => AppError.conflict("AI đang giải đề này, hãy chờ AI xong rồi cập nhật");
const examExists = (examId: string) =>
  new AppError("Đề này đã có đủ câu trong hệ thống. Hãy mở đề đó và dùng chức năng cập nhật ảnh, đáp án.", HTTP_STATUS.CONFLICT, undefined, "EXAM_EXISTS", { examId });
/** Đề cùng tên đã có: không có cờ overwrite thì 409 (EXAM_TITLE_EXISTS, giao diện hỏi lại admin), có cờ thì trả đề đó để ghi đè */
const sameTitle = async (body: UploadExamBody) => {
  const exam = body.title ? await examRepository.findByTitle(body.title) : null;
  if (exam && !body.overwrite) throw new AppError("Đã có đề cùng tên này trong hệ thống", HTTP_STATUS.CONFLICT, { title: "Tên đề đã tồn tại" }, "EXAM_TITLE_EXISTS", { examId: exam.id });
  return exam;
};
const bytesOf = (f: File) => ("buffer" in f ? f.buffer : fs.readFile(f.path));
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

/** Kiểm tra nhanh byte đầu WebP khi còn trong RAM, để lượt chạy nền không phải đợi tới lúc xử lý mới báo lỗi */
function checkSignatures(files: MemFile[]) {
  const bad = files.find((f) => !isWebpSignature(f.buffer));
  if (bad) throw invalid(`Ảnh ${baseName(bad.originalname)} không phải tệp WebP`);
}

/** WebP hợp lệ giữ nguyên byte; quá lớn (cạnh hoặc dung lượng) thì thu nhỏ và mã hoá lại. Không phải WebP / không đọc được: 400. */
async function storedWebp(file: MemFile): Promise<Buffer> {
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
    const data = await storedWebp({ originalname: file.originalname, buffer: await bytesOf(file) }); // lần lượt từng ảnh để giữ RAM thấp
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

export type ExamUploadResult = Awaited<ReturnType<typeof result>>;

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

// Đề vừa tải/cập nhật: báo realtime và bỏ đệm Kho đề để đề hiện ngay trong danh sách theo môn
const published = (examId: string) => {
  invalidateCatalogCache();
  void realtimeHub.publishExamQuestions(examId);
  void realtimeHub.publishExam(examId);
};

/** Phần kiểm tra nhanh trước khi nhận việc (tiêu đề, tên ảnh, đáp án): lỗi thì trả 400 ngay */
async function prepareCreate(body: UploadExamBody, files: MemFile[]) {
  const title = body.title;
  if (!title) throw invalid("Vui lòng nhập tiêu đề đề thi", "title");
  const p = plan(files, 0, body.answers);
  checkSignatures(files);
  const threadId = `${MANUAL_THREAD_PREFIX}${randomBytes(MANUAL_THREAD_HEX_BYTES).toString("hex")}`;
  const info = { title, subjectCode: body.subjectCode, kind: body.kind ?? "FE", postedAt: null };
  return { threadId, title, p, info };
}

/** Ghi đề trong khoá của threadId; kiểm tra lại mọi điều kiện vì trạng thái có thể đã đổi từ lúc nhận việc */
function runCreate(adminId: string, { threadId, p, info }: Awaited<ReturnType<typeof prepareCreate>>, files: File[]) {
  const total = p.numbers.length;
  const answerSource: AnswerSource = p.answers.size ? "MANUAL" : "DEFAULT";
  return withThreadLock(threadId, async () => {
    const existing = await examRepository.findByThreadId(threadId);
    if (existing && (await examRepository.isComplete(existing))) throw examExists(existing.id);
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
            : (await examRepository.createUploaded(tx, { ...info, threadId, sourceUrl: "",totalQuestions: total, answerSource, createdById: adminId })).id;
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
}

async function prepareUpdate(id: string, body: UpdateExamImagesBody, files: MemFile[]) {
  if (examSolveService.isBusy(id)) throw solving();
  const first = await examRepository.findUploadTarget(prisma, id);
  if (!first) throw AppError.notFound("Không tìm thấy đề");
  plan(files, Math.max(0, ...first.questions.map((q) => q.number)), body.answers);
  checkSignatures(files);
  return first;
}

function runUpdate(adminId: string, id: string, threadId: string, body: UpdateExamImagesBody, files: File[]) {
  return withThreadLock(threadId, async () => {
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
}

type ResourcePrep = Awaited<ReturnType<typeof prepareResource>>;
export type ResourceUploadResult = Awaited<ReturnType<typeof runResource>>;

/** Kiểm tra nhanh (tiêu đề, trùng tên, có tệp) trước khi xếp hàng, để lỗi và hỏi ghi đè vẫn trả ngay */
async function prepareResource(body: UploadExamBody, files: MemFile[]) {
  const title = body.title;
  if (!title) throw invalid("Vui lòng nhập tiêu đề đề thi", "title");
  const same = await sameTitle(body);
  if (!files.length) throw invalid("Thư mục không có tệp nào.", "files");
  const threadId = same?.threadId ?? `${MANUAL_THREAD_PREFIX}${randomBytes(MANUAL_THREAD_HEX_BYTES).toString("hex")}`;
  return { title, body, same, threadId };
}

function runResource(adminId: string, { title, body, same, threadId }: ResourcePrep, files: File[]) {
  // multer 1.x đọc tên tệp theo latin1 còn trình duyệt gửi UTF-8: đổi lại để giữ tên tiếng Việt
  const all = files.map((f) => ({ file: f, name: baseName(Buffer.from(f.originalname, "latin1").toString("utf8")) }));
  return withThreadLock(threadId, async () => {
    const dir = path.join(storageDir, EXAM_STORAGE_DIR, threadId, EXAM_FILES_DIR);
    const names = resourceFileNames(
      all.map((f) => f.name),
      EXAM_RESOURCE_NAME_MAX_BYTES,
    );
    const old = same ? await examAttachmentRepository.listByExam(same.id) : [];
    const written: string[] = [];
    let examId: string;
    try {
      await fs.mkdir(dir, { recursive: true });
      const rows: NewAttachment[] = [];
      for (const [i, f] of all.entries()) {
        const name = names[i]!;
        const file = `${randomBytes(4).toString("hex")}-${name}`;
        const abs = path.join(dir, file);
        const buffer = await bytesOf(f.file); // lần lượt từng tệp để giữ RAM thấp
        await fs.writeFile(abs, buffer, { flag: "wx" });
        written.push(abs);
        rows.push({ name, filePath: `${EXAM_STORAGE_DIR}/${threadId}/${EXAM_FILES_DIR}/${file}`, mime: attachmentType(f.name)?.mime ?? "application/octet-stream", sizeBytes: buffer.length, sourceUrl: "" });
      }
      examId = await prisma.$transaction(
        async (tx) => {
          let id = same?.id;
          if (id) await examAttachmentRepository.removeAll(id, tx);
          else
            id = (
              await examRepository.createUploaded(tx, { threadId, title, subjectCode: body.subjectCode, kind: body.kind ?? "FE", postedAt: null, sourceUrl: "", totalQuestions: 0, answerSource: "DEFAULT", createdById: adminId })
            ).id;
          await examAttachmentRepository.add(id, rows, tx);
          return id;
        },
        { timeout: EXAM_UPLOAD_TX_TIMEOUT_MS },
      );
    } catch (err) {
      await removeFiles(written);
      if (!same) await fs.rm(path.join(storageDir, EXAM_STORAGE_DIR, threadId), { recursive: true, force: true }).catch(() => undefined); // threadId mới: thư mục chỉ chứa tệp vừa ghi
      throw err;
    }
    await removeFiles(old.flatMap((a) => resolveInside(storageDir, a.filePath) ?? []));
    console.log(`[admin] #${adminId} tải tài liệu ${same ? "ghi đè " : ""}#${examId}: ${all.length} tệp`);
    published(examId);
    return { id: examId, title, files: all.length, overwritten: !!same, questions: 0, answered: 0 };
  });
}

export const adminExamUploadService = {
  /**
   * Tạo đề từ thư mục ảnh tải tay (Q1..QN.webp, đủ 1..N) + ans.json. threadId tự sinh "m<hex>" và sourceUrl rỗng (giao diện ẩn link khi rỗng).
   * Có đáp án ít nhất một câu: MANUAL; không có: DEFAULT (chưa có đáp án, không gọi AI ở đây).
   */
  async create(adminId: string, body: UploadExamBody, files: MemFile[]) {
    const same = await sameTitle(body);
    if (same) return this.updateImages(adminId, same.id, body, files); // ghi đè: thay ảnh các câu trùng số, cập nhật đáp án
    return runCreate(adminId, await prepareCreate(body, files), files);
  },

  /**
   * Thư mục tài liệu (không có images/ + ans.json): đề 0 câu, nguồn đáp án DEFAULT, MỌI tệp lưu thành tệp đính kèm
   * ở exams/<threadId>/files/<hex>-<tên> (đuôi lạ lưu octet-stream, luôn tải về, không mở trên trình duyệt).
   * Tên đề đã có + overwrite: xoá tệp cũ của đề đó rồi lưu tệp mới vào cùng đề. ?async=1 (giao diện mới): chạy nền qua hàng đợi chung với tải đề; không có cờ thì giữ cách cũ.
   */
  async createResource(adminId: string, body: UploadExamBody, files: MemFile[]) {
    return runResource(adminId, await prepareResource(body, files), files);
  },

  async createResourceAsync(adminId: string, body: UploadExamBody, files: MemFile[]) {
    const prep = await prepareResource(body, files);
    return examUploadQueue.enqueue({ adminId, kind: "create", title: prep.title }, files, (staged) => runResource(adminId, prep, staged));
  },

  /** Như create nhưng chạy nền: kiểm tra nhanh, ghi tệp tạm, xếp hàng rồi trả về lượt vừa xếp (kết quả xem ở jobs / realtime) */
  async createAsync(adminId: string, body: UploadExamBody, files: MemFile[]) {
    const same = await sameTitle(body);
    if (same) return this.updateImagesAsync(adminId, same.id, body, files);
    const prep = await prepareCreate(body, files);
    return examUploadQueue.enqueue({ adminId, kind: "create", title: prep.title }, files, (staged) => runCreate(adminId, prep, staged));
  },

  /**
   * Cập nhật ảnh (và đáp án) của đề có sẵn: Q<số> đã có thì thay ảnh (giữ đáp án trừ khi ans.json có), số mới phải nối tiếp
   * số lớn nhất hiện có. Câu bị thay ảnh: bỏ lời giải AI, embedding và dấu vân tay ảnh (viết cho ảnh cũ).
   * totalQuestions chỉ tăng (= max(tổng cũ, số câu lớn nhất)). Có đáp án mới: nguồn đáp án thành MANUAL như khi sửa tay.
   */
  async updateImages(adminId: string, id: string, body: UpdateExamImagesBody, files: MemFile[]) {
    const first = await prepareUpdate(id, body, files);
    return runUpdate(adminId, id, first.threadId, body, files);
  },

  async updateImagesAsync(adminId: string, id: string, body: UpdateExamImagesBody, files: MemFile[]) {
    const first = await prepareUpdate(id, body, files);
    return examUploadQueue.enqueue({ adminId, kind: "update", title: first.title, examId: id }, files, (staged) => runUpdate(adminId, id, first.threadId, body, staged));
  },

  /** Các lượt tải chạy nền gần đây của admin này, mới nhất trước */
  jobs: (adminId: string) => examUploadQueue.list(adminId),
  removeJobs: (adminId: string, uploadId?: string) => examUploadQueue.remove(adminId, uploadId),

  async gaps(query: ExamGapsQuery) {
    const { gap, kind, subject, q, page, limit } = query;
    const { items, total } = await examGapRepository.list(gap, { kind, subject, q }, { page, limit });
    return { items, meta: toMeta({ page, limit }, total) };
  },

  gapSummary: (filter: ExamGapFilter) => examGapRepository.summary(filter),
};
