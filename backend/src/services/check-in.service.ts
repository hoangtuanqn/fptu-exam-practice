import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { CHECKIN_BONUS, CHECKIN_CYCLE_DAYS, CHECKIN_DAILY } from "../constants/check-in";
import type { Db } from "../repositories/wallet.repository";
import { AppError } from "../rules/error";
import { DAY_MS, vnDate } from "../utils/time";
import { walletService } from "./wallet.service";

// Credit nhận được ở ngày thứ `cycleDay` của vòng (ngày cuối vòng có thêm thưởng chuỗi)
const rewardOf = (cycleDay: number) => CHECKIN_DAILY + (cycleDay === CHECKIN_CYCLE_DAYS ? CHECKIN_BONUS : 0);

/**
 * Tình trạng điểm danh của một người ở thời điểm hiện tại. "Ngày" luôn là ngày theo giờ Việt Nam (đổi ngày lúc 0h).
 * - streak: số ngày liên tiếp đã điểm danh (gồm cả hôm nay nếu đã nhận). Bỏ lỡ một ngày thì về 0.
 * - cycleDay: hôm nay là ngày thứ mấy (1..7) trong vòng 7 ngày.
 */
async function snapshot(userId: number, db: Db = prisma) {
  const today = vnDate();
  const last = await db.dailyCheckIn.findFirst({ where: { userId }, orderBy: { day: "desc" }, select: { day: true, streak: true } });
  const claimedToday = !!last && last.day.getTime() === today.getTime();
  const yesterday = today.getTime() - DAY_MS;
  const alive = !!last && (claimedToday || last.day.getTime() === yesterday); // chuỗi còn nối tiếp (hôm nay hoặc hôm qua đã nhận)
  const streak = alive ? last!.streak : 0;
  const cycleDay = claimedToday ? ((streak - 1) % CHECKIN_CYCLE_DAYS) + 1 : (streak % CHECKIN_CYCLE_DAYS) + 1;
  return { today, claimedToday, streak, cycleDay };
}

export const checkInService = {
  /** Giao diện hỏi lúc đăng nhập để biết có hiện hộp điểm danh không. Chưa xác minh email thì chưa nhận được (chống tạo nhiều tài khoản để lấy thưởng). */
  async status(userId: number, verified: boolean) {
    const { claimedToday, streak, cycleDay } = await snapshot(userId);
    return {
      canClaim: verified && !claimedToday,
      claimedToday,
      needVerify: !verified,
      streak, // số ngày liên tiếp đã điểm danh
      cycleDay, // hôm nay là ngày thứ mấy trong vòng
      completedDays: claimedToday ? cycleDay : cycleDay - 1, // số ngày của vòng đã nhận (để tô dấu tích)
      days: CHECKIN_CYCLE_DAYS,
      dailyAmount: CHECKIN_DAILY,
      bonus: CHECKIN_BONUS,
      todayAmount: rewardOf(cycleDay),
    };
  },

  /** Nhận thưởng hôm nay. Mỗi ngày một lần (ràng buộc duy nhất userId + ngày chặn cả khi bấm hai lần cùng lúc). */
  async claim(userId: number) {
    try {
      return await prisma.$transaction(async (tx) => {
        const { today, claimedToday, streak, cycleDay } = await snapshot(userId, tx);
        if (claimedToday) throw AppError.conflict("Hôm nay bạn đã điểm danh rồi, qua 0h quay lại nhé");
        const amount = rewardOf(cycleDay);
        await tx.dailyCheckIn.create({ data: { userId, day: today, streak: streak + 1, amount } });
        const entry = await walletService.applyChange(tx, {
          userId,
          amount,
          type: "CHECKIN_REWARD",
          note: `Điểm danh ngày ${cycleDay}/${CHECKIN_CYCLE_DAYS}${cycleDay === CHECKIN_CYCLE_DAYS ? `, kèm thưởng đủ ${CHECKIN_CYCLE_DAYS} ngày +${CHECKIN_BONUS}` : ""}`,
        });
        return {
          amount,
          bonus: cycleDay === CHECKIN_CYCLE_DAYS ? CHECKIN_BONUS : 0,
          streak: streak + 1,
          cycleDay,
          completedDays: cycleDay,
          balanceAfter: entry.balanceAfter,
        };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw AppError.conflict("Hôm nay bạn đã điểm danh rồi, qua 0h quay lại nhé");
      throw err;
    }
  },
};
