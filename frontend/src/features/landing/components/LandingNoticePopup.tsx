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
      <p className="md-label-medium inline-flex items-center gap-1.5 text-primary">
        <Crown size={14} aria-hidden /> Ưu đãi gói PRO
      </p>
      <h2 className="md-headline-small mt-1 text-on-surface">Chỉ còn {days} ngày nữa để mua gói PRO giá ưu đãi</h2>
      <p className="md-body-medium mt-3 text-on-surface-variant">
        Mua để kích hoạt liền, hoặc để dành cho kỳ <b>{termName(promo.term)}</b>. Giảm {promo.percentOff}% so với giá thường.
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="text" onClick={later}>Để sau</Button>
        <Link to="/pro" onClick={close} className={buttonClass({ variant: "filled" })}>Xem gói PRO</Link>
      </div>
    </Modal>
  );
}
