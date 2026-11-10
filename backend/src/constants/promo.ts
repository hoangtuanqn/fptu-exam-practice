// Cấu hình ưu đãi & khuyến mãi (admin chỉnh ở trang Ưu đãi, lưu trong bảng settings với tiền tố "promo.")
export interface BonusTier {
  min: number; // nạp từ mức này (VND) trở lên
  percent: number; // được thưởng thêm chừng này % số tiền nạp
}

export interface PromoConfig {
  bundleDiscountPercent: number; // gói "mở khóa cả đề" rẻ hơn mua lẻ chừng này % (0 = không giảm)
  freeTrials: number; // số lượt giải thích miễn phí mỗi tài khoản (tổng mọi đề)
  promoEndsAt: string; // hạn chót thật của ưu đãi gói (ISO). Rỗng = giảm giá vĩnh viễn, không đếm ngược; hết hạn thì giá gói bằng giá mua lẻ
  depositBonusTiers: BonusTier[]; // thưởng khi nạp nhiều (bậc cao nhất thỏa điều kiện được áp dụng)
  upsellResult: boolean; // lời mời nâng cấp ở bảng điểm sau khi nộp bài
  upsellReviewCap: boolean; // nhắc khi sổ câu sai gần đầy (gói thường)
  upsellDepositTier: boolean; // gợi ý nạp thêm một chút để lên bậc thưởng kế tiếp
}

export const PROMO_DEFAULTS: PromoConfig = {
  bundleDiscountPercent: 20,
  freeTrials: 2,
  promoEndsAt: "",
  depositBonusTiers: [
    { min: 100_000, percent: 5 },
    { min: 200_000, percent: 8 },
    { min: 500_000, percent: 12 },
  ],
  upsellResult: true,
  upsellReviewCap: true,
  upsellDepositTier: true,
};

export const PROMO_KEY_PREFIX = "promo.";

// Thưởng thêm khi nạp `amount` VND theo các bậc đã cấu hình
export const depositBonusOf = (amount: number, tiers: BonusTier[]) => {
  const tier = [...tiers].sort((a, b) => b.min - a.min).find((t) => amount >= t.min);
  return tier ? Math.floor((amount * tier.percent) / 100) : 0;
};

// Hạn chót còn hiệu lực (null = không đặt hạn hoặc đã hết hạn)
export const activePromoEnd = (c: Pick<PromoConfig, "promoEndsAt">): Date | null => {
  const d = c.promoEndsAt ? new Date(c.promoEndsAt) : null;
  return d && !Number.isNaN(d.getTime()) && d.getTime() > Date.now() ? d : null;
};

// Đã đặt hạn chót và đã qua: ưu đãi gói hết hiệu lực
export const promoExpired = (c: Pick<PromoConfig, "promoEndsAt">) => {
  const d = c.promoEndsAt ? new Date(c.promoEndsAt) : null;
  return !!d && !Number.isNaN(d.getTime()) && d.getTime() <= Date.now();
};
