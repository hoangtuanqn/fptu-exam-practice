import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, X } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/hooks/useApi";
import { useUpsell } from "@/shared/hooks/useUpsell";
import { formatMoney } from "@/shared/utils/formatters";
import { isPro } from "@/shared/utils/pro";
import { canShowPrompt, markPromptShown } from "@/shared/utils/promptCap";
import { planApi } from "./plan.api";

const SURFACE = "result-upgrade";
const MIN_WRONG = 3; // ít câu sai thì chưa cần mời

// Lời mời ở bảng điểm sau khi nộp bài (lúc người dùng muốn biết "vì sao sai" nhất).
// Chỉ so sánh giá thật: tổng giải thích lẻ của đúng số câu sai, giá Pro, giá FuOverflow VIP. Có nút bỏ qua; mỗi phiên một lần, tối đa 3 lần/tuần.
export function ResultUpgradeCard({ wrong }: { wrong: number }) {
  const { user } = useAuth();
  const { flags, explainPrice } = useUpsell();
  const eligible = !!user && !isPro(user) && flags.result && wrong >= MIN_WRONG;
  const plan = useApi(() => (eligible ? planApi.info() : Promise.resolve(null)), [eligible]).data;
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    if (!eligible || !plan || open !== null) return;
    const ok = canShowPrompt(SURFACE);
    setOpen(ok);
    if (ok) markPromptShown(SURFACE);
  }, [eligible, plan, open]);

  if (!eligible || !plan || !open) return null;
  const oneByOne = explainPrice * wrong;
  const perDay = Math.round(plan.price / (plan.months * 30));

  return (
    <section aria-label="Gợi ý gói Pro" className="relative mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left">
      <button type="button" onClick={() => setOpen(false)} aria-label="Để sau" className="absolute right-2 top-2 rounded-full p-1.5 text-amber-900/60 hover:bg-amber-100">
        <X size={16} />
      </button>
      <h3 className="pr-8 text-sm font-semibold text-amber-950">Sai {wrong} câu, hiểu vì sao mới nhớ lâu</h3>
      <p className="mt-1 text-xs leading-relaxed text-amber-900">
        {oneByOne > 0 && <>Mua giải thích từng câu hết {formatMoney(oneByOne)}. </>}
        Pro {plan.months} tháng chỉ <b>{formatMoney(plan.price)}</b> (khoảng {formatMoney(perDay)}/ngày), xem giải thích không giới hạn. FuOverflow VIP cùng thời hạn là {formatMoney(plan.fuoPrice)}.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link to="/pro" className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-on-primary">
          <Crown size={15} className="text-[#ffc61f]" /> Xem gói Pro
        </Link>
        <Link to="/pro" className="text-xs font-medium text-amber-950 underline">
          Chỉ ôn gấp? Nước rút {plan.sprint.days} ngày {formatMoney(plan.sprint.price)}
        </Link>
      </div>
    </section>
  );
}
