import { prisma } from "../configs/prisma";
import type { Db } from "./wallet.repository";

// Vé Pro (mua trước, kích hoạt sau). Các hàm nhận `db` để chạy được trong cùng một transaction với việc trừ tiền / cộng hạn Pro.
export const proTicketRepository = {
  create: (db: Db, data: { userId: number; plan: string; price: number; expiresAt: Date }) => db.proTicket.create({ data }),

  // Số vé chưa dùng và còn hạn của một người
  countOpen: (db: Db, userId: number, now: Date) => db.proTicket.count({ where: { userId, activatedAt: null, expiresAt: { gt: now } } }),

  // Vé còn dùng được, sắp hết hạn trước thì đứng trước
  listOpen: (userId: number, now: Date) =>
    prisma.proTicket.findMany({
      where: { userId, activatedAt: null, expiresAt: { gt: now } },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
      select: { id: true, plan: true, price: true, expiresAt: true, createdAt: true },
    }),

  /**
   * Đánh dấu vé đã dùng. Chỉ thành công khi vé là của đúng người này, chưa dùng và chưa hết hạn; trả về số dòng đổi
   * (0 = không hợp lệ hoặc đã dùng). Một câu UPDATE có điều kiện nên hai lần bấm cùng lúc chỉ một lần được tính.
   */
  claim: (db: Db, id: number, userId: number, now: Date) => db.proTicket.updateMany({ where: { id, userId, activatedAt: null, expiresAt: { gt: now } }, data: { activatedAt: now } }),

  findPlan: (db: Db, id: number) => db.proTicket.findUnique({ where: { id }, select: { plan: true, price: true } }),
};
