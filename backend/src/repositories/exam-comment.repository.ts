import type { ExamCommentStatus, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";

// Cột cho danh sách công khai: userId chỉ để tính "mine", không trả ra ngoài
const publicSelect = {
  id: true,
  questionNumber: true,
  body: true,
  status: true,
  createdAt: true,
  userId: true,
  user: { select: { fullName: true, avatarPath: true } },
} satisfies Prisma.ExamCommentSelect;

const adminSelect = {
  id: true,
  examId: true,
  questionNumber: true,
  body: true,
  status: true,
  createdAt: true,
  reviewedAt: true,
  reviewNote: true,
  exam: { select: { id: true, title: true } },
  user: { select: { id: true, email: true, fullName: true } },
} satisfies Prisma.ExamCommentSelect;

export type PublicCommentRow = Prisma.ExamCommentGetPayload<{ select: typeof publicSelect }>;
export type AdminCommentRow = Prisma.ExamCommentGetPayload<{ select: typeof adminSelect }>;

const newest: Prisma.ExamCommentOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];

export const examCommentRepository = {
  create: (data: { examId: string; questionNumber: number; userId: string; body: string }) => prisma.examComment.create({ data, select: publicSelect }),

  // Bình luận của một người từ `since` (index user_id, created_at), tối đa `take` dòng: dùng cho giới hạn theo ngày và chặn gửi trùng
  recentByUser: (userId: string, since: Date, take: number) =>
    prisma.examComment.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { examId: true, questionNumber: true, body: true },
      orderBy: newest,
      take,
    }),

  // Danh sách công khai của một câu: chỉ bình luận đã duyệt (index exam_id, question_number, status, created_at)
  async listApproved(examId: string, questionNumber: number, query: PaginationQuery) {
    const where = { examId, questionNumber, status: "APPROVED" } satisfies Prisma.ExamCommentWhereInput;
    const [items, total] = await Promise.all([
      prisma.examComment.findMany({ where, select: publicSelect, orderBy: newest, ...toSkipTake(query) }),
      prisma.examComment.count({ where }),
    ]);
    return { items, total };
  },

  // Bình luận chưa được duyệt (chờ hoặc bị từ chối) của chính người xem trên câu này
  listOwnUnapproved: (examId: string, questionNumber: number, userId: string, take: number) =>
    prisma.examComment.findMany({
      where: { examId, questionNumber, userId, status: { in: ["PENDING", "REJECTED"] } },
      select: publicSelect,
      orderBy: newest,
      take,
    }),

  // Số bình luận đã duyệt theo câu của một đề: một GROUP BY trên index (exam_id, question_number, status, ...)
  countApprovedByQuestion: (examId: string) =>
    prisma.examComment.groupBy({ by: ["questionNumber"], where: { examId, status: "APPROVED" }, _count: { _all: true } }),

  deleteOwn: async (id: string, examId: string, userId: string) => (await prisma.examComment.deleteMany({ where: { id, examId, userId } })).count,

  // ----- Admin
  async listAdmin(query: PaginationQuery, status: ExamCommentStatus | undefined, q: string | undefined) {
    // shortcut: tìm bằng LIKE '%q%' (không dùng được index); đủ cho bảng duyệt của admin, đổi sang FULLTEXT nếu bảng lớn và chậm
    const where: Prisma.ExamCommentWhereInput = {
      status,
      ...(q && { OR: [{ body: { contains: q } }, { user: { email: { contains: q } } }, { exam: { title: { contains: q } } }] }),
    };
    const [items, total] = await Promise.all([
      prisma.examComment.findMany({ where, select: adminSelect, orderBy: status ? newest : [{ id: "desc" }], ...toSkipTake(query) }),
      prisma.examComment.count({ where }),
    ]);
    return { items, total };
  },

  findAdmin: (id: string) => prisma.examComment.findUnique({ where: { id }, select: adminSelect }),

  // Badge của admin: index (status, created_at)
  countPending: () => prisma.examComment.count({ where: { status: "PENDING" } }),

  review: async (ids: string[], data: { status: Exclude<ExamCommentStatus, "PENDING">; reviewedById: string; reviewNote?: string | null }) =>
    (await prisma.examComment.updateMany({ where: { id: { in: ids } }, data: { ...data, reviewedAt: new Date() } })).count,

  deleteById: async (id: string) => (await prisma.examComment.deleteMany({ where: { id } })).count,
};
