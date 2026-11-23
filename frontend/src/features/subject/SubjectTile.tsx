import type { PointerEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import type { PickableSubject } from "./SubjectPicker";

// Chỉ chuột mới có hiệu ứng nghiêng/đèn theo con trỏ (cảm ứng không rê được, và kéo ngón tay không nên làm ô xoay)
function track(e: PointerEvent<HTMLButtonElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty("--mx", `${x * 100}%`);
  el.style.setProperty("--my", `${y * 100}%`);
  el.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
  el.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
}

function reset(e: PointerEvent<HTMLButtonElement>) {
  const el = e.currentTarget;
  el.style.setProperty("--rx", "0deg");
  el.style.setProperty("--ry", "0deg");
}

// Ô môn trong lưới: mã môn, tên môn (một dòng) và số đề xếp dọc.
// Rê chuột: ô nghiêng theo con trỏ, có đèn vàng lan theo chuột, dải sáng quét qua, viền và bóng vàng, mũi tên hiện ra. Bấm thì ô lún nhẹ.
export function SubjectTile({ subject, onPick }: { subject: PickableSubject; onPick: () => void }) {
  const name = subject.name ?? "Môn học";
  return (
    <button
      type="button"
      onClick={onPick}
      onPointerMove={track}
      onPointerLeave={reset}
      title={name}
      className="md-state group relative flex h-full w-full flex-col overflow-hidden rounded-m3-md border border-outline-variant/70 bg-gradient-to-b from-surface-container-lowest to-surface-container-low px-3.5 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_22px_-14px_rgba(70,45,0,0.35)] transition duration-200 [transform:perspective(700px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] hover:-translate-y-0.5 hover:border-[#e0a100]/70 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_16px_28px_-14px_rgba(160,100,0,0.5)] active:scale-[0.97] motion-reduce:transform-none"
    >
      {/* Đèn vàng lan theo vị trí con trỏ */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(circle at var(--mx,50%) var(--my,50%), rgb(255 198 31 / 0.28), transparent 60%)" }}
      />
      {/* Dải sáng quét ngang khi rê chuột */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%] motion-reduce:hidden"
      />
      <span aria-hidden className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#ffc61f]/60 to-transparent" />
      <ArrowUpRight
        aria-hidden
        size={16}
        className="absolute right-3 top-3 translate-x-[-4px] translate-y-[4px] text-[#b87800] opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
      />
      <span className="md-title-small relative text-primary">{subject.code}</span>
      <span className="md-body-small relative mt-0.5 block w-full truncate text-on-surface-variant">{name}</span>
      {subject.badge && (
        <span className="md-label-medium relative mt-2 inline-flex w-fit rounded-full bg-primary-container/70 px-2.5 py-0.5 text-on-primary-container">
          {subject.badge}
        </span>
      )}
    </button>
  );
}
