import type { PlanInfo } from "../plan.api";
import { vnd } from "./money";
import { Reveal } from "./Reveal";
import { GOLD } from "./style";

// Ba bước từ "chưa có gì" tới "dán link lấy đề": giảm cảm giác phức tạp trước khi mua
export function ProSteps({ plan }: { plan: PlanInfo }) {
  const steps = [
    { title: "Đăng nhập, xác minh email", text: "Mất chưa tới một phút." },
    { title: `Trả ${vnd(plan.price)} bằng credit`, text: "Thiếu thì nạp thêm, xong quay lại ngay." },
    { title: "Dán link và học", text: `Lấy đề, xem giải thích, không bị trừ credit suốt ${plan.months} tháng.` },
  ];
  return (
    <section className="mx-auto max-w-4xl px-4 pt-16">
      <Reveal>
        <h2 className="md-headline-small text-center text-on-surface">Bắt đầu chỉ với 3 bước</h2>
        <ol className="mt-7 grid gap-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-m3-md border border-outline-variant bg-surface-container-low p-4">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold shadow-m3-1 ${GOLD}`}>{i + 1}</span>
              <div className="md-title-small mt-3 text-on-surface">{s.title}</div>
              <p className="md-body-small mt-1 text-on-surface-variant">{s.text}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
