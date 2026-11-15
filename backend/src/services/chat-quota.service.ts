import { prisma } from "../configs/prisma";
import { CHAT_LIMITS, type ChatProvider } from "../constants/chat";
import type { Owner } from "../utils/actor";
import { needsCaptcha } from "../utils/chat-quota";
import { startOfVnDay } from "../utils/time";
import { captchaService } from "./captcha.service";

const defaults = {
  // Số tin của chính chủ này từ 0h hôm nay (giờ Việt Nam): thành viên theo tài khoản, khách theo ID khách của trình duyệt
  count: (owner: Owner): Promise<number> => prisma.chatLog.count({ where: { createdAt: { gte: startOfVnDay() }, ...("userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId }) } }),
  assert: (token: string | undefined, ip?: string) => captchaService.assert(token, ip),
};

export const chatQuotaService = {
  /**
   * Số tin mỗi đợt theo nơi trả lời (CHAT_LIMITS: guestBatch cho khách, memberBatch cho thành viên), đặt lại 0h mỗi ngày. Hết một đợt thì tin kế tiếp cần captcha (ném lỗi errors.captcha
   * để giao diện hiện hộp captcha rồi gửi lại kèm token); qua captcha là mở đợt kế tiếp.
   */
  async check(owner: Owner, captchaToken: string | undefined, ip: string | undefined, provider: ChatProvider = "anthropic", deps: Partial<typeof defaults> = {}) {
    const { count, assert } = { ...defaults, ...deps };
    const limits = CHAT_LIMITS[provider];
    const batch = "userId" in owner ? limits.memberBatch : limits.guestBatch;
    if (needsCaptcha(await count(owner), batch)) await assert(captchaToken, ip);
  },
};
