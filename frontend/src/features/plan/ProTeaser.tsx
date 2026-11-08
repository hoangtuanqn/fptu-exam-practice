import { Link } from "react-router-dom";
import { ArrowRight, Crown } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/hooks/useApi";
import { isPro } from "@/shared/utils/pro";
import { planApi } from "./plan.api";

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

// Dải mời nâng cấp ở trang chủ: một dòng, vàng nổi bật. Ẩn khi đã là Pro hoặc chưa tải được giá.
export function ProTeaser() {
  const { user } = useAuth();
  const plan = useApi(() => planApi.info(), []).data;
  if (!plan || isPro(user)) return null;
  return (
    <Link
      to="/pro"
      className="pro-cta group mx-auto mt-6 flex max-w-xl items-center gap-3 rounded-full bg-gradient-to-r from-[#2a1d00] to-[#4a3500] py-2 pl-2 pr-4 text-left text-[#fff6dc] shadow-m3-2 ring-1 ring-[#ffc61f]/50 transition hover:ring-[#ffc61f]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ffd75e] to-[#f0a800] text-[#3a2600]">
        <Crown size={18} strokeWidth={2.4} />
      </span>
      <span className="min-w-0 flex-1 text-sm leading-tight">
        <b className="text-[#ffc61f]">Pro {plan.months} tháng chỉ {vnd(plan.price)}</b>
        <span className="block truncate text-xs text-[#fff6dc]/75">Tiết kiệm {vnd(plan.savings)} so với FuOverflow VIP</span>
      </span>
      <ArrowRight size={18} className="shrink-0 text-[#ffc61f] transition group-hover:translate-x-0.5" />
    </Link>
  );
}
