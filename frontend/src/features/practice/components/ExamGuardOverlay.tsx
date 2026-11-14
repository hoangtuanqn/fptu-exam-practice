import { memo, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Maximize, Send, ShieldAlert } from "lucide-react";
import type { GuardAway } from "@/features/practice/hooks/useExamGuard";
import { Button } from "@/shared/ui/Button";

interface Props {
  away: Exclude<GuardAway, null>;
  count: number; // số lần vi phạm đã ghi
  onResume: () => void;
  onSubmit: () => void;
  onTamper: () => void; // lớp phủ bị gỡ khỏi trang
}

// Lớp phủ kín màn hình khi rời bài thi toàn màn hình. Nền đặc (không làm nhòe) và đề đã được gỡ khỏi trang phía sau.
// Vẽ vào <body> dưới hộp thoại (z-60) để hộp xác nhận nộp bài nằm trên.
export const ExamGuardOverlay = memo(function ExamGuardOverlay({ away, count, onResume, onSubmit, onTamper }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const tamper = useRef(onTamper);
  tamper.current = onTamper;

  // Bị xoá bằng devtools: gắn lại đúng nút cũ (React vẫn giữ nút này) và tính thêm một vi phạm.
  // Layout effect: cleanup chạy trước khi React gỡ nút, nên lần gỡ hợp lệ (nộp bài, quay lại) không bị gắn lại hay tính nhầm.
  useLayoutEffect(() => {
    const node = ref.current;
    const parent = node?.parentNode;
    if (!node || !parent) return;
    let alive = true;
    const mo = new MutationObserver(() => {
      if (!alive || node.isConnected) return;
      parent.appendChild(node);
      tamper.current();
    });
    mo.observe(parent, { childList: true });
    return () => {
      alive = false;
      mo.disconnect();
    };
  }, []);

  const left = away === "left";
  return createPortal(
    <div
      ref={ref}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="exam-guard-title"
      aria-describedby="exam-guard-desc"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-scrim p-6 text-center text-white"
    >
      <div className="w-full max-w-sm">
        <ShieldAlert size={40} className="mx-auto text-amber-300" aria-hidden />
        <h2 id="exam-guard-title" className="md-headline-small mt-4">
          {left ? "Bạn đã rời khỏi bài thi" : "Bài thi chạy toàn màn hình"}
        </h2>
        <div id="exam-guard-desc" className="md-body-large mt-2 text-white/80">
          {left && <p className="font-semibold text-amber-300">Lần vi phạm thứ {count}</p>}
          <p>Đồng hồ vẫn đang chạy</p>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="filled" autoFocus onClick={onResume}>
            <Maximize size={18} /> {left ? "Quay lại làm bài" : "Vào toàn màn hình"}
          </Button>
          <Button variant="outlined" className="!border-white/40 !text-white" onClick={onSubmit}>
            <Send size={18} /> Nộp bài
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
});
