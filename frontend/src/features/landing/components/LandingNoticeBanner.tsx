import { useState } from "react";
import { Megaphone, X } from "lucide-react";
import { isSnoozed, snooze } from "@/shared/utils/promptSnooze";
import { LANDING_NOTICE as N } from "../content";

const SURFACE = "landing_notice";
const SNOOZE_DAYS = 1 / 24; // tắt thì ẩn 1 giờ

// Thông báo mỏng đầu trang chủ. Chỉ Landing dùng nên chỉ hiện ở trang chủ; hết hạn thì tự ẩn.
export function LandingNoticeBanner() {
  const [hidden, setHidden] = useState(() => isSnoozed(SURFACE));
  if (hidden || Date.now() >= new Date(N.endsAt).getTime()) return null;

  return (
    <div role="status" className="flex items-center gap-2 border-b border-outline-variant bg-brand-50 px-4 py-2 text-sm text-on-surface">
      <Megaphone size={16} className="shrink-0 text-brand-700" aria-hidden />
      <p className="min-w-0 flex-1">
        {N.text}{" "}
        <a href={N.link} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">
          {N.linkLabel}
        </a>
      </p>
      <button
        type="button"
        aria-label="Tắt thông báo trong 1 giờ"
        title="Tắt trong 1 giờ"
        onClick={() => {
          snooze(SURFACE, SNOOZE_DAYS);
          setHidden(true);
        }}
        className="shrink-0 rounded-full p-1 text-on-surface-variant hover:bg-surface-container-highest"
      >
        <X size={16} />
      </button>
    </div>
  );
}
