import { Link } from "react-router-dom";
import { Link2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { Button, buttonClass } from "@/shared/ui/Button";
import { ChargeSummary } from "@/shared/ui/ChargeSummary";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit } from "@/shared/utils/formatters";

interface Props {
  url: string;
  fee: number; // phí lần lấy này (0 = miễn phí)
  balance: number | null; // số dư của thành viên; null = khách
  onCancel: () => void;
  onConfirm: () => void;
}

// Xác nhận trước khi lấy đề: thành viên thấy khoản bị trừ thật to và màu đỏ; khách thấy giới hạn lượt miễn phí.
export function ConfirmFetchDialog({ url, fee, balance, onCancel, onConfirm }: Props) {
  const { user } = useAuth();
  const unverified = !!user && !user.emailVerifiedAt; // thành viên chưa xác minh email: chưa lấy đề được
  const isGuest = balance === null;
  const short = balance !== null && balance < fee;

  return (
    <Modal onClose={onCancel}>
      <ModalTitle icon={Link2}>Xác nhận lấy đề</ModalTitle>

      {unverified ? (
        <div className="mt-4">
          <VerifyEmailNotice variant="inline" message="Bạn cần xác minh email trước khi lấy đề. Kiểm tra hộp thư hoặc gửi lại thư xác minh." />
          <ModalActions>
            <Button onClick={onCancel}>Đóng</Button>
          </ModalActions>
        </div>
      ) : (
        <>
          <div className="mt-4 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600" title={url}>
            {url}
          </div>

          <div className="mt-4">
            <ChargeSummary amount={fee} balance={balance} freeNote={isGuest ? "Khách được lấy miễn phí 1 đề mỗi ngày, lần này sẽ dùng hết lượt hôm nay." : undefined} />
          </div>

          {isGuest ? (
            <p className="mt-3 text-xs leading-relaxed text-slate-500">Đăng ký tài khoản để lấy thêm đề và giữ đề trong kho riêng.</p>
          ) : (
            !short && <p className="mt-3 text-xs leading-relaxed text-slate-500">Lấy đề lỗi sẽ được hoàn phí tự động. Đề bạn đã lấy trước đó mở lại miễn phí.</p>
          )}

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
                {isGuest ? "Lấy đề" : fee > 0 ? `Trả ${formatCredit(fee)}` : "Lấy đề"}
              </Button>
            )}
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
