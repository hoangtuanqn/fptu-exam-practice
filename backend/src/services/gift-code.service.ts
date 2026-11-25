import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { creditLotRepository } from "../repositories/credit-lot.repository";
import { giftCodeRepository } from "../repositories/gift-code.repository";
import { AppError } from "../rules/error";
import type { CreateGiftCodeBody, UpdateGiftCodeBody } from "../rules/requests/gift-code.request";
import { toMeta, type PaginationQuery } from "../utils/pagination";
import { adminNoticeService } from "./admin-notice.service";
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
const INVALID = "Mã không đúng hoặc không còn hiệu lực. Kiểm tra lại từng ký tự (chữ O và số 0, chữ I và số 1) rồi thử lại.";

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

  async update(id: string, body: UpdateGiftCodeBody) {
    const { expiresAt: rawExpiresAt, ...rest } = body;
    const expiresAt = rawExpiresAt ? new Date(rawExpiresAt) : rawExpiresAt; // null = bỏ hạn
    if (expiresAt && expiresAt <= new Date()) {
      throw new AppError("Hạn dùng phải ở tương lai", 400, { expiresAt: "Hạn dùng phải ở tương lai" });
    }
    // Mã đã có người dùng thì code/credit/thời hạn credit chỉ được giữ nguyên (form gửi lại giá trị cũ vẫn qua)
    const locked = { code: body.code, amount: body.amount, creditTtlMinutes: body.creditTtlMinutes };
    const touchesLocked = Object.values(locked).some((v) => v !== undefined);
    const guard: Prisma.GiftCodeWhereInput = {
      usedCount: body.maxUses === undefined ? undefined : { lte: body.maxUses },
      OR: touchesLocked ? [{ usedCount: 0 }, locked] : undefined,
    };

    let count: number;
    try {
      count = await giftCodeRepository.update(id, { ...rest, expiresAt }, guard);
    } catch (err) {
      if (prismaCode(err) === "P2002") throw AppError.conflict("Mã này đã tồn tại", { code: "Mã này đã tồn tại" });
      throw err;
    }

    const current = await giftCodeRepository.findById(id);
    if (!current) throw AppError.notFound("Không tìm thấy mã");
    if (!count) {
      const changesLocked = (Object.keys(locked) as (keyof typeof locked)[]).some((k) => locked[k] !== undefined && locked[k] !== current[k]);
      if (current.usedCount > 0 && changesLocked) {
        throw AppError.conflict("Mã đã có người dùng, không đổi được mã, credit hoặc thời hạn credit");
      }
      if (body.maxUses !== undefined && body.maxUses < current.usedCount) {
        const msg = `Số lượt không được nhỏ hơn số lượt đã dùng (${current.usedCount})`;
        throw new AppError(msg, 400, { maxUses: msg });
      }
      // Còn lại: dữ liệu gửi lên trùng giá trị cũ nên không có dòng nào đổi
    }
    return { ...current, status: statusOf(current) };
  },

  async remove(id: string) {
    if (await giftCodeRepository.deleteUnused(id)) return;
    if (!(await giftCodeRepository.findById(id))) throw AppError.notFound("Không tìm thấy mã");
    throw AppError.conflict("Mã đã có người dùng, hãy tắt mã thay vì xóa");
  },

  async redemptions(id: string, query: PaginationQuery) {
    const { items, total } = await giftCodeRepository.listRedemptions(id, query);
    return { items, meta: toMeta(query, total) };
  },

  // ----- Thành viên
  async mine(userId: string, query: PaginationQuery) {
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
  async redeem(userId: string, code: string) {
    const result = await prisma.$transaction(async (tx) => {
      const gift = await giftCodeRepository.findByCode(tx, code);
      if (!gift) throw new AppError(INVALID);
      if (!(await giftCodeRepository.claimUse(tx, gift.id))) {
        // Mã có thật thì nói rõ lý do
        if (gift.active && gift.expiresAt && gift.expiresAt <= new Date()) throw new AppError("Mã này đã hết hạn sử dụng.");
        if (gift.active) throw new AppError("Mã này đã hết lượt, những người nhập trước đã dùng hết.");
        throw new AppError(INVALID);
      }
      const terms = await giftCodeRepository.lockTerms(tx, gift.id);
      gift.amount = Number(terms.amount);
      gift.creditTtlMinutes = terms.ttl === null ? null : Number(terms.ttl);
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
    adminNoticeService.push("gift.redeemed", { title: `Nhập giftcode ${result.code}`, body: `+${result.amount.toLocaleString("vi-VN")} credit`, userId, link: "/admin/gift-codes" });
    return result;
  },
};
