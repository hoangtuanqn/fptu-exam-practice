import { prisma } from "../configs/prisma";
import { CHAT_GUEST_BATCH, CHAT_MEMBER_BATCH } from "../constants/chat";
import type { Owner } from "../utils/actor";
import { needsCaptcha } from "../utils/chat-quota";
import { startOfVnDay } from "../utils/time";
import { captchaService } from "./captcha.service";

const defaults = {
  // Số tin của chính chủ này từ 0h hôm nay (giờ Việt Nam): thành viên theo tài khoản, khách theo ID khách của trình duyệt
  count: (owner: Owner) => prisma.chatLog.count({ where: { createdAt: { gte: startOfVnDay() }, ...("userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId }) } }),
  assert: (token: string | undefined, ip?: string) => captchaService.assert(token, ip),
};

export const chatQuotaService = {
  /**
   * Khách: 10 tin mỗi đợt, thành viên: 20 tin mỗi đợt, đặt lại 0h mỗi ngày. Hết một đợt thì tin kế tiếp cần captcha (ném lỗi errors.captcha
   * để giao diện hiện hộp captcha rồi gửi lại kèm token); qua captcha là mở đợt kế tiếp.
   */
  async check(owner: Owner, captchaToken: string | undefined, ip: string | undefined, deps: Partial<typeof defaults> = {}) {
    const { count, assert } = { ...defaults, ...deps };
    const batch = "userId" in owner ? CHAT_MEMBER_BATCH : CHAT_GUEST_BATCH;
    if (needsCaptcha(await count(owner), batch)) await assert(captchaToken, ip);
  },
};
