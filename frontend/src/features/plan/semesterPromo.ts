import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/hooks/useApi";
import { isSnoozed, snooze } from "@/shared/utils/promptSnooze";
import { planApi, type PlanInfo, type SemesterPromo } from "./plan.api";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
export const LAST_CALL_MS = 2 * DAY_MS; // 48 giờ cuối: đếm theo giờ

// Thông tin gói dùng chung cho mọi nơi: tải một lần cho mỗi tài khoản (ưu đãi phụ thuộc người đó đã dùng hay chưa)
let cache: { key: string; p: Promise<PlanInfo> } | null = null;
const loadPlanInfo = (userId?: string) => {
  const key = userId ?? "";
  if (cache?.key !== key) {
    const entry = { key, p: planApi.info() };
    entry.p.catch(() => {
      if (cache === entry) cache = null; // lần sau thử lại
    });
    cache = entry;
  }
  return cache.p;
};
// Gọi sau khi mua hoặc khi máy chủ báo giá đã đổi
export const resetPlanInfo = () => {
  cache = null;
};

export function usePlanInfo(enabled = true) {
  const { user } = useAuth();
  return useApi(() => (enabled ? loadPlanInfo(user?.id) : Promise.resolve(null)), [enabled, user?.id]);
}

export interface ActivePromo extends SemesterPromo {
  msLeft: number;
  left: string; // "còn 5 ngày" | "còn 12 giờ"
}

// Ưu đãi còn áp dụng cho người này: null khi máy chủ cũ, không có đợt, đã dùng hoặc đã qua hạn
export const activePromo = (plan: PlanInfo | null | undefined): ActivePromo | null => {
  const p = plan?.semesterPromo;
  if (!p || p.used || !(p.price < p.originalPrice)) return null;
  const msLeft = Date.parse(p.endsAt) - Date.now();
  if (!(msLeft > 0)) return null;
  return { ...p, msLeft, left: msLeft <= LAST_CALL_MS ? `còn ${Math.ceil(msLeft / HOUR_MS)} giờ` : `còn ${Math.ceil(msLeft / DAY_MS)} ngày` };
};

export const useSemesterPromo = (enabled = true) => activePromo(usePlanInfo(enabled).data);

// Giá đang bán của gói Pro (đã tính ưu đãi nếu có) và gói Nước rút, lấy từ máy chủ; null khi chưa tải xong hoặc lỗi
export function usePlanPrices() {
  const plan = usePlanInfo().data;
  if (!plan) return { pro: null, sprint: null, months: null, sprintDays: null };
  return { pro: withPromo(plan, activePromo(plan)).price, sprint: plan.sprint.price, months: plan.months, sprintDays: plan.sprint.days };
}

// Gói Pro với giá ưu đãi, để mọi chỗ hiện giá (và số tiền trừ) khớp nhau
export const withPromo = (plan: PlanInfo, promo: ActivePromo | null): PlanInfo => {
  if (!promo) return plan;
  const savings = Math.max(0, plan.fuoPrice - promo.price);
  return { ...plan, price: promo.price, savings, savingsPercent: plan.fuoPrice > 0 ? Math.round((savings / plan.fuoPrice) * 100) : 0, pricePerMonth: Math.round(promo.price / plan.months) };
};

// Lời mời ưu đãi kỳ mới (thanh thông báo, thẻ sau khi nộp bài): tối đa một lần mỗi ngày, dùng chung cho mọi vị trí
const DAY_SLOT = "semester-promo-day";
export const takePromoSlot = () => {
  if (isSnoozed(DAY_SLOT)) return false;
  snooze(DAY_SLOT, 1);
  return true;
};

// Thanh đã hiện hôm nay thì giữ nguyên qua các trang (tới khi người dùng bấm ✕), và lời mời khác ở trang chủ nhường chỗ
const BAR_TODAY = "semester-promo-bar-today";
export const promoBarOwnsToday = () => isSnoozed(BAR_TODAY);
export const markPromoBarToday = () => snooze(BAR_TODAY, 1);
