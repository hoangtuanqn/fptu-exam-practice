import type { PlanInfo } from "../plan.api";
import { GlossCard } from "@/shared/ui/GlossCard";
import { vnd } from "./money";
import { Reveal } from "./Reveal";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { GOLD_GLOSS } from "@/shared/ui/gold";

// Ba bước từ "chưa có gì" tới "dán link lấy đề": giảm cảm giác phức tạp trước khi mua
export function ProSteps({ plan }: { plan: PlanInfo }) {
  const steps = [
    { title: "Đăng nhập, xác minh email", text: "Mất chưa tới một phút." },
    { title: `Trả ${vnd(plan.price)} bằng credit`, text: "Thiếu thì nạp thêm, xong quay lại ngay." },
    { title: "Dán link và học", text: `Lấy đề, xem giải thích, không bị trừ credit suốt ${plan.months} tháng.` },
  ];
  return (
    <section className="mx-auto max-w-4xl px-4 pt-20">
      <Reveal>
        <SectionTitle eyebrow="Cách dùng" title="Bắt đầu chỉ với 3 bước" />
        <ol className="relative mt-8 grid gap-4 sm:grid-cols-3">
          {/* Đường nối các bước (chỉ hiện khi ba thẻ nằm ngang hàng) */}
          <div aria-hidden className="absolute left-[16.6%] right-[16.6%] top-9 hidden border-t-2 border-dashed border-[#ffc61f]/50 sm:block" />
          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              <GlossCard className="h-full p-5 text-center">
                <span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-base font-extrabold ${GOLD_GLOSS}`}>{i + 1}</span>
                <div className="md-title-small mt-3 text-on-surface">{s.title}</div>
                <p className="md-body-small mt-1 text-on-surface-variant">{s.text}</p>
              </GlossCard>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
