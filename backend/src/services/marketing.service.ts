import { env } from "../configs/env";
import { CAMPAIGN_KEYS, CAMPAIGN_META, type CampaignKey } from "../constants/marketing";
import { marketingRepository } from "../repositories/marketing.repository";
import { userRepository, type PublicUser } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import { verifyMarketingToken } from "../utils/marketing-token";
import { mailService } from "./mail.service";
import { marketingCampaignService, oneClickUrl } from "./marketing-campaign.service";
import { marketingSettingService } from "./marketing-setting.service";

export const marketingService = {
  /** Hủy nhận thư marketing bằng token trong thư (không cần đăng nhập). Gọi lại nhiều lần vẫn ổn. */
  async unsubscribe(token: string) {
    const userId = verifyMarketingToken(env.JWT_SECRET, token);
    if (userId === null) throw new AppError("Liên kết không hợp lệ", 400);
    await userRepository.optOutMarketing(userId);
    return { ok: true };
  },

  async campaigns() {
    const [flags, counts] = await Promise.all([marketingSettingService.flags(), marketingRepository.sentCounts()]);
    return CAMPAIGN_KEYS.map((key) => {
      const meta = CAMPAIGN_META[key];
      const steps = Array.from({ length: meta.steps }, (_, i) => ({
        step: i + 1,
        sentCount: counts.filter((c) => c.campaign === key && Number(c.step) === i + 1).reduce((n, c) => n + Number(c.n), 0),
      }));
      return { key, label: meta.label, description: meta.description, enabled: flags[key], steps };
    });
  },

  async setEnabled(key: CampaignKey, enabled: boolean) {
    await marketingSettingService.setEnabled(key, enabled);
    return (await this.campaigns()).find((c) => c.key === key)!;
  },

  eligibleCounts: () => marketingCampaignService.eligibleCounts(),

  /** Gửi thư mẫu (mọi bước) CHỈ tới email của chính admin đang bấm; không ghi log chiến dịch. */
  async sendTest(key: CampaignKey, admin: PublicUser) {
    const mails = marketingCampaignService.samples(key, { id: admin.id, email: admin.email, fullName: admin.fullName, proExpiresAt: admin.proExpiresAt });
    for (const mail of mails) await mailService.sendMarketing(admin.email, { ...mail, subject: `[Thử] ${mail.subject}` }, oneClickUrl(admin.id));
    return { sent: mails.length, to: admin.email };
  },
};
