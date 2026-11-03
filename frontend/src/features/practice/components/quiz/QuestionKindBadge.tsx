import type { Question } from "@/features/practice/types.ts";
import { isMultiple } from "@/features/practice/utils/question";
import { Badge } from "@/shared/ui/Badge";

// Nhãn "Chọn một đáp án" / "Chọn nhiều đáp án"
export function QuestionKindBadge({ question, short = false }: { question: Question; short?: boolean }) {
  if (question.answerPending) return <Badge>Chọn đáp án</Badge>; // chưa biết chọn một hay nhiều
  const text = isMultiple(question) ? "Chọn nhiều" : "Chọn một";
  return <Badge>{short ? text : `${text} đáp án`}</Badge>;
}
