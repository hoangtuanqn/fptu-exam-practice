import { Flag } from "lucide-react";

interface Props {
  flagged: boolean;
  onToggle: () => void;
}

// Đánh dấu câu cần xem lại (phím tắt M)
export function FlagButton({ flagged, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      title="Đánh dấu xem lại (M)"
      aria-label="Đánh dấu xem lại"
      className={`inline-flex items-center gap-1.5 rounded-md border p-2 text-xs font-medium transition sm:px-2.5 sm:py-1 ${
        flagged
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-700"
      }`}
    >
      <Flag size={13} className={flagged ? "fill-amber-500" : ""} />
      <span className="hidden sm:inline">Đánh dấu</span>
    </button>
  );
}
