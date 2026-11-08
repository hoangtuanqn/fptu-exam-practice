import { prisma } from "../configs/prisma";
import { STUDY_GOAL_CHOICES, STUDY_MIN_REVIEWS } from "../constants/review";
import { AppError } from "../rules/error";
import { DAY_MS, vnDate } from "../utils/time";

const qualifies = (d: { attempts: number; reviews: number }) => d.attempts >= 1 || d.reviews >= STUDY_MIN_REVIEWS;

export const studyService = {
  /** Ghi nhận hoạt động học của hôm nay (giờ Việt Nam). Không để lỗi ở đây làm hỏng việc chính nên người gọi tự bắt lỗi. */
  async bump(userId: number, inc: { attempts?: number; reviews?: number }) {
    const day = vnDate();
    const attempts = inc.attempts ?? 0;
    const reviews = inc.reviews ?? 0;
    const where = { userId_day: { userId, day } };
    try {
      await prisma.studyDay.upsert({ where, create: { userId, day, attempts, reviews }, update: { attempts: { increment: attempts }, reviews: { increment: reviews } } });
    } catch {
      // hai yêu cầu cùng lúc cùng tạo dòng của ngày: dòng đã có rồi, chỉ cần cộng thêm
      await prisma.studyDay.update({ where, data: { attempts: { increment: attempts }, reviews: { increment: reviews } } });
    }
  },

  /**
   * Chuỗi ngày học, tiến độ tuần và hôm nay. Tuần tính từ thứ Hai theo giờ Việt Nam.
   * Chuỗi còn nối khi hôm nay hoặc hôm qua có học; bỏ lỡ một ngày thì về 0.
   */
  async stats(userId: number) {
    const today = vnDate();
    const since = new Date(today.getTime() - 400 * DAY_MS);
    const [days, user] = await Promise.all([
      prisma.studyDay.findMany({ where: { userId, day: { gte: since } }, orderBy: { day: "desc" }, select: { day: true, attempts: true, reviews: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { studyGoalDays: true } }),
    ]);
    const done = new Set(days.filter(qualifies).map((d) => d.day.getTime()));
    const todayRow = days.find((d) => d.day.getTime() === today.getTime());

    let cursor = done.has(today.getTime()) ? today.getTime() : today.getTime() - DAY_MS;
    let streak = 0;
    while (done.has(cursor)) {
      streak++;
      cursor -= DAY_MS;
    }

    const sinceMonday = (today.getUTCDay() + 6) % 7; // 0 = thứ Hai
    const weekStart = today.getTime() - sinceMonday * DAY_MS;
    const week = Array.from({ length: 7 }, (_, i) => done.has(weekStart + i * DAY_MS)); // thứ Hai..Chủ nhật
    const goal = user?.studyGoalDays ?? 3;
    return {
      streak,
      studiedToday: done.has(today.getTime()),
      todayReviews: todayRow?.reviews ?? 0,
      minReviews: STUDY_MIN_REVIEWS,
      week,
      todayIndex: sinceMonday,
      weekDone: week.filter(Boolean).length,
      goal,
      goalMet: week.filter(Boolean).length >= goal,
    };
  },

  async setGoal(userId: number, goalDays: number) {
    if (!(STUDY_GOAL_CHOICES as readonly number[]).includes(goalDays)) throw new AppError("Mục tiêu không hợp lệ");
    await prisma.user.update({ where: { id: userId }, data: { studyGoalDays: goalDays } });
    return this.stats(userId);
  },
};
