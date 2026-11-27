import type { ExamCommentStatus, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { CommentFlagReason } from "../constants/exam-comment";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";

// Cột cho danh sách công khai: userId chỉ để tính "mine", role/proExpiresAt chỉ để tính nhãn; không trả ra ngoài
const publicSelect = {
  id: true,
  questionNumber: true,
  body: true,
  status: true,
  createdAt: true,
  userId: true,
  user: { select: { fullName: true, avatarPath: true, role: true, proExpiresAt: true } },
  _count: { select: { likes: true } },
} satisfies Prisma.ExamCommentSelect;

const adminSelect = {
  id: true,
  examId: true,
  questionNumber: true,
  body: true,
  status: true,
  flagReason: true,
  createdAt: true,
  reviewedAt: true,
  reviewNote: true,
  exam: { select: { id: true, title: true } },
  user: { select: { id: true, email: true, fullName: true } },
  _count: { select: { reports: true } },
} satisfies Prisma.ExamCommentSelect;

export type PublicCommentRow = Prisma.ExamCommentGetPayload<{ select: typeof publicSelect }>;
export type AdminCommentRow = Prisma.ExamCommentGetPayload<{ select: typeof adminSelect }>;
export type AdminCommentFilter = ExamCommentStatus | "REPORTED" | undefined;

const newest: Prisma.ExamCommentOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];

export const examCommentRepository = {
  create: (data: { examId: string; questionNumber: number; userId: string; body: string; status: ExamCommentStatus; flagReason: CommentFlagReason | null }) =>
    prisma.examComment.create({ data, select: publicSelect }),

  // ----- Giới hạn khi gửi: đều là COUNT/findMany có giới hạn trên index, không tải cả ngày bình luận về
  // Số bình luận của một người từ `since` (index user_id, created_at)
  countByUserSince: (userId: string, since: Date) => prisma.examComment.count({ where: { userId, createdAt: { gte: since } } }),

  // Bình luận của một người trên một câu từ `since`, tối đa `take` dòng (index user_id, exam_id, question_number, created_at)
  onQuestionSince: (userId: string, examId: string, questionNumber: number, since: Date, take: number) =>
    prisma.examComment.findMany({ where: { userId, examId, questionNumber, createdAt: { gte: since } }, select: { body: true }, orderBy: newest, take }),

  // Cùng nội dung ở câu khác từ `since` (collation không phân biệt hoa thường); quét trong khoảng index user_id, created_at
  countSameBodyElsewhere: (userId: string, examId: string, questionNumber: number, body: string, since: Date) =>
    prisma.examComment.count({ where: { userId, createdAt: { gte: since }, body, NOT: { examId, questionNumber } } }),

  // Số bình luận bị admin từ chối từ `since` (index user_id, status, reviewed_at)
  countRejectedSince: (userId: string, since: Date) => prisma.examComment.count({ where: { userId, status: "REJECTED", reviewedAt: { gte: since } } }),

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

  // Bình luận đã duyệt của đề (để thích / báo cáo)
  findApproved: (id: string, examId: string) =>
    prisma.examComment.findFirst({ where: { id, examId, status: "APPROVED" }, select: { id: true, userId: true, questionNumber: true, body: true, reviewedById: true } }),

  // ----- Thích bình luận
  likedIds: async (userId: string, commentIds: string[]) =>
    commentIds.length ? (await prisma.examCommentLike.findMany({ where: { userId, commentId: { in: commentIds } }, select: { commentId: true } })).map((l) => l.commentId) : [],

  async setLike(commentId: string, userId: string, liked: boolean) {
    if (liked) await prisma.examCommentLike.createMany({ data: [{ commentId, userId }], skipDuplicates: true });
    else await prisma.examCommentLike.deleteMany({ where: { commentId, userId } });
    return prisma.examCommentLike.count({ where: { commentId } });
  },

  // ----- Báo cáo
  hasReport: async (commentId: string, userId: string) => !!(await prisma.examCommentReport.findUnique({ where: { commentId_userId: { commentId, userId } }, select: { userId: true } })),
  countReportsByUserSince: (userId: string, since: Date) => prisma.examCommentReport.count({ where: { userId, createdAt: { gte: since } } }),
  // true = báo cáo mới (lặp lại thì bỏ qua)
  addReport: async (commentId: string, userId: string, reason: string | null) =>
    (await prisma.examCommentReport.createMany({ data: [{ commentId, userId, reason }], skipDuplicates: true })).count === 1,
  countReports: (commentId: string) => prisma.examCommentReport.count({ where: { commentId } }),
  // Tự ẩn: chỉ bình luận đang hiện và chưa từng được admin duyệt tay. true = vừa ẩn
  hideReported: async (id: string) =>
    (await prisma.examComment.updateMany({ where: { id, status: "APPROVED", reviewedById: null }, data: { status: "PENDING", flagReason: "REPORTED" } })).count === 1,

  // ----- Admin
  async listAdmin(query: PaginationQuery, filter: AdminCommentFilter, q: string | undefined) {
    // shortcut: tìm bằng LIKE '%q%' (không dùng được index); đủ cho bảng duyệt của admin, đổi sang FULLTEXT nếu bảng lớn và chậm
    const where: Prisma.ExamCommentWhereInput = {
      ...(filter === "REPORTED" ? { reports: { some: {} } } : { status: filter }),
      ...(q && { OR: [{ body: { contains: q } }, { user: { email: { contains: q } } }, { exam: { title: { contains: q } } }] }),
    };
    const byStatus = filter && filter !== "REPORTED";
    const [items, total] = await Promise.all([
      prisma.examComment.findMany({ where, select: adminSelect, orderBy: byStatus ? newest : [{ id: "desc" }], ...toSkipTake(query) }),
      prisma.examComment.count({ where }),
    ]);
    return { items, total };
  },

  findAdmin: (id: string) => prisma.examComment.findUnique({ where: { id }, select: adminSelect }),

  // Badge của admin: index (status, created_at); bị báo cáo = còn báo cáo chưa xử lý (bảng báo cáo nhỏ, xoá khi duyệt)
  countPending: () => prisma.examComment.count({ where: { status: "PENDING" } }),
  countReported: async () => (await prisma.examCommentReport.groupBy({ by: ["commentId"] })).length,

  // Duyệt / từ chối cũng xử lý xong các báo cáo của bình luận đó
  review: async (ids: string[], data: { status: Exclude<ExamCommentStatus, "PENDING">; reviewedById: string; reviewNote?: string | null }) => {
    const [updated] = await prisma.$transaction([
      prisma.examComment.updateMany({ where: { id: { in: ids } }, data: { ...data, reviewedAt: new Date() } }),
      prisma.examCommentReport.deleteMany({ where: { commentId: { in: ids } } }),
    ]);
    return updated.count;
  },

  deleteById: async (id: string) => (await prisma.examComment.deleteMany({ where: { id } })).count,
};
