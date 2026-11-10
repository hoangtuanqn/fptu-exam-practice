import { Gift, Loader2 } from "lucide-react";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import type { FreeTurnStatus } from "./link-reward.api";
import { useEarnTurn } from "./useEarnTurn";

const dayMonth = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

/**
 * Lượt giải thích miễn phí, nằm trong hộp xác nhận giải thích khi làm bài:
 *  - có lượt: nút dùng 1 lượt;
 *  - còn nhận được hôm nay: nút vượt link (đang chờ thì chỉ một dòng trạng thái);
 *  - đã nhận đủ: một dòng nhắc.
 * Không hiện gì nếu tính năng tắt và người dùng không còn lượt nào.
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
    <div className="mt-4 space-y-2 rounded-m3-lg border border-outline-variant bg-surface-container p-3">
      {status.available > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="md-body-medium min-w-0 text-on-surface">
            <Gift size={16} className="mr-1.5 inline text-primary" />
            Còn {status.available} lượt miễn phí
            {status.nextExpiresAt && <span className="text-on-surface-variant"> (hết hạn {dayMonth(status.nextExpiresAt)})</span>}
          </p>
          {onUse && (
            <Button variant="primary" onClick={onUse}>
              Dùng 1 lượt
            </Button>
          )}
        </div>
      )}

      {canEarn && phase === "waiting" && (
        <div role="status" className="space-y-1 text-sm text-on-surface-variant">
          <p className="flex items-center gap-2">
            <Loader2 size={16} className="shrink-0 animate-spin" /> Đang chờ bạn vượt link ở tab mới. Xong quay lại đây.
          </p>
          {fallbackUrl && (
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Trình duyệt chặn tab mới, bấm để mở
            </a>
          )}{" "}
          <button type="button" onClick={cancel} className="text-xs underline">
            Hủy
          </button>
        </div>
      )}

      {canEarn && phase !== "waiting" && (
        <div className="flex items-center justify-between gap-3">
          <p className="md-body-small text-on-surface-variant">
            {status.available === 0 && <Gift size={16} className="mr-1.5 inline text-primary" />}
            Vượt link (1 đến 2 phút) nhận thêm 1 lượt · hôm nay còn {status.remainingToday}/{status.dailyLimit}
          </p>
          <Button variant="outlined" disabled={phase === "starting"} onClick={() => void start(status.available)}>
            {phase === "starting" && <Loader2 size={16} className="animate-spin" />}
            Nhận lượt
          </Button>
        </div>
      )}

      {status.enabled && status.remainingToday === 0 && <p className="md-body-small text-on-surface-variant">Hôm nay bạn đã nhận đủ {status.dailyLimit} lượt, mai quay lại nhé.</p>}
      {error && <p className="rounded-m3-md bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>}
    </div>
  );
}
