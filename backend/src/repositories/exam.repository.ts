import { type ExamKind, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { parseSiteTime } from "../utils/html";
import type { Db } from "./wallet.repository";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";
import { classifyKind } from "../utils/exam-kind";
import { subjectCodeFromTitle } from "../utils/subject-code";

// PENDING = AI đang phân tích đáp án (đề đã dùng được, chỉ chưa chấm được)
export type AnswerSource = "PENDING" | "FAILED" | "DEFAULT" | "AI" | "MANUAL";

export interface NewExam {
  threadId: string;
  title: string;
  sourceUrl: string;
  author?: string;
  postedAt?: string;
  createdById?: string;
  answerSource: AnswerSource;
  aiReport?: string;
  kind?: ExamKind;
  description?: string | null;
  questions: {
    number: number;
    name: string;
    imagePath: string;
    sourceImage: string;
    mediaUrl?: string;
    answer: string;
  }[];
}

export const examRepository = {
  findByThreadId: (threadId: string) => prisma.exam.findUnique({ where: { threadId } }),
  /** Đề cùng tên (bỏ khoảng trắng, không phân biệt hoa thường nhờ collation của cột): "A - FA26 - FE" và "a - fa26- fe" là một */
  async findByTitle(title: string) {
    const rows = await prisma.$queryRaw<{ id: string; threadId: string }[]>`SELECT id, thread_id AS threadId FROM exams WHERE REPLACE(title, ' ', '') = ${title.replace(/\s+/g, "")} LIMIT 1`;
    return rows[0] ?? null;
  },
  findById: (id: string) => prisma.exam.findUnique({ where: { id } }),

  // Đáp án đúng của từng câu, dùng để chấm bài
  findQuestionsForGrading: (examId: string) =>
    prisma.examQuestion.findMany({ where: { examId, isReference: false }, orderBy: { number: "asc" }, select: { number: true, answer: true } }),

  // Đáp án hiện tại của một câu (để so với đáp án người dùng đề xuất)
  findQuestionAnswer: (examId: string, number: number) =>
    prisma.examQuestion.findUnique({ where: { examId_number: { examId, number } }, select: { answer: true } }),

  setQuestionAnswer: (db: Db, examId: string, number: number, answer: string) =>
    db.examQuestion.update({ where: { examId_number: { examId, number } }, data: { answer } }),

  // Đáp án và ảnh của một câu (dùng để nhờ AI giải thích)
  findQuestionForExplain: (examId: string, number: number) =>
    prisma.examQuestion.findUnique({
      where: { examId_number: { examId, number } },
      select: { number: true, name: true, answer: true, imagePath: true, exam: { select: { title: true, threadId: true, answerSource: true, subjectCode: true, kind: true, totalQuestions: true } } },
    }),

  findDetail: (id: string) =>
    prisma.exam.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { number: "asc" }, select: { number: true, imagePath: true, answer: true, isReference: true, topic: true } },
        attachments: { orderBy: { id: "asc" }, select: { id: true, name: true, filePath: true, mime: true, sizeBytes: true } },
      },
    }),

  // Admin xem/sửa đề: thông tin đề + từng câu (ảnh, đáp án, có phải tài liệu tham khảo)
  findAdminDetail: (id: string) =>
    prisma.exam.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        kind: true,
        subjectCode: true,
        threadId: true,
        sourceUrl: true,
        totalQuestions: true,
        answerSource: true,
        aiReport: true,
        createdAt: true,
        questions: { orderBy: { number: "asc" }, select: { number: true, name: true, imagePath: true, mediaUrl: true, answer: true, isReference: true } },
      },
    }),

  // Admin tải đề .zip: chỉ ảnh + đáp án từng câu
  findForExport: (id: string) =>
    prisma.exam.findUnique({
      where: { id },
      select: { threadId: true, subjectCode: true, answerSource: true, questions: { orderBy: { number: "asc" }, select: { number: true, imagePath: true, answer: true } } },
    }),

  // Dữ liệu để nhờ AI giải lại: tên + đường dẫn ảnh từng câu
  findForSolve: (id: string) =>
    prisma.exam.findUnique({
      where: { id },
      include: { questions: { orderBy: { number: "asc" }, select: { number: true, name: true, imagePath: true, mediaUrl: true } } },
    }),

  // Trạng thái đáp án và đáp án từng câu, để giao diện hỏi lại khi AI đang phân tích
  findAnswers: (id: string) =>
    prisma.exam.findUnique({
      where: { id },
      select: { answerSource: true, aiReport: true, questions: { orderBy: { number: "asc" }, select: { number: true, answer: true, isReference: true, topic: true } } },
    }),

  // Đề đang dùng đáp án tạm mà AI chưa từng chạy: chuyển sang chờ AI (xóa đáp án A giả)
  markPending: (examId: string) =>
    prisma.$transaction([
      prisma.examQuestion.updateMany({ where: { examId }, data: { answer: "" } }),
      prisma.exam.update({ where: { id: examId }, data: { answerSource: "PENDING" } }),
    ]),

  findAnswerSource: (id: string) => prisma.exam.findUnique({ where: { id }, select: { answerSource: true, kind: true, totalQuestions: true, threadId: true } }),

  // Đề còn đang chờ AI (ví dụ server tắt giữa chừng): xếp lại hàng khi khởi động
  // (bỏ đề đang lấy dở: chưa đủ câu thì chưa thể giải)
  findPendingIds: async () => {
    const exams = await prisma.exam.findMany({
      where: { answerSource: "PENDING" },
      select: { id: true, totalQuestions: true, _count: { select: { questions: true } } },
    });
    return exams.filter((e) => e._count.questions >= e.totalQuestions).map((e) => e.id);
  },

  findByThreadIdOfId: (id: string) => prisma.exam.findUnique({ where: { id }, select: { id: true, subjectCode: true } }),

  update: (id: string, data: { title?: string; kind?: ExamKind; subjectCode?: string | null }) =>
    prisma.exam.update({ where: { id }, data, select: { id: true } }),

  findReport: (id: string) =>
    prisma.exam.findUnique({ where: { id }, select: { id: true, title: true, threadId: true, answerSource: true, aiReport: true } }),

  async listAll(query: PaginationQuery & { q?: string; kind?: ExamKind; source?: string }) {
    const { q, kind, source } = query;
    const where: Prisma.ExamWhereInput = {
      answerSource: source,
      // Đề cũ chưa phân loại (kind null) tính là FE, cùng quy tắc với danh mục
      ...(kind && (kind === "FE" ? { OR: [{ kind: "FE" }, { kind: null }] } : { kind })),
      ...(q && { AND: [{ OR: [{ title: { contains: q } }, { threadId: { contains: q } }, { subjectCode: { contains: q } }] }] }),
    };
    const [items, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        select: { id: true, title: true, threadId: true, sourceUrl: true, totalQuestions: true, answerSource: true, createdAt: true, kind: true, subjectCode: true },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.exam.count({ where }),
    ]);
    // Số câu cần chấm (không tính tài liệu tham khảo) và số câu đã có đáp án, theo từng đề của trang này: admin thấy ngay đề nào thiếu
    const ids = items.map((e) => e.id);
    const [graded, blank] = await Promise.all([
      prisma.examQuestion.groupBy({ by: ["examId"], where: { examId: { in: ids }, isReference: false }, _count: { _all: true } }),
      prisma.examQuestion.groupBy({ by: ["examId"], where: { examId: { in: ids }, isReference: false, answer: "" }, _count: { _all: true } }),
    ]);
    const gradedOf = new Map(graded.map((g) => [g.examId, g._count._all]));
    const blankOf = new Map(blank.map((b) => [b.examId, b._count._all]));
    return {
      items: items.map((e) => {
        const gradedQuestions = gradedOf.get(e.id) ?? 0;
        return { ...e, gradedQuestions, answeredQuestions: gradedQuestions - (blankOf.get(e.id) ?? 0) };
      }),
      total,
    };
  },

  // Đề tạo trước khi có câu hỏi, `totalQuestions` là tổng số ảnh sẽ có.
  // Đề chỉ coi là đủ khi số câu đã lưu bằng totalQuestions (isComplete).
  createShell: (data: Omit<NewExam, "questions"> & { totalQuestions: number }) =>
    prisma.exam.create({
      data: {
        threadId: data.threadId,
        title: data.title,
        subjectCode: subjectCodeFromTitle(data.title),
        sourceUrl: data.sourceUrl,
        author: data.author,
        postedAt: parseSiteTime(data.postedAt),
        totalQuestions: data.totalQuestions,
        createdById: data.createdById,
        answerSource: data.answerSource,
        aiReport: data.aiReport,
        kind: data.kind,
        description: data.description,
      },
    }),

  // Điền mã môn cho các đề cũ chưa có (chạy lúc khởi động, an toàn khi chạy lại). Đề không có mã trong tên vẫn để null.
  async backfillSubjectCodes() {
    const rows = await prisma.exam.findMany({ where: { subjectCode: null }, select: { id: true, title: true } });
    const byCode = new Map<string, string[]>();
    for (const r of rows) {
      const code = subjectCodeFromTitle(r.title);
      if (code) (byCode.get(code) ?? byCode.set(code, []).get(code)!).push(r.id);
    }
    for (const [code, ids] of byCode) await prisma.exam.updateMany({ where: { id: { in: ids } }, data: { subjectCode: code } });
    return [...byCode.values()].reduce((n, ids) => n + ids.length, 0);
  },

  // Loại đề cho các đề cũ chưa có (chạy lúc khởi động, an toàn khi chạy lại). Đề cũ đều được lấy qua nhãn "Đề Thi FE",
  // nên tên đề không nói rõ PE/Quiz thì là FE.
  async backfillKinds() {
    const rows = await prisma.exam.findMany({ where: { kind: null }, select: { id: true, title: true } });
    const byKind = new Map<ExamKind, string[]>();
    for (const r of rows) {
      const found = classifyKind(null, r.title);
      const kind = found === "OTHER" ? "FE" : found;
      (byKind.get(kind) ?? byKind.set(kind, []).get(kind)!).push(r.id);
    }
    for (const [kind, ids] of byKind) await prisma.exam.updateMany({ where: { id: { in: ids } }, data: { kind } });
    return rows.length;
  },

  countQuestions: (examId: string) => prisma.examQuestion.count({ where: { examId } }),

  // Đề chỉ có tệp (0 câu) coi là xong khi đã ghi tệp đính kèm (ghi một lần ở cuối lượt lấy đề)
  isComplete: async (exam: { id: string; totalQuestions: number }) =>
    (await prisma.examQuestion.count({ where: { examId: exam.id } })) >= exam.totalQuestions &&
    (exam.totalQuestions > 0 || (await prisma.examAttachment.count({ where: { examId: exam.id } })) > 0),

  // Xóa đề (câu hỏi, kho của người dùng... xóa theo). Dùng khi lấy đề thất bại giữa chừng.
  deleteById: (id: string) => prisma.exam.deleteMany({ where: { id } }),

  // Các câu đã có ảnh + tổng số câu, để giao diện hiện dần khi đề đang được lấy về
  findLoadedQuestions: (id: string) =>
    prisma.exam.findUnique({
      where: { id },
      select: { totalQuestions: true, questions: { orderBy: { number: "asc" }, select: { number: true, imagePath: true, answer: true } } },
    }),

  // Đề + câu hỏi được ghi trong một transaction: hoặc đủ, hoặc không có gì.
  create: (data: NewExam) =>
    prisma.$transaction(
      async (tx) => {
        const exam = await tx.exam.create({
          data: {
            threadId: data.threadId,
            title: data.title,
            subjectCode: subjectCodeFromTitle(data.title),
            sourceUrl: data.sourceUrl,
            author: data.author,
            postedAt: parseSiteTime(data.postedAt),
            totalQuestions: data.questions.length,
            createdById: data.createdById,
            answerSource: data.answerSource,
            aiReport: data.aiReport,
          },
        });
        await tx.examQuestion.createMany({ data: data.questions.map((q) => ({ ...q, examId: exam.id })) });
        return exam;
      },
      { timeout: 60_000 },
    ),

  // Admin tải đề bằng tay: đề + các câu hiện có (số câu, ảnh) để xếp số câu và xoá ảnh cũ sau khi thay
  findUploadTarget: (db: Db, id: string) =>
    db.exam.findUnique({
      where: { id },
      select: { id: true, threadId: true, title: true, totalQuestions: true, answerSource: true, questions: { orderBy: { number: "asc" }, select: { number: true, imagePath: true } } },
    }),

  createUploaded: (db: Db, data: { threadId: string; title: string; subjectCode: string; sourceUrl: string; postedAt: Date | null; kind: ExamKind; totalQuestions: number; answerSource: AnswerSource; createdById: string }) =>
    db.exam.create({ data, select: { id: true } }),

  setUploadedInfo: (db: Db, id: string, data: { title?: string; subjectCode?: string; kind?: ExamKind; postedAt?: Date | null; totalQuestions: number; answerSource: AnswerSource; aiReport?: null }) =>
    db.exam.update({ where: { id }, data, select: { id: true } }),

  /**
   * Ghi ảnh tải tay theo số câu (một câu INSERT ... ON DUPLICATE KEY): câu mới được tạo, câu đã có chỉ đổi ảnh (giữ tên, đáp án, chủ đề).
   * Câu bị thay ảnh: bỏ dấu vân tay ảnh, embedding và lời giải AI (viết cho ảnh cũ). Đáp án trong `answers` ghi đè đáp án cũ.
   */
  async saveUploadedQuestions(db: Db, examId: string, rows: { number: number; name: string; imagePath: string }[], replaced: number[], answers: [number, string][]) {
    const values = rows.map((q) => Prisma.sql`(${examId}, ${q.number}, ${q.name}, ${q.imagePath}, '', '')`);
    await db.$executeRaw`
      INSERT INTO exam_questions (exam_id, number, name, image_path, source_image, answer)
      VALUES ${Prisma.join(values)} AS new
      ON DUPLICATE KEY UPDATE image_path = new.image_path, source_image = new.source_image, image_hash = NULL`;
    if (answers.length) {
      const cases = answers.map(([n, a]) => Prisma.sql`WHEN ${n} THEN ${a}`);
      await db.$executeRaw`UPDATE exam_questions SET answer = CASE number ${Prisma.join(cases, " ")} END WHERE exam_id = ${examId} AND number IN (${Prisma.join(answers.map(([n]) => n))})`;
    }
    const stale = [...new Set([...replaced, ...answers.map(([n]) => n)])];
    if (stale.length) await db.questionExplanation.deleteMany({ where: { examId, questionNumber: { in: stale } } });
    if (replaced.length) await db.questionEmbedding.deleteMany({ where: { question: { examId, number: { in: replaced } } } });
  },

  // Đề dở dang được điền bằng tay với đủ 1..N: bỏ các câu thừa của lượt lấy đề cũ
  dropQuestionsAfter: (db: Db, examId: string, total: number) => db.examQuestion.deleteMany({ where: { examId, number: { gt: total } } }),

  // Cập nhật đáp án cả đề (sau khi AI giải lại): chạy trong một transaction
  // `references`: số câu mà AI cho là tài liệu tham khảo (trang công thức...). Mỗi lần giải đặt lại cờ cho cả đề.
  updateAnswers: (examId: string, answers: string[], source: AnswerSource, report: string | null, references: number[] = []) =>
    prisma.$transaction(async (tx) => {
      if (answers.length) {
        // Một câu UPDATE ... CASE cho cả đề thay vì mỗi câu một lượt ghi (giữ khoá ngắn hơn)
        const cases = answers.map((a, i) => Prisma.sql`WHEN ${i + 1} THEN ${a}`);
        await tx.$executeRaw`UPDATE exam_questions SET answer = CASE number ${Prisma.join(cases, " ")} END WHERE exam_id = ${examId} AND number <= ${answers.length}`;
      }
      await tx.examQuestion.updateMany({ where: { examId, number: { notIn: references } }, data: { isReference: false } });
      if (references.length) await tx.examQuestion.updateMany({ where: { examId, number: { in: references } }, data: { isReference: true } });
      await tx.exam.update({ where: { id: examId }, data: { answerSource: source, aiReport: report } });
      await tx.questionExplanation.deleteMany({ where: { examId } }); // đáp án đổi thì lời giải thích cũ không còn đúng
    }),
};

// Hai lượt nhập cùng một thread chạy gần nhau: lượt đến sau chạm unique `thread_id`
export const isDuplicateThread = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
