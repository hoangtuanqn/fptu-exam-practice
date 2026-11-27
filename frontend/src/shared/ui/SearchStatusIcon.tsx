import { Loader2, Search } from "lucide-react";

// Kính lúp của ô tìm; đang tìm thì đổi thành vòng xoay ngay tại chỗ (không xê dịch gì).
// Chỉ đổi khi chờ quá 150ms (CSS .search-status trong index.css) nên tìm nhanh thì không nháy.
export function SearchStatusIcon({ busy = false, size = 16, strokeWidth }: { busy?: boolean; size?: number; strokeWidth?: number }) {
  return (
    <span className={`search-status${busy ? " is-busy" : ""}`}>
      <Search size={size} strokeWidth={strokeWidth} aria-hidden />
      <span>
        <Loader2 size={size} strokeWidth={strokeWidth} aria-hidden className="motion-safe:animate-spin" />
      </span>
    </span>
  );
}
