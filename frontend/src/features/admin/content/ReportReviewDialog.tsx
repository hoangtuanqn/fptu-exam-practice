import { useState } from "react";
import { Check, Loader2, MessageSquareWarning, X } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { REPORT_REWARD } from "@/features/answer-report/config";
import { ReportStatusBadge } from "@/shared/components/StatusBadge";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { AnswerReportAdmin } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { Field } from "@/shared/ui/Input";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit, formatDateTime } from "@/shared/utils/formatters";

interface Props {
  report: AnswerReportAdmin;
  onClose: () => void;
  onDone: () => void; // báo danh sách tải lại
}

// Xem một báo cáo đáp án: ảnh câu hỏi, đáp án hiện tại và đề xuất, lý do. Duyệt đúng thì sửa đáp án và thưởng credit.
export function ReportReviewDialog({ report, onClose, onDone }: Props) {
  const toast = useToast();
  const { run, loading, error } = useSubmit();
  const [note, setNote] = useState("");
  const pending = report.status === "PENDING";

  const review = (action: "approve" | "reject") =>
    void run(async () => {
      const body = { note: note.trim() || undefined };
      if (action === "approve") await adminApi.approveReport(report.id, body);
      else await adminApi.rejectReport(report.id, body);
      toast.success(action === "approve" ? `Đã duyệt, thưởng ${formatCredit(REPORT_REWARD)}` : "Đã từ chối báo cáo");
      onDone();
      onClose();
    });

  return (
    <Modal onClose={onClose}>
      <ModalTitle icon={MessageSquareWarning}>
        {report.exam.title} · câu {report.questionNumber}
      </ModalTitle>
      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
        <ReportStatusBadge value={report.status} />
        <span>
          {report.user.fullName} ({report.user.email}) · {formatDateTime(report.createdAt)}
        </span>
      </div>

      {report.imageUrl && (
        <a href={report.imageUrl} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <img src={report.imageUrl} alt={`Câu ${report.questionNumber}`} className="max-h-72 w-full object-contain" />
        </a>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500">Đáp án hiện tại</div>
          <div className="mt-0.5 text-lg font-semibold text-slate-900">{report.currentAnswer}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-xs text-emerald-700">Người dùng đề xuất</div>
          <div className="mt-0.5 text-lg font-semibold text-emerald-800">{report.proposedAnswer}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xs font-medium text-slate-500">Lý do</div>
        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{report.reason}</p>
      </div>

      {pending ? (
        <div className="mt-3 space-y-3">
          <FormError message={error} />
          <Field label="Ghi chú (tùy chọn)">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="Hiển thị cho người báo cáo"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition hover:border-slate-300 focus:border-brand-500"
            />
          </Field>
          <ModalActions>
            <Button onClick={() => review("reject")} disabled={loading}>
              <X size={16} /> Từ chối
            </Button>
            <Button variant="primary" onClick={() => review("approve")} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Duyệt đúng (+{formatCredit(REPORT_REWARD)})
            </Button>
          </ModalActions>
        </div>
      ) : (
        <>
          {report.reviewNote && <p className="mt-3 text-sm text-slate-600">Ghi chú: {report.reviewNote}</p>}
          <ModalActions>
            <Button onClick={onClose}>Đóng</Button>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
