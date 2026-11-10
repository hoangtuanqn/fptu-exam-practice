import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import type { FreeTurnStatus } from "./link-reward.api";
import { useEarnTurn } from "./useEarnTurn";

const dayMonth = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

// Một dòng: tiêu đề + chú thích nhỏ bên trái, nút bên phải (cùng kiểu với thẻ "Mở khóa cả đề")
function Row({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <span className="min-w-0 text-sm text-on-surface">
        <span className="font-medium">{title}</span>
        {hint && <span className="block text-xs text-on-surface-variant">{hint}</span>}
      </span>
      {action}
    </div>
  );
}

/**
 * Lượt giải thích miễn phí, nằm trong hộp xác nhận giải thích khi làm bài.
 * Có lượt thì cho dùng ngay; còn nhận được hôm nay thì cho vượt link lấy thêm. Tắt và không còn lượt thì không hiện gì.
 */
export function EarnTurnBlock({ status, onUse, onChange }: { status: FreeTurnStatus; onUse?: () => void; onChange: () => void }) {
  const toast = useToast();
  const { phase, error, fallbackUrl, start, cancel } = useEarnTurn(() => {
    toast.success("Đã nhận 1 lượt giải thích miễn phí");
    onChange();
  });

  if (!status.enabled && status.available === 0) return null;
  const canEarn = status.enabled && status.remainingToday > 0;
  const waiting = canEarn && phase === "waiting";

  return (
    <div className="mt-3 divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      {status.available > 0 && (
        <Row
          title={`Bạn có ${status.available} lượt miễn phí`}
          hint={status.nextExpiresAt ? `Lượt sớm nhất hết hạn ngày ${dayMonth(status.nextExpiresAt)}` : undefined}
          action={
            onUse && (
              <Button variant="primary" onClick={onUse}>
                Dùng 1 lượt
              </Button>
            )
          }
        />
      )}

      {canEarn && !waiting && (
        <Row
          title="Nhận thêm 1 lượt miễn phí"
          hint={status.remainingToday < status.dailyLimit ? `Vượt link mất khoảng 1 đến 2 phút. Hôm nay còn ${status.remainingToday} lần.` : "Vượt link mất khoảng 1 đến 2 phút."}
          action={
            <Button variant="outlined" disabled={phase === "starting"} onClick={() => void start(status.available)}>
              {phase === "starting" && <Loader2 size={16} className="animate-spin" />}
              Vượt link
            </Button>
          }
        />
      )}

      {waiting && (
        <Row
          title="Đang chờ bạn vượt link"
          hint={
            fallbackUrl ? (
              <>
                Trình duyệt chặn tab mới.{" "}
                <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Bấm để mở
                </a>
              </>
            ) : (
              "Làm xong ở tab mới rồi quay lại đây, lượt sẽ tự hiện."
            )
          }
          action={
            <button type="button" onClick={cancel} className="flex shrink-0 items-center gap-2 text-xs text-on-surface-variant underline">
              <Loader2 size={14} className="animate-spin" /> Hủy
            </button>
          }
        />
      )}

      {status.enabled && status.remainingToday === 0 && <Row title="Hôm nay đã nhận đủ lượt" hint="Mai quay lại để nhận thêm." />}
      {error && <p className="bg-error-container px-3.5 py-2 text-xs text-on-error-container">{error}</p>}
    </div>
  );
}
