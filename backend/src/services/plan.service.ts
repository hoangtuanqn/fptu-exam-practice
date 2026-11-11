import type { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { NUDGE_EXAM_WINDOW_DAYS, NUDGE_MIN_SPEND, NUDGE_SPEND_WINDOW_DAYS, PRO_BENEFITS, PRO_PLAN, SPRINT_PLAN, TICKET_MAX_OPEN, TICKET_VALID_DAYS, type PlanCode } from "../constants/plan";
import { planSignalRepository } from "../repositories/plan-signal.repository";
import { proTicketRepository } from "../repositories/pro-ticket.repository";
import { userRepository } from "../repositories/user.repository";
import { userCache } from "../utils/user-cache";
import { AppError } from "../rules/error";
import { isProUntil } from "../utils/pro";
import { DAY_MS, vnDate } from "../utils/time";
import { adminNoticeService } from "./admin-notice.service";
import { notificationService } from "./notification.service";
import { walletService } from "./wallet.service";

const addDays = (from: Date, days: number) => new Date(from.getTime() + days * 86_400_000);

const addMonths = (from: Date, months: number) => {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
};

// Thông số của một gói theo mã
const planOf = (code: PlanCode) => {
  const sprint = code === "SPRINT";
  return {
    plan: sprint ? SPRINT_PLAN : PRO_PLAN,
    sprint,
    months: sprint ? 0 : PRO_PLAN.months, // gói Nước rút tính theo ngày, lưu months = 0
    duration: sprint ? `${SPRINT_PLAN.days} ngày` : `${PRO_PLAN.months} tháng`,
  };
};

/**
 * Cộng thời hạn của một gói vào tài khoản và ghi lịch sử mua. PHẢI gọi bên trong transaction, sau khi dòng người dùng đã bị khóa
 * (bằng lệnh trừ tiền hoặc `incrementBalance(…, 0)`), để hai lần cộng cùng lúc chạy lần lượt và luôn cộng dồn đúng.
 * Còn hạn thì tính từ ngày hết hạn cũ, hết hạn rồi thì tính từ bây giờ.
 */
async function extendPro(tx: Prisma.TransactionClient, userId: number, code: PlanCode, price: number, now = new Date()) {
  const { plan, sprint, months } = planOf(code);
  const row = await tx.user.findUnique({ where: { id: userId }, select: { proExpiresAt: true } });
  if (!row) throw AppError.notFound("Không tìm thấy tài khoản");
  const startsAt = isProUntil(row.proExpiresAt, now) ? row.proExpiresAt! : now;
  const endsAt = sprint ? addDays(startsAt, SPRINT_PLAN.days) : addMonths(startsAt, months);
  await tx.user.update({ where: { id: userId }, data: { proExpiresAt: endsAt } });
  await tx.planPurchase.create({ data: { userId, plan: plan.code, months, price, startsAt, endsAt } });
  return { proExpiresAt: endsAt, renewed: startsAt > now };
}

export const planService = {
  // Thông tin gói để hiện trang bán hàng; mức tiết kiệm luôn tính từ giá, không lưu cứng
  info() {
    const { price, fuoPrice, months } = PRO_PLAN;
    const savings = Math.max(0, fuoPrice - price);
    return {
      code: PRO_PLAN.code,
      name: PRO_PLAN.name,
      months,
      price,
      fuoPrice,
      savings,
      savingsPercent: fuoPrice > 0 ? Math.round((savings / fuoPrice) * 100) : 0,
      pricePerMonth: Math.round(price / months),
      benefits: PRO_BENEFITS,
      sprint: { code: SPRINT_PLAN.code, name: SPRINT_PLAN.name, days: SPRINT_PLAN.days, price: SPRINT_PLAN.price },
      ticket: { validDays: TICKET_VALID_DAYS, maxOpen: TICKET_MAX_OPEN },
    };
  },

  async isPro(userId: number): Promise<boolean> {
    const row = await prisma.user.findUnique({ where: { id: userId }, select: { proExpiresAt: true } });
    return isProUntil(row?.proExpiresAt);
  },

  /**
   * Mua (hoặc gia hạn) Pro bằng credit. Trừ tiền trước: lệnh UPDATE số dư khóa dòng người dùng nên hai yêu cầu cùng lúc
   * chạy lần lượt; đọc hạn hiện tại SAU khi đã khóa nên mua liên tiếp luôn cộng dồn đúng, không ghi đè nhau.
   */
  async purchase(userId: number, code: PlanCode = "PRO") {
    const { plan, duration } = planOf(code);
    const result = await prisma.$transaction(async (tx) => {
      const entry = await walletService.charge(tx, { userId, amount: plan.price, type: "PLAN_CHARGE", note: `Mua gói ${plan.name} ${duration}` });
      const extended = await extendPro(tx, userId, code, plan.price);
      return { ...extended, balanceAfter: entry.balanceAfter };
    });
    notificationService.proPurchased({ userId, planName: plan.name, duration, price: plan.price, renewed: result.renewed, expiresAt: result.proExpiresAt, balanceAfter: result.balanceAfter });
    userCache.invalidate(userId); // đã commit: lần xác thực sau thấy ngay gói Pro mới
    adminNoticeService.push("plan.purchased", { title: `${result.renewed ? "Gia hạn" : "Mua"} gói ${plan.name} ${duration}`, body: `${plan.price.toLocaleString("vi-VN")} credit`, userId, link: "/admin/purchases" });
    return { ...result, user: await userRepository.findById(userId) };
  },

  /**
   * Mua vé: trả tiền ngay nhưng CHƯA tính thời hạn Pro, người dùng tự kích hoạt sau (trong TICKET_VALID_DAYS ngày).
   * Trừ tiền và tạo vé trong một transaction: lỗi ở bước nào thì cả hai cùng huỷ, tiền không bị trừ mà không có vé.
   */
  async purchaseTicket(userId: number, code: PlanCode = "PRO") {
    const { plan, duration } = planOf(code);
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const entry = await walletService.charge(tx, { userId, amount: plan.price, type: "PLAN_CHARGE", note: `Mua vé ${plan.name} ${duration} (kích hoạt sau)` });
      // Đếm sau khi đã khóa dòng người dùng bằng lệnh trừ tiền, nên hai lần mua cùng lúc không lách được giới hạn
      if ((await proTicketRepository.countOpen(tx, userId, now)) >= TICKET_MAX_OPEN) {
        throw new AppError(`Bạn đang giữ ${TICKET_MAX_OPEN} vé chưa kích hoạt. Hãy kích hoạt bớt rồi mua thêm.`);
      }
      const ticket = await proTicketRepository.create(tx, { userId, plan: plan.code, price: plan.price, expiresAt: addDays(now, TICKET_VALID_DAYS) });
      return { ticket: { id: ticket.id, plan: ticket.plan, expiresAt: ticket.expiresAt }, balanceAfter: entry.balanceAfter };
    });
    userCache.invalidate(userId); // số dư đã đổi
    return { ...result, user: await userRepository.findById(userId) };
  },

  /** Các vé còn dùng được của một người (chưa kích hoạt, chưa hết hạn), vé sắp hết hạn đứng trước. */
  async tickets(userId: number) {
    const items = await proTicketRepository.listOpen(userId, new Date());
    return items.map((t) => ({ id: t.id, plan: t.plan, name: planOf(t.plan as PlanCode).plan.name, duration: planOf(t.plan as PlanCode).duration, price: t.price, expiresAt: t.expiresAt, createdAt: t.createdAt }));
  },

  /**
   * Kích hoạt một vé: đánh dấu đã dùng và cộng thời hạn Pro trong một transaction. Dòng người dùng bị khóa trước
   * (như lúc mua) nên không đè lên một lần mua khác cùng lúc; bấm đúp thì lần thứ hai thấy vé đã dùng và báo lỗi.
   */
  async activateTicket(userId: number, ticketId: number) {
    const result = await prisma.$transaction(async (tx) => {
      await userRepository.incrementBalance(tx, userId, 0); // chỉ để khóa dòng người dùng
      const now = new Date();
      const claimed = await proTicketRepository.claim(tx, ticketId, userId, now);
      if (claimed.count === 0) throw AppError.notFound("Vé này không còn dùng được: đã kích hoạt, đã hết hạn hoặc không phải của bạn");
      const ticket = await proTicketRepository.findPlan(tx, ticketId);
      if (!ticket) throw AppError.notFound("Không tìm thấy vé");
      return extendPro(tx, userId, ticket.plan as PlanCode, ticket.price, now);
    });
    userCache.invalidate(userId);
    return { ...result, user: await userRepository.findById(userId) };
  },

  /**
   * Dữ kiện thật để đưa lời mời Pro đúng lúc: buổi thi gần nhất (lịch FAP hoặc ngày người dùng tự đặt) và tổng tiền đã chi lẻ
   * cho việc Pro đã bao gồm. Không có dữ kiện thì trả rỗng, giao diện sẽ không mời.
   */
  async signals(userId: number) {
    const today = vnDate();
    const since = new Date(Date.now() - NUDGE_SPEND_WINDOW_DAYS * DAY_MS);
    const [slot, userDate, spent] = await Promise.all([planSignalRepository.nextExamSlot(userId, today), planSignalRepository.userExamDate(userId), planSignalRepository.spentSince(userId, since)]);

    const upcoming: { date: Date; subjectCode: string | null; source: "FAP" | "USER" }[] = [];
    if (slot) upcoming.push({ date: slot.examDate, subjectCode: slot.subjectCode, source: "FAP" });
    if (userDate && userDate.getTime() >= today.getTime()) upcoming.push({ date: userDate, subjectCode: null, source: "USER" });
    const nearest = upcoming.sort((a, b) => a.date.getTime() - b.date.getTime())[0];
    const daysLeft = nearest ? Math.round((nearest.date.getTime() - today.getTime()) / DAY_MS) : null;
    const exam = nearest && daysLeft !== null && daysLeft <= NUDGE_EXAM_WINDOW_DAYS ? { date: nearest.date.toISOString().slice(0, 10), daysLeft, subjectCode: nearest.subjectCode, source: nearest.source } : null;

    return {
      exam,
      spent: { days: NUDGE_SPEND_WINDOW_DAYS, total: Math.max(0, spent.fetch + spent.explain + spent.pe), fetch: spent.fetch, explain: spent.explain, pe: spent.pe, minToShow: NUDGE_MIN_SPEND },
    };
  },
};
