import { BookMarked, MousePointerClick, Sparkles } from "lucide-react";
import { useSignupGift } from "../useSignupGift";

// Ba điểm mạnh ở viewport đầu tiên, viết thành một dòng nhẹ (icon nhỏ, không khung): đồng bộ FLM Syllabus, lấy đề một chạm (kèm giá thật), AI giải thích.
export function ValueTrio() {
  const { price } = useSignupGift();
  const priceText = price > 0 ? `${price.toLocaleString("vi-VN")}đ / lượt` : "miễn phí";

  const items = [
    { icon: BookMarked, text: <>Đồng bộ <b>FLM Syllabus</b></> },
    { icon: MousePointerClick, text: <>Mở đề <b>1 click</b> · <b className="text-primary">{priceText}</b></> },
    { icon: Sparkles, text: <>AI giải thích đáp án</> },
  ];

  return (
    <ul className="mx-auto mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-on-surface-variant">
      {items.map(({ icon: Icon, text }, i) => (
        <li key={i} className="md-body-medium inline-flex items-center gap-2">
          <Icon size={16} className="shrink-0 text-primary" aria-hidden />
          <span className="[&_b]:font-semibold [&_b]:text-on-surface [&_b.text-primary]:text-primary">{text}</span>
        </li>
      ))}
    </ul>
  );
}
