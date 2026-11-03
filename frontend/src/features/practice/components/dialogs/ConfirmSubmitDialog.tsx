import { AlertTriangle, Info } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

interface Props {
  answered: number;
  total: number;
  savable: boolean; // đề của hệ thống (lưu được lịch sử) hay đề mở từ thư mục
  onCancel: () => void;
  onConfirm: () => void;
}

// Xác nhận trước khi nộp bài
export function ConfirmSubmitDialog({ answered, total, savable, onCancel, onConfirm }: Props) {
  const { user } = useAuth();
  const left = total - answered;

  return (
    <Modal>
      <ModalTitle icon={AlertTriangle}>Nộp bài?</ModalTitle>
      <p className="mt-4 text-sm text-slate-600">
        Bạn đã làm <b className="text-slate-900">{answered}</b> / {total} câu.
        {left > 0 ? (
          <>
            {" "}
            Còn <b className="text-slate-900">{left}</b> câu chưa trả lời, những câu này sẽ không được tính điểm.
          </>
        ) : (
          " Bạn đã trả lời tất cả các câu."
        )}
      </p>
      {!user && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-600" />
          {savable
            ? "Bạn chưa đăng nhập. Sau khi nộp, hãy đăng ký hoặc đăng nhập để bài này được lưu vào lịch sử."
            : "Đề mở từ thư mục trên máy không được lưu lịch sử. Hãy lấy đề từ link FuOverflow để lưu lại kết quả."}
        </p>
      )}
      <ModalActions>
        <Button grow onClick={onCancel}>
          Tiếp tục làm
        </Button>
        <Button grow variant="primary" onClick={onConfirm}>
          Nộp bài
        </Button>
      </ModalActions>
    </Modal>
  );
}
