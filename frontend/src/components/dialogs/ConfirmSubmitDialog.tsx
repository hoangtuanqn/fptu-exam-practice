import { AlertTriangle } from "lucide-react";
import { Button } from "../ui/Button";
import { Modal, ModalActions, ModalTitle } from "../ui/Modal";

interface Props {
  answered: number;
  total: number;
  onCancel: () => void;
  onConfirm: () => void;
}

// Xác nhận trước khi nộp bài
export function ConfirmSubmitDialog({ answered, total, onCancel, onConfirm }: Props) {
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
