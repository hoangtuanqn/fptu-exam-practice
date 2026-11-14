import { env } from "../configs/env";
import {
  CAMPAIGN_KEYS,
  CAMPAIGN_META,
  DEFAULT_MARKETING_PARAMS,
  MARKETING_PAUSE_DAYS,
  PARAM_LIMITS,
  TOPIC_BITS,
  type CampaignKey,
  type MarketingParams,
  type MarketingTopic,
} from "../constants/marketing";
import { marketingRepository, type Recipient } from "../repositories/marketing.repository";
import { userRepository, type PublicUser } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import { safeTarget, verifyClickToken } from "../utils/marketing-click";
import { verifyMarketingToken } from "../utils/marketing-token";
import { DAY_MS } from "../utils/time";
import { inlineMailImages, mailService } from "./mail.service";
import { marketingCampaignService, oneClickUrl } from "./marketing-campaign.service";
import { marketingSettingService } from "./marketing-setting.service";

export type UnsubscribeMode = "all" | "pause" | "topic";

// Người nhận giả cho xem trước: không dùng dữ liệu của ai (id 0 không phải tài khoản nào)
export const PREVIEW_RECIPIENT: Recipient = { id: 0, email: "ban@example.com", fullName: "Bạn", proExpiresAt: null };

const paramsView = (values: MarketingParams) => ({ values, defaults: DEFAULT_MARKETING_PARAMS, limits: PARAM_LIMITS });

export const marketingService = {
  /**
   * Từ liên kết trong thư (không cần đăng nhập): "all" huỷ tất cả, "pause" tạm dừng MARKETING_PAUSE_DAYS ngày, "topic" tắt riêng một loại thư.
   * Gọi lại nhiều lần vẫn ổn.
   */
  async unsubscribe(token: string, mode: UnsubscribeMode = "all", topic?: MarketingTopic) {
    const userId = verifyMarketingToken(env.JWT_SECRET, token);
    if (userId === null) throw new AppError("Liên kết không hợp lệ", 400);
    if (mode === "pause") await userRepository.pauseMarketing(userId, new Date(Date.now() + MARKETING_PAUSE_DAYS * DAY_MS));
    else if (mode === "topic" && topic) await userRepository.muteMarketingTopic(userId, TOPIC_BITS[topic]);
    else await userRepository.optOutMarketing(userId);
    return { ok: true, mode };
  },

  /** Nút trong thư: ghi lượt bấm, trả địa chỉ chuyển hướng. Đích luôn là CLIENT_URL + đường dẫn lưu trong log, không bao giờ lấy từ URL. */
  async click(token: string) {
    const logId = verifyClickToken(env.JWT_SECRET, token);
    if (logId === null) return env.CLIENT_URL;
    try {
      return env.CLIENT_URL + safeTarget(await marketingRepository.recordClick(logId, new Date()));
    } catch (err) {
      console.error("[marketing] không ghi được lượt bấm:", (err as Error).message);
      return env.CLIENT_URL; // người bấm vẫn vào được trang
    }
  },

  async campaigns() {
    const [flags, counts, params] = await Promise.all([marketingSettingService.flags(), marketingRepository.sentCounts(), marketingSettingService.params()]);
    return CAMPAIGN_KEYS.map((key) => {
      const meta = CAMPAIGN_META[key];
      const steps = Array.from({ length: meta.steps }, (_, i) => ({
        step: i + 1,
        sentCount: counts.filter((c) => c.campaign === key && Number(c.step) === i + 1).reduce((n, c) => n + Number(c.n), 0),
      }));
      return { key, label: meta.label, description: meta.description(params), enabled: flags[key], steps };
    });
  },

  async setEnabled(key: CampaignKey, enabled: boolean) {
    await marketingSettingService.setEnabled(key, enabled);
    return (await this.campaigns()).find((c) => c.key === key)!;
  },

  eligibleCounts: () => marketingCampaignService.eligibleCounts(),

  /** Gửi thư mẫu (mọi bước) CHỈ tới email của chính admin đang bấm; không ghi log chiến dịch. */
  async sendTest(key: CampaignKey, admin: PublicUser) {
    const to = { id: admin.id, email: admin.email, fullName: admin.fullName, proExpiresAt: admin.proExpiresAt };
    const mails = marketingCampaignService.samples(key, to, new Date(), await marketingSettingService.params());
    for (const mail of mails) await mailService.sendMarketing(admin.email, { ...mail, subject: `[Thử] ${mail.subject}` }, oneClickUrl(admin.id));
    return { sent: mails.length, to: admin.email };
  },

  /** Xem trước một bước thư với số liệu minh hoạ và người nhận giả; ảnh cid thay bằng data URI để hiện trong iframe. */
  async preview(key: CampaignKey, step: number) {
    const mail = marketingCampaignService.samples(key, PREVIEW_RECIPIENT, new Date(), await marketingSettingService.params())[step - 1];
    if (!mail) throw AppError.notFound("Chiến dịch không có bước thư này");
    return { subject: mail.subject, html: inlineMailImages(mail.html) };
  },

  params: async () => paramsView(await marketingSettingService.params()),
  setParams: async (patch: Partial<MarketingParams>) => paramsView(await marketingSettingService.setParams(patch)),
  resetParams: async () => paramsView(await marketingSettingService.resetParams()),
};
