import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { REFERRAL_CODE_ALPHABET, REFERRAL_CODE_LENGTH } from "../constants/referral";
import { referralRepository } from "../repositories/referral.repository";
import type { Db } from "../repositories/wallet.repository";
import { maskEmail } from "../utils/mask";
import { toMeta, type PaginationQuery } from "../utils/pagination";
import { notificationService } from "./notification.service";
import { referralSettingService } from "./referral-setting.service";
import { walletService } from "./wallet.service";

const randomCode = () => Array.from({ length: REFERRAL_CODE_LENGTH }, () => REFERRAL_CODE_ALPHABET[randomInt(REFERRAL_CODE_ALPHABET.length)]).join("");

// Một khoản thưởng vừa được cộng, để gửi email SAU khi transaction đã commit
export interface RewardNotice {
  recipientId: number;
  kind: "signup" | "referrer_signup" | "commission";
  otherName: string; // tên người còn lại trong cặp giới thiệu
  amount: number;
  balanceAfter: number;
}

export const referralService = {
  // Mã chưa trùng với ai (kiểm tra trước; trùng cực hiếm và còn có ràng buộc unique ở DB)
  async uniqueCode() {
    for (let i = 0; i < 10; i++) {
      const code = randomCode();
      if (!(await referralRepository.codeExists(code))) return code;
    }
    throw new Error("Không sinh được mã giới thiệu");
  },

  // Người dùng cũ chưa có mã thì tạo khi cần; mã không đổi sau đó
  async ensureCode(userId: number) {
    const current = (await referralRepository.findCodeOf(userId))?.referralCode;
    if (current) return current;
    for (let i = 0; i < 5; i++) {
      try {
        return (await referralRepository.setCode(userId, await this.uniqueCode())).referralCode!;
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      }
    }
    throw new Error("Không tạo được mã giới thiệu");
  },

  /**
   * Gọi trong transaction đăng ký. Mã hợp lệ thì gắn người giới thiệu cho tài khoản mới; chương trình đang bật thì cộng
   * thưởng cho người mới (và cho người giới thiệu nếu admin đặt). Mã sai thì bỏ qua êm, không làm hỏng việc đăng ký.
   */
  async applyAtSignup(db: Db, newUser: { id: number; fullName: string }, code: string | undefined): Promise<RewardNotice[]> {
    if (!code) return [];
    const owner = await referralRepository.findOwnerByCode(db, code);
    if (!owner || owner.status !== "ACTIVE" || owner.id === newUser.id) return [];
    await referralRepository.setReferrer(db, newUser.id, owner.id);

    const config = await referralSettingService.get();
    if (!config.enabled) return [];
    const referrer = await db.user.findUnique({ where: { id: owner.id }, select: { fullName: true } });
    const notices: RewardNotice[] = [];

    if (config.signupBonus > 0) {
      const entry = await walletService.applyChange(db, { userId: newUser.id, amount: config.signupBonus, type: "REFERRAL_BONUS", note: "Thưởng đăng ký qua mã giới thiệu" });
      await referralRepository.createReward(db, { referrerId: owner.id, referredId: newUser.id, type: "SIGNUP_BONUS", amount: config.signupBonus });
      notices.push({ recipientId: newUser.id, kind: "signup", otherName: referrer?.fullName ?? "", amount: config.signupBonus, balanceAfter: entry.balanceAfter });
    }
    if (config.referrerSignupBonus > 0) {
      const entry = await walletService.applyChange(db, { userId: owner.id, amount: config.referrerSignupBonus, type: "REFERRAL_BONUS", note: `Thưởng giới thiệu ${newUser.fullName}` });
      await referralRepository.createReward(db, { referrerId: owner.id, referredId: newUser.id, type: "REFERRER_BONUS", amount: config.referrerSignupBonus });
      notices.push({ recipientId: owner.id, kind: "referrer_signup", otherName: newUser.fullName, amount: config.referrerSignupBonus, balanceAfter: entry.balanceAfter });
    }
    return notices;
  },

  /**
   * Gọi trong transaction cộng tiền nạp: người nạp có người giới thiệu thì người đó nhận % số tiền vừa nạp.
   * depositOrderId duy nhất trong sổ thưởng nên một lệnh nạp không bao giờ sinh hoa hồng hai lần.
   */
  async rewardDeposit(db: Db, input: { depositorId: number; depositorName: string; depositOrderId: number; code: string; amount: number }): Promise<RewardNotice | null> {
    const link = await referralRepository.findReferrerOf(db, input.depositorId);
    if (!link?.referredById) return null;
    const config = await referralSettingService.get();
    if (!config.enabled || config.commissionPercent <= 0) return null;
    const commission = Math.floor((input.amount * config.commissionPercent) / 100);
    if (commission <= 0) return null;

    // Ghi sổ thưởng TRƯỚC (depositOrderId duy nhất chặn trả hoa hồng hai lần), rồi mới cộng credit.
    // Lỗi ở đây không được làm hỏng việc cộng tiền nạp của người dùng: bỏ qua hoa hồng và ghi log.
    try {
      await referralRepository.createReward(db, { referrerId: link.referredById, referredId: input.depositorId, type: "DEPOSIT_COMMISSION", amount: commission, depositOrderId: input.depositOrderId });
      const entry = await walletService.applyChange(db, {
        userId: link.referredById,
        amount: commission,
        type: "REFERRAL_COMMISSION",
        note: `Hoa hồng ${config.commissionPercent}% từ lệnh nạp ${input.code}`,
      });
      return { recipientId: link.referredById, kind: "commission", otherName: input.depositorName, amount: commission, balanceAfter: entry.balanceAfter };
    } catch (err) {
      console.error(`[referral] không trả được hoa hồng cho lệnh nạp ${input.code}: ${(err as Error).message}`);
      return null;
    }
  },

  // Gửi email sau khi transaction đã commit
  notify(notices: (RewardNotice | null)[]) {
    for (const n of notices) if (n) notificationService.referralReward(n);
  },

  // ----- Thành viên
  async overview(userId: number, query: PaginationQuery) {
    const [code, config, stats, list] = await Promise.all([
      this.ensureCode(userId),
      referralSettingService.get(),
      referralRepository.statsOf(userId),
      referralRepository.listReferred(userId, query),
    ]);
    const commission = await referralRepository.commissionByReferred(list.items.map((u) => u.id));
    return {
      code,
      program: { enabled: config.enabled, signupBonus: config.signupBonus, commissionPercent: config.commissionPercent },
      stats,
      items: list.items.map((u) => ({ id: u.id, name: u.fullName, email: maskEmail(u.email), joinedAt: u.createdAt, earned: commission.get(u.id) ?? 0 })),
      meta: toMeta(query, list.total),
    };
  },

  // Công khai: trang đăng ký hỏi mã có hợp lệ không để hiện lời mời (không lộ người giới thiệu là ai)
  async publicInfo(code: string) {
    const [owner, config] = await Promise.all([referralRepository.findOwnerByCode(prisma, code), referralSettingService.get()]);
    return { valid: Boolean(owner) && config.enabled, bonus: config.signupBonus };
  },

  // ----- Admin
  async adminList(query: PaginationQuery) {
    const { items, total } = await referralRepository.listAll(query);
    const commission = await referralRepository.commissionByReferred(items.map((u) => u.id));
    return {
      items: items.map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, joinedAt: u.createdAt, referrer: u.referredBy, earned: commission.get(u.id) ?? 0 })),
      meta: toMeta(query, total),
    };
  },
};
