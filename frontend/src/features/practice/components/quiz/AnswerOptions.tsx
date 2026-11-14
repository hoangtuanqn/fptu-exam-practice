import { Check, X } from "lucide-react";
import type { Question } from "@/features/practice/types.ts";
import { OPTIONS } from "@/features/practice/config/options";
import { hasAnswer, isMultiple } from "@/features/practice/utils/question";

interface Props {
  question: Question;
  selected: string[];
  revealed: boolean;
  onChoose: (option: string) => void;
  compact?: boolean;
  vertical?: boolean; // xếp dọc, nút 40dp: dùng trong thanh dọc cạnh ảnh đề để dành chỗ cho đề
  dense?: boolean; // 8 nút chia đều một hàng ngang, cao 44dp (thanh dưới cùng trên điện thoại, máy tính bảng)
}

// Hàng lựa chọn A–H, mỗi nút 48x48dp (thanh dọc: 40dp). Tròn = chọn một, bo góc = chọn nhiều.
// Trạng thái dùng vai trò M3: chọn = secondary-container, đúng = success-container, sai = error-container.
// Kết quả KHÔNG chỉ dựa vào màu: đúng có dấu tích, sai có dấu X (WCAG 1.4.1).
export function AnswerOptions({ question, selected, revealed, onChoose, compact = false, vertical = false, dense = false }: Props) {
  const { correct } = question;
  const multiple = isMultiple(question);
  const graded = hasAnswer(question);
  const locked = !!question.answerPending; // AI chưa có đáp án: chỉ xem đề, chưa cho chọn

  function state(opt: string): { cls: string; mark: "right" | "wrong" | null } {
    const isSelected = selected.includes(opt);
    if (revealed && graded) {
      if (correct.includes(opt)) return { cls: "border-success bg-success-container text-on-success-container", mark: "right" };
      if (isSelected) return { cls: "border-error bg-error-container text-on-error-container", mark: "wrong" };
      return { cls: "border-outline-variant text-on-surface/38", mark: null };
    }
    return {
      cls: isSelected ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline text-on-surface",
      mark: null,
    };
  }

  return (
    <div
      role="group"
      aria-label={multiple ? "Chọn một hoặc nhiều đáp án" : "Chọn một đáp án"}
      className={vertical ? "flex flex-col items-center gap-1" : dense ? "mx-auto grid max-w-md grid-cols-8 gap-1" : compact ? "grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:justify-center" : "flex flex-wrap gap-3"}
    >
      {OPTIONS.map((opt) => {
        const { cls, mark } = state(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChoose(opt)}
            disabled={locked}
            aria-pressed={selected.includes(opt)}
            aria-label={`Đáp án ${opt}${mark === "right" ? ", đúng" : mark === "wrong" ? ", sai" : ""}`}
            className={`md-state md-motion md-title-medium relative inline-flex items-center justify-center gap-0.5 border disabled:cursor-not-allowed disabled:opacity-[0.38] ${
              vertical ? "h-10 w-10 min-w-10" : dense ? "h-11 w-full min-w-0" : `h-12 min-w-12 ${compact ? "w-full sm:w-12" : "w-12"}`
            } ${multiple ? "rounded-m3-md" : "rounded-full"} ${cls}`}
          >
            {opt}
            {mark === "right" && <Check size={14} strokeWidth={3} className="absolute -right-1 -top-1 rounded-full bg-success p-0.5 text-on-success" />}
            {mark === "wrong" && <X size={14} strokeWidth={3} className="absolute -right-1 -top-1 rounded-full bg-error p-0.5 text-on-error" />}
          </button>
        );
      })}
    </div>
  );
}
