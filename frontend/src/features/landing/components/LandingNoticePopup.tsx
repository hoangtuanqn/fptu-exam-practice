import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { Modal } from "@/shared/ui/Modal";
import { Button, buttonClass } from "@/shared/ui/Button";
import { isSnoozed, snooze } from "@/shared/utils/promptSnooze";
import { LANDING_NOTICE as N } from "../content";

const SURFACE = "landing_notice";
const SNOOZE_DAYS = 1 / 24; // tắt thì ẩn 1 giờ

// Popup thông báo khi vào trang chủ. Chỉ Landing dùng nên chỉ hiện ở trang chủ; hết hạn thì tự ẩn.
export function LandingNoticePopup() {
  const [open, setOpen] = useState(() => !isSnoozed(SURFACE) && Date.now() < new Date(N.endsAt).getTime());
  if (!open) return null;

  const close = () => setOpen(false); // đóng bằng X/Esc/bấm nền: chỉ ẩn lần này
  const snoozeAndClose = () => {
    snooze(SURFACE, SNOOZE_DAYS);
    setOpen(false);
  };

  return (
    <Modal onClose={close} maxWidth="max-w-xl">
      <p className="md-label-medium inline-flex items-center gap-1.5 text-primary">
        <Gamepad2 size={14} aria-hidden /> {N.badge}
      </p>
      <h2 className="md-headline-small mt-1 text-on-surface">{N.title}</h2>
      <p className="md-body-medium mt-2 text-on-surface-variant">{N.lead}</p>
      <ol className="mt-3 space-y-1.5">
        {N.rounds.map((r, i) => (
          <li key={r.name} className="flex items-center gap-2 text-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary-container text-xs font-bold text-on-secondary-container">{i + 1}</span>
            <span><b>{r.name}</b> · {r.when}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm font-semibold text-primary">{N.note}</p>
      <img src={N.image} alt={N.imageAlt} className="mt-4 w-full rounded-m3-lg" />
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="text" onClick={snoozeAndClose}>Tắt trong 1 giờ</Button>
        <a href={N.link} target="_blank" rel="noreferrer" onClick={close} className={buttonClass({ variant: "filled" })}>{N.linkLabel}</a>
      </div>
    </Modal>
  );
}
