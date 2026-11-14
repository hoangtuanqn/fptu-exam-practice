import { env } from "../configs/env";
import type { MarketingBroadcast } from "@prisma/client";
import {
  BROADCAST_EXAM_DAYS,
  BROADCAST_STEP,
  BROADCAST_TOPIC,
  CAMPAIGN_META,
  DEFAULT_MARKETING_PARAMS,
  MARKETING_SEND_GAP_MS,
  STEP_CYCLE_FACTOR,
  UPSELL_EXAM_DAYS,
  UPSELL_SPEND_DAYS,
  WINBACK_CREDIT_EXPIRY_DAYS,
  WINBACK_NEW_EXAMS_DAYS,
  broadcastCampaign,
  type BroadcastSegment,
  type CampaignKey,
  type LogCampaign,
  type MarketingParams,
  type MarketingTopic,
} from "../constants/marketing";
import { renderBroadcast, renderExpiry, renderUpsell, renderWinback1, renderWinback2, renderWinback3, type MarketingMail } from "../mail/templates/marketing";
import { broadcastRepository } from "../repositories/marketing-broadcast.repository";
import { audience, marketingRepository, type Recipient } from "../repositories/marketing.repository";
import { planSignalRepository } from "../repositories/plan-signal.repository";
import { CLICK_PLACEHOLDER, signClickToken, withClickUrl } from "../utils/marketing-click";
import { epochDay, signMarketingToken } from "../utils/marketing-token";
import { sleep } from "../utils/sleep";
import { DAY_MS, startOfVnDay, vnDate } from "../utils/time";
import { mailService } from "./mail.service";
import { marketingSettingService } from "./marketing-setting.service";
import { planService } from "./plan.service";
import { reminderService } from "./reminder.service";

// Thư marketing tự động. Người nhận chọn bằng truy vấn theo tập (có chỉ số), dữ liệu trong thư lấy theo lô, gửi lần lượt.
// Mỗi thư được ghi vào email_campaign_logs TRƯỚC khi gửi (unique theo người + chiến dịch + bước) nên chạy lại hay sập giữa chừng không gửi trùng.

export interface CampaignJob {
  campaign: LogCampaign;
  step: number; // giá trị lưu trong log
  target: string; // đường dẫn nội bộ của nút trong thư (vd /pro); link nút trong `mail` là CLICK_PLACEHOLDER
  to: Recipient;
  mail: MarketingMail;
}

const ago = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS);
const ahead = (now: Date, days: number) => new Date(now.getTime() + days * DAY_MS);
const cycleStep = (cycle: number, step: number) => cycle * STEP_CYCLE_FACTOR + step;

const token = (userId: number) => signMarketingToken(env.JWT_SECRET, userId);
// `c` = loại thư (không nằm trong token; token chỉ xác thực người dùng) để trang huỷ đề nghị "chỉ tắt loại thư này"
export const unsubscribePageUrl = (userId: number, topic?: MarketingTopic) => `${env.CLIENT_URL}/unsubscribe?t=${token(userId)}${topic ? `&c=${topic}` : ""}`;
export const oneClickUrl = (userId: number) => `${env.API_URL || env.CLIENT_URL}/api/v1/marketing/unsubscribe?t=${token(userId)}`;
const clickUrl = (logId: number) => `${env.API_URL || env.CLIENT_URL}/api/v1/marketing/click?t=${signClickToken(env.JWT_SECRET, logId)}`;

// Đích của nút trong thư (đường dẫn nội bộ, lưu vào log); thư mẫu gửi thử dùng link thẳng `site(path)`
const paths = {
  review: "/account/review",
  subject: (code: string | null) => (code ? `/mon/${encodeURIComponent(code)}` : "/"),
  plan: "/pro",
};
const site = (path: string) => `${env.CLIENT_URL}${path}`;
const url = CLICK_PLACEHOLDER;

// Giá thật từ planService (không ghi cứng); giá mỗi ngày tính theo tháng 30 ngày nên thư ghi "khoảng"
const planOffer = () => {
  const info = planService.info();
  return {
    pro: { name: info.name, months: info.months, price: info.price, perDay: Math.round(info.price / (info.months * 30)), fuoPrice: info.fuoPrice, savingsPercent: info.savingsPercent },
    sprint: info.sprint,
  };
};

const base = (u: Recipient, key: CampaignKey) => ({ name: u.fullName, unsubscribeUrl: unsubscribePageUrl(u.id, CAMPAIGN_META[key].topic) });

// ---- Dựng thư cho từng chiến dịch (một lô người nhận)

async function winbackMails(step: number, users: Recipient[], now: Date): Promise<CampaignJob[]> {
  if (users.length === 0) return [];
  const ids = users.map((u) => u.id);
  const subjects = step < 3 ? await marketingRepository.lastSubjects(ids) : new Map<number, string>();
  const codes = [...new Set(subjects.values())];
  const [due, newExams, credit] = await Promise.all([
    step === 1 ? reminderService.collectDue(ids, now.getTime()) : new Map<number, number>(),
    step === 2 && codes.length ? marketingRepository.newExamCounts(codes, ago(now, WINBACK_NEW_EXAMS_DAYS)) : new Map<string, number>(),
    step === 2 ? marketingRepository.expiringCredit(ids, now, ahead(now, WINBACK_CREDIT_EXPIRY_DAYS)) : new Map<number, { amount: number; expiresAt: Date }>(),
  ]);
  return users.map((u) => {
    const code = subjects.get(u.id) ?? null;
    const n = due.get(u.id) ?? 0;
    const target = step === 1 ? (n > 0 ? paths.review : paths.subject(code)) : step === 2 ? paths.subject(code) : paths.review;
    const mail =
      step === 1
        ? renderWinback1({ ...base(u, "winback"), due: n, subject: code, url })
        : step === 2
          ? renderWinback2({ ...base(u, "winback"), subject: code, newExams: code ? (newExams.get(code) ?? 0) : 0, expiringCredit: credit.get(u.id) ?? null, url })
          : renderWinback3({ ...base(u, "winback"), url });
    return { campaign: "winback" as const, step, target, to: u, mail };
  });
}

const builders: Record<CampaignKey, (now: Date, take: number, p: MarketingParams) => Promise<CampaignJob[]>> = {
  async winback(now, take, p) {
    const jobs: CampaignJob[] = [];
    for (const [i, days] of p.winbackStepDays.entries()) {
      if (jobs.length >= take) break;
      const users = await marketingRepository.pick(winbackAudience(now, p, i, days), take - jobs.length);
      jobs.push(...(await winbackMails(i + 1, users, now)));
    }
    return jobs;
  },

  async pro_upsell(now, take, p) {
    const today = vnDate(now.getTime());
    const users = await marketingRepository.pick(audience.proUpsell(upsellParams(now, p)), take);
    if (users.length === 0) return [];
    const ids = users.map((u) => u.id);
    const [spent, exams] = await Promise.all([planSignalRepository.netSpendByUser(ids, ago(now, UPSELL_SPEND_DAYS)), marketingRepository.nextExamDates(ids, today, ahead(today, UPSELL_EXAM_DAYS))]);
    const offer = planOffer();
    return users.map((u) => {
      const exam = exams.get(u.id);
      const mail = renderUpsell({ ...base(u, "pro_upsell"), ...offer, spent: spent.get(u.id) ?? 0, spentDays: UPSELL_SPEND_DAYS, daysToExam: exam ? Math.round((exam.getTime() - today.getTime()) / DAY_MS) : null, url });
      return { campaign: "pro_upsell" as const, step: cycleStep(epochDay(now), 1), target: paths.plan, to: u, mail };
    });
  },

  async pro_expiry(now, take, p) {
    const jobs: CampaignJob[] = [];
    for (const [i, days] of p.expiryStepDays.entries()) {
      if (jobs.length >= take) break;
      const users = await marketingRepository.pick(expiryAudience(now, p, i, days), take - jobs.length);
      for (const u of users) {
        const expiresAt = u.proExpiresAt!;
        const daysLeft = Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS));
        jobs.push({ campaign: "pro_expiry", step: cycleStep(epochDay(expiresAt), i + 1), target: paths.plan, to: u, mail: renderExpiry({ ...base(u, "pro_expiry"), expiresAt, daysLeft, url }) });
      }
    }
    return jobs;
  },
};

const upsellParams = (now: Date, p: MarketingParams) => {
  const today = vnDate(now.getTime());
  return { now, quiet: ago(now, p.minGapDays), repeatSince: ago(now, p.upsellRepeatDays), spendSince: ago(now, UPSELL_SPEND_DAYS), minPurchases: p.upsellMinPurchases, examFrom: today, examTo: ahead(today, UPSELL_EXAM_DAYS) };
};

// Bước i của win-back: vắng trong (mốc bước sau, mốc bước này]; bước cuối tới winbackMaxInactiveDays
const winbackAudience = (now: Date, p: MarketingParams, i: number, days: number) =>
  audience.winback(i + 1, ago(now, days), ago(now, p.winbackStepDays[i + 1] ?? p.winbackMaxInactiveDays), ago(now, p.minGapDays), now);
// Bước i của nhắc hết hạn: hết hạn trong (mốc bước sau, mốc bước này]
const expiryAudience = (now: Date, p: MarketingParams, i: number, days: number) => audience.proExpiry(i + 1, ahead(now, p.expiryStepDays[i + 1] ?? 0), ahead(now, days));

// ---- Gửi thủ công

type BroadcastRow = Pick<MarketingBroadcast, "id" | "segment" | "segmentDays">;

/** Người nhận thư gửi thủ công lúc `now` (tính lại mỗi lần, không chụp sẵn). `quiet` null = bỏ qua khoảng cách giữa hai thư. */
export const broadcastAudience = (b: BroadcastRow, now: Date, quiet: Date | null) => {
  const today = vnDate(now.getTime());
  return audience.broadcast({ id: b.id, segment: b.segment as BroadcastSegment, segmentDays: b.segmentDays }, { now, quiet, examFrom: today, examTo: ahead(today, BROADCAST_EXAM_DAYS) });
};

export const broadcastMail = (b: Pick<MarketingBroadcast, "subject" | "body" | "ctaLabel">, u: Recipient, link: string) =>
  renderBroadcast({ name: u.fullName, unsubscribeUrl: unsubscribePageUrl(u.id, BROADCAST_TOPIC), subject: b.subject, body: b.body, ctaLabel: b.ctaLabel, url: link });

export const broadcastPreviewUrl = (path: string) => site(path);

async function broadcastJobs(now: Date, take: number, p: MarketingParams): Promise<CampaignJob[]> {
  const b = await broadcastRepository.sending();
  if (!b) return [];
  const users = await marketingRepository.pick(broadcastAudience(b, now, ago(now, p.minGapDays)), take);
  // Không còn ai chưa nhận, kể cả người đang trong khoảng cách giữa hai thư: xong đợt
  if (users.length === 0 && (await marketingRepository.count(broadcastAudience(b, now, null))) === 0) await broadcastRepository.finish(b.id);
  const campaign = broadcastCampaign(b.id);
  return users.map((u) => ({ campaign, step: BROADCAST_STEP, target: b.ctaPath, to: u, mail: broadcastMail(b, u, url) }));
}

// Nhắc hết hạn Pro gần như thư giao dịch nên chạy trước, rồi gửi thủ công (admin chủ động); thư gửi trước được ghi log nên phần sau tự bỏ qua người vừa nhận
const ORDER = ["pro_expiry", "broadcast", "pro_upsell", "winback"] as const;
export type RunKey = (typeof ORDER)[number];

export const marketingCampaignService = {
  /** Số người đang đủ điều kiện mỗi chiến dịch (chưa tính trần thư mỗi lần chạy). */
  async eligibleCounts(now = new Date()) {
    const p = await marketingSettingService.params();
    const winback = p.winbackStepDays.map((d, i) => marketingRepository.count(winbackAudience(now, p, i, d)));
    const expiry = p.expiryStepDays.map((d, i) => marketingRepository.count(expiryAudience(now, p, i, d)));
    const [w, u, e] = await Promise.all([Promise.all(winback), marketingRepository.count(audience.proUpsell(upsellParams(now, p))), Promise.all(expiry)]);
    const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);
    return { winback: sum(w), pro_upsell: u, pro_expiry: sum(e) };
  },

  /** Chạy mỗi ngày: gửi các chiến dịch đang bật, tổng tối đa `dailyCap` thư mỗi ngày (tính cả thư đã gửi hôm nay). Trả số thư đã gửi theo chiến dịch. */
  async run(now = new Date()) {
    const [flags, p, sentToday] = await Promise.all([
      marketingSettingService.flags(),
      marketingSettingService.params(),
      marketingRepository.sentSince(startOfVnDay(now.getTime())),
    ]);
    const sent = Object.fromEntries(ORDER.map((k) => [k, 0])) as Record<RunKey, number>;
    let left = p.dailyCap - sentToday; // chạy lại trong ngày cũng không vượt hạn mức (tính cả thư gửi thủ công)
    for (const key of ORDER) {
      // Gửi thủ công không có công tắc: chỉ có thư khi admin đã xác nhận bắt đầu (trạng thái SENDING)
      if (left <= 0 || (key !== "broadcast" && !flags[key])) continue;
      for (const job of await (key === "broadcast" ? broadcastJobs(now, left, p) : builders[key](now, left, p))) {
        if (left <= 0) break;
        if (await marketingSettingService.isPaused()) return sent; // kiểm tra trước mỗi thư: bấm tạm dừng giữa lượt chạy dừng ngay
        left--;
        if (await this.deliver(job)) sent[key]++;
        await sleep(MARKETING_SEND_GAP_MS);
      }
    }
    return sent;
  },

  // Giữ chỗ trong log rồi mới gửi; gửi lỗi thì bỏ chỗ để lần sau thử lại. Lỗi một người không chặn những người còn lại.
  async deliver(job: CampaignJob) {
    try {
      const logId = await marketingRepository.claim(job.to.id, job.campaign, job.step, job.target);
      if (logId === null) return false; // đã gửi bước này rồi
      try {
        await mailService.sendMarketing(job.to.email, withClickUrl(job.mail, clickUrl(logId)), oneClickUrl(job.to.id));
        return true;
      } catch (err) {
        await marketingRepository.release(logId);
        throw err;
      }
    } catch (err) {
      console.error(`[marketing] lỗi gửi ${job.campaign} cho user ${job.to.id}:`, (err as Error).message);
      return false;
    }
  },

  /** Thư mẫu của một chiến dịch (mọi bước) với số liệu minh hoạ, dùng cho nút gửi thử của admin. */
  samples(key: CampaignKey, to: Recipient, now = new Date(), p: MarketingParams = DEFAULT_MARKETING_PARAMS): MarketingMail[] {
    const b = base(to, key);
    if (key === "winback")
      return [
        renderWinback1({ ...b, due: 12, subject: "PRO192", url: site(paths.review) }),
        renderWinback2({ ...b, subject: "PRO192", newExams: 5, expiringCredit: { amount: 5000, expiresAt: ahead(now, 5) }, url: site(paths.subject("PRO192")) }),
        renderWinback3({ ...b, url: site(paths.review) }),
      ];
    if (key === "pro_upsell") return [renderUpsell({ ...b, ...planOffer(), spent: 25_000, spentDays: UPSELL_SPEND_DAYS, daysToExam: 12, url: site(paths.plan) })];
    return p.expiryStepDays.map((d) => renderExpiry({ ...b, expiresAt: ahead(now, d), daysLeft: d, url: site(paths.plan) }));
  },
};
