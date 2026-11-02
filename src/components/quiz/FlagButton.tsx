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
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
        flagged
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-700"
      }`}
    >
      <Flag size={13} className={flagged ? "fill-amber-500" : ""} />
      Đánh dấu
    </button>
  );
}
