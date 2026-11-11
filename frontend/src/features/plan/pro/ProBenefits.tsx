import { Download, Flame, Link2, NotebookPen, Sparkles, Target } from "lucide-react";
import type { PlanInfo } from "../plan.api";
import { vnd } from "./money";

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
    <section className="mx-auto max-w-5xl px-4 pt-14">
      <h2 className="md-headline-small text-center text-on-surface">Lên Pro bạn được gì</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-m3-lg border border-outline-variant bg-surface-container-lowest p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <Icon size={20} />
            </span>
            <h3 className="md-title-medium mt-3 text-on-surface">{title}</h3>
            <p className="md-body-medium mt-1 text-on-surface-variant">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
