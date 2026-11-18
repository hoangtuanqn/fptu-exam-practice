import type { ExamKind } from "@/features/exam-import/types";
import { Badge } from "@/shared/ui/Badge";

const LABELS: Record<ExamKind, string> = { FE: "FE", PE: "PE", QUIZ: "Quiz", OTHER: "Khác" };

// Nhãn loại đề (FE / PE / Quiz / Khác); không rõ loại thì không hiện
export function ExamKindBadge({ kind }: { kind?: ExamKind }) {
  if (!kind || !LABELS[kind]) return null;
  return <Badge tone={kind === "PE" ? "warning" : "neutral"}>{LABELS[kind]}</Badge>;
}
