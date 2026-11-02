import type { Question } from "../../types";
import { isMultiple } from "../../utils/question";
import { Badge } from "../ui/Badge";

// Nhãn "Chọn một đáp án" / "Chọn nhiều đáp án"
export function QuestionKindBadge({ question, short = false }: { question: Question; short?: boolean }) {
  const text = isMultiple(question) ? "Chọn nhiều" : "Chọn một";
  return <Badge>{short ? text : `${text} đáp án`}</Badge>;
}
