import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { useToast } from "@/shared/context/ToastContext";
import { Button, buttonClass } from "@/shared/ui/Button";
import { ChargeSummary } from "@/shared/ui/ChargeSummary";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit } from "@/shared/utils/formatters";
import { depositLink } from "./depositLink";
import { explanationApi, type ExplanationBundle } from "./explanation.api";
import { errorMessage } from "@/shared/api/errors";

interface Props {
  examId: number;
  bundle: ExplanationBundle;
  onCancel: () => void;
  onUnlocked: () => void; // đã mở khóa xong (cha tải lại thông tin giá/trạng thái)
}

// Pháo giấy nhỏ khi mở khóa thành công: các mảnh bắn ra từ giữa hộp rồi mờ dần (chỉ CSS, tự tắt khi giảm chuyển động)
const CONFETTI = Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2 + (i % 3) * 0.2;
  const d = 90 + (i % 5) * 28;
  return { dx: Math.round(Math.cos(a) * d), dy: Math.round(Math.sin(a) * d - 40), rot: (i % 2 ? 1 : -1) * (180 + i * 23), color: ["#fbbf24", "#f43f5e", "#38bdf8", "#34d399", "#a78bfa"][i % 5]!, delay: (i % 6) * 40 };
});

// Xác nhận trả giá gói rồi mở khóa toàn bộ lời giải thích của đề
export function ExplainUnlockDialog({ examId, bundle, onCancel, onUnlocked }: Props) {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const balance = user?.balance ?? 0;
  const unverified = !!user && !user.emailVerifiedAt;
  const short = balance < bundle.price;
  const saved = bundle.original - bundle.price;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await explanationApi.unlock(examId, bundle.price);
      void refresh(); // cập nhật số dư sau khi trừ phí
      toast.success("Đã mở khóa toàn bộ lời giải thích của đề");
      setDone(true);
      onUnlocked();
    } catch (err) {
      setError(errorMessage(err, "Không mở khóa được, vui lòng thử lại"));
      onUnlocked(); // tải lại giá/trạng thái mới nhất (giá có thể đã đổi, hoặc đã mở khóa ở tab khác)
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Modal onClose={onCancel}>
        <div className="relative py-4 text-center">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-10">
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                className="confetti-piece absolute h-2 w-1.5 rounded-[1px]"
                style={{ background: c.color, animationDelay: `${c.delay}ms`, ["--dx" as string]: `${c.dx}px`, ["--dy" as string]: `${c.dy}px`, ["--rot" as string]: `${c.rot}deg` }}
              />
            ))}
          </div>
          <div className="unlock-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">Đã mở khóa toàn bộ giải thích!</h2>
          <p className="mt-1.5 text-sm text-slate-600">Bấm “Xem giải thích” ở bất kỳ câu nào của đề này, không mất thêm credit.</p>
          <div className="mt-5">
            <Button variant="primary" grow onClick={onCancel}>
              <Sparkles size={16} /> Bắt đầu xem giải thích
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={busy ? undefined : onCancel}>
      <ModalTitle icon={Sparkles}>Mở khóa toàn bộ giải thích</ModalTitle>
      {unverified ? (
        <div className="mt-3">
          <VerifyEmailNotice variant="inline" message="Bạn cần xác minh email trước khi dùng giải thích AI." />
          <ModalActions>
            <Button onClick={onCancel}>Đóng</Button>
          </ModalActions>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Mở khóa <b>{bundle.remaining} câu</b> của đề một lần duy nhất. Sau đó bấm giải thích câu nào cũng <b>không mất thêm credit</b>.
          </p>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm">
            <span className="text-amber-900">
              Mua lẻ <span className="line-through">{formatCredit(bundle.original)}</span>
            </span>
            <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">Tiết kiệm {formatCredit(saved)} (-{bundle.discountPercent}%)</span>
          </div>

          <div className="mt-4">
            <ChargeSummary amount={bundle.price} balance={balance} />
          </div>
          {error && <p className="mt-3 rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}
          <ModalActions>
            <Button grow onClick={onCancel} disabled={busy}>
              Hủy
            </Button>
            {short ? (
              <Link to={depositLink(bundle.price - balance, location.pathname)} className={buttonClass({ variant: "primary", grow: true })}>
                Nạp thêm {formatCredit(bundle.price - balance)}
              </Link>
            ) : (
              <Button grow variant="primary" onClick={() => void confirm()} disabled={busy}>
                <Sparkles size={16} /> {busy ? "Đang mở khóa…" : `Trả ${formatCredit(bundle.price)}`}
              </Button>
            )}
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
