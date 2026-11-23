import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { Button, buttonClass } from "@/shared/ui/Button";
import { ChargeSummary } from "@/shared/ui/ChargeSummary";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit } from "@/shared/utils/formatters";

interface Props {
  fee: number; // phí lần mở này
  balance: number; // số dư của thành viên
  onCancel: () => void;
  onConfirm: () => void;
}

// Xác nhận trước khi mở đề có tính phí: khoản bị trừ hiện rõ; thiếu credit thì đưa đi nạp
export function ConfirmOpenDialog({ fee, balance, onCancel, onConfirm }: Props) {
  const { user } = useAuth();
  const unverified = !!user && !user.emailVerifiedAt; // chưa xác minh email: chưa mở đề được
  const short = balance < fee;

  return (
    <Modal onClose={onCancel}>
      <ModalTitle icon={BookOpen}>Xác nhận mở đề</ModalTitle>

      {unverified ? (
        <div className="mt-4">
          <VerifyEmailNotice variant="inline" message="Bạn cần xác minh email trước khi mở đề. Kiểm tra hộp thư hoặc gửi lại thư xác minh." />
          <ModalActions>
            <Button onClick={onCancel}>Đóng</Button>
          </ModalActions>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <ChargeSummary amount={fee} balance={balance} />
          </div>
          {!short && <p className="mt-3 text-xs leading-relaxed text-slate-500">Đề bạn đã mở trước đó mở lại miễn phí.</p>}
          <ModalActions>
            <Button grow onClick={onCancel}>
              Hủy
            </Button>
            {short ? (
              <Link to="/account/deposit" className={buttonClass({ variant: "primary", grow: true })}>
                Nạp credit
              </Link>
            ) : (
              <Button grow variant="primary" onClick={onConfirm}>
                Trả {formatCredit(fee)}
              </Button>
            )}
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
