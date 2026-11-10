import { useCallback, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

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

  const confirmDialog = pending ? (
    <Modal onClose={() => settle(false)}>
      <ModalTitle icon={pending.icon ?? AlertTriangle}>{pending.title}</ModalTitle>
      {pending.message && <div className="md-body-large mt-3 text-on-surface-variant">{pending.message}</div>}
      <ModalActions>
        <Button onClick={() => settle(false)}>{pending.cancelLabel ?? "Huỷ"}</Button>
        <Button variant={pending.tone === "danger" ? "danger" : "primary"} onClick={() => settle(true)}>
          {pending.confirmLabel ?? "Xác nhận"}
        </Button>
      </ModalActions>
    </Modal>
  ) : null;

  return { confirm, confirmDialog };
}
