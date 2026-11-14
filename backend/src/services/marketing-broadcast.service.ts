import type { MarketingBroadcast } from "@prisma/client";
import { HTTP_STATUS } from "../constants/httpStatus";
import { BROADCAST_CONFIRM, type BroadcastSegment } from "../constants/marketing";
import { marketingRepository } from "../repositories/marketing.repository";
import { broadcastRepository } from "../repositories/marketing-broadcast.repository";
import type { PublicUser } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import type { CreateBroadcastBody } from "../rules/requests/marketing.request";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";
import { inlineMailImages, mailService } from "./mail.service";
import { PREVIEW_RECIPIENT } from "./marketing.service";
import { broadcastAudience, broadcastMail, broadcastPreviewUrl, oneClickUrl } from "./marketing-campaign.service";
import { marketingSettingService } from "./marketing-setting.service";

// Gửi thủ công: admin soạn bản nháp, gửi thử cho chính mình, gõ "GỬI" để bắt đầu. Thư thật chỉ đi qua lượt chạy marketing hằng ngày
// (marketingCampaignService.run): cùng hạn mức ngày, cùng giới hạn 1 thư / minGapDays ngày, cùng kiểm tra huỷ / tắt loại "news" / tạm dừng.

// Bàn phím tiếng Việt có thể gửi dấu dạng tổ hợp nên chuẩn hoá Unicode trước khi so
export const isBroadcastConfirm = (v: unknown) => typeof v === "string" && v.normalize("NFC").trim() === BROADCAST_CONFIRM.normalize("NFC");

const get = async (id: number) => {
  const b = await broadcastRepository.find(id);
  if (!b) throw AppError.notFound("Không tìm thấy thư gửi thủ công");
  return b;
};

const view = (b: MarketingBroadcast, counts?: { sent: number; clicked: number }) => ({
  id: b.id,
  subject: b.subject,
  body: b.body,
  ctaLabel: b.ctaLabel,
  ctaPath: b.ctaPath,
  segment: b.segment as BroadcastSegment,
  segmentDays: b.segmentDays,
  status: b.status,
  createdById: b.createdById,
  createdAt: b.createdAt,
  sent: counts?.sent ?? 0,
  clicked: counts?.clicked ?? 0,
});

export const marketingBroadcastService = {
  async create(input: CreateBroadcastBody, adminId: number) {
    const b = await broadcastRepository.create({ ...input, segmentDays: input.segment === "inactive" ? (input.segmentDays ?? null) : null, createdById: adminId });
    return view(b);
  },

  async list(query: PaginationQuery) {
    const { skip, take } = toSkipTake(query);
    const { items, total } = await broadcastRepository.list(skip, take);
    const counts = await marketingRepository.broadcastCounts(items.map((b) => b.id));
    return { items: items.map((b) => view(b, counts.get(b.id))), total };
  },

  /** Ước tính: người trong nhóm chưa nhận thư này (chưa trừ người đang trong khoảng cách giữa hai thư) và số ngày gửi hết theo hạn mức ngày. */
  async estimate(id: number, now = new Date()) {
    const [b, p] = await Promise.all([get(id), marketingSettingService.params()]);
    const recipients = await marketingRepository.count(broadcastAudience(b, now, null));
    return { recipients, days: Math.ceil(recipients / p.dailyCap) };
  },

  /** Xem trước với người nhận giả (không dữ liệu của ai); ảnh cid thay bằng data URI như xem trước chiến dịch. */
  async preview(id: number) {
    const b = await get(id);
    const mail = broadcastMail(b, PREVIEW_RECIPIENT, broadcastPreviewUrl(b.ctaPath));
    return { subject: mail.subject, html: inlineMailImages(mail.html) };
  },

  /** Gửi thư mẫu CHỈ tới email của admin đang bấm, link nút trỏ thẳng tới trang; không ghi log nên không tính vào hạn mức hay giới hạn gửi. */
  async sendTest(id: number, admin: PublicUser) {
    const b = await get(id);
    const to = { id: admin.id, email: admin.email, fullName: admin.fullName, proExpiresAt: admin.proExpiresAt };
    const mail = broadcastMail(b, to, broadcastPreviewUrl(b.ctaPath));
    await mailService.sendMarketing(admin.email, { ...mail, subject: `[Thử] ${mail.subject}` }, oneClickUrl(admin.id));
    return { sent: 1, to: admin.email };
  },

  /** DRAFT -> SENDING khi admin gõ đúng "GỬI" (không thì 400); thư bắt đầu đi ở lượt chạy kế tiếp. Chỉ một đợt được gửi cùng lúc. */
  async start(id: number, confirm: unknown) {
    if (!isBroadcastConfirm(confirm)) throw new AppError(`Gõ ${BROADCAST_CONFIRM} để xác nhận gửi`, HTTP_STATUS.BAD_REQUEST);
    const b = await get(id);
    if (b.status !== "DRAFT") throw AppError.conflict("Chỉ bắt đầu được bản nháp");
    const result = await broadcastRepository.start(id);
    if (result === "busy") throw AppError.conflict("Đang có một đợt gửi thủ công khác, hãy dừng hoặc chờ đợt đó xong");
    if (result === "state") throw AppError.conflict("Chỉ bắt đầu được bản nháp");
    return view(await get(id));
  },

  /** Dừng bất cứ lúc nào (bản nháp hoặc đang gửi); thư còn lại trong lượt đang chạy cũng không gửi (claim kiểm tra lại). */
  async cancel(id: number) {
    await get(id);
    if (!(await broadcastRepository.cancel(id))) throw AppError.conflict("Đợt này đã xong hoặc đã dừng");
    return view(await get(id));
  },
};
