import { useState } from "react";
import { Check, Loader2, ThumbsDown, X } from "lucide-react";
import { openImageHandler } from "@/shared/api/protectedImage";
import { ProtectedImg } from "@/shared/ui/ProtectedImg";
import { adminApi, type ExplanationFeedbackAdmin } from "@/features/admin/api/admin.api";
import { EXPLAIN_FEEDBACK_REWARD, REPORT_REWARD } from "@/features/answer-report/config";
import { FEEDBACK_REASONS } from "@/features/explanation/explanation.api";
import { OPTIONS } from "@/features/practice/config/options";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { FormError } from "@/shared/ui/Feedback";
import { Markdown } from "@/shared/ui/Markdown";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit, formatDateTime } from "@/shared/utils/formatters";

interface Props {
  feedback: ExplanationFeedbackAdmin;
  onClose: () => void;
  onDone: () => void; // báo danh sách tải lại
}

// Xem một đánh giá 👎: ảnh câu, đáp án hiện tại, góp ý, lời giải đang lưu. Xác nhận đúng thì xóa lời giải (sửa đáp án nếu chọn) và thưởng credit.
export function FeedbackReviewDialog({ feedback: f, onClose, onDone }: Props) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit(undefined, ["answer"]);
  const { confirm, confirmDialog } = useConfirm();
  const [picked, setPicked] = useState<string[]>([]);

  const current = f.currentAnswer; // backend cũ không trả: ẩn nút xác nhận, vẫn đóng được
  const answer = [...picked].sort().join(" ");
  const same = picked.length > 0 && answer === current;
  const changed = picked.length > 0 && !same;
  const reward = changed ? REPORT_REWARD : EXPLAIN_FEEDBACK_REWARD;
  const blocked = f.explanationStale
    ? "Lời giải đã được tạo lại sau góp ý này nên không thưởng được, bạn chỉ có thể đóng góp ý."
    : f.explanation === null
      ? "Lời giải đã bị xóa nên không thưởng được, bạn chỉ có thể đóng góp ý."
      : null;
  const reason = FEEDBACK_REASONS.find((r) => r.value === f.reason)?.label;

  const toggle = (letter: string) => setPicked((p) => (p.includes(letter) ? p.filter((x) => x !== letter) : [...p, letter]));

  const close = () =>
    void run(async () => {
      await adminApi.resolveFeedback(f.id);
      toast.success("Đã đóng góp ý, không thưởng");
      onDone();
      onClose();
    });

  const accept = async () => {
    const message = `Lời giải câu ${f.questionNumber} sẽ bị xóa${changed ? `, đáp án đổi từ ${current || "—"} thành ${answer}` : ""} và ${f.user.fullName} được thưởng ${formatCredit(reward)}. Các đánh giá chưa tốt khác của câu này cũng được đóng.`;
    if (!(await confirm({ title: changed ? "Sửa đáp án và thưởng?" : "Xác nhận lời giải sai?", message, confirmLabel: "Xác nhận" }))) return;
    void run(async () => {
      const row = await adminApi.confirmFeedback(f.id, changed ? { answer } : {});
      toast.success(`Đã xác nhận, thưởng ${formatCredit(row.reward ?? reward)}`);
      onDone();
      onClose();
    });
  };

  return (
    <Modal wide onClose={loading ? undefined : onClose}>
      {confirmDialog}
      <ModalTitle icon={ThumbsDown}>
        {f.exam.title} · câu {f.questionNumber}
      </ModalTitle>
      <p className="mt-1 text-xs text-slate-500">
        {f.user.fullName} ({f.user.email}) · {formatDateTime(f.updatedAt)}
      </p>

      {f.imageUrl && (
        <a href="#" onClick={openImageHandler(f.imageUrl)} title="Mở ảnh lớn" className="mt-3 block overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <ProtectedImg src={f.imageUrl} alt={`Câu ${f.questionNumber}`} className="max-h-72 w-full object-contain" />
        </a>
      )}

      {current !== undefined && (
        <p className="mt-3 text-sm text-slate-700">
          Đáp án hiện tại: <b className="text-slate-900">{current || "—"}</b>
        </p>
      )}

      <div className="mt-3">
        <div className="text-xs font-medium text-slate-500">Góp ý</div>
        <p className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          {reason && <b>{reason}. </b>}
          {f.comment ? `“${f.comment}”` : !reason && "Không có nhận xét."}
        </p>
      </div>

      <div className="mt-3">
        <div className="text-xs font-medium text-slate-500">Lời giải đang lưu{f.model ? ` (${f.model})` : ""}</div>
        {/* Cuộn riêng để lời giải dài không đẩy nút xử lý quá xa */}
        <div tabIndex={0} aria-label="Lời giải đang lưu" className="mt-1 max-h-72 overflow-y-auto break-words rounded-lg border border-slate-200 bg-surface-container-lowest p-3">
          {f.explanation ? <Markdown>{f.explanation}</Markdown> : <p className="text-sm text-slate-500">Lời giải này đã bị xóa.</p>}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <FormError message={error} />
        {current != null && !blocked && (
          <fieldset>
            <legend className="md-label-large mb-1.5 text-on-surface-variant">Đáp án sai? Chọn đáp án đúng (không bắt buộc)</legend>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {OPTIONS.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => toggle(letter)}
                  disabled={loading}
                  aria-pressed={picked.includes(letter)}
                  className={`h-11 rounded-lg border-2 text-base font-semibold transition ${
                    picked.includes(letter) ? "border-primary bg-primary text-on-primary" : "border-slate-300 bg-surface-container-lowest text-slate-700 hover:border-slate-500"
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
            {fieldErrors.answer ? (
              <span role="alert" className="md-body-small mt-1 block px-4 text-error">
                {fieldErrors.answer}
              </span>
            ) : same ? (
              <span className="md-body-small mt-1 block px-4 text-error">Trùng đáp án hiện tại. Bỏ chọn nếu chỉ lời giải sai.</span>
            ) : null}
          </fieldset>
        )}
        {current != null && blocked && <p className="text-sm text-slate-600">{blocked}</p>}

        <ModalActions>
          <Button onClick={close} disabled={loading}>
            <X size={16} aria-hidden /> Đóng, không thưởng
          </Button>
          {current != null && (
            <Button variant="primary" onClick={() => void accept()} disabled={loading || !!blocked || same}>
              {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />}
              {changed ? "Sửa đáp án" : "Lời giải sai"} (+{formatCredit(reward)})
            </Button>
          )}
        </ModalActions>
      </div>
    </Modal>
  );
}
