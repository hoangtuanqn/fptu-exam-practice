import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, TimerOff } from "lucide-react";
import { depositApi, type DepositDetail } from "../../api/deposit.api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useCountdown } from "../../hooks/useCountdown";
import { formatMoney } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { CopyButton } from "../ui/CopyButton";
import { ErrorBox, Loading } from "../ui/Feedback";

const POLL_MS = 4000;

function Row({ label, value, copy, strong }: { label: string; value: string; copy?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="flex items-center gap-1 text-right">
        <span className={`text-sm tabular-nums ${strong ? "font-semibold text-slate-900" : "text-slate-700"}`}>{value}</span>
        {copy && <CopyButton text={copy} label={`Sao chép ${label.toLowerCase()}`} />}
      </span>
    </div>
  );
}

// Màn hình chuyển khoản: QR + thông tin, tự hỏi máy chủ mỗi vài giây cho tới khi lệnh được thanh toán hoặc hết hạn
export function PaymentPanel({ id, onClose }: { id: number; onClose: () => void }) {
  const { refresh } = useAuth();
  const toast = useToast();
  const [detail, setDetail] = useState<DepositDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notified = useRef(false);

  const status = detail?.order.status;
  const left = useCountdown(detail?.order.expiresAt);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const d = await depositApi.get(id);
        if (stopped) return;
        setDetail(d);
        setError(null);
        if (d.order.status === "PAID" && !notified.current) {
          notified.current = true;
          toast.success("Đã nhận tiền, số dư được cập nhật");
          void refresh();
        }
      } catch (err) {
        if (!stopped) setError(err instanceof Error ? err.message : "Không tải được lệnh nạp");
      }
    };
    void load();
    const timer = setInterval(() => {
      if (!document.hidden && !notified.current) void load();
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error && !detail) return <ErrorBox message={error} onRetry={onClose} />;
  if (!detail) return <Loading />;

  const { order, payment } = detail;

  if (status === "PAID") {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <CheckCircle2 size={44} className="text-emerald-600" />
        <h2 className="font-serif text-2xl font-semibold text-slate-900">Nạp tiền thành công</h2>
        <p className="text-sm text-slate-500">
          Đã cộng <b className="text-slate-800">{formatMoney(order.amount)}</b> vào ví của bạn.
        </p>
        <Button variant="primary" onClick={onClose} className="mt-2">
          Hoàn tất
        </Button>
      </Card>
    );
  }

  // Hết hạn theo trạng thái máy chủ, hoặc đồng hồ phía người dùng đã về 0 (cron chưa kịp đánh dấu)
  if (status === "EXPIRED" || !payment || left === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <TimerOff size={40} className="text-slate-400" />
        <h2 className="font-serif text-xl font-semibold text-slate-900">Lệnh nạp đã hết hạn</h2>
        <p className="max-w-sm text-sm text-slate-500">
          Nếu bạn đã chuyển khoản đúng nội dung, tiền vẫn được ghi nhận khi hệ thống đối soát. Chưa chuyển thì hãy tạo
          lệnh mới.
        </p>
        <Button variant="primary" onClick={onClose} className="mt-2">
          Quay lại
        </Button>
      </Card>
    );
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} /> Quay lại
        </button>
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700">
          <Clock size={14} /> Còn <b className="font-mono tabular-nums">{mm}:{ss}</b>
        </span>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[220px_1fr]">
        <div className="mx-auto w-full max-w-[220px]">
          <img src={payment.qrUrl} alt="Mã QR chuyển khoản" className="aspect-square w-full rounded-lg border border-slate-200 bg-white object-contain" />
          <p className="mt-2 text-center text-xs text-slate-500">Quét bằng ứng dụng ngân hàng</p>
        </div>

        <div>
          <Row label="Ngân hàng" value={payment.bankCode} />
          <Row label="Số tài khoản" value={payment.accountNumber} copy={payment.accountNumber} strong />
          {payment.accountName && <Row label="Chủ tài khoản" value={payment.accountName} />}
          <Row label="Số tiền" value={formatMoney(payment.amount)} copy={String(payment.amount)} strong />
          <Row label="Nội dung" value={payment.content} copy={payment.content} strong />

          <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
            Nhập <b>đúng nội dung chuyển khoản</b> để được cộng tiền tự động. Trang này sẽ tự cập nhật khi nhận được tiền.
          </div>
        </div>
      </div>
    </Card>
  );
}
