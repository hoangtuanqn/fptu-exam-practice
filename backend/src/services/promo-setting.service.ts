import { PROMO_DEFAULTS, PROMO_KEY_PREFIX, type BonusTier, type PromoConfig } from "../constants/promo";
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
    };
  },

  async update(body: UpdatePromoBody) {
    const cur = await this.get();
    // Công tắc là trường thêm sau: bản giao diện cũ không gửi thì giữ nguyên giá trị đang lưu
    const sw = (name: "upsellResult" | "upsellReviewCap" | "upsellDepositTier") => String(body[name] ?? cur[name]);
    await settingRepository.setMany({
      [keyOf("upsellResult")]: sw("upsellResult"),
      [keyOf("upsellReviewCap")]: sw("upsellReviewCap"),
      [keyOf("upsellDepositTier")]: sw("upsellDepositTier"),
      [keyOf("bundleDiscountPercent")]: String(body.bundleDiscountPercent),
      [keyOf("freeTrials")]: String(body.freeTrials),
      [keyOf("promoEndsAt")]: body.promoEndsAt,
      [keyOf("depositBonusTiers")]: JSON.stringify([...body.depositBonusTiers].sort((a, b) => a.min - b.min)),
    });
    return this.get();
  },
};
