import { useState, type FormEvent } from "react";
import { Loader2, MessageSquareWarning } from "lucide-react";
import { OPTIONS } from "@/features/practice/config/options";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { Field } from "@/shared/ui/Input";
import { FormError } from "@/shared/ui/Feedback";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit } from "@/shared/utils/formatters";
import { answerReportApi } from "./answer-report.api";
import { REPORT_REASON_MAX, REPORT_REASON_MIN, REPORT_REWARD } from "./config";

interface Props {
  examId: number;
  questionNumber: number;
  currentAnswer: string[]; // đáp án đang có của câu
  onClose: () => void;
  onSent: () => void;
}

// Báo cáo đáp án sai: chọn đáp án đúng theo bạn và nêu lý do. Được admin xác nhận thì nhận credit.
export function ReportAnswerDialog({ examId, questionNumber, currentAnswer, onClose, onSent }: Props) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [picked, setPicked] = useState<string[]>([]);
  const [reason, setReason] = useState("");

  const toggle = (letter: string) => setPicked((p) => (p.includes(letter) ? p.filter((x) => x !== letter) : [...p, letter]));
  const valid = picked.length > 0 && reason.trim().length >= REPORT_REASON_MIN;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await answerReportApi.create({ examId, questionNumber, proposedAnswer: [...picked].sort().join(" "), reason: reason.trim() });
      toast.success("Đã gửi báo cáo, cảm ơn bạn đã đóng góp");
      onSent();
      onClose();
    });
  };

  return (
    <Modal onClose={onClose}>
      <ModalTitle icon={MessageSquareWarning}>Báo cáo đáp án câu {questionNumber}</ModalTitle>
      <p className="mt-1 text-sm text-slate-600">
        Đáp án hiện tại: <b className="text-slate-900">{currentAnswer.join(" ") || "—"}</b>. Nếu báo cáo của bạn được xác nhận chính xác, bạn nhận{" "}
        <b className="text-emerald-700">{formatCredit(REPORT_REWARD)}</b>.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
        <FormError message={error} />

        <Field label="Đáp án đúng theo bạn" error={fieldErrors.proposedAnswer} hint="Chọn nhiều chữ cái nếu câu có nhiều đáp án.">
          <div className="flex flex-wrap gap-2">
            {OPTIONS.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => toggle(letter)}
                aria-pressed={picked.includes(letter)}
                className={`h-10 w-10 rounded-lg border-2 text-base font-semibold transition ${
                  picked.includes(letter) ? "border-brand-900 bg-brand-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Lý do" error={fieldErrors.reason} hint={`${reason.trim().length}/${REPORT_REASON_MAX} · tối thiểu ${REPORT_REASON_MIN} ký tự`}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={REPORT_REASON_MAX}
            placeholder="Giải thích vì sao đáp án này đúng (kiến thức, nguồn tham khảo, cách tính...)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition hover:border-slate-300 focus:border-brand-500"
          />
        </Field>

        <ModalActions>
          <Button type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" type="submit" disabled={loading || !valid}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            Gửi báo cáo
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
