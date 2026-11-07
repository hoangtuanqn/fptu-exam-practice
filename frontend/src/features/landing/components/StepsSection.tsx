import { STEPS } from "../content";

// Ba bước từ đề đến điểm số: danh sách có thứ tự, mỗi bước là một thẻ filled của M3 với số trong vòng tròn primary-container
export function StepsSection() {
  return (
    <section className="bg-surface px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="md-label-large text-center uppercase tracking-widest text-primary">Cách hoạt động</p>
        <h2 className="md-section-title mt-2 text-center text-on-surface">Từ đề thi đến điểm số trong 3 bước</h2>
        <ol className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-m3-lg bg-surface-container-highest p-5">
              <span className="md-title-large flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">{i + 1}</span>
              <h3 className="md-title-large mt-4 text-on-surface">{step.title}</h3>
              <p className="md-body-medium mt-1.5 text-on-surface-variant">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
