import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { Button, buttonClass } from "@/shared/ui/Button";
import { ChargeSummary } from "@/shared/ui/ChargeSummary";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit } from "@/shared/utils/formatters";

interface Props {
  questionNumber: number;
  price: number;
  onCancel: () => void;
  onConfirm: () => void;
}

// Xác nhận phí trước khi xem lời giải thích AI (chỉ hỏi lần đầu của mỗi câu; mua rồi thì xem lại miễn phí)
export function ExplainConfirmDialog({ questionNumber, price, onCancel, onConfirm }: Props) {
  const { user } = useAuth();
  const balance = user?.balance ?? 0;
  const unverified = !!user && !user.emailVerifiedAt;
  const short = balance < price;

  return (
    <Modal onClose={onCancel}>
      <ModalTitle icon={Sparkles}>Giải thích câu {questionNumber}</ModalTitle>
      {unverified ? (
        <div className="mt-3">
          <VerifyEmailNotice variant="inline" message="Bạn cần xác minh email trước khi dùng giải thích AI." />
          <ModalActions>
            <Button onClick={onCancel}>Đóng</Button>
          </ModalActions>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">AI sẽ giải thích vì sao đáp án đúng và vì sao các lựa chọn còn lại sai. Mỗi câu chỉ trả một lần, xem lại miễn phí.</p>
          <div className="mt-4">
            <ChargeSummary amount={price} balance={balance} />
          </div>
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
                <Sparkles size={16} /> Trả {formatCredit(price)}
              </Button>
            )}
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
