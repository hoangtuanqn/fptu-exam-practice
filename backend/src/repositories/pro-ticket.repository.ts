import { prisma } from "../configs/prisma";
import { PRO_PLAN } from "../constants/plan";
import type { Db } from "./wallet.repository";

// Vé Pro (mua trước, kích hoạt sau). Các hàm nhận `db` để chạy được trong cùng một transaction với việc trừ tiền / cộng hạn Pro.
export const proTicketRepository = {
  create: (db: Db, data: { userId: string; plan: string; price: number; expiresAt: Date }) => db.proTicket.create({ data }),

  // Số vé chưa dùng và còn hạn của một người
  countOpen: (db: Db, userId: string, now: Date) => db.proTicket.count({ where: { userId, activatedAt: null, expiresAt: { gt: now } } }),

  // Vé còn dùng được, sắp hết hạn trước thì đứng trước
  listOpen: (userId: string, now: Date) =>
    prisma.proTicket.findMany({
      where: { userId, activatedAt: null, expiresAt: { gt: now } },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
      select: { id: true, plan: true, price: true, expiresAt: true, createdAt: true },
    }),

  /**
   * Đánh dấu vé đã dùng. Chỉ thành công khi vé là của đúng người này, chưa dùng và chưa hết hạn; trả về số dòng đổi
   * (0 = không hợp lệ hoặc đã dùng). Một câu UPDATE có điều kiện nên hai lần bấm cùng lúc chỉ một lần được tính.
   */
  claim: (db: Db, id: string, userId: string, now: Date) => db.proTicket.updateMany({ where: { id, userId, activatedAt: null, expiresAt: { gt: now } }, data: { activatedAt: now } }),

  findPlan: (db: Db, id: string) => db.proTicket.findUnique({ where: { id }, select: { plan: true, price: true } }),

  /**
   * Đã mua gói Pro giá ưu đãi trong đợt này chưa (mua thẳng hoặc mua vé, tính từ mốc bắt đầu đợt). Mọi dòng PRO rẻ hơn giá gốc
   * đều là giá ưu đãi (chỉ plan.service tạo các dòng này), nên admin đổi giá giữa đợt thì người đã mua vẫn bị tính là đã dùng.
   */
  async usedPromo(db: Db, userId: string, since: Date) {
    // shortcut: vé ưu đãi của đợt trước kích hoạt trong đợt này tạo planPurchase mới nên bị tính là đã dùng; thêm cột nguồn (ticketId) vào plan_purchases nếu có người phàn nàn
    const where = { userId, plan: "PRO", price: { lt: PRO_PLAN.price }, createdAt: { gte: since } };
    return !!(await db.planPurchase.findFirst({ where, select: { id: true } })) || !!(await db.proTicket.findFirst({ where, select: { id: true } }));
  },

  /** Số tài khoản đã mua giá ưu đãi trong đợt (mua ngay hoặc vé; một người có cả hai chỉ tính một). */
  async promoBuyers(since: Date) {
    const where = { plan: "PRO", price: { lt: PRO_PLAN.price }, createdAt: { gte: since } };
    const [a, b] = await Promise.all([
      prisma.planPurchase.findMany({ where, select: { userId: true }, distinct: ["userId"] }),
      prisma.proTicket.findMany({ where, select: { userId: true }, distinct: ["userId"] }),
    ]);
    return new Set([...a, ...b].map((r) => r.userId)).size;
  },
};
