import { useCallback, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";

export interface ConfirmOptions {
  title: string;
  /** Nói rõ điều gì sẽ xảy ra: xoá gì, có khôi phục được không, tốn bao nhiêu credit hoặc lượt gọi AI */
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger: xoá/ghi đè dữ liệu (nút đỏ). primary: thao tác tốn tiền hoặc gọi AI. */
  tone?: "danger" | "primary";
  icon?: LucideIcon;
}

export interface ConfirmModalProps extends ConfirmOptions {
  /** Đang chạy thao tác sau khi xác nhận: khoá nút, không đóng bằng Esc / bấm nền */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Hộp xác nhận gọn dùng chung cho mọi thao tác xoá / tốn tiền (useConfirm vẽ chính hộp này).
 * Cần chạy việc không đồng bộ ngay trong hộp (có trạng thái đang xử lý) thì dùng thẳng ConfirmModal với `busy`.
 */
export function ConfirmModal({ title, message, confirmLabel, cancelLabel, tone, icon: Icon = AlertTriangle, busy = false, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <Modal maxWidth="max-w-sm" flush onClose={busy ? undefined : onCancel}>
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone === "danger" ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container"}`}>
            <Icon size={18} />
          </div>
          <h2 className="md-title-medium min-w-0 break-words text-on-surface">{title}</h2>
        </div>
        {message && <div className="md-body-medium mt-3 text-on-surface-variant">{message}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button size="sm" onClick={onCancel} disabled={busy}>
            {cancelLabel ?? "Huỷ"}
          </Button>
          <Button size="sm" variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
            {confirmLabel ?? "Xác nhận"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/**
 * Hỏi xác nhận trước khi chạy một thao tác xoá dữ liệu hoặc tốn tiền (gọi AI, trừ credit).
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (!(await confirm({ title: "Xoá ...?", message: "...", confirmLabel: "Xoá", tone: "danger" }))) return;
 *   ...
 *   return <>... {confirmDialog}</>;
 *
 * Hộp thoại dùng Modal chung nên có sẵn Esc để huỷ, bấm nền để huỷ và nhốt phím Tab. Mặc định không ai bấm Enter là xác nhận
 * (focus nằm ở khung hộp), phải chủ ý bấm nút xác nhận.
 */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);
  const current = useRef<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        const p = { ...options, resolve };
        current.current = p;
        setPending(p);
      }),
    [],
  );

  const settle = (ok: boolean) => {
    current.current?.resolve(ok);
    current.current = null;
    setPending(null);
  };

  const confirmDialog = pending ? <ConfirmModal {...pending} onConfirm={() => settle(true)} onCancel={() => settle(false)} /> : null;

  return { confirm, confirmDialog };
}
