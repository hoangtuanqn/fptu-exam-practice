import { ExternalLink } from "lucide-react";
import { brand, logos } from "@/shared/brand/brand";
import { buttonClass } from "@/shared/ui/Button";

// Hai thẻ outlined của M3: kho đề FuOverflow và giải thích đáp án bằng AI
export function PartnerAiSection() {
  return (
    <section className="bg-surface-container-low px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="md-label-large text-center uppercase tracking-widest text-primary">Điểm nổi bật</p>
        <h2 className="md-section-title mt-2 text-center text-on-surface">Học thông minh hơn</h2>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-m3-lg border border-outline-variant bg-surface p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <img src={logos.partner} alt={brand.partnerName} className="h-10 w-10 rounded-full" />
              <span className="md-label-medium uppercase tracking-wider text-on-surface-variant">Kho đề {brand.partnerName}</span>
            </div>
            <h3 className="md-title-large mt-5 text-on-surface">Luyện đề thi FE từ kho đề của {brand.partnerName}</h3>
            <p className="md-body-medium mt-2 text-on-surface-variant">
              Dán link đề, hệ thống tự lấy về và lưu vào thư viện của bạn. Làm ngay như thi thật, có chấm điểm, tính giờ và lưu lịch sử từng lần làm.
            </p>
            <a href={brand.partnerUrl} target="_blank" rel="noreferrer" className={buttonClass({ variant: "text", className: "mt-4 -ml-3" })}>
              Xem kho đề <ExternalLink size={16} />
            </a>
          </div>

          <div className="rounded-m3-lg border border-outline-variant bg-surface p-5 sm:p-6">
            <span className="md-label-medium inline-flex h-6 items-center rounded-m3-sm bg-tertiary-container px-2.5 uppercase tracking-wider text-on-tertiary-container">VIP</span>
            <h3 className="md-title-large mt-5 text-on-surface">AI giải thích đáp án chi tiết</h3>
            <p className="md-body-medium mt-2 text-on-surface-variant">
              Làm sai một câu? AI chỉ ra vì sao đáp án đúng là đúng và các phương án còn lại sai ở đâu, để bạn hiểu chứ không chỉ nhớ. Bấm giải thích ngay ở câu hỏi lúc làm bài hoặc khi xem lại kết quả.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
