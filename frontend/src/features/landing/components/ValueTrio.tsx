import { BookMarked, MousePointerClick, Sparkles } from "lucide-react";
import { GOLD_GLOSS } from "@/shared/ui/gold";
import { useSignupGift } from "../useSignupGift";

// Ba điểm mạnh ở viewport đầu tiên, viết thành một dòng nhẹ (không khung): đồng bộ FLM Syllabus, lấy đề một chạm (kèm giá thật), AI giải thích.
export function ValueTrio() {
  const { price } = useSignupGift();
  const priceText = price > 0 ? `${price.toLocaleString("vi-VN")}đ / lượt` : "miễn phí";

  const items = [
    { icon: BookMarked, text: <>Đồng bộ <b>FLM Syllabus</b></> },
    { icon: MousePointerClick, text: <>Lấy đề FuOverflow <b>1 click</b> · <b className="text-primary">{priceText}</b></> },
    { icon: Sparkles, text: <>AI giải thích đáp án</> },
  ];

  return (
    <ul className="mx-auto mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-2.5 text-on-surface-variant">
      {items.map(({ icon: Icon, text }, i) => (
        <li key={i} className="md-body-medium inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest/80 py-1 pl-1 pr-3.5 shadow-m3-1">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${GOLD_GLOSS}`}>
            <Icon size={13} strokeWidth={2.4} />
          </span>
          <span className="[&_b]:font-semibold [&_b]:text-on-surface [&_b.text-primary]:text-primary">{text}</span>
        </li>
      ))}
    </ul>
  );
}
