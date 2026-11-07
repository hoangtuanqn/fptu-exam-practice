import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, TimerOff } from "lucide-react";
import { depositApi, type DepositDetail } from "@/features/account/api/deposit.api";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/context/ToastContext";
import { useCountdown } from "@/shared/hooks/useCountdown";
import { formatCredit, formatMoney } from "@/shared/utils/formatters";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { CopyButton } from "@/shared/ui/CopyButton";
import { PaymentRow } from "./PaymentRow";
import { PublicDepositView } from "./PublicDepositView";
import { ApiError } from "@/shared/api/client";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";

const POLL_MS = 4000;

// Màn hình chuyển khoản: QR + thông tin, tự hỏi máy chủ mỗi vài giây cho tới khi lệnh được thanh toán hoặc hết hạn
export function PaymentPanel({ code, onClose }: { code: string; onClose: () => void }) {
  const { refresh } = useAuth();
  const toast = useToast();
  const [detail, setDetail] = useState<DepositDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notOwner, setNotOwner] = useState(false); // lệnh không thuộc tài khoản này: chỉ cho xem bản rút gọn
  const notified = useRef(false);

  const status = detail?.order.status;
  const left = useCountdown(detail?.order.expiresAt);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const d = await depositApi.get(code);
        if (stopped) return;
        setDetail(d);
        setError(null);
        if (d.order.status === "PAID" && !notified.current) {
          notified.current = true;
          toast.success("Đã nhận tiền, credit đã được cộng");
          void refresh();
        }
      } catch (err) {
        if (stopped) return;
        if (err instanceof ApiError && err.status === 404) setNotOwner(true);
        else setError(err instanceof Error ? err.message : "Không tải được lệnh nạp");
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
  }, [code]);

  if (notOwner) {
    return (
      <div className="space-y-3">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} /> Quay lại
        </button>
        <PublicDepositView
          code={code}
          note="Lệnh nạp này không thuộc tài khoản của bạn nên thông tin người tạo được ẩn. Bạn chỉ xem được số tiền, trạng thái và thông tin chuyển khoản."
        />
      </div>
    );
  }
  if (error && !detail) return <ErrorBox message={error} onRetry={onClose} />;
  if (!detail) return <Loading />;

  const { order, payment } = detail;

  if (status === "PAID") {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <CheckCircle2 size={44} className="text-emerald-600" />
        <h2 className="font-serif text-2xl font-semibold text-slate-900">Nạp credit thành công</h2>
        <p className="text-sm text-slate-500">
          Đã cộng <b className="text-slate-800">{formatCredit(order.amount)}</b> vào ví của bạn.
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
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          Liên kết lệnh nạp <CopyButton text={`${window.location.origin}/deposit/${code}`} label="Sao chép liên kết lệnh nạp" />
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700">
          <Clock size={14} /> Còn <b className="tabular-nums">{mm}:{ss}</b>
        </span>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[220px_1fr]">
        <div className="mx-auto w-full max-w-[220px]">
          <img src={payment.qrUrl} alt="Mã QR chuyển khoản" className="aspect-square w-full rounded-lg border border-slate-200 bg-surface-container-lowest object-contain" />
          <p className="mt-2 text-center text-xs text-slate-500">Quét bằng ứng dụng ngân hàng</p>
        </div>

        <div>
          <PaymentRow label="Ngân hàng" value={payment.bankCode} />
          <PaymentRow label="Số tài khoản" value={payment.accountNumber} copy={payment.accountNumber} strong />
          {payment.accountName && <PaymentRow label="Chủ tài khoản" value={payment.accountName} />}
          <PaymentRow label="Số tiền" value={formatMoney(payment.amount)} copy={String(payment.amount)} strong />
          <PaymentRow label="Nội dung" value={payment.content} copy={payment.content} strong />

          <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
            Nhập <b>đúng nội dung chuyển khoản</b> để được cộng tiền tự động. Trang này sẽ tự cập nhật khi nhận được tiền.
          </div>
        </div>
      </div>
    </Card>
  );
}
