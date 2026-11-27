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
  examId: string;
  questionNumber: number;
  currentAnswer: string[]; // đáp án đang có của câu
  onClose: () => void;
  onSent: () => void;
}

// Báo cáo đáp án sai: chọn đáp án đúng theo bạn và nêu lý do. Được admin xác nhận thì nhận credit.
export function ReportAnswerDialog({ examId, questionNumber, currentAnswer, onClose, onSent }: Props) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit("Chưa gửi được báo lỗi đáp án, bạn thử lại nhé", ["proposedAnswer", "reason"]);
  const [picked, setPicked] = useState<string[]>([]);
  const [reason, setReason] = useState("");

  const toggle = (letter: string) => setPicked((p) => (p.includes(letter) ? p.filter((x) => x !== letter) : [...p, letter]));
  const missing = REPORT_REASON_MIN - reason.trim().length; // còn thiếu bao nhiêu ký tự
  const valid = picked.length > 0 && missing <= 0;
  const dirty = picked.length > 0 || reason !== "";

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
    // Hộp nằm gần mép trên để bàn phím điện thoại không che ô lý do.
    // Đã chọn hoặc gõ dở thì chạm ra ngoài, bấm Esc không đóng (khỏi mất nội dung); nút Hủy vẫn đóng
    <Modal top onClose={dirty ? undefined : onClose}>
      <ModalTitle icon={MessageSquareWarning}>Báo cáo đáp án câu {questionNumber}</ModalTitle>
      <p className="mt-1 text-sm text-slate-600">
        Đáp án hiện tại: <b className="text-slate-900">{currentAnswer.join(" ") || "—"}</b>. Nếu báo cáo của bạn được xác nhận chính xác, bạn nhận{" "}
        <b className="text-emerald-700">{formatCredit(REPORT_REWARD)}</b>.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
        <FormError message={error} />

        {/* Nhóm nút không bọc trong <label> (Field): bấm vào chữ hay khoảng trống của label sẽ tự bấm nút A */}
        <fieldset>
          <legend className="md-label-large mb-1.5 text-on-surface-variant">Đáp án đúng theo bạn</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {OPTIONS.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => toggle(letter)}
                aria-pressed={picked.includes(letter)}
                className={`h-11 rounded-lg border-2 text-base font-semibold transition ${
                  picked.includes(letter) ? "border-primary bg-primary text-on-primary" : "border-slate-300 bg-surface-container-lowest text-slate-700 hover:border-slate-500"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
          {fieldErrors.proposedAnswer ? (
            <span role="alert" className="md-body-small mt-1 block px-4 text-error">
              {fieldErrors.proposedAnswer}
            </span>
          ) : (
            <span className="md-body-small mt-1 block px-4 text-on-surface-variant">Chọn nhiều chữ cái nếu câu có nhiều đáp án.</span>
          )}
        </fieldset>

        <Field label="Lý do" error={fieldErrors.reason} hint={missing > 0 ? `Cần thêm ${missing} ký tự` : `${reason.trim().length}/${REPORT_REASON_MAX}`}>
          {/* Dưới 1024px chữ 16px: nhỏ hơn thì iPhone tự phóng to cả trang khi chạm vào ô */}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={REPORT_REASON_MAX}
            placeholder="Giải thích vì sao đáp án này đúng (kiến thức, nguồn tham khảo, cách tính...)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base outline-none transition hover:border-slate-300 focus:border-brand-500 lg:text-sm"
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
