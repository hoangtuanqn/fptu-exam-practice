import { Gift } from "lucide-react";

interface Props {
  eyebrow: string; // tiêu đề ngắn của quà
  amount: number; // số credit được tặng
  caption: string; // một câu giải thích ngắn
}

// Thẻ quà ở trang đăng ký: nền vàng nhạt theo màu chủ đạo, viền mảnh, không hiệu ứng. Đổi màu theo giao diện sáng/tối.
export function GiftCard({ eyebrow, amount, caption }: Props) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary-container/40 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
        <Gift size={20} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="md-title-small flex flex-wrap items-baseline gap-x-2 text-on-surface">
          {eyebrow}
          <span className="font-semibold tabular-nums text-primary">+{amount.toLocaleString("vi-VN")} credit</span>
        </p>
        <p className="md-body-small mt-0.5 text-on-surface-variant">{caption}</p>
      </div>
    </div>
  );
}
