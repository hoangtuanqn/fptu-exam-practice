import { useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Sparkles, Ticket } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { errorMessage } from "@/shared/api/errors";
import { Button, buttonClass } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatDate } from "@/shared/utils/formatters";
import { isPro } from "@/shared/utils/pro";
import { planApi, type ActivateResult, type ProTicket } from "./plan.api";

// Hộp thoại xác nhận kích hoạt một vé Pro: nói rõ thời hạn được cộng và rằng kích hoạt rồi thì không đổi lại được.
export function ActivateTicketDialog({ ticket, onClose, onDone }: { ticket: ProTicket; onClose: () => void; onDone?: () => void }) {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ActivateResult | null>(null);
  const renewing = isPro(user);

  const activate = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await planApi.activateTicket(ticket.id);
      setUser(result.user);
      setDone(result);
      onDone?.();
    } catch (err) {
      setError(errorMessage(err, "Chưa kích hoạt được vé, bạn thử lại nhé"));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Modal onClose={onClose}>
        <div className="py-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#ffd75e] to-[#f0a800] text-[#3a2600] shadow-m3-2">
            <Crown size={32} strokeWidth={2.2} />
          </div>
          <h2 className="md-headline-small mt-4 text-on-surface">Đã kích hoạt vé!</h2>
          <p className="md-body-medium mt-1.5 text-on-surface-variant">
            Pro của bạn có hiệu lực đến <b className="text-on-surface">{formatDate(done.proExpiresAt)}</b>.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link to="/" className={buttonClass({ variant: "filled", grow: true })} onClick={onClose}>
              <Sparkles size={16} /> Chọn đề ngay
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
      <ModalTitle icon={Ticket}>Kích hoạt vé {ticket.name}</ModalTitle>
      <ul className="md-body-medium mt-3 space-y-1.5 text-on-surface-variant">
        <li>
          Từ bây giờ bạn được thêm <b className="text-on-surface">{ticket.duration}</b> Pro{renewing ? ", cộng dồn vào hạn hiện tại" : ""}.
        </li>
        <li>
          Kích hoạt rồi thì <b className="text-on-surface">không đổi lại được</b>. Vé này dùng được đến {formatDate(ticket.expiresAt)}; nếu chưa cần, bạn cứ để vé đó và kích hoạt sau.
        </li>
      </ul>
      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}
      <ModalActions>
        <Button grow onClick={onClose} disabled={busy}>
          Để sau
        </Button>
        <Button variant="filled" grow onClick={() => void activate()} disabled={busy} className="!bg-gradient-to-b !from-[#ffd75e] !to-[#f0a800] !text-[#3a2600] font-bold">
          {busy ? "Đang kích hoạt…" : "Kích hoạt ngay"}
        </Button>
      </ModalActions>
    </Modal>
  );
}
