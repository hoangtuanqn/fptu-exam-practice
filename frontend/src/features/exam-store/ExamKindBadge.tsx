import type { ExamKind } from "@/features/exam-import/types";

const KINDS: Record<ExamKind, { label: string; cls: string }> = {
  FE: { label: "FE", cls: "bg-primary-container text-on-primary-container" },
  PE: { label: "PE", cls: "bg-tertiary-container text-on-tertiary-container" },
  QUIZ: { label: "Quiz", cls: "bg-secondary-container text-on-secondary-container" },
  OTHER: { label: "Khác", cls: "bg-surface-container-highest text-on-surface-variant" },
};

// Nhãn nhỏ loại đề (FE, PE, Quiz, Khác). Đề cũ chưa có loại: coi là FE
export function ExamKindBadge({ kind }: { kind?: ExamKind | null }) {
  const k = KINDS[kind ?? "FE"] ?? KINDS.FE;
  return <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold leading-none ${k.cls}`}>{k.label}</span>;
}
