import { Loader2 } from "lucide-react";

// Đề đang được lấy về: câu nào tải xong hiện câu đó, các câu còn lại tới dần nên người dùng xem trước được
export function LoadingMoreBanner({ loaded, total }: { loaded: number; total: number }) {
  return (
    <div role="status" aria-live="polite" className="mb-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-sm text-brand-900">
      <div className="flex items-center gap-2.5">
        <Loader2 size={16} className="shrink-0 animate-spin text-brand-700" />
        <span className="font-medium">
          Đang tải câu hỏi {loaded}/{total}…
        </span>
        <span className="hidden text-brand-800/80 sm:inline">Bạn xem trước các câu đã có, câu còn lại sẽ hiện dần.</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100" aria-hidden>
        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-500" style={{ width: `${(loaded / Math.max(1, total)) * 100}%` }} />
      </div>
    </div>
  );
}
