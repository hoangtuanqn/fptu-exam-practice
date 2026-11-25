import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Trash2 } from "lucide-react";
import { adminApi, type ExamAdminDetail } from "@/features/admin/api/admin.api";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

// Xoá hẳn đề: nói rõ những gì sẽ mất theo để admin cân nhắc
export function DeleteExamDialog({ exam, onClose }: { exam: ExamAdminDetail; onClose: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const u = exam.usage;
  const items = [
    [u.userExams, "thành viên đang có đề này trong kho"],
    [u.attempts, "bài làm đã nộp"],
    [u.unlocks, "gói mở khóa lời giải đã mua"],
    [u.purchases, "lời giải mua lẻ"],
  ].filter(([n]) => (n as number) > 0);

  async function remove() {
    setBusy(true);
    try {
      await adminApi.deleteExam(exam.id);
      toast.success("Đã xoá đề");
      navigate("/admin/exams", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Không xoá được"));
      setBusy(false);
    }
  }

  return (
    <Modal onClose={busy ? undefined : onClose}>
      <ModalTitle icon={Trash2}>Xoá đề này?</ModalTitle>
      <p className="mt-3 text-sm font-medium text-slate-800">{exam.title}</p>
      {items.length > 0 ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <p className="font-medium">Các dữ liệu sau sẽ bị xoá theo và không khôi phục được:</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {items.map(([n, label]) => (
              <li key={label as string}>
                <b>{n as number}</b> {label as string}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">Credit đã trả không được hoàn tự động. Nếu cần, hãy cộng lại thủ công cho thành viên.</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Chưa ai dùng đề này nên xoá không ảnh hưởng thành viên nào.</p>
      )}
      <p className="mt-3 text-xs text-slate-500">Xoá cả ảnh câu hỏi trên máy chủ.</p>
      <ModalActions>
        <Button grow onClick={onClose} disabled={busy}>
          Huỷ
        </Button>
        <Button grow variant="danger" onClick={() => void remove()} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Xoá đề
        </Button>
      </ModalActions>
    </Modal>
  );
}
