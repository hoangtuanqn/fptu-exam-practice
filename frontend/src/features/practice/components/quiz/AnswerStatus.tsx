import { Check, CheckCircle2, XCircle } from "lucide-react";
import type { Question } from "@/features/practice/types.ts";
import { hasAnswer, isCorrect } from "@/features/practice/utils/question";
import { Button } from "@/shared/ui/Button";
import { Kbd } from "@/shared/ui/Kbd";

interface Props {
  question: Question;
  selected: string[];
  revealed: boolean;
  canCheck: boolean; // luyện tập: đã chọn nhưng chưa chốt
  onCheck: () => void;
}

// Ô trạng thái có CHIỀU CAO CỐ ĐỊNH: hiện nút "Xác nhận" hoặc kết quả đúng/sai.
// Luôn chiếm đúng một chỗ nên bố cục không bị giật khi nội dung đổi.
export function AnswerStatus({ question, selected, revealed, canCheck, onCheck }: Props) {
  return (
    <div className="flex h-10 min-w-44 items-center">
      {canCheck ? (
        <Button variant="primary" size="sm" className="h-10" onClick={onCheck}>
          <Check size={16} />
          Xác nhận
          <Kbd>Enter</Kbd>
        </Button>
      ) : revealed ? (
        hasAnswer(question) ? (
          <Result right={isCorrect(question, selected)} correct={question.correct} />
        ) : (
          <span className="text-sm text-slate-400">Chưa có đáp án</span>
        )
      ) : null}
    </div>
  );
}

function Result({ right, correct }: { right: boolean; correct: string[] }) {
  const Icon = right ? CheckCircle2 : XCircle;
  const tone = right
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <div className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-sm ${tone}`}>
      <Icon size={18} className="shrink-0" />
      <span className="whitespace-nowrap">
        {right ? (
          "Chính xác"
        ) : (
          <>
            Đáp án đúng: <b>{correct.join(" ")}</b>
          </>
        )}
      </span>
    </div>
  );
}
