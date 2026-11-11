import { Bot, Check, Crown, FileDown, History, Infinity as InfinityIcon, Link2, MessageCircleQuestion, Minus, Sparkles, Timer } from "lucide-react";
import type { PlanInfo } from "../plan.api";
import { GlossCard } from "./GlossCard";
import { vnd } from "./money";
import { Reveal } from "./Reveal";
import { SectionTitle } from "./SectionTitle";
import { GOLD_GLOSS } from "./style";

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

const ROW = "grid grid-cols-[1fr_72px_88px] sm:grid-cols-[1fr_110px_120px]";
const PRO_CELL = "flex items-center justify-center bg-[#ffc61f]/10";

// So sánh với FuOverflow VIP cùng thời hạn: hai thanh giá, rồi bảng tính năng với cột Pro được tô nền vàng nhạt
export function ProCompare({ plan }: { plan: PlanInfo }) {
  const ratio = plan.fuoPrice > 0 ? Math.max(8, (plan.price / plan.fuoPrice) * 100) : 100;
  return (
    <section className="mx-auto max-w-3xl px-4 pt-20">
      <Reveal>
        <SectionTitle
          eyebrow="So sánh"
          title={
            <>
              Cùng {plan.months} tháng, bạn giữ lại <span className="text-primary">{vnd(plan.savings)}</span>
            </>
          }
          subtitle="Không chỉ là kho đề: FEPass biến đề thi thành một buổi học có người kèm."
        />

        <GlossCard className="mt-8 space-y-4 p-5">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="text-on-surface-variant">FuOverflow VIP</span>
              <b className="tabular-nums text-on-surface">{vnd(plan.fuoPrice)}</b>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-surface-container-highest shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]">
              <div className="pro-bar h-full w-full rounded-full bg-gradient-to-b from-outline to-outline/70" />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-on-surface">
                <Crown size={14} className="text-primary" /> FEPass Pro
              </span>
              <b className="tabular-nums text-primary">{vnd(plan.price)}</b>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-surface-container-highest shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]">
              <div
                className="pro-bar h-full rounded-full bg-gradient-to-b from-[#ffe58a] via-[#ffc61f] to-[#e89a00] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] [animation-delay:0.55s]"
                style={{ width: `${ratio}%` }}
              />
            </div>
          </div>
        </GlossCard>

        <GlossCard className="mt-4 overflow-hidden">
          <div className={`${ROW} border-b border-outline-variant bg-surface-container text-center text-xs font-semibold text-on-surface-variant`}>
            <span className="px-4 py-3 text-left">Tính năng</span>
            <span className="flex items-center justify-center py-3">FuOverflow VIP</span>
            <span className={`${PRO_CELL} gap-1 bg-[#ffc61f]/20 py-3 text-primary`}>
              <Crown size={13} /> FEPass Pro
            </span>
          </div>
          {FEATURES.map(({ icon: Icon, text, fuo }) => (
            <div key={text} className={`${ROW} border-b border-outline-variant transition-colors hover:bg-surface-container-low`}>
              <span className="md-body-medium flex items-start gap-2.5 px-4 py-3 pr-2 text-on-surface">
                <Icon size={18} className="mt-0.5 shrink-0 text-primary" /> {text}
              </span>
              <span className="flex items-center justify-center py-3">
                {fuo ? <Check size={18} className="text-on-surface-variant" aria-label="Có" /> : <Minus size={18} className="text-outline" aria-label="Không có" />}
              </span>
              <span className={`${PRO_CELL} py-3`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${GOLD_GLOSS}`}>
                  <Check size={14} strokeWidth={3.2} aria-label="Có" />
                </span>
              </span>
            </div>
          ))}
          <div className={`${ROW} bg-surface-container text-center`}>
            <span className="md-label-large px-4 py-3 text-left text-on-surface">Giá {plan.months} tháng</span>
            <span className="md-body-medium flex items-center justify-center py-3 tabular-nums text-on-surface-variant line-through">{vnd(plan.fuoPrice)}</span>
            <span className={`${PRO_CELL} md-title-small bg-[#ffc61f]/20 py-3 tabular-nums text-primary`}>{vnd(plan.price)}</span>
          </div>
        </GlossCard>
      </Reveal>
    </section>
  );
}
