import { Sparkles } from "lucide-react";

interface Props {
  onExplain: () => void;
  bought?: boolean; // đã mua lời giải của câu này
  free?: boolean; // còn lượt xem thử miễn phí
}

// Nút "Giải thích bằng AI", dùng ở khung câu hỏi và cửa sổ phóng to ảnh
export function ExplainButton({ onExplain, bought, free }: Props) {
  return (
    <button
      onClick={onExplain}
      title="Giải thích bằng AI"
      aria-label="Giải thích bằng AI"
      className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 p-2 text-xs font-medium text-brand-800 transition hover:border-brand-400 sm:px-2.5 sm:py-1"
    >
      <Sparkles size={13} />
      <span className="hidden sm:inline">{bought ? "Xem giải thích" : free ? "Giải thích miễn phí" : "Giải thích"}</span>
    </button>
  );
}
