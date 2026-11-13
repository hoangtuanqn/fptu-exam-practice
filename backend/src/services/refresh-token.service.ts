import { createHash, randomBytes, randomUUID } from "node:crypto";
import { env } from "../configs/env";
import { refreshTokenRepository } from "../repositories/refresh-token.repository";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import { TtlCache } from "../utils/ttl-cache";

const DAY_MS = 24 * 60 * 60 * 1000;
// Hai tab cùng làm mới một lúc là chuyện bình thường: token vừa bị thay trong vài giây này không bị coi là bị đánh cắp
const REUSE_GRACE_MS = 10_000;
// Ghi lần hoạt động gần nhất (đăng nhập, làm mới phiên) tối đa 1 lần mỗi giờ mỗi người; nhớ trong bộ nhớ nên không tốn thêm truy vấn để kiểm tra
const ACTIVE_TOUCH_MS = 60 * 60 * 1000;
const touched = new TtlCache<number, true>(ACTIVE_TOUCH_MS, 20_000);
const touchActive = (userId: number) => {
  if (touched.get(userId)) return;
  touched.set(userId, true);
  userRepository.touchActive(userId, new Date()).catch((err) => console.error("[auth] không ghi được lần hoạt động:", (err as Error).message));
};

export interface ClientContext {
  ip?: string;
  userAgent?: string;
}

// Chỉ lưu băm: lộ DB cũng không dùng được token
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Phiên đăng nhập dài hạn (refresh token). Access token (JWT) sống ngắn; khi hết hạn, giao diện đổi refresh token
 * lấy access token mới. Mỗi lần đổi, refresh token cũng được xoay vòng (cấp cái mới, thu hồi cái cũ).
 * Token đã thu hồi mà bị đưa lại sau thời gian châm chước là dấu hiệu bị lộ: xoá cả phiên, buộc đăng nhập lại.
 */
export const refreshTokenService = {
  // Gọi khi đăng nhập (mọi cách) và khi xoay vòng token, nên cũng là chỗ ghi lần hoạt động gần nhất
  async issue(userId: number, ctx: ClientContext, familyId: string = randomUUID()) {
    touchActive(userId);
    const token = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * DAY_MS);
    await refreshTokenRepository.create({
      userId,
      tokenHash: hashToken(token),
      familyId,
      expiresAt,
      userAgent: ctx.userAgent?.slice(0, 255),
      ip: ctx.ip?.slice(0, 64),
    });
    return { token, expiresAt };
  },

  /** Đổi refresh token lấy phiên mới. `refreshToken` là null khi chỉ cấp lại access token (cookie đã được tab khác thay). */
  async rotate(raw: string, ctx: ClientContext): Promise<{ userId: number; refreshToken: string | null }> {
    const record = await refreshTokenRepository.findByHash(hashToken(raw));
    if (!record || record.expiresAt <= new Date()) throw AppError.unauthorized();

    if (record.revokedAt) {
      if (Date.now() - record.revokedAt.getTime() <= REUSE_GRACE_MS) return { userId: record.userId, refreshToken: null };
      await refreshTokenRepository.deleteFamily(record.familyId); // token cũ bị dùng lại: coi như bị lộ
      throw AppError.unauthorized();
    }

    // Thua cuộc đua với yêu cầu khác cùng lúc: yêu cầu kia đã cấp token mới
    if (!(await refreshTokenRepository.revoke(record.id))) return { userId: record.userId, refreshToken: null };

    const next = await this.issue(record.userId, ctx, record.familyId);
    return { userId: record.userId, refreshToken: next.token };
  },

  /** Đăng xuất: xoá cả phiên của thiết bị này. Không báo lỗi nếu token không còn. */
  async logout(raw: string) {
    const record = await refreshTokenRepository.findByHash(hashToken(raw));
    if (record) await refreshTokenRepository.deleteFamily(record.familyId);
  },

  revokeAllOfUser: (userId: number) => refreshTokenRepository.deleteAllOfUser(userId),

  cleanup: () => refreshTokenRepository.deleteExpired(),
};
