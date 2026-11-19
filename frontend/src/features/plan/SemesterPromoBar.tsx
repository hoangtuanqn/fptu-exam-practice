import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, X } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { isPro, proDaysLeft } from "@/shared/utils/pro";
import { isSnoozed, snooze } from "@/shared/utils/promptSnooze";
import { vnd } from "./pro/money";
import { PromoCountdown } from "./PromoCountdown";
import { activePromo, LAST_CALL_MS, markPromoBarToday, promoBarOwnsToday, takePromoSlot, usePlanInfo, type ActivePromo } from "./semesterPromo";

const RENEW_DAYS = 30; // Pro còn ít hơn ngần này ngày thì vẫn mời (gia hạn giá ưu đãi)

const short = (n: number) => (n % 1000 === 0 ? `${n / 1000}k` : vnd(n));

// Đóng thì ẩn 3 ngày; 48 giờ cuối được hiện lại đúng một lần dù đang ẩn. Khóa theo kỳ nên đợt mới không bị ẩn theo đợt cũ.
function decide(p: ActivePromo) {
  const dismissed = isSnoozed(`semester-promo:${p.term}`);
  const lastCallKey = `semester-promo-last:${p.term}`;
  if (dismissed && !(p.msLeft <= LAST_CALL_MS && !isSnoozed(lastCallKey))) return false;
  if (promoBarOwnsToday() && !dismissed) return true; // đã bấm ✕ thì không giữ chỗ nữa (kể cả trong 48 giờ cuối)
  if (!takePromoSlot()) return false;
  markPromoBarToday();
  if (dismissed) snooze(lastCallKey, 2);
  return true;
}

// Thanh mỏng báo ưu đãi kỳ mới ở trang chủ (khi chưa mở bài) và các trang tài khoản. Chỉ cho người chưa Pro hoặc Pro sắp hết hạn.
export function SemesterPromoBar() {
  const { user } = useAuth();
  const eligible = !!user && (!isPro(user) || proDaysLeft(user) <= RENEW_DAYS);
  const plan = usePlanInfo(eligible).data;
  const promo = eligible ? activePromo(plan) : null;
  const [open, setOpen] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    if (!promo || decided.current) return;
    decided.current = true;
    setOpen(decide(promo));
  }, [promo]);

  if (!open || !promo || !plan) return null;
  return (
    <div className="flex w-full shrink-0 items-center gap-1 border-b border-[#ffc61f]/40 bg-gradient-to-r from-[#2a1d00] to-[#4a3500] pl-4 pr-1 text-[#fff6dc]">
      <Link to="/pro" className="md-body-medium flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 py-1.5 text-center">
        <Crown size={16} className="shrink-0 text-[#ffc61f]" aria-hidden />
        <span className="min-w-0">
          <b className="text-[#ffc61f]">Ưu đãi kỳ {promo.term}:</b> Pro {plan.months} tháng chỉ {short(promo.price)} (-{promo.percentOff}%), còn <PromoCountdown endsAt={promo.endsAt} className="font-semibold" />
        </span>
      </Link>
      <button
        type="button"
        onClick={() => {
          snooze(`semester-promo:${promo.term}`);
          setOpen(false);
        }}
        aria-label="Ẩn ưu đãi"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#fff6dc]/70 hover:bg-white/10"
      >
        <X size={16} />
      </button>
    </div>
  );
}
