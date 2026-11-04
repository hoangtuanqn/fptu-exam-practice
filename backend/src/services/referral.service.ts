import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { userRepository } from "../repositories/user.repository";
import { REFERRAL_CODE_ALPHABET, REFERRAL_CODE_LENGTH } from "../constants/referral";
import { referralRepository } from "../repositories/referral.repository";
import { AppError } from "../rules/error";
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

// Hạn nhập mã giới thiệu: ngày đăng ký + số ngày được phép
const claimState = (me: { createdAt: Date; referredById: number | null }, config: { enabled: boolean; claimWindowDays: number }) => {
  if (me.referredById) return { status: "referred" as const, deadline: null };
  const deadline = claimDeadline(me.createdAt, config.claimWindowDays);
  if (!config.enabled) return { status: "unavailable" as const, deadline: null };
  return Date.now() > deadline.getTime() ? { status: "expired" as const, deadline } : { status: "open" as const, deadline };
};

const claimDeadline = (createdAt: Date, days: number) => new Date(createdAt.getTime() + days * 24 * 3600_000);

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

  // Cộng thưởng đăng ký cho người mới (và người giới thiệu nếu admin đặt). Dùng chung cho lúc đăng ký và lúc nhập mã muộn.
  async grantSignupRewards(db: Db, newUser: { id: number; fullName: string }, ownerId: number): Promise<RewardNotice[]> {
    const config = await referralSettingService.get();
    if (!config.enabled) return [];
    const referrer = await db.user.findUnique({ where: { id: ownerId }, select: { fullName: true } });
    const notices: RewardNotice[] = [];

    if (config.signupBonus > 0) {
      const entry = await walletService.applyChange(db, { userId: newUser.id, amount: config.signupBonus, type: "REFERRAL_BONUS", note: "Thưởng nhập mã giới thiệu" });
      await referralRepository.createReward(db, { referrerId: ownerId, referredId: newUser.id, type: "SIGNUP_BONUS", amount: config.signupBonus });
      notices.push({ recipientId: newUser.id, kind: "signup", otherName: referrer?.fullName ?? "", amount: config.signupBonus, balanceAfter: entry.balanceAfter });
    }
    if (config.referrerSignupBonus > 0) {
      const entry = await walletService.applyChange(db, { userId: ownerId, amount: config.referrerSignupBonus, type: "REFERRAL_BONUS", note: `Thưởng giới thiệu ${newUser.fullName}` });
      await referralRepository.createReward(db, { referrerId: ownerId, referredId: newUser.id, type: "REFERRER_BONUS", amount: config.referrerSignupBonus });
      notices.push({ recipientId: ownerId, kind: "referrer_signup", otherName: newUser.fullName, amount: config.referrerSignupBonus, balanceAfter: entry.balanceAfter });
    }
    return notices;
  },

  /**
   * Gọi trong transaction đăng ký. Mã hợp lệ thì gắn người giới thiệu cho tài khoản mới và cộng thưởng (nếu chương trình đang bật).
   * Mã sai thì bỏ qua êm, không làm hỏng việc đăng ký.
   */
  async applyAtSignup(db: Db, newUser: { id: number; fullName: string }, code: string | undefined): Promise<RewardNotice[]> {
    if (!code) return [];
    const owner = await referralRepository.findOwnerByCode(db, code);
    if (!owner || owner.status !== "ACTIVE" || owner.id === newUser.id) return [];
    await referralRepository.setReferrer(db, newUser.id, owner.id);
    return this.grantSignupRewards(db, newUser, owner.id);
  },

  /**
   * Nhập mã giới thiệu SAU khi đăng ký, trong hạn `claimWindowDays` (mặc định 7 ngày) và khi chưa có người giới thiệu.
   * Quá hạn thì mất quyền. Gắn người giới thiệu bằng UPDATE có điều kiện nên không thể nhập hai lần.
   */
  async claim(userId: number, code: string) {
    const [user, config] = await Promise.all([userRepository.findReferralProfile(userId), referralSettingService.get()]);
    if (!user) throw new AppError("Không tìm thấy tài khoản", 404);
    if (user.referredById) throw new AppError("Bạn đã được giới thiệu rồi, không thể nhập thêm mã");
    if (!config.enabled) throw new AppError("Chương trình giới thiệu đang tạm dừng");
    if (Date.now() > claimDeadline(user.createdAt, config.claimWindowDays).getTime()) {
      throw new AppError(`Đã quá hạn nhập mã giới thiệu (${config.claimWindowDays} ngày kể từ khi đăng ký)`);
    }

    const owner = await referralRepository.findOwnerByCode(prisma, code);
    // Cùng một thông báo cho mã sai và mã của chính mình, không lộ thêm thông tin
    if (!owner || owner.status !== "ACTIVE" || owner.id === userId) throw new AppError("Mã giới thiệu không hợp lệ", 400, { code: "Mã giới thiệu không hợp lệ" });
    // Chặn vòng giới thiệu: người do bạn giới thiệu không thể là người giới thiệu bạn
    const ownerLink = await referralRepository.findReferrerOf(prisma, owner.id);
    if (ownerLink?.referredById === userId) throw new AppError("Không thể nhập mã của người do chính bạn giới thiệu", 400, { code: "Mã không hợp lệ" });

    const notices = await prisma.$transaction(async (tx) => {
      if (!(await referralRepository.setReferrerIfNone(tx, userId, owner.id))) throw new AppError("Bạn đã được giới thiệu rồi, không thể nhập thêm mã");
      return this.grantSignupRewards(tx, user, owner.id);
    });
    this.notify(notices);
    return { bonus: notices.find((n) => n.kind === "signup")?.amount ?? 0 };
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
    const [code, config, stats, list, me] = await Promise.all([
      this.ensureCode(userId),
      referralSettingService.get(),
      referralRepository.statsOf(userId),
      referralRepository.listReferred(userId, query),
      userRepository.findReferralProfile(userId),
    ]);
    const commission = await referralRepository.commissionByReferred(list.items.map((u) => u.id));
    return {
      code,
      program: { enabled: config.enabled, signupBonus: config.signupBonus, commissionPercent: config.commissionPercent },
      // Nhập mã giới thiệu sau khi đăng ký: còn được nhập không, hạn chót là khi nào
      claim: me ? claimState(me, config) : { status: "unavailable" as const, deadline: null },
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
  adminSummary: () => referralRepository.summary(),

  async adminList(query: PaginationQuery) {
    const { items, total } = await referralRepository.listAll(query);
    const commission = await referralRepository.commissionByReferred(items.map((u) => u.id));
    return {
      items: items.map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, joinedAt: u.createdAt, referrer: u.referredBy, earned: commission.get(u.id) ?? 0 })),
      meta: toMeta(query, total),
    };
  },
};
