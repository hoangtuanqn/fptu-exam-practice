import { STEPS } from "../content";

// Ba bước từ đề đến điểm số: danh sách đánh số kiểu giáo trình, mỗi mục một vạch navy trên đầu
export function StepsSection() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:py-16">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-700">Cách hoạt động</p>
        <h2 className="mt-2 text-center font-display text-2xl font-semibold text-brand-900 sm:text-4xl">Từ đề thi đến điểm số trong 3 bước</h2>
        <ol className="mt-8 grid grid-cols-1 gap-6 sm:mt-12 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-t-2 border-brand-900 pt-4">
              <span className="font-display text-4xl font-semibold leading-none text-brand-700">{i + 1}.</span>
              <h3 className="mt-3 font-display text-lg font-semibold text-brand-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
