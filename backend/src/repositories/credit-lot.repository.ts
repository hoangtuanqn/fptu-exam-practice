import { prisma } from "../configs/prisma";
import type { Db } from "./wallet.repository";

interface LotRow {
  id: number;
  remaining: number;
}

export const creditLotRepository = {
  create: (db: Db, data: { userId: number; source: string; amount: number; expiresAt: Date; note?: string }) =>
    db.creditLot.create({ data: { ...data, remaining: data.amount }, select: { id: true, amount: true, expiresAt: true } }),

  // Lots with credit left, earliest expiry first. Locks the rows: call it inside the same transaction that changes the balance.
  lockUsable: (db: Db, userId: number) =>
    db.$queryRaw<LotRow[]>`SELECT id, remaining FROM credit_lots WHERE user_id = ${userId} AND remaining > 0 ORDER BY expires_at ASC, id ASC FOR UPDATE`,

  setRemaining: (db: Db, id: number, remaining: number) => db.creditLot.update({ where: { id }, data: { remaining }, select: { id: true } }),

  async lockOne(db: Db, id: number) {
    const rows = await db.$queryRaw<{ id: number; user_id: number; remaining: number; expires_at: Date }[]>`
      SELECT id, user_id, remaining, expires_at FROM credit_lots WHERE id = ${id} FOR UPDATE`;
    return rows[0] ?? null;
  },

  // Lots that are past their expiry and still hold credit (the expiry job works through these)
  listDue: (limit: number) =>
    prisma.creditLot.findMany({ where: { remaining: { gt: 0 }, expiresAt: { lte: new Date() } }, select: { id: true, userId: true }, orderBy: { expiresAt: "asc" }, take: limit }),

  // Lots of one user that still count, soonest expiry first (shown on the giftcode page)
  listActiveByUser: (userId: number) =>
    prisma.creditLot.findMany({ where: { userId, remaining: { gt: 0 }, expiresAt: { gt: new Date() } }, select: { id: true, amount: true, remaining: true, expiresAt: true, note: true }, orderBy: { expiresAt: "asc" }, take: 50 }),
};
