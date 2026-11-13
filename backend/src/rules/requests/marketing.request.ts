import { z } from "zod";
import { CAMPAIGN_KEYS } from "../../constants/marketing";

// Không kiểm dạng ở đây: token sai dạng hay sai chữ ký đều nhận cùng một lỗi 400 từ service
const tokenField = z.string().optional();

// Hủy một chạm (RFC 8058): token nằm trong query `t` (header List-Unsubscribe), trang web gửi trong body `{ token }`
export const unsubscribeQuery = z.object({ t: tokenField });
export const unsubscribeBody = z.object({ token: tokenField }).optional();

export const campaignKeyParam = z.object({ key: z.enum(CAMPAIGN_KEYS) });
export const setCampaignBody = z.object({ enabled: z.boolean() });

export type UnsubscribeQuery = z.infer<typeof unsubscribeQuery>;
export type UnsubscribeBody = z.infer<typeof unsubscribeBody>;
export type CampaignKeyParam = z.infer<typeof campaignKeyParam>;
export type SetCampaignBody = z.infer<typeof setCampaignBody>;
