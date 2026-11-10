import crypto from "node:crypto";
import { prisma } from "../configs/prisma";
import { env } from "../configs/env";
import { EXPIRING_SOON_MS, LINK4M_HOSTS, LINK_REQUEST_TTL_MS, MAX_REQUESTS_PER_DAY } from "../constants/link-reward";
import type { Db } from "../repositories/wallet.repository";
import { AppError } from "../rules/error";
import { DAY_MS, startOfVnDay } from "../utils/time";
import { linkRewardSettingService } from "./link-reward-setting.service";

/**
 * Vượt link (Link4M) để nhận lượt giải thích AI miễn phí:
 *  1. start: máy chủ tạo mã dùng một lần gắn với tài khoản, nhờ Link4M rút gọn địa chỉ /account/nhan-luot?t=<mã>.
 *  2. Người dùng làm các bước của Link4M rồi được chuyển về địa chỉ đích đó.
 *  3. claim: kiểm tra mã (đúng tài khoản, còn hạn, chưa dùng, đã qua thời gian tối thiểu, chưa quá số lượt mỗi ngày) rồi cộng 1 lượt.
 * Lượt miễn phí hết hạn sau số ngày admin đặt; dùng lượt sắp hết hạn trước.
 */
const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{20,64}$/;

async function shorten(apiToken: string, destination: string): Promise<string> {
  const busy = () => new AppError("Dịch vụ vượt link đang bận, vui lòng thử lại sau ít phút", 502);
  type Reply = { status?: string; shortenedUrl?: unknown; message?: unknown };
  let reply: Reply | null = null;
  try {
    const res = await fetch(`https://link4m.co/api-shorten/v2?api=${encodeURIComponent(apiToken)}&url=${encodeURIComponent(destination)}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    reply = (await res.json()) as Reply;
  } catch {
    throw busy();
  }
  const json = reply as Reply | null;
  if (json?.status !== "success" || typeof json.shortenedUrl !== "string") {
    console.error(`[link-reward] Link4M từ chối yêu cầu: ${String(json?.message ?? "không rõ lý do").slice(0, 120)}`); // không ghi địa chỉ (có token)
    throw busy();
  }
  try {
    const u = new URL(json.shortenedUrl);
    if (u.protocol !== "https:" || !LINK4M_HOSTS.includes(u.hostname)) throw new Error("host");
    return u.href;
  } catch {
    console.error("[link-reward] Link4M trả về địa chỉ không hợp lệ");
    throw busy();
  }
}

const claimedToday = (userId: number) => prisma.linkRewardRequest.count({ where: { userId, status: "CLAIMED", claimedAt: { gte: startOfVnDay() } } });

export const linkRewardService = {
  /** Trạng thái cho người dùng: số lượt còn, lượt sắp hết hạn, số lần còn nhận được hôm nay */
  async status(userId: number) {
    const now = new Date();
    const [cfg, turns, today, expiredRecently] = await Promise.all([
      linkRewardSettingService.get(),
      prisma.freeExplainTurn.findMany({ where: { userId, usedAt: null, expiresAt: { gt: now } }, select: { expiresAt: true }, orderBy: { expiresAt: "asc" } }),
      claimedToday(userId),
      prisma.freeExplainTurn.count({ where: { userId, usedAt: null, expiresAt: { lte: now, gt: new Date(now.getTime() - 3 * DAY_MS) } } }), // vừa hết hạn trong 3 ngày qua mà chưa dùng
    ]);
    return {
      enabled: cfg.enabled && cfg.apiToken !== "", // tạo được link mới hay không (lượt đã có vẫn dùng được kể cả khi tắt)
      available: turns.length,
      nextExpiresAt: turns[0]?.expiresAt ?? null,
      expiringSoon: turns.filter((t) => t.expiresAt.getTime() - now.getTime() < EXPIRING_SOON_MS).length,
      expiredRecently,
      claimedToday: today,
      dailyLimit: cfg.dailyLimit,
      remainingToday: Math.max(0, cfg.dailyLimit - today),
      validDays: cfg.validDays,
    };
  },

  /** Tạo link vượt link cho người dùng (dùng lại link đang chờ nếu còn hạn, để không tạo thừa) */
  async start(userId: number) {
    const cfg = await linkRewardSettingService.get();
    if (!cfg.enabled || !cfg.apiToken) throw new AppError("Tính năng vượt link chưa được bật");
    if ((await claimedToday(userId)) >= cfg.dailyLimit) throw new AppError(`Hôm nay bạn đã nhận đủ ${cfg.dailyLimit} lượt. Ngày mai quay lại nhé.`);

    const now = new Date();
    const pending = await prisma.linkRewardRequest.findFirst({ where: { userId, status: "PENDING", expiresAt: { gt: now } }, orderBy: { id: "desc" } });
    if (pending) return { shortUrl: pending.shortUrl, expiresAt: pending.expiresAt };

    const issuedToday = await prisma.linkRewardRequest.count({ where: { userId, createdAt: { gte: startOfVnDay() } } });
    if (issuedToday >= MAX_REQUESTS_PER_DAY) throw new AppError("Hôm nay bạn đã tạo quá nhiều liên kết, vui lòng thử lại vào ngày mai");

    const token = crypto.randomBytes(24).toString("base64url");
    const destination = `${env.CLIENT_URL.replace(/\/+$/, "")}/account/nhan-luot?t=${token}`;
    const shortUrl = await shorten(cfg.apiToken, destination);
    const expiresAt = new Date(now.getTime() + LINK_REQUEST_TTL_MS);
    await prisma.linkRewardRequest.create({ data: { userId, tokenHash: hash(token), shortUrl, expiresAt } });
    return { shortUrl, expiresAt };
  },

  /** Nhận lượt sau khi vượt link xong. Gọi lại với cùng mã (tải lại trang) thì báo đã nhận, không cộng thêm. */
  async claim(userId: number, token: string) {
    if (!TOKEN_FORMAT.test(token)) throw AppError.notFound("Liên kết nhận lượt không hợp lệ");
    const request = await prisma.linkRewardRequest.findUnique({ where: { tokenHash: hash(token) } });
    if (!request || request.userId !== userId) throw AppError.notFound("Liên kết nhận lượt không hợp lệ hoặc không thuộc tài khoản này");
    if (request.status === "CLAIMED") return { granted: false, already: true, ...(await this.status(userId)) };

    const cfg = await linkRewardSettingService.get();
    const now = Date.now();
    if (request.expiresAt.getTime() < now) throw new AppError("Liên kết đã hết hạn (quá 30 phút). Hãy tạo liên kết mới rồi vượt lại.", 410);
    const waitMs = cfg.minSeconds * 1000 - (now - request.createdAt.getTime());
    if (waitMs > 0) throw new AppError(`Bạn hoàn thành quá nhanh. Hãy làm đủ các bước trên trang vượt link, rồi thử lại sau ${Math.ceil(waitMs / 1000)} giây.`, 429);
    if ((await claimedToday(userId)) >= cfg.dailyLimit) throw new AppError(`Hôm nay bạn đã nhận đủ ${cfg.dailyLimit} lượt. Ngày mai quay lại nhé.`);

    const expiresAt = new Date(now + cfg.validDays * DAY_MS);
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.linkRewardRequest.updateMany({ where: { id: request.id, status: "PENDING" }, data: { status: "CLAIMED", claimedAt: new Date(now) } });
      if (claimed.count !== 1) throw AppError.conflict("Liên kết này đã được dùng"); // hai yêu cầu cùng lúc: chỉ một lượt thành công
      await tx.freeExplainTurn.create({ data: { userId, requestId: request.id, expiresAt } });
    });
    return { granted: true, already: false, ...(await this.status(userId)) };
  },

  /** Dùng 1 lượt (sắp hết hạn trước) cho một câu. Gọi trong transaction của việc mua giải thích. false = không còn lượt hợp lệ. */
  async consume(db: Db, userId: number, examId: number, questionNumber: number) {
    const now = new Date();
    const turn = await db.freeExplainTurn.findFirst({ where: { userId, usedAt: null, expiresAt: { gt: now } }, orderBy: { expiresAt: "asc" }, select: { id: true } });
    if (!turn) return false;
    const used = await db.freeExplainTurn.updateMany({ where: { id: turn.id, usedAt: null }, data: { usedAt: now, usedExamId: examId, usedQuestionNumber: questionNumber } });
    return used.count === 1;
  },

  /** AI lỗi sau khi đã dùng lượt: trả lại lượt cho người dùng */
  async restore(db: Db, userId: number, examId: number, questionNumber: number) {
    await db.freeExplainTurn.updateMany({
      where: { userId, usedExamId: examId, usedQuestionNumber: questionNumber, usedAt: { not: null } },
      data: { usedAt: null, usedExamId: null, usedQuestionNumber: null },
    });
  },

  /** Số liệu cho admin */
  async stats() {
    const since = new Date(Date.now() - DAY_MS);
    const [issued24h, claimed24h, claimedTotal, activeTurns, usedTotal] = await Promise.all([
      prisma.linkRewardRequest.count({ where: { createdAt: { gte: since } } }),
      prisma.linkRewardRequest.count({ where: { status: "CLAIMED", claimedAt: { gte: since } } }),
      prisma.linkRewardRequest.count({ where: { status: "CLAIMED" } }),
      prisma.freeExplainTurn.count({ where: { usedAt: null, expiresAt: { gt: new Date() } } }),
      prisma.freeExplainTurn.count({ where: { usedAt: { not: null } } }),
    ]);
    return { issued24h, claimed24h, claimedTotal, activeTurns, usedTotal };
  },
};
