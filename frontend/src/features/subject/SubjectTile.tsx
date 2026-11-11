import type { PickableSubject } from "./SubjectPicker";

// Ô môn trong lưới: mã môn, tên môn (một dòng) và số đề xếp dọc. Nền chuyển sắc, đổ bóng, rê chuột thì nâng lên và viền vàng.
export function SubjectTile({ subject, onPick }: { subject: PickableSubject; onPick: () => void }) {
  const name = subject.name ?? "Môn học";
  return (
    <button
      type="button"
      onClick={onPick}
      title={name}
      className="md-state group relative flex h-full w-full flex-col overflow-hidden rounded-m3-md border border-outline-variant/70 bg-gradient-to-b from-surface-container-lowest to-surface-container-low px-3.5 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_22px_-14px_rgba(70,45,0,0.35)] transition duration-200 hover:-translate-y-0.5 hover:border-[#e0a100]/70 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_16px_28px_-14px_rgba(160,100,0,0.5)]"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#ffc61f]/60 to-transparent" />
      <span className="md-title-small text-primary">{subject.code}</span>
      <span className="md-body-small mt-0.5 block w-full truncate text-on-surface-variant">{name}</span>
      {subject.badge && <span className="md-label-medium mt-2 inline-flex w-fit rounded-full bg-primary-container/70 px-2.5 py-0.5 text-on-primary-container">{subject.badge}</span>}
    </button>
  );
}
