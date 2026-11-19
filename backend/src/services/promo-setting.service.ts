import { HTTP_STATUS } from "../constants/httpStatus";
import { nextSemesterStartedAt, PROMO_DEFAULTS, semesterEndsAtNeedsFuture, PROMO_KEY_PREFIX, type BonusTier, type PromoConfig } from "../constants/promo";
import { AppError } from "../rules/error";
import { settingRepository } from "../repositories/setting.repository";
import type { UpdatePromoBody } from "../rules/requests/setting.request";

const keyOf = (name: keyof PromoConfig) => `${PROMO_KEY_PREFIX}${name}`;
const NAMES = Object.keys(PROMO_DEFAULTS) as (keyof PromoConfig)[];

const num = (raw: string | undefined, fallback: number) => (raw !== undefined && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : fallback);

const flag = (raw: string | undefined, fallback: boolean) => (raw === undefined || raw === "" ? fallback : raw === "true");

const parseTiers = (raw: string | undefined): BonusTier[] => {
  if (raw === undefined) return PROMO_DEFAULTS.depositBonusTiers;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return PROMO_DEFAULTS.depositBonusTiers;
    return v
      .filter((t): t is BonusTier => typeof t?.min === "number" && typeof t?.percent === "number" && t.min > 0 && t.percent > 0)
      .sort((a, b) => a.min - b.min);
  } catch {
    return PROMO_DEFAULTS.depositBonusTiers;
  }
};

export const promoSettingService = {
  async get(): Promise<PromoConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    return {
      bundleDiscountPercent: num(raw[keyOf("bundleDiscountPercent")], PROMO_DEFAULTS.bundleDiscountPercent),
      freeTrials: num(raw[keyOf("freeTrials")], PROMO_DEFAULTS.freeTrials),
      promoEndsAt: raw[keyOf("promoEndsAt")] ?? PROMO_DEFAULTS.promoEndsAt,
      depositBonusTiers: parseTiers(raw[keyOf("depositBonusTiers")]),
      upsellResult: flag(raw[keyOf("upsellResult")], PROMO_DEFAULTS.upsellResult),
      upsellReviewCap: flag(raw[keyOf("upsellReviewCap")], PROMO_DEFAULTS.upsellReviewCap),
      upsellDepositTier: flag(raw[keyOf("upsellDepositTier")], PROMO_DEFAULTS.upsellDepositTier),
      upsellFirstRun: flag(raw[keyOf("upsellFirstRun")], PROMO_DEFAULTS.upsellFirstRun),
      upsellProNudge: flag(raw[keyOf("upsellProNudge")], PROMO_DEFAULTS.upsellProNudge),
      semesterPromoEnabled: flag(raw[keyOf("semesterPromoEnabled")], PROMO_DEFAULTS.semesterPromoEnabled),
      semesterPromoTerm: raw[keyOf("semesterPromoTerm")] ?? PROMO_DEFAULTS.semesterPromoTerm,
      semesterPromoPrice: num(raw[keyOf("semesterPromoPrice")], PROMO_DEFAULTS.semesterPromoPrice),
      semesterPromoEndsAt: raw[keyOf("semesterPromoEndsAt")] ?? PROMO_DEFAULTS.semesterPromoEndsAt,
      semesterPromoStartedAt: raw[keyOf("semesterPromoStartedAt")] ?? PROMO_DEFAULTS.semesterPromoStartedAt,
    };
  },

  async update(body: UpdatePromoBody) {
    const cur = await this.get();
    // Công tắc là trường thêm sau: bản giao diện cũ không gửi thì giữ nguyên giá trị đang lưu
    const sw = (name: "upsellResult" | "upsellReviewCap" | "upsellDepositTier" | "upsellFirstRun" | "upsellProNudge") => String(body[name] ?? cur[name]);
    // Ưu đãi kỳ mới: thiếu trường nào thì giữ giá trị đang lưu, rồi kiểm tra trạng thái sau khi lưu
    const enabled = body.semesterPromoEnabled ?? cur.semesterPromoEnabled;
    const term = body.semesterPromoTerm ?? cur.semesterPromoTerm;
    const endsAt = body.semesterPromoEndsAt ?? cur.semesterPromoEndsAt;
    if (enabled) {
      const errors: Record<string, string> = {};
      if (!term) errors.semesterPromoTerm = "Vui lòng nhập kỳ ưu đãi, ví dụ SP27";
      if (semesterEndsAtNeedsFuture(cur, enabled, term, endsAt) && !(Date.parse(endsAt) > Date.now())) errors.semesterPromoEndsAt = "Hạn chót phải là thời điểm trong tương lai";
      const messages = Object.values(errors);
      if (messages.length) throw new AppError(messages.length === 1 ? messages[0]! : `Có ${messages.length} thông tin chưa hợp lệ, xem từng ô bên dưới`, HTTP_STATUS.BAD_REQUEST, errors);
    }
    await settingRepository.setMany({
      [keyOf("upsellResult")]: sw("upsellResult"),
      [keyOf("upsellReviewCap")]: sw("upsellReviewCap"),
      [keyOf("upsellDepositTier")]: sw("upsellDepositTier"),
      [keyOf("upsellFirstRun")]: sw("upsellFirstRun"),
      [keyOf("upsellProNudge")]: sw("upsellProNudge"),
      [keyOf("bundleDiscountPercent")]: String(body.bundleDiscountPercent),
      [keyOf("freeTrials")]: String(body.freeTrials),
      [keyOf("promoEndsAt")]: body.promoEndsAt,
      [keyOf("depositBonusTiers")]: JSON.stringify([...body.depositBonusTiers].sort((a, b) => a.min - b.min)),
      [keyOf("semesterPromoEnabled")]: String(enabled),
      [keyOf("semesterPromoTerm")]: term,
      [keyOf("semesterPromoPrice")]: String(body.semesterPromoPrice ?? cur.semesterPromoPrice),
      [keyOf("semesterPromoEndsAt")]: endsAt,
      [keyOf("semesterPromoStartedAt")]: nextSemesterStartedAt(cur, enabled, term),
    });
    return this.get();
  },
};
