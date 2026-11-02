import { FileQuestion } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

const CODE = "rounded bg-slate-100 px-1";

// Báo lỗi khi thư mục không có ảnh hợp lệ
export function NotFoundDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal>
      <ModalTitle icon={FileQuestion}>Không tìm thấy ảnh câu hỏi</ModalTitle>
      <p className="mt-4 text-sm text-slate-600">
        Ảnh trong thư mục phải có tên dạng <code className={CODE}>1.webp</code>, <code className={CODE}>2.webp</code>{" "}
        (hoặc <code className={CODE}>Q1.webp</code>...). Hãy kiểm tra lại thư mục rồi thử lại.
      </p>
      <ModalActions>
        <Button grow variant="primary" onClick={onClose}>
          Đã hiểu
        </Button>
      </ModalActions>
    </Modal>
  );
}
