import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { creditLotRepository } from "../repositories/credit-lot.repository";
import { giftCodeRepository } from "../repositories/gift-code.repository";
import { AppError } from "../rules/error";
import type { CreateGiftCodeBody } from "../rules/requests/gift-code.request";
import { toMeta, type PaginationQuery } from "../utils/pagination";
import { notificationService } from "./notification.service";
import { walletService } from "./wallet.service";

// Bỏ các ký tự dễ nhầm (0/O, 1/I) để người dùng gõ mã không bị sai
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateCode = () => Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

type GiftCodeStatus = "ACTIVE" | "DISABLED" | "EXPIRED" | "USED_UP";

const statusOf = (g: { active: boolean; expiresAt: Date | null; usedCount: number; maxUses: number }): GiftCodeStatus => {
  if (!g.active) return "DISABLED";
  if (g.expiresAt && g.expiresAt <= new Date()) return "EXPIRED";
  if (g.usedCount >= g.maxUses) return "USED_UP";
  return "ACTIVE";
};

const prismaCode = (err: unknown) => (err instanceof Prisma.PrismaClientKnownRequestError ? err.code : null);

// Thông báo chung cho mã sai hoặc đã tắt để không lộ mã nào đang tồn tại
const INVALID = "Mã không hợp lệ hoặc không còn hiệu lực";

export const giftCodeService = {
  // ----- Admin
  async create(body: CreateGiftCodeBody) {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    if (expiresAt && expiresAt <= new Date()) {
      throw new AppError("Hạn dùng phải ở tương lai", 400, { expiresAt: "Hạn dùng phải ở tương lai" });
    }
    const data = { amount: body.amount, maxUses: body.maxUses, note: body.note, expiresAt, creditTtlMinutes: body.creditTtlMinutes };

    // Mã tự sinh trùng thì sinh lại; mã admin tự đặt trùng thì báo lỗi
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const created = await giftCodeRepository.create({ ...data, code: body.code ?? generateCode() });
        return { ...created, status: statusOf(created) };
      } catch (err) {
        if (prismaCode(err) !== "P2002") throw err;
        if (body.code) throw AppError.conflict("Mã này đã tồn tại", { code: "Mã này đã tồn tại" });
      }
    }
    throw new AppError("Không tạo được mã, vui lòng thử lại");
  },

  async list(query: PaginationQuery, filter: { q?: string; active?: boolean }) {
    const { items, total } = await giftCodeRepository.list(query, filter);
    return { items: items.map((g) => ({ ...g, status: statusOf(g) })), meta: toMeta(query, total) };
  },

  async setActive(id: number, active: boolean) {
    try {
      const updated = await giftCodeRepository.setActive(id, active);
      return { ...updated, status: statusOf(updated) };
    } catch (err) {
      if (prismaCode(err) === "P2025") throw AppError.notFound("Không tìm thấy mã");
      throw err;
    }
  },

  async redemptions(id: number, query: PaginationQuery) {
    const { items, total } = await giftCodeRepository.listRedemptions(id, query);
    return { items, meta: toMeta(query, total) };
  },

  // ----- Thành viên
  async mine(userId: number, query: PaginationQuery) {
    const { items, total } = await giftCodeRepository.listByUser(userId, query);
    return {
      items: items.map((r) => ({ id: r.id, code: r.giftCode.code, amount: r.amount, createdAt: r.createdAt })),
      meta: toMeta(query, total),
    };
  },

  /**
   * Nhập mã nhận credit. Mọi bước nằm trong một transaction: chiếm lượt (UPDATE có điều kiện), ghi nhận người dùng
   * (unique giftCodeId + userId: mỗi người một lần), cộng credit. Bước nào lỗi thì tất cả được hoàn tác.
   */
  async redeem(userId: number, code: string) {
    const result = await prisma.$transaction(async (tx) => {
      const gift = await giftCodeRepository.findByCode(tx, code);
      if (!gift) throw new AppError(INVALID);
      if (!(await giftCodeRepository.claimUse(tx, gift.id))) {
        // Mã có thật thì nói rõ lý do
        if (gift.active && gift.expiresAt && gift.expiresAt <= new Date()) throw new AppError("Mã đã hết hạn");
        if (gift.active) throw new AppError("Mã đã hết lượt sử dụng");
        throw new AppError(INVALID);
      }
      try {
        await giftCodeRepository.createRedemption(tx, { giftCodeId: gift.id, userId, amount: gift.amount });
      } catch (err) {
        if (prismaCode(err) === "P2002") throw new AppError("Bạn đã dùng mã này rồi");
        throw err;
      }
      const entry = await walletService.applyChange(tx, { userId, amount: gift.amount, type: "GIFT_CODE", note: `Giftcode ${gift.code}` });
      // Credit có thời hạn: ghi một lô credit hết hạn sau N phút kể từ lúc nhập (lô nằm trong số dư vừa cộng)
      const lifetimeMs = gift.creditTtlMinutes ? gift.creditTtlMinutes * 60_000 : 0;
      const creditExpiresAt = lifetimeMs ? new Date(Date.now() + lifetimeMs) : null;
      if (creditExpiresAt) await creditLotRepository.create(tx, { userId, source: "GIFT_CODE", amount: gift.amount, expiresAt: creditExpiresAt, note: `Giftcode ${gift.code}` });
      return { code: gift.code, amount: gift.amount, balanceAfter: entry.balanceAfter, creditExpiresAt };
    });

    // Gửi thư sau khi transaction đã commit
    notificationService.giftCodeRedeemed({ userId, ...result });
    return result;
  },
};
