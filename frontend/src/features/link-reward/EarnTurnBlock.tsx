import { Gift, Loader2 } from "lucide-react";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import type { FreeTurnStatus } from "./link-reward.api";
import { useEarnTurn } from "./useEarnTurn";

const dayMonth = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

/**
 * Lượt giải thích miễn phí, nằm trong hộp xác nhận giải thích khi làm bài.
 *  - Có lượt: dải tô màu nhẹ kèm nút dùng ngay.
 *  - Còn nhận được hôm nay: thẻ nổi bật có nút vượt link.
 * Tắt và không còn lượt thì không hiện gì.
 */
export function EarnTurnBlock({ status, onUse, onChange }: { status: FreeTurnStatus; onUse?: () => void; onChange: () => void }) {
  const toast = useToast();
  const { phase, error, fallbackUrl, start, cancel } = useEarnTurn(() => {
    toast.success("Đã nhận 1 lượt giải thích miễn phí");
    onChange();
  });

  if (!status.enabled && status.available === 0) return null;
  const canEarn = status.enabled && status.remainingToday > 0;

  return (
    <div className="mt-3 space-y-2">
      {status.available > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-primary-container px-3.5 py-2.5 text-on-primary-container">
          <span className="min-w-0 text-sm">
            <span className="font-medium">Bạn có {status.available} lượt miễn phí</span>
            {status.nextExpiresAt && <span className="block text-xs opacity-80">Hết hạn {dayMonth(status.nextExpiresAt)}</span>}
          </span>
          {onUse && (
            <Button variant="primary" onClick={onUse}>
              Dùng 1 lượt
            </Button>
          )}
        </div>
      )}

      {canEarn && phase === "waiting" && (
        <p role="status" className="flex flex-wrap items-center justify-center gap-x-2 text-center text-sm text-on-surface-variant">
          <Loader2 size={14} className="animate-spin" />
          Đang chờ bạn vượt link ở tab mới
          {fallbackUrl && (
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Mở lại
            </a>
          )}
          <button type="button" onClick={cancel} className="underline">
            Hủy
          </button>
        </p>
      )}

      {canEarn && phase !== "waiting" && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary-container to-surface-container-lowest px-3.5 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
            <Gift size={20} />
          </span>
          <span className="min-w-0 flex-1 text-sm text-on-surface">
            <span className="block font-semibold">{status.available > 0 ? "Nhận thêm lượt miễn phí" : "Giải thích miễn phí"}</span>
            <span className="block text-xs text-on-surface-variant">Vượt link mất 1 đến 2 phút</span>
          </span>
          <Button variant="primary" disabled={phase === "starting"} onClick={() => void start(status.available)}>
            {phase === "starting" && <Loader2 size={16} className="animate-spin" />}
            Nhận lượt
          </Button>
        </div>
      )}

      {status.enabled && status.remainingToday === 0 && <p className="text-center text-xs text-on-surface-variant">Hôm nay bạn đã nhận đủ lượt miễn phí.</p>}
      {error && <p className="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container">{error}</p>}
    </div>
  );
}
