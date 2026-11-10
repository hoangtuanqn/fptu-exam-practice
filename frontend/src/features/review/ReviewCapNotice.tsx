import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, X } from "lucide-react";
import { useUpsell } from "@/shared/hooks/useUpsell";
import { buttonClass } from "@/shared/ui/Button";
import { canShowPrompt, markPromptShown } from "@/shared/utils/promptCap";
import { trackPrompt } from "@/shared/utils/trackPrompt";

const SURFACE = "review-cap";
const WARN_RATIO = 0.8; // báo khi đã dùng từ 80% số chỗ của gói thường

// Báo trước khi sổ câu sai đầy (lúc đầy rồi đã có thông báo riêng). Có nút bỏ qua; mỗi phiên một lần, tối đa 3 lần/tuần.
export function ReviewCapNotice({ total, limit }: { total: number; limit: number | null }) {
  const { flags } = useUpsell();
  const [open, setOpen] = useState<boolean | null>(null);
  const near = limit !== null && total < limit && total >= Math.ceil(limit * WARN_RATIO);
  const eligible = flags.reviewCap && near;

  useEffect(() => {
    if (!eligible || open !== null) return;
    const ok = canShowPrompt(SURFACE);
    setOpen(ok);
    if (ok) {
      markPromptShown(SURFACE);
      trackPrompt(SURFACE, "shown");
    }
  }, [eligible, open]);

  if (!eligible || !open || limit === null) return null;
  return (
    <div role="status" className="relative flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-low py-3 pl-5 pr-12">
      <p className="md-body-medium text-on-surface">
        Sổ còn <b>{limit - total}</b> chỗ trống. Đầy rồi thì câu sai mới sẽ không được lưu. Pro không giới hạn số câu.
      </p>
      <Link to="/pro" onClick={() => trackPrompt(SURFACE, "click")} className={buttonClass({ size: "sm" })}>
        <Crown size={15} className="text-[#f0a800]" /> Xem gói Pro
      </Link>
      <button type="button" onClick={() => {
          trackPrompt(SURFACE, "dismiss");
          setOpen(false);
        }} aria-label="Để sau" className="absolute right-2 top-2 rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-high">
        <X size={16} />
      </button>
    </div>
  );
}
