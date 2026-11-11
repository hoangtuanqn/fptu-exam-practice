import { Download, Flame, Link2, NotebookPen, Sparkles, Target } from "lucide-react";
import type { PlanInfo } from "../plan.api";
import { vnd } from "./money";
import { Reveal } from "./Reveal";
import { GOLD } from "./style";

// Những gì mở khóa khi lên Pro. Nói rõ gói thường bị giới hạn ở đâu, không nêu con số nội bộ.
export function ProBenefits({ plan, fetchPrice }: { plan: PlanInfo; fetchPrice: number }) {
  const items = [
    plan.benefits.freeFetch && {
      icon: Link2,
      title: "Lấy đề không bị trừ credit",
      text: fetchPrice > 0 ? `Dán link FuOverflow là có đề kèm đáp án AI. Gói thường mỗi lần lấy đề tính ${vnd(fetchPrice)}.` : "Dán link FuOverflow là có đề kèm đáp án AI.",
    },
    plan.benefits.freeExplain && { icon: Sparkles, title: "Giải thích AI mọi câu", text: "Xem vì sao đúng, vì sao sai ở bất kỳ câu nào, không cần mở khóa từng câu hay từng đề." },
    plan.benefits.freePe && { icon: Download, title: "Tải đề PE", text: "Tải trọn bộ tài nguyên đề PE (file zip), không tính phí mỗi lần tải." },
    plan.benefits.topicReport && { icon: Target, title: "Báo cáo điểm yếu đầy đủ", text: "Thấy mình yếu chủ đề nào của môn và luyện đúng phần đó. Gói thường chỉ thấy chủ đề yếu nhất." },
    plan.benefits.frequentQuestions && { icon: Flame, title: "Xem đủ “Câu hay ra”", text: "Biết câu nào lặp lại ở nhiều đề để ôn trước. Gói thường chỉ xem vài câu đầu." },
    plan.benefits.unlimitedReview && { icon: NotebookPen, title: "Sổ câu sai không giới hạn", text: "Mọi câu sai đều được lưu và nhắc ôn đúng lịch. Gói thường có giới hạn số câu." },
  ].filter(Boolean) as { icon: typeof Link2; title: string; text: string }[];

  return (
    <section className="mx-auto max-w-5xl px-4 pt-16">
      <Reveal>
        <h2 className="md-headline-small text-center text-on-surface">Lên Pro bạn được gì</h2>
        <p className="md-body-medium mx-auto mt-1 max-w-md text-center text-on-surface-variant">Những thứ gói thường bị tính phí hoặc giới hạn, Pro mở hết.</p>
      </Reveal>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, text }, i) => (
          <Reveal key={title} delay={i * 80}>
            <div className="group h-full rounded-m3-lg border border-outline-variant bg-surface-container-lowest p-5 transition duration-300 hover:-translate-y-1 hover:border-[#ffc61f]/60 hover:shadow-m3-2">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-m3-1 transition group-hover:scale-105 ${GOLD}`}>
                <Icon size={24} strokeWidth={2.2} />
              </span>
              <h3 className="md-title-medium mt-4 text-on-surface">{title}</h3>
              <p className="md-body-medium mt-1 text-on-surface-variant">{text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
