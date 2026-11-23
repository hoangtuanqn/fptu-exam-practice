import { useRef, type KeyboardEvent, type ReactNode, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageMeta } from "@/shared/types/api";

// Bảng dữ liệu: cuộn ngang trên màn hình hẹp thay vì vỡ bố cục
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-700">{children}</table>
    </div>
  );
}

export const Thead = ({ children }: { children: ReactNode }) => (
  <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500">
    <tr>{children}</tr>
  </thead>
);

export const Th = ({ className = "", ...p }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={`whitespace-nowrap px-6 py-3 font-medium ${className}`} {...p} />
);

// Dòng bấm được: focus bằng Tab, Enter hoặc Space để mở (chỉ khi focus đúng dòng, không phải nút bên trong)
const onRowKey = (open: () => void) => (e: KeyboardEvent<HTMLTableRowElement>) => {
  if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    open();
  }
};

export const Tr = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
  <tr
    onClick={onClick}
    {...(onClick && { tabIndex: 0, onKeyDown: onRowKey(onClick) })}
    className={`border-b border-slate-100 last:border-0 ${onClick ? "cursor-pointer hover:bg-brand-50/40 focus-visible:bg-brand-50/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary" : "hover:bg-slate-50/50"}`}
  >
    {children}
  </tr>
);

export const Td = ({ className = "", ...p }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`px-6 py-3.5 align-middle ${className}`} {...p} />
);

export function Pagination({ meta, onPage }: { meta: PageMeta; onPage: (page: number) => void }) {
  const root = useRef<HTMLDivElement>(null);
  // Đổi trang thì cuộn về đầu thẻ chứa bảng: bấm "Trang sau" ở cuối bảng dài sẽ thấy ngay dòng đầu của trang mới
  const go = (page: number) => {
    onPage(page);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.current?.closest("section")?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  };
  if (meta.totalPages <= 1) {
    return <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{meta.total} kết quả</div>;
  }
  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-surface-container-lowest text-slate-600 shadow-soft hover:bg-slate-50 disabled:opacity-40";
  return (
    <div ref={root} className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
      <span>
        Trang {meta.page} / {meta.totalPages} · {meta.total} kết quả
      </span>
      <div className="flex gap-1.5">
        <button className={btn} disabled={meta.page <= 1} onClick={() => go(meta.page - 1)} aria-label="Trang trước" title="Trang trước">
          <ChevronLeft size={16} />
        </button>
        <button
          className={btn}
          disabled={meta.page >= meta.totalPages}
          onClick={() => go(meta.page + 1)}
          aria-label="Trang sau" title="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
