import crypto from "node:crypto";
import { env } from "../configs/env";
import { prisma } from "../configs/prisma";
import { REMINDER_EXAM_WINDOW_DAYS, REMINDER_MAX_PER_RUN, REMINDER_SEND_GAP_MS } from "../constants/reminder";
import { AppError } from "../rules/error";
import { DAY_MS, vnDate } from "../utils/time";
import { mailService } from "./mail.service";

// Email nhắc ôn: mặc định TẮT, người dùng tự bật; tối đa 1 thư mỗi ngày; thư nào cũng có liên kết hủy (không cần đăng nhập).
// Mọi thư đều dùng chung hộp gửi với thư xác minh và đặt lại mật khẩu, nên gửi ít và đúng người để không bị đánh dấu spam.

const sign = (userId: number) => crypto.createHmac("sha256", env.JWT_SECRET).update(`reminder-unsubscribe:${userId}`).digest("hex").slice(0, 32);

export const unsubscribeToken = (userId: number) => sign(userId);

export const verifyUnsubscribe = (userId: number, token: string) => {
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

const unsubscribeLink = (userId: number) => `${env.API_URL || env.CLIENT_URL}/api/v1/public/reminder/unsubscribe?u=${userId}&t=${sign(userId)}`;
const dateOnly = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const reminderService = {
  async get(userId: number) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { reminderEnabled: true, examDate: true, emailVerifiedAt: true } });
    return { enabled: !!u?.reminderEnabled, examDate: dateOnly(u?.examDate ?? null), emailVerified: !!u?.emailVerifiedAt };
  },

  async update(userId: number, input: { enabled: boolean; examDate: string | null }) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
    if (!u) throw AppError.notFound("Không tìm thấy tài khoản");
    if (input.enabled && !u.emailVerifiedAt) throw new AppError("Bạn cần xác minh email trước khi bật nhắc ôn qua email");
    await prisma.user.update({ where: { id: userId }, data: { reminderEnabled: input.enabled, examDate: input.examDate ? new Date(`${input.examDate}T00:00:00.000Z`) : null } });
    return this.get(userId);
  },

  // Liên kết hủy trong thư: không cần đăng nhập, chỉ cần đúng chữ ký của chính người đó
  async unsubscribe(userId: number, token: string) {
    if (!verifyUnsubscribe(userId, token)) return false;
    await prisma.user.updateMany({ where: { id: userId }, data: { reminderEnabled: false } });
    return true;
  },

  /**
   * Chạy mỗi ngày: gửi cho người đã bật nhắc, hôm nay chưa nhận thư, có câu đến hạn ôn và hôm nay CHƯA học
   * (đã học rồi thì không nhắc nữa). Trả số thư đã gửi.
   */
  async run(now = Date.now()) {
    const today = vnDate(now);
    const users = await prisma.user.findMany({
      where: { reminderEnabled: true, status: "ACTIVE", emailVerifiedAt: { not: null }, OR: [{ reminderSentOn: null }, { reminderSentOn: { lt: today } }] },
      take: REMINDER_MAX_PER_RUN,
      select: { id: true, email: true, fullName: true, examDate: true },
    });

    let sent = 0;
    for (const u of users) {
      try {
        const [due, day] = await Promise.all([
          prisma.reviewItem.count({ where: { userId: u.id, mastered: false, nextReviewAt: { lte: new Date(now) }, exam: { answerSource: { in: ["AI", "MANUAL"] } } } }),
          prisma.studyDay.findUnique({ where: { userId_day: { userId: u.id, day: today } }, select: { attempts: true, reviews: true } }),
        ]);
        if (due === 0 || (day && (day.attempts > 0 || day.reviews > 0))) continue;

        const daysLeft = u.examDate ? Math.round((u.examDate.getTime() - today.getTime()) / DAY_MS) : null;
        await mailService.sendReviewReminder(u.email, {
          name: u.fullName,
          due,
          daysToExam: daysLeft !== null && daysLeft >= 0 && daysLeft <= REMINDER_EXAM_WINDOW_DAYS ? daysLeft : null,
          reviewLink: `${env.CLIENT_URL}/account/review`,
          unsubscribeLink: unsubscribeLink(u.id),
        });
        await prisma.user.update({ where: { id: u.id }, data: { reminderSentOn: today } });
        sent++;
        await sleep(REMINDER_SEND_GAP_MS);
      } catch (err) {
        console.error(`[reminder] lỗi gửi cho user ${u.id}:`, (err as Error).message); // lỗi một người không chặn những người còn lại
      }
    }
    return sent;
  },
};
