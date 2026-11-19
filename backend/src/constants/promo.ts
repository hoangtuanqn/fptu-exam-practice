import { PRO_PLAN } from "./plan";

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
  upsellFirstRun: boolean; // danh sách "Bắt đầu" cho người mới ở trang chủ
  upsellProNudge: boolean; // lời mời Pro ở trang chủ dựa trên dữ liệu thật: kỳ thi sắp tới, tiền đã chi lẻ, vé Pro chưa kích hoạt
  semesterPromoEnabled: boolean; // ưu đãi kỳ mới: giảm giá gói Pro 4 tháng, mỗi tài khoản một lần mỗi đợt
  semesterPromoTerm: string; // kỳ của đợt ưu đãi, ví dụ SP27
  semesterPromoPrice: number; // giá ưu đãi (credit), luôn thấp hơn PRO_PLAN.price
  semesterPromoEndsAt: string; // hạn chót (ISO); qua hạn thì tự hết, không cần cron
  semesterPromoStartedAt: string; // máy chủ tự đặt khi bật hoặc đổi kỳ: định danh đợt, mua từ lúc này mới tính là đã dùng
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
  upsellFirstRun: true,
  upsellProNudge: true,
  semesterPromoEnabled: false,
  semesterPromoTerm: "",
  semesterPromoPrice: 69_000,
  semesterPromoEndsAt: "",
  semesterPromoStartedAt: "",
};

export const SEMESTER_TERM = /^(SP|SU|FA)\d{2}$/;
export const SEMESTER_PROMO_MIN_PRICE = 1000;

type SemesterPromo = Pick<PromoConfig, "semesterPromoEnabled" | "semesterPromoTerm" | "semesterPromoPrice" | "semesterPromoEndsAt" | "semesterPromoStartedAt">;

// Ưu đãi kỳ mới đang chạy: đã bật, có kỳ, giá hợp lệ và chưa qua hạn chót
export const semesterPromoActive = (c: SemesterPromo, now = Date.now()) => {
  const end = Date.parse(c.semesterPromoEndsAt);
  return c.semesterPromoEnabled && !!c.semesterPromoTerm && c.semesterPromoPrice > 0 && c.semesterPromoPrice < PRO_PLAN.price && end > now;
};

// Giá gói Pro 4 tháng cho một người: ưu đãi chỉ áp dụng khi đang chạy và người này chưa dùng trong đợt này
export const proPriceFor = (c: SemesterPromo, used: boolean, now = Date.now()) => (semesterPromoActive(c, now) && !used ? c.semesterPromoPrice : PRO_PLAN.price);

// Mốc bắt đầu đợt sau khi lưu: bật từ tắt sang hoặc đổi kỳ khi đang bật thì là đợt mới, còn lại giữ mốc cũ
export const nextSemesterStartedAt = (cur: SemesterPromo, enabled: boolean, term: string, now = new Date()) =>
  enabled && (!cur.semesterPromoEnabled || cur.semesterPromoTerm !== term || !cur.semesterPromoStartedAt) ? now.toISOString() : cur.semesterPromoStartedAt;

// Chỉ bắt hạn chót ở tương lai khi admin đang bật hoặc đổi kỳ/hạn; đợt đã tự hết hạn thì lưu phần khác (mốc thưởng nạp…) vẫn được
export const semesterEndsAtNeedsFuture = (cur: SemesterPromo, enabled: boolean, term: string, endsAt: string) =>
  enabled && (!cur.semesterPromoEnabled || cur.semesterPromoTerm !== term || Date.parse(cur.semesterPromoEndsAt) !== Date.parse(endsAt));

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
