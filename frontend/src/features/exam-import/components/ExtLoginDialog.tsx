import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

interface Props {
  url: string; // link đề FuOverflow người dùng vừa bấm
  onCancel: () => void;
}

// Người dùng đến từ nút của tiện ích trên FuOverflow nhưng chưa đăng nhập: cần có tài khoản fepass.top trước khi lấy đề.
// Đăng nhập (hoặc đăng ký) xong sẽ quay lại đúng đề này và hiện hộp xác nhận.
export function ExtLoginDialog({ url, onCancel }: Props) {
  const navigate = useNavigate();
  const back = `/?${new URLSearchParams({ link: url, confirm: "1", src: "ext" })}`;

  return (
    <Modal onClose={onCancel}>
      <ModalTitle icon={LogIn}>Đăng nhập để làm đề</ModalTitle>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Bạn cần có tài khoản fepass.top để lấy và làm đề. Đăng nhập (hoặc tạo tài khoản miễn phí) xong, hệ thống đưa bạn quay lại đúng đề này.
      </p>
      <div className="mt-3 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600" title={url}>
        {url}
      </div>
      <ModalActions>
        <Button grow variant="primary" onClick={() => navigate("/login", { state: { from: back } })}>
          <LogIn size={16} /> Đăng nhập
        </Button>
        <Button grow onClick={() => navigate("/register", { state: { from: back } })}>
          <UserPlus size={16} /> Tạo tài khoản
        </Button>
      </ModalActions>
    </Modal>
  );
}
