import { Link } from "react-router-dom";
import { ArrowRight, Gift } from "lucide-react";
import { useSignupGift } from "../useSignupGift";

// Banner quà đăng ký: nằm NGOÀI thẻ ưu đãi nên hiệu ứng xấp thẻ khi cuộn không bao giờ che được nó.
// Nền vàng nâu và chữ vàng cố định (không đổi theo sáng/tối) để luôn nổi bật.
export function SignupGiftBanner() {
  const { bonus, gifted, hasGift, exams } = useSignupGift();
  if (!hasGift) return null;
  return (
    <Link
      to="/register"
      className="pro-cta group relative mx-auto mt-7 flex max-w-3xl items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-[#2a1d00] via-[#4a3500] to-[#2a1d00] px-4 py-4 text-left text-[#fff6dc] shadow-m3-3 ring-1 ring-[#ffc61f]/60 transition hover:ring-[#ffc61f] sm:px-6"
    >
      <span className="ci-float flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#ffd75e] to-[#f0a800] text-[#3a2600] shadow-lg">
        <Gift size={30} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#ffe58a]/90">Đăng ký lần đầu nhận ngay</span>
        <span className="mt-0.5 block text-3xl font-black tabular-nums tracking-tight text-[#ffc61f] sm:text-4xl">{bonus.toLocaleString("vi-VN")} credit</span>
        <span className="mt-0.5 block text-sm text-[#fff6dc]/85">
          {gifted >= exams ? `Tương đương ${exams} đề thi FE FPTU, mở sẵn cho bạn` : `Tương đương ${gifted}/${exams} đề thi, mở sẵn cho bạn`}
        </span>
      </span>
      <span className="hidden shrink-0 items-center gap-2 rounded-full bg-gradient-to-b from-[#ffd75e] to-[#f0a800] px-5 py-2.5 text-sm font-extrabold text-[#3a2600] shadow-lg transition group-hover:scale-105 sm:inline-flex">
        Nhận quà <ArrowRight size={16} />
      </span>
      <ArrowRight size={22} className="shrink-0 text-[#ffc61f] sm:hidden" />
    </Link>
  );
}
