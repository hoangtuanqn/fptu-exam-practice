import { useState } from "react";
import { RotateCw, X } from "lucide-react";
import { IconButton } from "@/shared/ui/Button";
import { isSnoozed, snooze } from "@/shared/utils/promptSnooze";

const KEY = "rotate-hint";
const HIDE_DAYS = 7;

// Điện thoại cầm dọc: ảnh đề nhỏ nên gợi ý xoay ngang bằng một dòng, không che đề. Chỉ hiện bằng CSS khi màn hẹp và đang dọc; đóng rồi thì ẩn một tuần.
export function RotateHint() {
  const [dismissed, setDismissed] = useState(() => isSnoozed(KEY));
  if (dismissed) return null;
  return (
    <div className="hidden shrink-0 items-center gap-2 rounded-xl bg-secondary-container pl-3 text-on-secondary-container [@media(max-width:767px)_and_(orientation:portrait)]:flex">
      <RotateCw size={16} className="shrink-0" aria-hidden />
      <p className="md-body-medium flex-1 py-2">Xoay ngang điện thoại để chữ trong đề to hơn</p>
      <IconButton
        label="Ẩn gợi ý"
        onClick={() => {
          snooze(KEY, HIDE_DAYS);
          setDismissed(true);
        }}
      >
        <X size={16} />
      </IconButton>
    </div>
  );
}
