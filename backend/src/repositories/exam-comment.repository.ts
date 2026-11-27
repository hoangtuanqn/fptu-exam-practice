import type { ExamCommentStatus, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { CommentFlagReason } from "../constants/exam-comment";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";

// Tệp đính kèm (decision 0020): filePath chỉ để ký link, không trả ra ngoài
const fileSelect = { select: { id: true, name: true, mime: true, sizeBytes: true, filePath: true }, orderBy: { id: "asc" } } satisfies Prisma.ExamComment$filesArgs;
// Tài khoản đã xoá (hoặc đang chờ xoá) không được gợi ý / nhắc tên
const liveUser = { deletedAt: null, deleteRequestedAt: null } satisfies Prisma.UserWhereInput;

// Cột cho danh sách công khai: userId chỉ để tính "mine", role/proExpiresAt chỉ để tính nhãn; không trả ra ngoài
const publicSelect = {
  id: true,
  examId: true,
  questionNumber: true,
  body: true,
  status: true,
  createdAt: true,
  userId: true,
  parentId: true,
  replyToId: true,
  user: { select: { fullName: true, avatarPath: true, role: true, proExpiresAt: true, createdAt: true } },
  replyTo: { select: { user: { select: { fullName: true } } } },
  files: fileSelect,
  mentions: { select: { user: { select: { fullName: true } } } },
} satisfies Prisma.ExamCommentSelect;

const adminSelect = {
  id: true,
  examId: true,
  questionNumber: true,
  parentId: true,
  body: true,
  status: true,
  flagReason: true,
  createdAt: true,
  reviewedAt: true,
  reviewNote: true,
  exam: { select: { id: true, title: true } },
  user: { select: { id: true, email: true, fullName: true } },
  _count: { select: { reports: true } },
  files: fileSelect,
} satisfies Prisma.ExamCommentSelect;

export type PublicCommentRow = Prisma.ExamCommentGetPayload<{ select: typeof publicSelect }>;
export type AdminCommentRow = Prisma.ExamCommentGetPayload<{ select: typeof adminSelect }>;
export type AdminCommentFilter = ExamCommentStatus | "REPORTED" | undefined;
export type CommentReaction = "like" | "dislike";

const newest: Prisma.ExamCommentOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];
const oldest: Prisma.ExamCommentOrderByWithRelationInput[] = [{ createdAt: "asc" }, { id: "asc" }];
const reactionOf = (isDislike: boolean): CommentReaction => (isDislike ? "dislike" : "like");

export const examCommentRepository = {
  create: (data: {
    examId: string;
    questionNumber: number;
    userId: string;
    body: string;
    status: ExamCommentStatus;
    flagReason: CommentFlagReason | null;
    parentId?: string | null;
    replyToId?: string | null;
    files?: { name: string; filePath: string; mime: string; sizeBytes: number }[];
    mentionUserIds?: string[];
  }) => {
    const { files = [], mentionUserIds = [], ...row } = data;
    // Một câu lệnh: bình luận, tệp và người được nhắc cùng được ghi hoặc cùng không
    return prisma.examComment.create({
      data: { ...row, files: { create: files }, mentions: { create: mentionUserIds.map((userId) => ({ userId })) } },
      select: publicSelect,
    });
  },

  // ----- Tệp đính kèm
  // Số tệp một người đã tải lên từ `since` (bình luận đã xoá không tính: tệp của nó cũng đã bị xoá khỏi đĩa); index user_id, created_at rồi comment_id
  countFilesByUserSince: (userId: string, since: Date) => prisma.examCommentFile.count({ where: { comment: { userId, createdAt: { gte: since } } } }),

  // Đường dẫn tệp của một bình luận và các trả lời của nó (đọc trước khi xoá, xoá trên đĩa sau)
  threadFilePaths: async (id: string) =>
    (await prisma.examCommentFile.findMany({ where: { comment: { OR: [{ id }, { parentId: id }] } }, select: { filePath: true } })).map((f) => f.filePath),

  // Xoá dòng tệp của các bình luận (không đụng trả lời của chúng), trả về đường dẫn để xoá trên đĩa
  async deleteFilesOf(commentIds: string[]) {
    const files = await prisma.examCommentFile.findMany({ where: { commentId: { in: commentIds } }, select: { id: true, filePath: true } });
    if (files.length) await prisma.examCommentFile.deleteMany({ where: { id: { in: files.map((f) => f.id) } } });
    return files.map((f) => f.filePath);
  },

  // Tệp để phát qua link ký: phải thuộc một bình luận của đề này
  findFile: (id: string, examId: string) => prisma.examCommentFile.findFirst({ where: { id, comment: { examId } }, select: { name: true, mime: true, filePath: true } }),

  // ----- Nhắc tên
  // Người viết của các bình luận đã duyệt `refs` trong đề này (ref = id một bình luận của người đó); tài khoản đã xoá thì bỏ
  mentionAuthors: (refs: string[], examId: string) =>
    refs.length
      ? prisma.examComment.findMany({ where: { id: { in: refs }, examId, status: "APPROVED", user: liveUser }, select: { userId: true, user: { select: { fullName: true } } } })
      : Promise.resolve([]),

  /**
   * Gợi ý nhắc tên: người viết khác nhau của các bình luận đã duyệt trong đề (trừ người xem), tên chứa `q`, người mới bình luận gần nhất trước.
   * ref = id bình luận mới nhất của người đó (không trả id người dùng). GROUP BY trên index (exam_id, status, user_id).
   */
  async mentionSuggestions(examId: string, viewerId: string, q: string, take: number) {
    const groups = await prisma.examComment.groupBy({
      by: ["userId"],
      where: { examId, status: "APPROVED", userId: { not: viewerId }, user: { ...liveUser, ...(q && { fullName: { contains: q } }) } },
      _max: { id: true },
      orderBy: { _max: { id: "desc" } },
      take,
    });
    const users = new Map(
      (await prisma.user.findMany({ where: { id: { in: groups.map((g) => g.userId) } }, select: { id: true, fullName: true, avatarPath: true } })).map((u) => [u.id, u]),
    );
    return groups.flatMap((g) => {
      const u = users.get(g.userId);
      return u && g._max.id ? [{ ref: g._max.id, userId: u.id, fullName: u.fullName, avatarPath: u.avatarPath }] : [];
    });
  },

  /**
   * Người được nhắc trong các bình luận đã hiện mà chưa được báo: lấy ra rồi đánh dấu đã báo (mỗi người một lần, kể cả khi bị ẩn rồi duyệt lại).
   * shortcut: đọc rồi cập nhật không khoá; hai admin duyệt cùng một bình luận cùng lúc có thể báo hai lần
   */
  async claimMentions(commentIds: string[]) {
    if (!commentIds.length) return [];
    const rows = await prisma.examCommentMention.findMany({
      where: { commentId: { in: commentIds }, notifiedAt: null, comment: { status: "APPROVED" } },
      select: {
        userId: true,
        comment: {
          select: { id: true, examId: true, questionNumber: true, body: true, userId: true, user: { select: { fullName: true } }, replyTo: { select: { userId: true } }, parent: { select: { userId: true } } },
        },
      },
    });
    if (rows.length) await prisma.examCommentMention.updateMany({ where: { commentId: { in: [...new Set(rows.map((r) => r.comment.id))] }, notifiedAt: null }, data: { notifiedAt: new Date() } });
    return rows;
  },

  // ----- Giới hạn khi gửi (bình luận và trả lời tính chung): đều là COUNT/findMany có giới hạn trên index
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

  // Bình luận gốc đã duyệt của một mục, mới nhất trước mặc định (index exam_id, question_number, parent_id, status, created_at)
  async listApproved(examId: string, questionNumber: number, query: PaginationQuery, order: "newest" | "oldest" = "newest") {
    const where = { examId, questionNumber, parentId: null, status: "APPROVED" } satisfies Prisma.ExamCommentWhereInput;
    const [items, total] = await Promise.all([
      prisma.examComment.findMany({ where, select: publicSelect, orderBy: order === "oldest" ? oldest : newest, ...toSkipTake(query) }),
      prisma.examComment.count({ where }),
    ]);
    return { items, total };
  },

  // Số bình luận gốc đã duyệt của một mục (số thứ tự của bình luận vừa đăng); cùng index với listApproved
  countApprovedRoots: (examId: string, questionNumber: number) => prisma.examComment.count({ where: { examId, questionNumber, parentId: null, status: "APPROVED" } }),

  // Số bình luận đã duyệt (gốc và trả lời) của mỗi người viết trong trang: một GROUP BY trên index (user_id, status, reviewed_at)
  approvedCountsByUser: async (userIds: string[]) =>
    new Map(
      userIds.length
        ? (await prisma.examComment.groupBy({ by: ["userId"], where: { userId: { in: [...new Set(userIds)] }, status: "APPROVED" }, _count: { _all: true } })).map(
            (g) => [g.userId, g._count._all] as const,
          )
        : [],
    ),

  // Bình luận gốc chưa được duyệt (chờ hoặc bị từ chối) của chính người xem trên câu này
  listOwnUnapproved: (examId: string, questionNumber: number, userId: string, take: number) =>
    prisma.examComment.findMany({
      where: { examId, questionNumber, userId, parentId: null, status: { in: ["PENDING", "REJECTED"] } },
      select: publicSelect,
      orderBy: newest,
      take,
    }),

  // Trả lời đã duyệt của một bình luận gốc, cũ nhất trước (index parent_id, status, created_at)
  async listReplies(parentId: string, query: PaginationQuery) {
    const where = { parentId, status: "APPROVED" } satisfies Prisma.ExamCommentWhereInput;
    const [items, total] = await Promise.all([
      prisma.examComment.findMany({ where, select: publicSelect, orderBy: oldest, ...toSkipTake(query) }),
      prisma.examComment.count({ where }),
    ]);
    return { items, total };
  },

  listOwnUnapprovedReplies: (parentId: string, userId: string, take: number) =>
    prisma.examComment.findMany({ where: { parentId, userId, status: { in: ["PENDING", "REJECTED"] } }, select: publicSelect, orderBy: oldest, take }),

  // Số trả lời đã duyệt của mỗi bình luận gốc trong trang
  replyCounts: async (rootIds: string[]) =>
    rootIds.length
      ? new Map(
          (await prisma.examComment.groupBy({ by: ["parentId"], where: { parentId: { in: rootIds }, status: "APPROVED" }, _count: { _all: true } })).map((g) => [
            g.parentId!,
            g._count._all,
          ]),
        )
      : new Map<string, number>(),

  // Số bình luận đã duyệt (gốc và trả lời) theo câu của một đề: một GROUP BY trên index (exam_id, question_number, status, ...)
  countApprovedByQuestion: (examId: string) =>
    prisma.examComment.groupBy({ by: ["questionNumber"], where: { examId, status: "APPROVED" }, _count: { _all: true } }),

  // Xoá bình luận gốc thì các trả lời xoá theo (khoá ngoại)
  deleteOwn: async (id: string, examId: string, userId: string) => (await prisma.examComment.deleteMany({ where: { id, examId, userId } })).count,

  // Bình luận đã duyệt của đề (để thích / báo cáo / trả lời); parent = bình luận gốc nếu đây là trả lời
  findApproved: (id: string, examId: string) =>
    prisma.examComment.findFirst({
      where: { id, examId, status: "APPROVED" },
      select: { id: true, userId: true, questionNumber: true, body: true, reviewedById: true, parentId: true, parent: { select: { status: true, userId: true } } },
    }),

  // Bình luận gốc đã duyệt (danh sách trả lời)
  findApprovedRoot: (id: string, examId: string) => prisma.examComment.findFirst({ where: { id, examId, parentId: null, status: "APPROVED" }, select: { id: true, questionNumber: true } }),

  // ----- Thích / không thích: mỗi người một cảm xúc trên một bình luận
  // Số thích và không thích của các bình luận trong trang: một GROUP BY trên khoá chính (comment_id, ...)
  async reactionCounts(commentIds: string[]) {
    const out = new Map<string, { likes: number; dislikes: number }>(commentIds.map((id) => [id, { likes: 0, dislikes: 0 }]));
    if (!commentIds.length) return out;
    const groups = await prisma.examCommentLike.groupBy({ by: ["commentId", "isDislike"], where: { commentId: { in: commentIds } }, _count: { _all: true } });
    for (const g of groups) out.get(g.commentId)![g.isDislike ? "dislikes" : "likes"] = g._count._all;
    return out;
  },

  viewerReactions: async (userId: string, commentIds: string[]) =>
    new Map(
      commentIds.length
        ? (await prisma.examCommentLike.findMany({ where: { userId, commentId: { in: commentIds } }, select: { commentId: true, isDislike: true } })).map(
            (l) => [l.commentId, reactionOf(l.isDislike)] as const,
          )
        : [],
    ),

  /** Đặt cảm xúc (null = bỏ). `onlyIf` = chỉ bỏ khi cảm xúc hiện tại đúng loại này (API thích cũ). Trả cảm xúc trước đó. */
  async setReaction(commentId: string, userId: string, reaction: CommentReaction | null, onlyIf?: CommentReaction) {
    const key = { commentId_userId: { commentId, userId } };
    const before = await prisma.examCommentLike.findUnique({ where: key, select: { isDislike: true } });
    const previous = before ? reactionOf(before.isDislike) : null;
    if (reaction === null) {
      if (previous && (!onlyIf || previous === onlyIf)) await prisma.examCommentLike.deleteMany({ where: { commentId, userId } });
    } else if (previous !== reaction) {
      const isDislike = reaction === "dislike";
      // Hai lần bấm đầu cùng lúc: bản ghi có thể vừa được tạo bởi lần kia, nên tạo bỏ qua trùng rồi cập nhật
      await prisma.examCommentLike.createMany({ data: [{ commentId, userId, isDislike }], skipDuplicates: true });
      await prisma.examCommentLike.updateMany({ where: { commentId, userId }, data: { isDislike } });
    }
    return previous;
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

  // Trả lời chưa ở trạng thái đã duyệt trong các id (để báo cho người được trả lời khi admin duyệt)
  repliesNotApproved: (ids: string[]) =>
    prisma.examComment.findMany({
      where: { id: { in: ids }, parentId: { not: null }, status: { not: "APPROVED" }, OR: [{ flagReason: null }, { flagReason: { not: "REPORTED" } }] }, // bị báo cáo rồi được duyệt lại: đã báo lúc đăng, không báo lần hai
      select: { id: true, examId: true, questionNumber: true, body: true, userId: true, user: { select: { fullName: true } }, replyTo: { select: { userId: true } }, parent: { select: { userId: true } } },
    }),

  // Badge của admin: index (status, created_at); bị báo cáo = còn báo cáo chưa xử lý (bảng báo cáo nhỏ, xoá khi duyệt)
  countPending: () => prisma.examComment.count({ where: { status: "PENDING" } }),
  countReported: async () => (await prisma.examCommentReport.groupBy({ by: ["commentId"] })).length,

  // Duyệt / từ chối cũng xử lý xong các báo cáo của bình luận đó; không đụng tới các trả lời của nó
  review: async (ids: string[], data: { status: Exclude<ExamCommentStatus, "PENDING">; reviewedById: string; reviewNote?: string | null }) => {
    const [updated] = await prisma.$transaction([
      prisma.examComment.updateMany({ where: { id: { in: ids } }, data: { ...data, reviewedAt: new Date() } }),
      prisma.examCommentReport.deleteMany({ where: { commentId: { in: ids } } }),
    ]);
    return updated.count;
  },

  deleteById: async (id: string) => (await prisma.examComment.deleteMany({ where: { id } })).count,
};
