import { useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "@/shared/ui/Modal";
import { Button, buttonClass } from "@/shared/ui/Button";
import { isSnoozed, snooze } from "@/shared/utils/promptSnooze";
import { useAuth } from "@/features/auth/AuthContext";
import { isPro } from "@/shared/utils/pro";
import { vnd } from "@/features/plan/pro/money";
import { activePromo, usePlanInfo } from "@/features/plan/semesterPromo";

const NAMES: Record<string, string> = { SP: "Spring", SU: "Summer", FA: "Fall" };
// "SP27" -> "Spring 2027" (mã kỳ lấy từ DB); mã lạ thì giữ nguyên
const termName = (t: string) => {
  const m = /^(SP|SU|FA)(\d{2})$/i.exec(t);
  return m ? `${NAMES[m[1]!.toUpperCase()]} 20${m[2]}` : t;
};

// Popup trang chủ: đếm ngược ưu đãi mua gói Pro của kỳ mới (dữ liệu thật từ DB). Hết đợt hoặc đã dùng ưu đãi thì không hiện.
export function LandingNoticePopup() {
  const { user } = useAuth();
  const pro = !!user && isPro(user); // đã mua PRO thì không mời nữa
  const plan = usePlanInfo(!pro).data;
  const promo = pro ? null : activePromo(plan);
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
    <Modal onClose={close} maxWidth="max-w-lg" flush corner={<div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block"><div className="popup-climber"><img src="/promo/mascot-climb-body.webp" alt="" className="climb-body" /><img src="/promo/mascot-climb-hand-l.webp" alt="" className="climb-hand-l" /><img src="/promo/mascot-climb-hand-r.webp" alt="" className="climb-hand-r" /></div></div>}>
      <div className="relative">
        <img src="/promo/pro-poster.webp" width={960} height={600} alt="Poster gói PRO của FEPass: mở khóa tất cả đề thi, flashcard và mọi tính năng, không giới hạn" className="block w-full" />
        {/* Nhãn giá nằm đè lên poster, lấy số thật từ DB nên không vẽ cứng vào ảnh */}
        <div className="absolute right-[4%] top-[7%] -rotate-3 rounded-2xl bg-[#ffc61f] px-3 py-2 text-center text-[#4d0a10] shadow-lg ring-2 ring-white/70 sm:px-4 sm:py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide sm:text-xs">Pro {plan?.months} tháng</p>
          <p className="text-sm text-[#4d0a10]/70 line-through sm:text-base">{vnd(promo.originalPrice)}</p>
          <p className="text-2xl font-extrabold leading-none sm:text-3xl">{vnd(promo.price)}</p>
          <p className="mt-1 rounded-full bg-[#d62828] px-2 py-0.5 text-[10px] font-bold text-white sm:text-xs">Giảm {promo.percentOff}%</p>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <h2 className="md-headline-small text-on-surface">
          Chỉ còn <span className="text-primary">{days} ngày</span> nữa mua gói PRO
        </h2>
        <p className="md-body-medium mt-2 text-on-surface-variant">
          Web mới vận hành nên giá đang rẻ bèo. Mua ngay đi, để lâu là tăng giá, lúc đó đừng trách cóc không nhắc nhé!
        </p>
        <p className="md-body-medium mt-2 text-on-surface-variant">
          Mua để kích hoạt liền, hoặc để dành cho kỳ <b className="text-on-surface">{termName(promo.term)}</b>.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="text" onClick={later}>Để sau</Button>
          <Link to="/pro" onClick={close} className={buttonClass({ variant: "filled" })}>Xem gói PRO</Link>
        </div>
      </div>
    </Modal>
  );
}
