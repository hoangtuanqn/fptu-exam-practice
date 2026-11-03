import { Link } from "react-router-dom";
import { Link2, TriangleAlert } from "lucide-react";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit } from "@/shared/utils/formatters";

interface Props {
  url: string;
  fee: number; // phí mỗi lần lấy đề (0 = miễn phí)
  balance: number | null; // số dư của thành viên; null = khách
  onCancel: () => void;
  onConfirm: () => void;
}

const Row = ({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className={`text-sm tabular-nums ${strong ? "text-base font-semibold" : "font-medium"} ${danger ? "text-rose-600" : "text-slate-900"}`}>
      {value}
    </span>
  </div>
);

// Xác nhận trước khi lấy đề: thành viên thấy rõ khoản phí sẽ bị trừ và số dư sau đó; khách thấy giới hạn lượt miễn phí.
export function ConfirmFetchDialog({ url, fee, balance, onCancel, onConfirm }: Props) {
  const isGuest = balance === null;
  const short = balance !== null && balance < fee;

  return (
    <Modal onClose={onCancel}>
      <ModalTitle icon={Link2}>Xác nhận lấy đề</ModalTitle>

      <div className="mt-4 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600" title={url}>
        {url}
      </div>

      {isGuest ? (
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Khách được lấy miễn phí <b className="text-slate-900">1 đề mỗi ngày</b>. Lần này sẽ dùng hết lượt hôm nay. Đăng ký tài khoản để lấy thêm đề
          và giữ đề trong kho riêng.
        </p>
      ) : (
        <div className="mt-3">
          <Row label="Phí lấy đề" value={`−${formatCredit(fee)}`} strong />
          <Row label="Số dư hiện tại" value={formatCredit(balance)} />
          <Row label="Số dư sau khi lấy" value={formatCredit(Math.max(0, balance - fee))} danger={short} />
        </div>
      )}

      {short ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          Số dư không đủ để lấy đề này. Vui lòng nạp thêm credit.
        </p>
      ) : (
        !isGuest && (
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Phí tính cho mỗi lần lấy, kể cả đề đã có sẵn. Lấy đề lỗi sẽ được hoàn phí tự động.
          </p>
        )
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
            {isGuest ? "Lấy đề" : "Xác nhận"}
          </Button>
        )}
      </ModalActions>
    </Modal>
  );
}
