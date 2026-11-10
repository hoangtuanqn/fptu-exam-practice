import { Gift, Loader2 } from "lucide-react";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import type { FreeTurnStatus } from "./link-reward.api";
import { useEarnTurn } from "./useEarnTurn";

const dayMonth = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

/**
 * Khối "lượt giải thích miễn phí" dùng trong hộp xác nhận giải thích và thẻ Tổng quan:
 *  - có lượt: nói rõ còn bao nhiêu, khi nào hết hạn, kèm nút dùng (nếu có onUse);
 *  - chưa có và còn nhận được hôm nay: nút vượt link, có hướng dẫn và trạng thái chờ;
 *  - hôm nay đã nhận đủ: nhắc quay lại ngày mai.
 * Không hiện gì nếu tính năng tắt và người dùng không còn lượt nào.
 */
export function EarnTurnBlock({ status, onUse, onChange, className = "mt-4 rounded-m3-lg" }: { status: FreeTurnStatus; onUse?: () => void; onChange: () => void; className?: string }) {
  const toast = useToast();
  const { phase, error, fallbackUrl, start, cancel } = useEarnTurn(() => {
    toast.success("Đã nhận 1 lượt giải thích miễn phí");
    onChange();
  });

  if (!status.enabled && status.available === 0) return null;

  return (
    <div className={`space-y-3 border border-outline-variant bg-surface-container p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <Gift size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="md-title-small text-on-surface">
            {status.available > 0 ? `Bạn có ${status.available} lượt giải thích miễn phí` : "Nhận lượt giải thích miễn phí"}
          </p>
          <p className="md-body-small text-on-surface-variant">
            {status.available > 0 && status.nextExpiresAt
              ? `Lượt sớm nhất hết hạn ngày ${dayMonth(status.nextExpiresAt)}. Mỗi lượt dùng cho 1 câu.`
              : `Vượt link rồi quay lại để nhận 1 lượt, giữ được ${status.validDays} ngày.`}
          </p>
        </div>
      </div>

      {status.available > 0 && onUse && (
        <Button variant="primary" className="w-full" onClick={onUse}>
          Dùng 1 lượt miễn phí
        </Button>
      )}

      {status.enabled && status.remainingToday > 0 && (
        <>
          {phase === "waiting" ? (
            <div role="status" className="space-y-2 text-sm text-on-surface-variant">
              <p className="flex items-center gap-2">
                <Loader2 size={16} className="shrink-0 animate-spin" /> Đang chờ bạn hoàn thành các bước ở tab Link4M. Xong thì quay lại đây, lượt sẽ tự hiện.
              </p>
              {fallbackUrl && (
                <p>
                  Trình duyệt chặn mở tab mới.{" "}
                  <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Bấm vào đây để mở trang vượt link
                  </a>
                  .
                </p>
              )}
              <button type="button" onClick={cancel} className="text-xs underline">
                Thôi, không chờ nữa
              </button>
            </div>
          ) : (
            <>
              <Button variant={status.available > 0 ? "outlined" : "primary"} className="w-full" disabled={phase === "starting"} onClick={() => void start(status.available)}>
                {phase === "starting" && <Loader2 size={16} className="animate-spin" />}
                Vượt link nhận thêm 1 lượt miễn phí
              </Button>
              <p className="md-body-small text-on-surface-variant">
                Bạn sẽ qua trang Link4M, làm vài bước (khoảng 1 đến 2 phút). Hôm nay còn nhận được {status.remainingToday}/{status.dailyLimit} lần.
              </p>
            </>
          )}
          {error && <p className="rounded-m3-md bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>}
        </>
      )}

      {status.enabled && status.remainingToday === 0 && (
        <p className="md-body-small text-on-surface-variant">Hôm nay bạn đã nhận đủ {status.dailyLimit} lượt. Ngày mai quay lại để nhận thêm nhé.</p>
      )}
    </div>
  );
}
