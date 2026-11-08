import { Link } from "react-router-dom";
import { ArrowRight, Gift } from "lucide-react";
import { useSignupGift } from "../useSignupGift";

// Dải quà đăng ký: một dòng mỏng (không đẩy nội dung chính xuống). Nền vàng nâu và chữ vàng cố định (không đổi theo sáng/tối) để luôn nổi bật.
export function SignupGiftBanner() {
  const { bonus, gifted, hasGift, exams } = useSignupGift();
  if (!hasGift) return null;
  const worth = gifted >= exams ? `${exams} đề` : `${gifted}/${exams} đề`;
  return (
    <Link
      to="/register"
      className="pro-cta group relative mx-auto mt-6 flex max-w-3xl items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-[#2a1d00] via-[#4a3500] to-[#2a1d00] py-1.5 pl-1.5 pr-2 text-left text-[#fff6dc] shadow-m3-2 ring-1 ring-[#ffc61f]/60 transition hover:ring-[#ffc61f]"
    >
      <span className="ci-float flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ffd75e] to-[#f0a800] text-[#3a2600]">
        <Gift size={19} strokeWidth={2.3} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className="hidden sm:inline">Đăng ký lần đầu nhận ngay </span>
        <span className="sm:hidden">Đăng ký nhận </span>
        <b className="text-base font-black tabular-nums text-[#ffc61f]">{bonus.toLocaleString("vi-VN")} credit</b>
        <span className="hidden text-[#fff6dc]/80 sm:inline"> · tương đương {worth}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-b from-[#ffd75e] to-[#f0a800] px-3 py-1.5 text-sm font-extrabold sm:px-4 text-[#3a2600] transition group-hover:scale-105">
        <span className="hidden sm:inline">Nhận quà</span> <ArrowRight size={15} />
      </span>
    </Link>
  );
}
