import type { Question } from "../../types";
import { OPTIONS } from "../../config/options";
import { hasAnswer, isMultiple } from "../../utils/question";

interface Props {
  question: Question;
  selected: string[];
  revealed: boolean;
  onChoose: (option: string) => void;
  compact?: boolean;
}

// Hàng nút A–H. Tròn = chọn một, vuông bo góc = chọn nhiều.
export function AnswerOptions({ question, selected, revealed, onChoose, compact = false }: Props) {
  const { correct } = question;
  const multiple = isMultiple(question);
  const graded = hasAnswer(question);

  function style(opt: string) {
    const isSelected = selected.includes(opt);
    if (revealed && graded) {
      if (correct.includes(opt)) return "border-emerald-600 bg-emerald-600 text-white";
      if (isSelected) return "border-rose-600 bg-rose-600 text-white";
      return "border-slate-200 bg-white text-slate-400";
    }
    return isSelected
      ? "border-brand-900 bg-brand-900 text-white"
      : "border-slate-300 bg-white text-slate-700 hover:border-slate-500";
  }

  return (
    <div className={`flex flex-wrap ${compact ? "justify-center gap-2" : "gap-3"}`}>
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          onClick={() => onChoose(opt)}
          className={`border-2 font-semibold shadow-sm transition active:scale-95 ${
            compact ? "h-10 w-10 text-base" : "h-12 w-12 text-lg"
          } ${multiple ? "rounded-lg" : "rounded-full"} ${style(opt)}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
