import { STEPS } from "../content";

// Ba bước từ đề đến điểm số
export function StepsSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-4xl px-5 py-16">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Cách hoạt động</p>
        <h2 className="mt-2 text-center text-2xl font-semibold text-slate-900 sm:text-3xl">
          Từ đề thi đến điểm số trong 3 bước
        </h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="group relative rounded-2xl border border-slate-200/80 bg-paper p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-card"
            >
              <span className="absolute right-5 top-4 text-5xl font-semibold leading-none text-slate-900/[0.05] transition group-hover:text-brand-600/10">
                {i + 1}
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-semibold text-brand-600 shadow-soft ring-1 ring-slate-200/80">
                {i + 1}
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
