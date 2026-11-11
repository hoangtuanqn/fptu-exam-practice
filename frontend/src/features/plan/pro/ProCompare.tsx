import { Bot, Check, Crown, FileDown, History, Infinity as InfinityIcon, Link2, MessageCircleQuestion, Minus, Sparkles, Timer } from "lucide-react";
import type { PlanInfo } from "../plan.api";
import { vnd } from "./money";
import { Reveal } from "./Reveal";
import { GOLD } from "./style";

// Cột FuOverflow VIP: chỉ dòng đầu có (xem đề); các dòng còn lại là tính năng FEPass tự xây thêm
const FEATURES: { icon: typeof Bot; text: string; fuo: boolean }[] = [
  { icon: Link2, text: "Xem đề thi FE đầy đủ từ kho FuOverflow", fuo: true },
  { icon: Bot, text: "AI giải đáp án cho cả đề, kèm đối chiếu bình luận", fuo: false },
  { icon: Sparkles, text: "Giải thích AI từng câu, nói rõ vì sao sai", fuo: false },
  { icon: History, text: "Chấm điểm thang 10, lưu lịch sử và điểm cao nhất", fuo: false },
  { icon: Timer, text: "Chế độ Thi có đếm ngược, tự nộp khi hết giờ", fuo: false },
  { icon: FileDown, text: "Tải trọn bộ tài nguyên đề PE (file zip)", fuo: false },
  { icon: MessageCircleQuestion, text: "Trợ lý Cóc Pass trả lời mọi lúc", fuo: false },
  { icon: InfinityIcon, text: "Không giới hạn lượt lấy đề, giải thích, AI giải đề", fuo: false },
];

const ROW = "grid grid-cols-[1fr_72px_88px] items-center px-4 sm:grid-cols-[1fr_110px_120px]";

// Bảng so sánh với FuOverflow VIP cùng thời hạn: cột Pro được tô nền vàng nhạt, giá thật ở dòng cuối
export function ProCompare({ plan }: { plan: PlanInfo }) {
  const ratio = plan.fuoPrice > 0 ? Math.max(8, (plan.price / plan.fuoPrice) * 100) : 100;
  return (
    <section className="mx-auto max-w-3xl px-4 pt-16">
      <Reveal>
        <h2 className="md-headline-small text-center text-on-surface">
          Cùng {plan.months} tháng, bạn giữ lại <span className="text-primary">{vnd(plan.savings)}</span>
        </h2>
        <p className="md-body-medium mx-auto mt-1 max-w-md text-center text-on-surface-variant">Không chỉ là kho đề: FEPass biến đề thi thành một buổi học có người kèm.</p>

        <div className="mt-6 space-y-3 rounded-m3-lg border border-outline-variant bg-surface-container-low p-4">
          <div>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-on-surface-variant">FuOverflow VIP</span>
              <b className="tabular-nums text-on-surface">{vnd(plan.fuoPrice)}</b>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-container-highest">
              <div className="pro-bar h-full w-full rounded-full bg-outline" />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-on-surface">
                <Crown size={14} className="text-primary" /> FEPass Pro
              </span>
              <b className="tabular-nums text-primary">{vnd(plan.price)}</b>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-container-highest">
              <div className="pro-bar h-full rounded-full bg-gradient-to-r from-[#ffd75e] to-[#f0a800] [animation-delay:0.55s]" style={{ width: `${ratio}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-m3-lg border border-outline-variant bg-surface-container-lowest">
          <div className={`${ROW} border-b border-outline-variant bg-surface-container py-3 text-center text-xs font-semibold text-on-surface-variant`}>
            <span className="text-left">Tính năng</span>
            <span>FuOverflow VIP</span>
            <span className="inline-flex items-center justify-center gap-1 text-primary">
              <Crown size={13} /> FEPass Pro
            </span>
          </div>
          {FEATURES.map(({ icon: Icon, text, fuo }) => (
            <div key={text} className={`${ROW} border-b border-outline-variant py-3`}>
              <span className="md-body-medium flex items-start gap-2.5 pr-2 text-on-surface">
                <Icon size={18} className="mt-0.5 shrink-0 text-primary" /> {text}
              </span>
              <span className="flex justify-center">{fuo ? <Check size={18} className="text-on-surface-variant" aria-label="Có" /> : <Minus size={18} className="text-outline" aria-label="Không có" />}</span>
              <span className="flex justify-center">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${GOLD}`}>
                  <Check size={15} strokeWidth={3} aria-label="Có" />
                </span>
              </span>
            </div>
          ))}
          <div className={`${ROW} bg-surface-container py-3 text-center`}>
            <span className="md-label-large text-left text-on-surface">Giá {plan.months} tháng</span>
            <span className="md-body-medium tabular-nums text-on-surface-variant line-through">{vnd(plan.fuoPrice)}</span>
            <span className="md-title-small tabular-nums text-primary">{vnd(plan.price)}</span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
