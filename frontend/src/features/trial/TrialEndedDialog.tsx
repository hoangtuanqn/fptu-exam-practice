import { Sparkles } from "lucide-react";
import { SignUpCta } from "./SignUpCta";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

// Hiện khi khách đã dùng hết lượt thử mà muốn mở đề mới
export function TrialEndedDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal>
      <ModalTitle icon={Sparkles}>Bạn đã dùng hết lượt thử</ModalTitle>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Lượt dùng thử miễn phí chỉ có một lần. Tạo tài khoản miễn phí, chỉ mất vài giây, để tiếp tục luyện đề không
        giới hạn.
      </p>
      <div className="mt-5">
        <SignUpCta />
      </div>
      <ModalActions>
        <Button grow variant="ghost" onClick={onClose}>
          Để sau
        </Button>
      </ModalActions>
    </Modal>
  );
}
