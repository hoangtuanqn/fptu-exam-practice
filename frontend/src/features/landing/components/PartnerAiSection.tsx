import { ExternalLink, Sparkles } from "lucide-react";
import { brand, logos } from "@/shared/brand/brand";

// Hai thẻ: kho đề FuOverflow và AI giải thích đáp án
export function PartnerAiSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-4xl px-5 py-12">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <img src={logos.partner} alt={brand.partnerName} className="h-11 w-11 rounded-full" />
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-brand-700">
                Kho đề {brand.partnerName}
              </span>
            </div>
            <h3 className="mt-4 font-serif text-xl font-semibold text-slate-900">
              Luyện đề thi FE từ kho đề của {brand.partnerName}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Lấy đề từ {brand.partnerName}, mở thư mục đề trên hệ thống và làm ngay như thi thật, có chấm điểm và tính
              giờ.
            </p>
            <a
              href={brand.partnerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
            >
              Xem kho đề <ExternalLink size={14} />
            </a>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-6 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-accent">
              <Sparkles size={20} />
            </span>
            <h3 className="mt-4 font-serif text-xl font-semibold">AI giải thích đáp án chi tiết</h3>
            <p className="mt-2 text-sm leading-relaxed text-brand-100">
              Làm sai một câu? AI chỉ ra vì sao đáp án đúng là đúng và các phương án còn lại sai ở đâu, để bạn hiểu chứ
              không chỉ nhớ.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
