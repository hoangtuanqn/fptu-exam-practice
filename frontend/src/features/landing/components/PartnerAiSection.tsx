import { ExternalLink } from "lucide-react";
import { brand, logos } from "@/shared/brand/brand";
import { buttonClass } from "@/shared/ui/Button";
import { GlossCard } from "@/shared/ui/GlossCard";
import { SectionTitle } from "@/shared/ui/SectionTitle";

// Hai thẻ nổi: kho đề FuOverflow và giải thích đáp án bằng AI
export function PartnerAiSection() {
  return (
    <section className="bg-surface-container-low px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <SectionTitle eyebrow="Điểm nổi bật" title="Học thông minh hơn" />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <GlossCard lift className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <img src={logos.partner} alt={brand.partnerName} className="h-10 w-10 rounded-full ring-2 ring-[#ffc61f]/40" />
              <span className="md-label-medium uppercase tracking-wider text-on-surface-variant">Kho đề {brand.partnerName}</span>
            </div>
            <h3 className="md-title-large mt-5 text-on-surface">Luyện đề thi FE từ kho đề của {brand.partnerName}</h3>
            <p className="md-body-medium mt-2 text-on-surface-variant">
              Dán link đề, hệ thống tự lấy về và lưu vào thư viện của bạn. Làm ngay như thi thật, có chấm điểm, tính giờ và lưu lịch sử từng lần làm.
            </p>
            <a href={brand.partnerUrl} target="_blank" rel="noreferrer" className={buttonClass({ variant: "text", className: "mt-4 -ml-3" })}>
              Xem kho đề <ExternalLink size={16} />
            </a>
          </GlossCard>

          <GlossCard lift className="p-5 sm:p-6">
            <span className="md-label-medium inline-flex h-6 items-center rounded-m3-sm bg-tertiary-container px-2.5 uppercase tracking-wider text-on-tertiary-container">VIP</span>
            <h3 className="md-title-large mt-5 text-on-surface">AI giải thích đáp án chi tiết</h3>
            <p className="md-body-medium mt-2 text-on-surface-variant">
              Làm sai một câu? AI chỉ ra vì sao đáp án đúng là đúng và các phương án còn lại sai ở đâu, để bạn hiểu chứ không chỉ nhớ. Bấm giải thích ngay ở câu hỏi lúc làm bài
            </p>
          </GlossCard>
        </div>
      </div>
    </section>
  );
}
