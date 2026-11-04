import { ExternalLink } from "lucide-react";
import { brand, logos } from "@/shared/brand/brand";

// Hai khung: kho đề FuOverflow và giải thích đáp án bằng AI. Viền mảnh, tiêu đề chữ có chân.
export function PartnerAiSection() {
  return (
    <section className="border-b border-slate-200 bg-paper">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:py-16">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-700">Điểm nổi bật</p>
        <h2 className="mt-2 text-center font-display text-2xl font-semibold text-brand-900 sm:text-4xl">Học thông minh hơn</h2>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 border-t-4 border-t-brand-900 bg-white p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <img src={logos.partner} alt={brand.partnerName} className="h-10 w-10 rounded-md" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Kho đề {brand.partnerName}</span>
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold text-brand-900">Luyện đề thi FE từ kho đề của {brand.partnerName}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Dán link đề, hệ thống tự lấy về và lưu vào thư viện của bạn. Làm ngay như thi thật, có chấm điểm, tính giờ và lưu lịch sử từng lần làm.
            </p>
            <a href={brand.partnerUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
              Xem kho đề <ExternalLink size={14} />
            </a>
          </div>

          <div className="rounded-lg border border-slate-200 border-t-4 border-t-brand-600 bg-white p-5 sm:p-7">
            <span className="inline-block rounded border border-brand-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-700">VIP</span>
            <h3 className="mt-5 font-display text-xl font-semibold text-brand-900">AI giải thích đáp án chi tiết</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Làm sai một câu? AI chỉ ra vì sao đáp án đúng là đúng và các phương án còn lại sai ở đâu, để bạn hiểu chứ không chỉ nhớ. Bấm giải thích ngay ở câu hỏi lúc làm bài hoặc khi xem lại kết quả.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
