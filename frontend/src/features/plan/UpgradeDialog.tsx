import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, Crown, PartyPopper, Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { depositLink } from "@/features/explanation/depositLink";
import { errorMessage } from "@/shared/api/errors";
import { Button, buttonClass } from "@/shared/ui/Button";
import { ChargeSummary } from "@/shared/ui/ChargeSummary";
import { FormError } from "@/shared/ui/Feedback";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit, formatDate } from "@/shared/utils/formatters";
import { addMonths, isPro } from "@/shared/utils/pro";
import { planApi, type PlanInfo, type PurchaseResult } from "./plan.api";

const CONFETTI = ["#ffc61f", "#fff1c2", "#f0a800", "#ffffff", "#e7c26c", "#ff8a3d"];

// Hộp thoại xác nhận mua / gia hạn Pro: nói rõ trừ bao nhiêu, còn lại bao nhiêu, hạn mới là ngày nào. Thành công thì chúc mừng.
export function UpgradeDialog({ plan, onClose }: { plan: PlanInfo; onClose: () => void }) {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PurchaseResult | null>(null);

  const balance = user?.balance ?? 0;
  const short = balance < plan.price;
  const renewing = isPro(user);
  const base = renewing ? new Date(user!.proExpiresAt!) : new Date();
  const newExpiry = addMonths(base, plan.months);

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await planApi.purchase();
      setUser(result.user);
      setDone(result);
    } catch (err) {
      setError(errorMessage(err, "Chưa nâng cấp được, bạn thử lại nhé"));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Modal onClose={onClose}>
        <div className="relative py-2 text-center">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-12">
            {Array.from({ length: 28 }, (_, i) => {
              const a = (i / 28) * Math.PI * 2 + (i % 3) * 0.2;
              const d = 90 + (i % 5) * 30;
              return (
                <span
                  key={i}
                  className="ci-confetti"
                  style={{ ["--dx" as string]: `${Math.round(Math.cos(a) * d)}px`, ["--dy" as string]: `${Math.round(Math.sin(a) * d - 30)}px`, ["--rot" as string]: `${(i % 2 ? 1 : -1) * (160 + i * 21)}deg`, background: CONFETTI[i % CONFETTI.length], animationDelay: `${(i % 6) * 0.04}s` }}
                />
              );
            })}
          </div>
          <div className="ci-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-[#ffd75e] to-[#f0a800] text-[#3a2600] shadow-m3-2">
            <Crown size={40} strokeWidth={2.2} />
          </div>
          <h2 className="md-headline-small mt-4 text-on-surface">{done.renewed ? "Đã gia hạn Pro!" : "Chào mừng thành viên Pro!"}</h2>
          <p className="md-body-medium mt-1.5 text-on-surface-variant">
            Pro của bạn có hiệu lực đến <b className="text-on-surface">{formatDate(done.proExpiresAt)}</b>. Còn lại <b className="tabular-nums text-on-surface">{formatCredit(done.balanceAfter)}</b> trong ví.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link to="/" className={buttonClass({ variant: "filled", grow: true })} onClick={onClose}>
              <Sparkles size={16} /> Lấy đề ngay
            </Link>
            <Button variant="tonal" grow onClick={onClose}>
              Xong
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={busy ? undefined : onClose}>
      <ModalTitle icon={Crown}>{renewing ? "Gia hạn gói Pro" : "Nâng cấp lên Pro"}</ModalTitle>
      <ul className="md-body-medium mt-3 space-y-1.5 text-on-surface-variant">
        <li>
          Thêm <b className="text-on-surface">{plan.months} tháng</b> Pro, hạn mới đến <b className="text-on-surface">{formatDate(newExpiry.toISOString())}</b>
          {renewing && " (cộng dồn vào hạn hiện tại)"}.
        </li>
        <li>Trả một lần, <b className="text-on-surface">không tự động gia hạn</b>, không bị trừ thêm.</li>
      </ul>
      <ul className="md-body-small mt-2 flex flex-wrap gap-x-3 gap-y-1 text-on-surface-variant">
        {plan.benefits.freeFetch && <li className="inline-flex items-center gap-1"><Check size={14} className="text-primary" /> Lấy đề miễn phí</li>}
        {plan.benefits.freeExplain && <li className="inline-flex items-center gap-1"><Check size={14} className="text-primary" /> Giải thích AI mọi câu</li>}
        {plan.benefits.freePe && <li className="inline-flex items-center gap-1"><Check size={14} className="text-primary" /> Tải đề PE miễn phí</li>}
        {plan.benefits.topicReport && <li className="inline-flex items-center gap-1"><Check size={14} className="text-primary" /> Báo cáo điểm yếu theo chủ đề</li>}
        {plan.benefits.unlimitedReview && <li className="inline-flex items-center gap-1"><Check size={14} className="text-primary" /> Sổ câu sai không giới hạn</li>}
      </ul>
      <div className="mt-4">
        <ChargeSummary amount={plan.price} balance={balance} />
      </div>
      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}
      <ModalActions>
        <Button grow onClick={onClose} disabled={busy}>
          Để sau
        </Button>
        {short ? (
          <Link to={depositLink(plan.price - balance, location.pathname)} className={buttonClass({ variant: "filled", grow: true })} onClick={onClose}>
            Nạp thêm {formatCredit(plan.price - balance)}
          </Link>
        ) : (
          <Button variant="filled" grow onClick={() => void buy()} disabled={busy} className="!bg-gradient-to-b !from-[#ffd75e] !to-[#f0a800] !text-[#3a2600] font-bold">
            <PartyPopper size={16} /> {busy ? "Đang nâng cấp…" : `Trả ${formatCredit(plan.price)}`}
          </Button>
        )}
      </ModalActions>
    </Modal>
  );
}
