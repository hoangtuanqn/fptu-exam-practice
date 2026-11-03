import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/shared/ui/Button";
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
  const short = balance < price;

  return (
    <Modal onClose={onCancel}>
      <ModalTitle icon={Sparkles}>Giải thích câu {questionNumber}</ModalTitle>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        AI sẽ giải thích vì sao đáp án đúng và vì sao các lựa chọn còn lại sai. Phí <b className="text-slate-900">{formatCredit(price)}</b>, mỗi câu chỉ trả một lần, xem lại miễn phí.
      </p>
      <div className="mt-3 rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Số dư hiện tại</span>
          <span className="font-medium tabular-nums text-slate-900">{formatCredit(balance)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-slate-500">Số dư sau khi xem</span>
          <span className={`font-medium tabular-nums ${short ? "text-rose-600" : "text-slate-900"}`}>{formatCredit(Math.max(0, balance - price))}</span>
        </div>
      </div>
      {short && (
        <p className="mt-2 text-sm text-rose-600">
          Số dư không đủ.{" "}
          <Link to="/account/deposit" className="font-medium underline">
            Nạp thêm credit
          </Link>
        </p>
      )}
      <ModalActions>
        <Button onClick={onCancel}>Hủy</Button>
        <Button variant="primary" onClick={onConfirm} disabled={short}>
          <Sparkles size={16} /> Xác nhận ({formatCredit(price)})
        </Button>
      </ModalActions>
    </Modal>
  );
}
