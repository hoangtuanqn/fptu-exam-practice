import { activePromoEnd, promoExpired } from "../constants/promo";
import { aiSettingService } from "./ai-setting.service";
import { promoSettingService } from "./promo-setting.service";

export const offersService = {
  async get() {
    const [promo, ai] = await Promise.all([promoSettingService.get(), aiSettingService.get()]);
    const ends = activePromoEnd(promo);
    return {
      explainPrice: ai.explainPrice,
      freeTrials: ai.explainPrice > 0 ? promo.freeTrials : 0,
      bundleDiscountPercent: promoExpired(promo) ? 0 : promo.bundleDiscountPercent,
      promoEndsAt: ends ? ends.toISOString() : null,
      depositBonusTiers: promo.depositBonusTiers,
      upsell: { result: promo.upsellResult, reviewCap: promo.upsellReviewCap, depositTier: promo.upsellDepositTier, firstRun: promo.upsellFirstRun, proNudge: promo.upsellProNudge },
    };
  },
};
