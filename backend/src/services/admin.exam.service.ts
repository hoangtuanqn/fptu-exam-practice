import fs from "node:fs/promises";
import path from "node:path";
import { storageDir } from "../configs/env";
import { EXAM_STORAGE_DIR } from "../constants/crawler";
import { prisma } from "../configs/prisma";
import { realtimeHub } from "../realtime/hub";
import type { ListAdminExamsQuery, UpdateExamBody, UpdateExamQuestionsBody } from "../rules/requests/admin.request";
import { subjectRepository } from "../repositories/subject.repository";
import { invalidateCatalogCache } from "./catalog.service";
import { fileUrlOf } from "../utils/file-url";
import { examRepository } from "../repositories/exam.repository";
import { AppError } from "../rules/error";
import { toMeta } from "../utils/pagination";
import { aiSettingService } from "./ai-setting.service";
import { aiReady } from "../constants/ai";
import { solveExam } from "./ai/exam-solver.service";
import { examSolveService } from "./exam-solve.service";
import { subjectCodeFromTitle } from "../utils/subject-code";
import { buildExamZip, ExamZipTooLarge, withTrustedAnswers } from "../utils/exam-zip";
import { AI_NOT_SOLVABLE_MESSAGE, EXAM_ZIP_MAX_BYTES, EXAM_ZIP_MAX_QUESTIONS, isAiSolvable } from "../constants/exam";
import { HTTP_STATUS } from "../constants/httpStatus";

export const adminExamService = {
  async list(query: ListAdminExamsQuery) {
    const { items, total } = await examRepository.listAll(query);
    return {
      items: items.map((e) => ({
        ...e,
        solving: examSolveService.isBusy(e.id) || e.answerSource === "PENDING",
        solveError: examSolveService.lastError(e.id),
      })),
      meta: toMeta(query, total),
    };
  },

  // Bắt đầu nhờ AI giải lại và trả về ngay (việc này có thể mất vài phút); admin theo dõi ở danh sách
  async solve(id: string) {
    const ai = await aiSettingService.get();
    if (!aiReady(ai)) throw new AppError("Chưa bật AI hoặc chưa có khóa API ở Quản trị → AI giải đáp án");
    if (!(await examRepository.findByThreadIdOfId(id))) throw AppError.notFound("Không tìm thấy đề");
    if ((await examRepository.countQuestions(id)) === 0) throw new AppError("Đề này không có câu hỏi để AI giải");
    const meta = await examRepository.findAnswerSource(id);
    if (!meta || !isAiSolvable(meta)) throw new AppError(AI_NOT_SOLVABLE_MESSAGE);
    if (!examSolveService.enqueue(id)) throw AppError.conflict("Đề này đang được AI giải");
  },

  /**
   * AI giải lại MỘT câu để admin đối chiếu, không dùng bình luận. Dùng đúng bộ prompt giải đề
   * (base + module môn, đã cache) nên chất lượng như khi giải cả đề, nhưng chỉ gửi ảnh của đúng câu này nên rẻ hơn nhiều.
   * Không ghi đáp án vào DB: trả gợi ý để admin duyệt rồi lưu. commentsRefreshed/commentsCount/commentsNote giữ cho giao diện cũ.
   */
  async resolveQuestion(id: string, number: number) {
    const ai = await aiSettingService.get();
    if (!aiReady(ai)) throw new AppError("Chưa bật AI hoặc chưa có khóa API ở Quản trị → AI giải đáp án");
    const exam = await examRepository.findForSolve(id);
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    if (!isAiSolvable(exam)) throw new AppError(AI_NOT_SOLVABLE_MESSAGE);
    const q = exam.questions.find((x) => x.number === number);
    if (!q) throw AppError.notFound("Không tìm thấy câu này");
    if (exam.answerSource === "PENDING" || examSolveService.isBusy(id)) throw AppError.conflict("AI đang giải cả đề này, chờ xong rồi giải lại từng câu");

    try {
      const r = await solveExam(ai, {
        title: exam.title,
        questions: [{ number: q.number, name: q.name, file: path.join(storageDir, q.imagePath) }],
      });
      return { number, answer: r.answers[0] ?? "", notQuestion: r.notQuestions.includes(number), report: r.report, commentsRefreshed: false, commentsCount: null, commentsNote: null };
    } catch (err) {
      throw new AppError(`AI chưa giải được câu này: ${(err as Error).message}`);
    }
  },

  async report(id: string) {
    const exam = await examRepository.findReport(id);
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    return exam;
  },

  // Xem toàn bộ đề: ảnh từng câu và đáp án hiện tại
  async detail(id: string) {
    const exam = await examRepository.findAdminDetail(id);
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    const { questions, ...info } = exam;
    const [userExams, attempts, unlocks, purchases] = await Promise.all([
      prisma.userExam.count({ where: { examId: id } }),
      prisma.examAttempt.count({ where: { examId: id } }),
      prisma.explanationUnlock.count({ where: { examId: id } }),
      prisma.explanationPurchase.count({ where: { examId: id } }),
    ]);
    return {
      ...info,
      usage: { userExams, attempts, unlocks, purchases }, // mức độ đang được dùng: để cân nhắc trước khi xoá
      solving: examSolveService.isBusy(id) || exam.answerSource === "PENDING",
      questions: questions.map(({ imagePath, ...q }) => ({ ...q, imageUrl: fileUrlOf(imagePath) })),
    };
  },

  // Tải đề dạng .zip: images/NN.ext + dap-an/dap-an.txt. Ảnh thiếu thì bỏ qua, không làm hỏng cả file
  async download(adminId: string, id: string) {
    const exam = await examRepository.findForExport(id);
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    const tooLarge = new AppError("Đề quá lớn để tải về", HTTP_STATUS.PAYLOAD_TOO_LARGE);
    if (exam.questions.length > EXAM_ZIP_MAX_QUESTIONS) throw tooLarge;
    const built = await buildExamZip(withTrustedAnswers(exam.questions, exam.answerSource), { root: storageDir, readFile: (p) => fs.readFile(p), maxBytes: EXAM_ZIP_MAX_BYTES }).catch((e) => {
      throw e instanceof ExamZipTooLarge ? tooLarge : e;
    });
    for (const n of built.skipped) console.warn(`[admin] tải đề #${id}: bỏ qua ảnh câu ${n} (không đọc được)`);
    console.log(`[admin] #${adminId} tải đề #${id}`);
    const name = `${exam.subjectCode ?? "de"}_${exam.threadId}`.replace(/[^A-Za-z0-9_-]/g, "") || `de_${id}`;
    // shortcut: zip dựng trong bộ nhớ (trần 100 MB), chuyển sang fflate Zip streaming khi đề lớn hơn nhiều
    return { zip: Buffer.from(built.zip.buffer, built.zip.byteOffset, built.zip.byteLength), filename: `${name}.zip` };
  },

  /**
   * Sửa đáp án / đánh dấu tài liệu tham khảo cho nhiều câu cùng lúc (một transaction).
   * Câu nào đổi đáp án thì xoá lời giải AI cũ của câu đó (đã viết theo đáp án cũ).
   * Đề chuyển sang nguồn "Chỉnh tay" để không bị AI ghi đè nhầm khi chưa chủ ý.
   */
  async saveQuestions(adminId: string, id: string, { changes }: UpdateExamQuestionsBody) {
    if (examSolveService.isBusy(id)) throw AppError.conflict("AI đang giải đề này, hãy chờ AI xong rồi sửa");
    const exam = await examRepository.findAdminDetail(id);
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    const byNumber = new Map(exam.questions.map((q) => [q.number, q]));
    const unknown = changes.find((c) => !byNumber.has(c.number));
    if (unknown) throw new AppError(`Đề không có câu ${unknown.number}`);

    const answerChanged: number[] = [];
    await prisma.$transaction(async (tx) => {
      for (const c of changes) {
        const old = byNumber.get(c.number)!;
        const data: { answer?: string; isReference?: boolean } = {};
        if (c.answer !== undefined && c.answer !== old.answer) {
          data.answer = c.answer;
          answerChanged.push(c.number);
        }
        if (c.isReference !== undefined && c.isReference !== old.isReference) data.isReference = c.isReference;
        if (Object.keys(data).length) await tx.examQuestion.update({ where: { examId_number: { examId: id, number: c.number } }, data });
      }
      if (answerChanged.length) await tx.questionExplanation.deleteMany({ where: { examId: id, questionNumber: { in: answerChanged } } });
      if (exam.answerSource !== "MANUAL") await tx.exam.update({ where: { id }, data: { answerSource: "MANUAL" } });
    });
    console.log(`[admin] #${adminId} sửa đề #${id}: ${answerChanged.length} đáp án, ${changes.length} câu gửi lên`);
    void realtimeHub.publishExam(id); // người đang mở đề thấy ngay
    return this.detail(id);
  },

  // Sửa tên/loại/môn của đề. Chỉ gửi tên (giao diện cũ) thì môn vẫn suy từ tên như trước
  async update(adminId: string, id: string, { title, kind, subjectCode }: UpdateExamBody) {
    const exam = await examRepository.findByThreadIdOfId(id);
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    // subjectCode không có FK: mã cũ của đề có thể không nằm trong bảng môn, giữ nguyên thì không chặn
    const changed = subjectCode && subjectCode !== exam.subjectCode?.toUpperCase();
    if (changed && !(await subjectRepository.findByCode(subjectCode))) {
      throw new AppError("Không tìm thấy môn học này", HTTP_STATUS.BAD_REQUEST, { subjectCode: "Môn học không tồn tại" });
    }
    const code = subjectCode !== undefined ? subjectCode : title !== undefined ? subjectCodeFromTitle(title) : undefined;
    await examRepository.update(id, { title, kind, subjectCode: code });
    console.log(`[admin] #${adminId} sửa đề #${id}: ${[title !== undefined && "tên", kind && `loại ${kind}`, code !== undefined && `môn ${code ?? "(bỏ)"}`].filter(Boolean).join(", ")}`);
    invalidateCatalogCache(); // Kho đề hiện ngay tên/loại/môn mới
    return this.detail(id);
  },

  /**
   * Xoá hẳn một đề: câu hỏi, kho của người dùng, bài làm, lời giải thích đã mua đều bị xoá theo (khoá ngoại CASCADE).
   * Lượt lấy đề cũ giữ lại nhưng không còn gắn với đề. Xoá luôn thư mục ảnh; thread đó có thể được lấy lại từ đầu.
   */
  async remove(adminId: string, id: string) {
    if (examSolveService.isBusy(id)) throw AppError.conflict("AI đang giải đề này, hãy chờ AI xong rồi xoá");
    const exam = await prisma.exam.findUnique({ where: { id }, select: { threadId: true } });
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    await examRepository.deleteById(id);
    await fs.rm(path.join(storageDir, EXAM_STORAGE_DIR, exam.threadId), { recursive: true, force: true }).catch(() => undefined);
    console.log(`[admin] #${adminId} xoá đề #${id} (thread ${exam.threadId})`);
  },
};
