import { Loader2, Search } from "lucide-react";
import { useSlow } from "@/shared/hooks/useSlow";

// Kính lúp của ô tìm; đang tìm quá 150ms thì đổi thành vòng xoay ngay tại chỗ (không xê dịch gì), tìm nhanh thì không nháy.
export function SearchStatusIcon({ busy = false, size = 16, strokeWidth }: { busy?: boolean; size?: number; strokeWidth?: number }) {
  const slow = useSlow(busy);
  if (!slow) return <Search size={size} strokeWidth={strokeWidth} aria-hidden />;
  return (
    // xoay thẻ bọc chứ không xoay thẳng <svg>: trình duyệt xoay được mà không phải vẽ lại
    <span className="flex motion-safe:animate-spin">
      <Loader2 size={size} strokeWidth={strokeWidth} aria-hidden />
    </span>
  );
}
