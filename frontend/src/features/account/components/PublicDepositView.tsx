import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, ShieldCheck, TimerOff } from "lucide-react";
import { depositApi, type PublicDepositDetail } from "@/features/account/api/deposit.api";
import { useAuth } from "@/features/auth/AuthContext";
import { DepositStatusBadge } from "@/shared/components/StatusBadge";
import { useCountdown } from "@/shared/hooks/useCountdown";
import { Card } from "@/shared/ui/Card";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";
import { buttonClass } from "@/shared/ui/Button";
import { formatDateTime, formatMoney } from "@/shared/utils/formatters";
import { PaymentRow } from "./PaymentRow";
import { errorMessage } from "@/shared/api/errors";

const POLL_MS = 5000;

// Bản xem lệnh nạp dành cho người KHÔNG phải chủ lệnh (hoặc chưa đăng nhập): chỉ có mã, số tiền, trạng thái, thời hạn
// và thông tin chuyển khoản. Không có tên, email hay bất kỳ định danh nào của người tạo lệnh.
export function PublicDepositView({ code, note }: { code: string; note?: ReactNode }) {
  const { user } = useAuth();
  const [detail, setDetail] = useState<PublicDepositDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const left = useCountdown(detail?.order.expiresAt);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const d = await depositApi.getPublic(code);
        if (stopped) return;
        setDetail(d);
        setError(null);
      } catch (err) {
        if (!stopped) setError(errorMessage(err, "Không tải được lệnh nạp"));
      }
    };
    void load();
    // Còn chờ thanh toán thì hỏi lại để người chuyển khoản thấy ngay khi đã nhận tiền
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [code]);

  if (error && !detail) return <ErrorBox message={error} />;
  if (!detail) return <Loading />;

  const { order, payment } = detail;
  const expired = order.status === "EXPIRED" || (order.status === "PENDING" && left === 0);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-xs text-slate-500">Lệnh nạp tiền</p>
          <p className="text-base font-semibold text-slate-900">{order.code}</p>
        </div>
        <DepositStatusBadge value={expired ? "EXPIRED" : order.status} />
      </div>

      <div className="px-5 py-6">
        <div className="text-sm text-slate-500">Số tiền</div>
        <div className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{formatMoney(order.amount)}</div>
        <div className="mt-1 text-xs text-slate-500">Tạo lúc {formatDateTime(order.createdAt)}</div>

        {order.status === "PAID" && (
          <div className="mt-5 flex items-start gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>
              Đã nhận tiền{order.paidAt ? ` lúc ${formatDateTime(order.paidAt)}` : ""}. Lệnh nạp này đã hoàn tất.
            </span>
          </div>
        )}

        {expired && (
          <div className="mt-5 flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <TimerOff size={18} className="mt-0.5 shrink-0" />
            <span>Lệnh nạp đã hết hạn. Nếu bạn đã chuyển khoản đúng nội dung, tiền vẫn được ghi nhận khi hệ thống đối soát.</span>
          </div>
        )}

        {payment && !expired && order.status === "PENDING" && (
          <div className="mt-5">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700">
              <Clock size={14} /> Còn{" "}
              <b className="tabular-nums">
                {mm}:{ss}
              </b>
            </div>
            <div className="grid gap-6 md:grid-cols-[200px_1fr]">
              <div className="mx-auto w-full max-w-[200px]">
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
                  Nhập <b>đúng nội dung chuyển khoản</b> để tiền được cộng tự động cho chủ lệnh nạp.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-slate-400" />
        <span>
          {note ?? "Thông tin người tạo lệnh được ẩn để bảo mật. Bạn chỉ xem được số tiền, trạng thái và thông tin chuyển khoản."}
        </span>
      </div>

      {!user && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-4">
          <span className="mr-auto text-sm text-slate-600">Là chủ lệnh nạp này?</span>
          <Link to="/login" state={{ from: `/account/deposit/${order.code}` }} className={buttonClass({ variant: "primary", size: "sm" })}>
            Đăng nhập để quản lý
          </Link>
        </div>
      )}
    </Card>
  );
}
