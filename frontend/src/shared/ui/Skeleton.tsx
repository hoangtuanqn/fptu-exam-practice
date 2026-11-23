import type { ReactNode } from "react";

// Khối xương (skeleton): giữ chỗ cho nội dung đang tải, cùng kích thước gần với nội dung thật để trang không nhảy.
// Hiệu ứng quét nhẹ (md-skeleton trong index.css), tắt khi người dùng bật giảm chuyển động.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`md-skeleton rounded-m3-sm ${className}`} />;
}

// Vỏ chờ: hiện mờ dần sau ~150ms, nên tải nhanh không bị nháy khung xám rồi mất
export function SkeletonWrap({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="status" aria-busy="true" className="md-skeleton-wrap">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

// Chờ tải cho danh sách/bảng: các dòng chỉ gồm hai thanh chữ, không có avatar, để không giống một danh sách cố định
export function SkeletonList({ rows = 4, label = "Đang tải…" }: { rows?: number; label?: string }) {
  return (
    <SkeletonWrap label={label}>
      <div className="space-y-4 p-5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5 opacity-60" />
          </div>
        ))}
      </div>
    </SkeletonWrap>
  );
}

// Chờ tải cho bảng: các dòng nhiều cột (cột đầu rộng, cột cuối ngắn), giống dòng bảng thật
export function SkeletonTable({ rows = 6, label = "Đang tải…" }: { rows?: number; label?: string }) {
  return (
    <SkeletonWrap label={label}>
      <div className="divide-y divide-outline-variant/40">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-6 px-6 py-4">
            <Skeleton className="h-3.5 w-1/4" />
            <Skeleton className="hidden h-3.5 w-1/6 sm:block" />
            <Skeleton className="hidden h-3.5 w-1/5 sm:block" />
            <Skeleton className="ml-auto h-3.5 w-16" />
          </div>
        ))}
      </div>
    </SkeletonWrap>
  );
}

// Chờ tải cho khối nội dung đơn (thẻ số liệu, đoạn văn, form): các thanh có độ dài khác nhau
export function SkeletonBlock({ lines = 3, label = "Đang tải…" }: { lines?: number; label?: string }) {
  return (
    <SkeletonWrap label={label}>
      <div className="space-y-3 p-5">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={`h-4 ${i === lines - 1 ? "w-1/2" : "w-full"}`} />
        ))}
      </div>
    </SkeletonWrap>
  );
}

// Chờ tải cho cả trang khi chưa biết bố cục (chuyển trang lần đầu): tiêu đề + một thẻ danh sách
export function PageSkeleton({ label = "Đang tải trang…" }: { label?: string }) {
  return (
    <SkeletonWrap label={label}>
      <div className="space-y-6" aria-hidden>
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
        <div className="overflow-hidden rounded-m3-md border border-outline-variant">
          <SkeletonList rows={4} label="" />
        </div>
      </div>
    </SkeletonWrap>
  );
}
