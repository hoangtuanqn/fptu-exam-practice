import { Link } from "react-router-dom";
import { Crown } from "lucide-react";
import { buttonClass } from "@/shared/ui/Button";

// Báo số câu còn lại chỉ dành cho Pro (số thật từ máy chủ), luôn có nút "Để sau".
export function LockedPanel({ hidden, onClose }: { hidden: number; onClose: () => void }) {
  return (
    <section aria-label="Câu dành cho Pro" className="flex min-h-[16rem] flex-col items-center justify-center rounded-m3-md border border-outline-variant bg-surface-container-low px-5 py-8 text-center">
      <Crown size={28} className="text-[#f0a800]" />
      <p className="md-title-medium mt-2 text-on-surface">Còn {hidden} câu nữa dành cho PRO</p>
      <p className="md-body-medium mt-1 text-on-surface-variant">Nâng cấp Pro để học hết flashcard của môn này và mọi môn khác.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link to="/pro" className={buttonClass({ variant: "primary" })}>
          <Crown size={16} className="text-[#f0a800]" /> Xem gói Pro
        </Link>
        <button type="button" onClick={onClose} className={buttonClass({ variant: "text" })}>
          Về câu đầu
        </button>
      </div>
    </section>
  );
}
