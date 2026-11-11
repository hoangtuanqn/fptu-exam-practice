import { Clock, Sparkles } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { Countdown } from "@/features/explanation/ExplainBundleBanner";
import { offersApi } from "../offers.api";

// Dải ưu đãi CÓ HẠN THẬT: chỉ hiện khi admin đã đặt hạn chót (Ưu đãi → hạn chót) và ưu đãi còn hiệu lực. Không có hạn thì không hiện gì,
// tuyệt đối không dựng đồng hồ đếm ngược giả. Đồng hồ và con số giảm giá đều đọc từ cấu hình máy chủ.
export function PromoDeadlineBanner() {
  const { data } = useApi(() => offersApi.get(), []);
  if (!data?.promoEndsAt || data.bundleDiscountPercent <= 0 || new Date(data.promoEndsAt).getTime() <= Date.now()) return null;

  return (
    <div
      role="status"
      className="mx-auto mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full bg-gradient-to-r from-[#2a1d00] via-[#4a3500] to-[#2a1d00] px-4 py-2 text-sm text-[#fff6dc] shadow-m3-2 ring-1 ring-[#ffc61f]/60"
    >
      <span className="inline-flex items-center gap-1.5">
        <Sparkles size={15} className="text-[#ffc61f]" aria-hidden />
        Mở khóa giải thích AI cả đề <b className="text-base font-black text-[#ffc61f]">giảm {data.bundleDiscountPercent}%</b>
      </span>
      <Countdown endsAt={data.promoEndsAt} />
      <span className="inline-flex items-center gap-1 text-xs text-[#fff6dc]/75">
        <Clock size={12} aria-hidden /> Hết hạn {new Date(data.promoEndsAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
      </span>
    </div>
  );
}
