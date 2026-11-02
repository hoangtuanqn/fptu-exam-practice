import { STEPS } from "../content";

// Ba bước từ thư mục đề đến điểm số
export function StepsSection() {
  return (
    <section className="border-t border-slate-200 bg-paper">
      <div className="mx-auto max-w-4xl px-5 py-12">
        <h2 className="text-center font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">
          Từ thư mục đề đến điểm số trong 3 bước
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent font-serif text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
