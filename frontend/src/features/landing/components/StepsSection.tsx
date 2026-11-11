import { GlossCard } from "@/shared/ui/GlossCard";
import { GOLD_GLOSS } from "@/shared/ui/gold";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { STEPS } from "../content";

// Ba bước từ đề đến điểm số: thẻ có bề mặt chuyển sắc, số bước vàng bóng, đường nét đứt nối các bước khi xếp ngang hàng
export function StepsSection() {
  return (
    <section className="bg-surface px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <SectionTitle eyebrow="Cách hoạt động" title="Từ đề thi đến điểm số trong 3 bước" />
        <ol className="relative mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-3">
          <div aria-hidden className="absolute left-[16.6%] right-[16.6%] top-10 hidden border-t-2 border-dashed border-[#ffc61f]/50 sm:block" />
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <GlossCard lift className="h-full p-5">
                <span className={`md-title-large flex h-10 w-10 items-center justify-center rounded-full font-extrabold ${GOLD_GLOSS}`}>{i + 1}</span>
                <h3 className="md-title-large mt-4 text-on-surface">{step.title}</h3>
                <p className="md-body-medium mt-1.5 text-on-surface-variant">{step.text}</p>
              </GlossCard>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
