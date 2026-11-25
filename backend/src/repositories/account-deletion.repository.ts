import { prisma } from "../configs/prisma";
import { hashDeletedEmail } from "../utils/deleted-email";
import { userCache } from "../utils/user-cache";
import type { Db } from "./wallet.repository";

export const accountDeletionRepository = {
  /** Việc đang dở khiến chưa thể xoá: đơn Coursera chưa xong, lệnh nạp còn chờ chuyển khoản. */
  async openWork(userId: string, now: Date) {
    const [courseraOrders, deposits] = await Promise.all([
      prisma.courseraOrder.count({ where: { userId, status: { in: ["PENDING", "PROCESSING"] } } }),
      prisma.depositOrder.count({ where: { userId, status: "PENDING", expiresAt: { gt: now } } }),
    ]);
    return { courseraOrders, deposits };
  },

  // Đóng tài khoản ngay: đánh dấu và đăng xuất mọi thiết bị trong một transaction
  async markRequested(userId: string, at: Date) {
    await prisma.$transaction([
      prisma.user.updateMany({ where: { id: userId, deleteRequestedAt: null }, data: { deleteRequestedAt: at } }),
      prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);
    userCache.invalidate(userId);
  },

  // Huỷ yêu cầu (đăng nhập lại). false = tài khoản đã bị ẩn danh, không cứu được
  async cancel(userId: string) {
    const { count } = await prisma.user.updateMany({ where: { id: userId, deletedAt: null }, data: { deleteRequestedAt: null } });
    userCache.invalidate(userId);
    return count === 1;
  },

  dueIds: (cutoff: Date, take: number) =>
    prisma.user.findMany({ where: { deleteRequestedAt: { lte: cutoff }, deletedAt: null }, select: { id: true }, orderBy: { deleteRequestedAt: "asc" }, take }).then((rows) => rows.map((r) => r.id)),

  // Chiếm dòng bằng UPDATE có điều kiện: người dùng vừa đăng nhập lại (đã huỷ) thì không ai ẩn danh được nữa
  async claim(db: Db, userId: string, cutoff: Date, at: Date) {
    const { count } = await db.user.updateMany({ where: { id: userId, deleteRequestedAt: { lte: cutoff }, deletedAt: null }, data: { deletedAt: at } });
    if (count !== 1) return null;
    return db.user.findUnique({ where: { id: userId }, select: { email: true, balance: true, avatarPath: true } });
  },

  /** Xoá dữ liệu cá nhân và che phần còn phải giữ. Trả id tài liệu slide để xoá tệp sau khi commit. */
  async purge(db: Db, userId: string) {
    const where = { userId };
    const uploads = await db.materialUpload.findMany({ where, select: { id: true } });
    await db.refreshToken.deleteMany({ where });
    await db.passwordResetToken.deleteMany({ where });
    await db.emailVerificationToken.deleteMany({ where });
    await db.practiceSession.deleteMany({ where });
    await db.reviewItem.deleteMany({ where });
    await db.userQuestionCard.deleteMany({ where });
    await db.userReviewLog.deleteMany({ where });
    await db.savedQuestion.deleteMany({ where });
    await db.studyDay.deleteMany({ where });
    await db.dailyCheckIn.deleteMany({ where });
    await db.userBadge.deleteMany({ where });
    await db.userGradeSetting.deleteMany({ where });
    await db.userGrade.deleteMany({ where });
    await db.userExamSlot.deleteMany({ where });
    await db.userNotice.deleteMany({ where });
    await db.materialUpload.deleteMany({ where }); // trang và chương xoá theo (cascade)
    await db.courseraOrder.updateMany({ where, data: { email: "", password: null, note: "" } });
    await db.chatLog.updateMany({ where, data: { question: "", ip: null } });
    await db.adminNotice.updateMany({ where, data: { body: null } }); // nội dung có tên và email
    await db.creditLot.updateMany({ where, data: { remaining: 0 } });
    return uploads.map((u) => u.id);
  },

  scrubUser: (db: Db, userId: string, data: { email: string; fullName: string; password: string; deletedEmailHash: string }) =>
    db.user.update({
      where: { id: userId },
      data: {
        ...data,
        googleSub: null,
        githubId: null,
        referralCode: null,
        avatarPath: null,
        proExpiresAt: null,
        emailVerifiedAt: null,
        examDate: null,
        lastActiveAt: null,
        reminderEnabled: false,
        marketingOptOut: true,
      },
    }),

  /** Email này từng thuộc một tài khoản đã xoá: không tặng quà đăng ký / giới thiệu lần nữa. */
  async isReturning(db: Db, userId: string) {
    const me = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    return !!me && !!(await db.user.findFirst({ where: { deletedEmailHash: hashDeletedEmail(me.email) }, select: { id: true } }));
  },
};
