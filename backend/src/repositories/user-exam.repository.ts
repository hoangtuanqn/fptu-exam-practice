import { prisma } from "../configs/prisma";
import type { Owner } from "../utils/actor";
import { newestFirst, toSkipTake, type PaginationQuery } from "../utils/pagination";
import type { Db } from "./wallet.repository";

const whereOf = (owner: Owner) => ("userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId });

// Đề còn thuộc về chủ kho: đề mua/nhập là vĩnh viễn, đề mở nhờ Pro (viaPro) chỉ còn khi Pro còn hạn
export const ownedWhere = (owner: Owner) => ({
  ...whereOf(owner),
  ...("userId" in owner && { OR: [{ viaPro: false }, { user: { proExpiresAt: { gt: new Date() } } }] }),
});

export const userExamRepository = {
  // Đã có thì bỏ qua, nhập lại cùng đề không lỗi. viaPro: mở miễn phí nhờ Pro; mua/nhập (mặc định) giữ vĩnh viễn và nâng cấp bản Pro cũ lên vĩnh viễn
  async add(owner: Owner, examId: string, db: Db = prisma, viaPro = false) {
    await db.userExam.createMany({ data: [{ ...whereOf(owner), examId, viaPro }], skipDuplicates: true });
    if (!viaPro) await db.userExam.updateMany({ where: { ...whereOf(owner), examId, viaPro: true }, data: { viaPro: false } });
  },

  // Đề (theo threadId) có trong kho của chủ này không: một truy vấn, không cần tra id đề trước
  hasThread: async (owner: Owner, threadId: string) => !!(await prisma.userExam.findFirst({ where: { ...ownedWhere(owner), exam: { threadId } }, select: { id: true } })),

  // Lần mở đầu tiên thôi; đã có mốc thì không ghi lại
  markOpened: (owner: Owner, examId: string) => prisma.userExam.updateMany({ where: { ...whereOf(owner), examId, openedAt: null }, data: { openedAt: new Date() } }),

  has: async (owner: Owner, examId: string) => !!(await prisma.userExam.findFirst({ where: { ...ownedWhere(owner), examId }, select: { id: true } })),

  async list(owner: Owner, query: PaginationQuery & { subject?: string }) {
    const where = { ...ownedWhere(owner), ...(query.subject && { exam: { subjectCode: query.subject.toUpperCase() } }) };
    const [items, total] = await Promise.all([
      prisma.userExam.findMany({
        where,
        select: { createdAt: true, exam: { select: { id: true, title: true, totalQuestions: true, answerSource: true, kind: true, _count: { select: { attachments: true } } } } },
        orderBy: [...newestFirst(true)],
        ...toSkipTake(query),
      }),
      prisma.userExam.count({ where }),
    ]);
    return { items, total };
  },

  // Chuyển toàn bộ đề của khách sang tài khoản (đã có thì bỏ qua) rồi xoá bản của khách, trong một transaction.
  // Lượt lấy đề của khách giữ nguyên để còn đếm giới hạn ngày của khách.
  claimGuest: (userId: string, guestId: string) =>
    prisma.$transaction(async (tx) => {
      const rows = await tx.userExam.findMany({ where: { guestId }, select: { examId: true } });
      if (rows.length > 0) {
        await tx.userExam.createMany({ data: rows.map((r) => ({ userId, examId: r.examId })), skipDuplicates: true });
        await tx.userExam.deleteMany({ where: { guestId } });
      }
      // Các lượt làm dở của khách cũng về tài khoản, để đăng nhập xong vẫn làm tiếp được
      await tx.practiceSession.updateMany({ where: { guestId, userId: null }, data: { userId, guestId: null } });
      return rows.length;
    }),
};
