import { ExternalLink, Sparkles } from "lucide-react";
import { brand, logos } from "@/shared/brand/brand";

// Hai thẻ: kho đề FuOverflow và AI giải thích đáp án
export function PartnerAiSection() {
  return (
    <section className="border-t border-slate-200/70 bg-paper">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:py-16">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
          Điểm nổi bật
        </p>
        <h2 className="mt-2 text-center text-2xl font-semibold text-slate-900 sm:text-3xl">
          Học thông minh hơn
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-card">
            <div className="flex items-center gap-3">
              <img
                src={logos.partner}
                alt={brand.partnerName}
                className="h-11 w-11 rounded-2xl"
              />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                Kho đề {brand.partnerName}
              </span>
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-900">
              Luyện đề thi FE từ kho đề của {brand.partnerName}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Dán link đề, hệ thống tự lấy về và lưu vào thư viện của bạn. Làm
              ngay như thi thật, có chấm điểm, tính giờ và lưu lịch sử từng lần
              làm.
            </p>
            <a
              href={brand.partnerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
            >
              Xem kho đề <ExternalLink size={14} />
            </a>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-7 text-white shadow-card">
            <div
              aria-hidden
              className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent/30 blur-3xl"
            />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25">
              <Sparkles size={20} />
            </span>
            <h3 className="relative mt-5 text-xl font-semibold">
              AI giải thích đáp án chi tiết
            </h3>
            <p className="relative mt-2 text-sm leading-relaxed text-brand-100">
              Làm sai một câu? AI chỉ ra vì sao đáp án đúng là đúng và các
              phương án còn lại sai ở đâu, để bạn hiểu chứ không chỉ nhớ. Bấm
              giải thích ngay ở câu hỏi lúc làm bài hoặc khi xem lại kết quả.
            </p>
            <span className="relative mt-5 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25">
              VIP
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
