import { useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/shared/ui/Button";

// Điện thoại cầm dọc: ảnh đề rất nhỏ nên nhắc xoay ngang. Chỉ hiện bằng CSS khi màn hình hẹp và đang dọc; bấm "Vẫn làm dọc" để tắt trong lần làm bài này.
export function RotateHint() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div
      role="dialog"
      aria-label="Xoay ngang điện thoại"
      className="fixed inset-0 z-40 hidden flex-col items-center justify-center gap-4 bg-scrim/90 p-6 text-center text-white [@media(max-width:767px)_and_(orientation:portrait)]:flex"
    >
      <RotateCw size={48} aria-hidden />
      <p className="md-title-large">Xoay ngang điện thoại để làm bài</p>
      <p className="md-body-medium text-white/80">Ảnh đề sẽ to và dễ đọc hơn</p>
      <Button variant="outlined" className="!border-white/40 !text-white" onClick={() => setDismissed(true)}>
        Vẫn làm dọc
      </Button>
    </div>
  );
}
