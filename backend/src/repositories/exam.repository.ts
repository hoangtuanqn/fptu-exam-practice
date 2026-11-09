import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { parseSiteTime } from "../utils/html";
import type { Db } from "./wallet.repository";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";
import { subjectCodeFromTitle } from "../utils/subject-code";

// PENDING = AI đang phân tích đáp án (đề đã dùng được, chỉ chưa chấm được)
export type AnswerSource = "PENDING" | "FAILED" | "DEFAULT" | "AI" | "MANUAL";

export interface NewExam {
  threadId: string;
  title: string;
  sourceUrl: string;
  author?: string;
  postedAt?: string;
  createdById?: number;
  answerSource: AnswerSource;
  aiReport?: string;
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

  // Đáp án đúng của từng câu, dùng để chấm bài
  findQuestionsForGrading: (examId: number) =>
    prisma.examQuestion.findMany({ where: { examId, isReference: false }, orderBy: { number: "asc" }, select: { number: true, answer: true } }),

  // Đáp án hiện tại của một câu (để so với đáp án người dùng đề xuất)
  findQuestionAnswer: (examId: number, number: number) =>
    prisma.examQuestion.findUnique({ where: { examId_number: { examId, number } }, select: { answer: true } }),

  setQuestionAnswer: (db: Db, examId: number, number: number, answer: string) =>
    db.examQuestion.update({ where: { examId_number: { examId, number } }, data: { answer } }),

  // Đáp án và ảnh của một câu (dùng để nhờ AI giải thích)
  findQuestionForExplain: (examId: number, number: number) =>
    prisma.examQuestion.findUnique({
      where: { examId_number: { examId, number } },
      select: { number: true, name: true, answer: true, imagePath: true, exam: { select: { title: true, threadId: true, answerSource: true } } },
    }),

  findDetail: (id: number) =>
    prisma.exam.findUnique({
      where: { id },
      include: { questions: { orderBy: { number: "asc" }, select: { number: true, imagePath: true, answer: true, isReference: true, topic: true } } },
    }),

  // Admin xem/sửa đề: thông tin đề + từng câu (ảnh, đáp án, có phải tài liệu tham khảo)
  findAdminDetail: (id: number) =>
    prisma.exam.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        threadId: true,
        sourceUrl: true,
        totalQuestions: true,
        answerSource: true,
        aiReport: true,
        createdAt: true,
        questions: { orderBy: { number: "asc" }, select: { number: true, name: true, imagePath: true, mediaUrl: true, answer: true, isReference: true } },
      },
    }),

  // Dữ liệu để nhờ AI giải lại: tên + đường dẫn ảnh từng câu
  findForSolve: (id: number) =>
    prisma.exam.findUnique({
      where: { id },
      include: { questions: { orderBy: { number: "asc" }, select: { number: true, name: true, imagePath: true } } },
    }),

  // Trạng thái đáp án và đáp án từng câu, để giao diện hỏi lại khi AI đang phân tích
  findAnswers: (id: number) =>
    prisma.exam.findUnique({
      where: { id },
      select: { answerSource: true, aiReport: true, questions: { orderBy: { number: "asc" }, select: { number: true, answer: true, isReference: true, topic: true } } },
    }),

  // Đề đang dùng đáp án tạm mà AI chưa từng chạy: chuyển sang chờ AI (xóa đáp án A giả)
  markPending: (examId: number) =>
    prisma.$transaction([
      prisma.examQuestion.updateMany({ where: { examId }, data: { answer: "" } }),
      prisma.exam.update({ where: { id: examId }, data: { answerSource: "PENDING" } }),
    ]),

  findAnswerSource: (id: number) => prisma.exam.findUnique({ where: { id }, select: { answerSource: true } }),

  // Đề còn đang chờ AI (ví dụ server tắt giữa chừng): xếp lại hàng khi khởi động
  // (bỏ đề đang lấy dở: chưa đủ câu thì chưa thể giải)
  findPendingIds: async () => {
    const exams = await prisma.exam.findMany({
      where: { answerSource: "PENDING" },
      select: { id: true, totalQuestions: true, _count: { select: { questions: true } } },
    });
    return exams.filter((e) => e._count.questions >= e.totalQuestions).map((e) => e.id);
  },

  findByThreadIdOfId: (id: number) => prisma.exam.findUnique({ where: { id }, select: { id: true } }),

  findReport: (id: number) =>
    prisma.exam.findUnique({ where: { id }, select: { id: true, title: true, threadId: true, answerSource: true, aiReport: true } }),

  async listAll(query: PaginationQuery) {
    const [items, total] = await Promise.all([
      prisma.exam.findMany({
        select: { id: true, title: true, threadId: true, totalQuestions: true, answerSource: true, createdAt: true },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.exam.count(),
    ]);
    // Số câu cần chấm mà chưa có đáp án, theo từng đề của trang này (để admin thấy ngay đề nào đang thiếu)
    const blanks = await prisma.examQuestion.groupBy({
      by: ["examId"],
      where: { examId: { in: items.map((e) => e.id) }, isReference: false, answer: "" },
      _count: { _all: true },
    });
    const blankOf = new Map(blanks.map((b) => [b.examId, b._count._all]));
    return { items: items.map((e) => ({ ...e, blankAnswers: blankOf.get(e.id) ?? 0 })), total };
  },

  // Đề được tạo TRƯỚC khi có ảnh: câu hỏi thêm dần qua addQuestions, `totalQuestions` là tổng số ảnh sẽ có.
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
      },
    }),

  addQuestions: (examId: number, questions: NewExam["questions"]) =>
    prisma.examQuestion.createMany({ data: questions.map((q) => ({ ...q, examId })), skipDuplicates: true }),

  // Làm mới đề: ghi đè từng câu theo số câu (giữ nguyên id đề và đáp án cũ cho tới khi giải xong lại)
  // Một câu INSERT ... ON DUPLICATE KEY cho cả đề (thay vì mỗi câu một lượt upsert): câu đã có chỉ đổi ảnh/tên, giữ đáp án cũ
  async upsertQuestions(examId: number, questions: NewExam["questions"]) {
    if (questions.length === 0) return;
    const rows = questions.map((q) => Prisma.sql`(${examId}, ${q.number}, ${q.name}, ${q.imagePath}, ${q.sourceImage}, ${q.mediaUrl ?? null}, ${q.answer})`);
    await prisma.$executeRaw`
      INSERT INTO exam_questions (exam_id, number, name, image_path, source_image, media_url, answer)
      VALUES ${Prisma.join(rows)} AS new
      ON DUPLICATE KEY UPDATE name = new.name, image_path = new.image_path, source_image = new.source_image, media_url = COALESCE(new.media_url, exam_questions.media_url)`;
  },

  // Làm mới xong phần lấy dữ liệu: cập nhật thông tin đề, bỏ các câu thừa (thread bớt ảnh) và lời giải thích cũ
  finishRefresh: (examId: number, data: { title: string; sourceUrl: string; author?: string; postedAt?: string; total: number }) =>
    prisma.$transaction([
      prisma.exam.update({
        where: { id: examId },
        data: {
          title: data.title,
          subjectCode: subjectCodeFromTitle(data.title),
          sourceUrl: data.sourceUrl,
          author: data.author,
          postedAt: parseSiteTime(data.postedAt),
          totalQuestions: data.total,
          refreshedAt: new Date(),
        },
      }),
      prisma.examQuestion.deleteMany({ where: { examId, number: { gt: data.total } } }),
      prisma.questionExplanation.deleteMany({ where: { examId } }),
    ]),

  // Điền mã môn cho các đề cũ chưa có (chạy lúc khởi động, an toàn khi chạy lại). Đề không có mã trong tên vẫn để null.
  async backfillSubjectCodes() {
    const rows = await prisma.exam.findMany({ where: { subjectCode: null }, select: { id: true, title: true } });
    const byCode = new Map<string, number[]>();
    for (const r of rows) {
      const code = subjectCodeFromTitle(r.title);
      if (code) (byCode.get(code) ?? byCode.set(code, []).get(code)!).push(r.id);
    }
    for (const [code, ids] of byCode) await prisma.exam.updateMany({ where: { id: { in: ids } }, data: { subjectCode: code } });
    return [...byCode.values()].reduce((n, ids) => n + ids.length, 0);
  },

  countQuestions: (examId: number) => prisma.examQuestion.count({ where: { examId } }),

  isComplete: async (exam: { id: number; totalQuestions: number }) =>
    (await prisma.examQuestion.count({ where: { examId: exam.id } })) >= exam.totalQuestions,

  // Xóa đề (câu hỏi, kho của người dùng... xóa theo). Dùng khi lấy đề thất bại giữa chừng.
  deleteById: (id: number) => prisma.exam.deleteMany({ where: { id } }),

  // Các câu đã có ảnh + tổng số câu, để giao diện hiện dần khi đề đang được lấy về
  findLoadedQuestions: (id: number) =>
    prisma.exam.findUnique({
      where: { id },
      select: { totalQuestions: true, questions: { orderBy: { number: "asc" }, select: { number: true, imagePath: true, answer: true } } },
    }),

  // Đề + câu hỏi được ghi trong một transaction: hoặc đủ, hoặc không có gì. (Bình luận lưu ở file comments.txt, không lưu DB)
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

  // Cập nhật đáp án cả đề (sau khi AI giải lại): chạy trong một transaction
  // `references`: số câu mà AI cho là tài liệu tham khảo (trang công thức...). Mỗi lần giải đặt lại cờ cho cả đề.
  updateAnswers: (examId: number, answers: string[], source: AnswerSource, report: string | null, references: number[] = []) =>
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
