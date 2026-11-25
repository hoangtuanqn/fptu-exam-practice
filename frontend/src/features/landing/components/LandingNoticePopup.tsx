import { useState } from "react";
import { Link } from "react-router-dom";
import { Crown } from "lucide-react";
import { Modal } from "@/shared/ui/Modal";
import { Button, buttonClass } from "@/shared/ui/Button";
import { isSnoozed, snooze } from "@/shared/utils/promptSnooze";
import { activePromo, usePlanInfo } from "@/features/plan/semesterPromo";

const NAMES: Record<string, string> = { SP: "Spring", SU: "Summer", FA: "Fall" };
// "SP27" -> "Spring 2027" (mã kỳ lấy từ DB); mã lạ thì giữ nguyên
const termName = (t: string) => {
  const m = /^(SP|SU|FA)(\d{2})$/i.exec(t);
  return m ? `${NAMES[m[1]!.toUpperCase()]} 20${m[2]}` : t;
};

// Popup trang chủ: đếm ngược ưu đãi mua gói Pro của kỳ mới (dữ liệu thật từ DB). Hết đợt hoặc đã dùng ưu đãi thì không hiện.
export function LandingNoticePopup() {
  const promo = activePromo(usePlanInfo().data);
  const surface = `landing_promo:${promo?.term ?? ""}`;
  const [closed, setClosed] = useState(false);
  if (!promo || closed || isSnoozed(surface)) return null;

  const close = () => setClosed(true); // đóng bằng X/Esc/bấm nền: chỉ ẩn lần này
  const later = () => {
    snooze(surface, 1);
    setClosed(true);
  };
  const days = Math.ceil(promo.msLeft / 86_400_000);

  return (
    <Modal onClose={close} maxWidth="max-w-md">
      <div className="relative -mx-1 overflow-hidden rounded-m3-lg bg-gradient-to-br from-[#2a1d00] via-[#4a3500] to-[#7a5a00] px-5 py-6 text-center text-[#fff6dc]">
        <Crown size={120} aria-hidden className="pointer-events-none absolute -right-6 -top-6 rotate-12 text-[#ffc61f]/15" />
        <Crown size={96} aria-hidden className="pointer-events-none absolute -bottom-8 -left-6 -rotate-12 text-[#ffc61f]/10" />
        <p className="relative inline-flex items-center gap-1.5 rounded-full bg-[#ffc61f]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#ffc61f]">
          <Crown size={14} aria-hidden /> Ưu đãi gói PRO
        </p>
        <p className="relative mt-3 text-sm text-[#fff6dc]/80">Chỉ còn</p>
        <p className="relative text-6xl font-extrabold leading-none text-[#ffc61f] tabular-nums">{days}</p>
        <p className="relative mt-1 text-lg font-semibold">ngày nữa để mua gói PRO</p>
        <p className="relative mt-3 inline-block rounded-full bg-[#ffc61f] px-3 py-1 text-sm font-bold text-[#2a1d00]">Giảm {promo.percentOff}%</p>
      </div>
      <h2 className="sr-only">Chỉ còn {days} ngày nữa để mua gói PRO giá ưu đãi</h2>
      <p className="md-body-medium mt-4 text-center text-on-surface-variant">
        Mua để kích hoạt liền, hoặc để dành cho kỳ <b className="text-on-surface">{termName(promo.term)}</b>.
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="text" onClick={later}>Để sau</Button>
        <Link to="/pro" onClick={close} className={buttonClass({ variant: "filled" })}>Xem gói PRO</Link>
      </div>
    </Modal>
  );
}
