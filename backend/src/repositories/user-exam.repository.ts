import { prisma } from "../configs/prisma";
import type { Owner } from "../utils/actor";
import { newestFirst, toSkipTake, type PaginationQuery } from "../utils/pagination";
import type { Db } from "./wallet.repository";

const whereOf = (owner: Owner) => ("userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId });

export const userExamRepository = {
  // Đã có thì bỏ qua, nhập lại cùng đề không lỗi
  add: (owner: Owner, examId: number, db: Db = prisma) =>
    db.userExam.createMany({ data: [{ ...whereOf(owner), examId }], skipDuplicates: true }),

  has: async (owner: Owner, examId: number) => !!(await prisma.userExam.findFirst({ where: { ...whereOf(owner), examId }, select: { id: true } })),

  async list(owner: Owner, query: PaginationQuery & { subject?: string }) {
    const where = { ...whereOf(owner), ...(query.subject && { exam: { subjectCode: query.subject.toUpperCase() } }) };
    const [items, total] = await Promise.all([
      prisma.userExam.findMany({
        where,
        select: { createdAt: true, exam: { select: { id: true, title: true, threadId: true, totalQuestions: true, answerSource: true } } },
        orderBy: [...newestFirst(true)],
        ...toSkipTake(query),
      }),
      prisma.userExam.count({ where }),
    ]);
    return { items, total };
  },

  // Chuyển toàn bộ đề của khách sang tài khoản (đã có thì bỏ qua) rồi xoá bản của khách, trong một transaction.
  // Các lượt lấy đề đang chờ/đang chạy cũng được chuyển sang tài khoản: job xong sau đó sẽ đưa đề vào kho của tài khoản
  // (không thì đề rơi vào kho của khách và người dùng không thấy). Lượt đã xong giữ nguyên để còn đếm giới hạn ngày của khách.
  claimGuest: (userId: number, guestId: string) =>
    prisma.$transaction(async (tx) => {
      const rows = await tx.userExam.findMany({ where: { guestId }, select: { examId: true } });
      if (rows.length > 0) {
        await tx.userExam.createMany({ data: rows.map((r) => ({ userId, examId: r.examId })), skipDuplicates: true });
        await tx.userExam.deleteMany({ where: { guestId } });
      }
      const jobs = await tx.crawlJob.updateMany({
        where: { guestId, userId: null, status: { in: ["QUEUED", "RUNNING"] } },
        data: { userId, guestId: null },
      });
      // Các lượt làm dở của khách cũng về tài khoản, để đăng nhập xong vẫn làm tiếp được
      await tx.practiceSession.updateMany({ where: { guestId, userId: null }, data: { userId, guestId: null } });
      return { exams: rows.length, jobs: jobs.count };
    }),
};
