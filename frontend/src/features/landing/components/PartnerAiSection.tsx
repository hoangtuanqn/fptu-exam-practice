import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/shared/ui/Button";
import { GlossCard } from "@/shared/ui/GlossCard";
import { SectionTitle } from "@/shared/ui/SectionTitle";

// Hai thẻ nổi: luyện đề như thi thật và giải thích đáp án bằng AI (không dùng logo/tên thương hiệu của bên thứ ba)
export function PartnerAiSection() {
  return (
    <section className="bg-surface-container-low px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <SectionTitle eyebrow="Điểm nổi bật" title="Học thông minh hơn" />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <GlossCard lift className="p-5 sm:p-6">
            <span className="md-label-medium inline-flex h-6 items-center rounded-m3-sm bg-secondary-container px-2.5 uppercase tracking-wider text-on-secondary-container">Kho đề</span>
            <h3 className="md-title-large mt-5 text-on-surface">Luyện đề thi FE như thi thật</h3>
            <p className="md-body-medium mt-2 text-on-surface-variant">
              Dán link đề, hệ thống tự lấy về và lưu vào thư viện của bạn. Làm ngay như thi thật, có chấm điểm, tính giờ và lưu lịch sử từng lần làm.
            </p>
            <Link to="/kho-de" className={buttonClass({ variant: "text", className: "mt-4 -ml-3" })}>
              Xem kho đề <ArrowRight size={16} />
            </Link>
          </GlossCard>

          <GlossCard lift className="p-5 sm:p-6">
            <span className="md-label-medium inline-flex h-6 items-center rounded-m3-sm bg-tertiary-container px-2.5 uppercase tracking-wider text-on-tertiary-container">Giải thích AI</span>
            <h3 className="md-title-large mt-5 text-on-surface">AI giải thích đáp án chi tiết</h3>
            <p className="md-body-medium mt-2 text-on-surface-variant">
              Làm sai một câu? AI chỉ ra vì sao đáp án đúng là đúng và các phương án còn lại sai ở đâu, để bạn hiểu chứ không chỉ nhớ. Bấm giải thích ngay ở câu hỏi lúc làm bài.
            </p>
            <Link to="/pro" className={buttonClass({ variant: "text", className: "mt-4 -ml-3" })}>
              Xem gói Pro <ArrowRight size={16} />
            </Link>
          </GlossCard>
        </div>
      </div>
    </section>
  );
}
