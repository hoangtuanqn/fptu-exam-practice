import { Download, Flame, Link2, NotebookPen, Sparkles, Target } from "lucide-react";
import type { PlanInfo } from "../plan.api";
import { GlossCard } from "@/shared/ui/GlossCard";
import { vnd } from "./money";
import { Reveal } from "./Reveal";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { GOLD_GLOSS } from "@/shared/ui/gold";

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
    <section className="mx-auto max-w-5xl px-4 pt-20">
      <Reveal>
        <SectionTitle eyebrow="Quyền lợi" title="Lên Pro bạn được gì" subtitle="Những thứ gói thường bị tính phí hoặc giới hạn, Pro mở hết." />
      </Reveal>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, text }, i) => (
          <Reveal key={title} delay={i * 80} className="h-full">
            <GlossCard lift className="group h-full p-5">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl transition duration-300 group-hover:scale-105 group-hover:-rotate-3 ${GOLD_GLOSS}`}>
                <Icon size={24} strokeWidth={2.2} />
              </span>
              <h3 className="md-title-medium mt-4 text-on-surface">{title}</h3>
              <p className="md-body-medium mt-1 text-on-surface-variant">{text}</p>
            </GlossCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
