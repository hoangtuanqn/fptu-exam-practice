import { Gift } from "lucide-react";

interface Props {
  eyebrow: string; // dòng nhỏ phía trên số
  amount: number; // số credit được tặng
  caption: string; // một câu giải thích ngắn
}

// Thẻ quà ở trang đăng ký. Nền nâu vàng và chữ vàng dùng màu cố định (như các dải quà ở trang chủ) để luôn nổi bật ở cả giao diện sáng và tối.
export function GiftCard({ eyebrow, amount, caption }: Props) {
  return (
    <div role="status" className="promo-shine relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2a1d00] via-[#4a3500] to-[#2a1d00] p-4 text-[#fff6dc] shadow-m3-2 ring-1 ring-[#ffc61f]/50">
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#ffc61f]/25 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="relative flex items-center gap-4">
        <span className="ci-float flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#ffd75e] to-[#f0a800] text-[#3a2600] shadow-lg">
          <Gift size={28} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ffc61f]/80">{eyebrow}</p>
          <p className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-black leading-none tabular-nums text-[#ffc61f]">+{amount.toLocaleString("vi-VN")}</span>
            <span className="text-sm font-semibold">credit</span>
          </p>
          <p className="mt-1 text-xs leading-snug text-[#fff6dc]/75">{caption}</p>
        </div>
      </div>
    </div>
  );
}
