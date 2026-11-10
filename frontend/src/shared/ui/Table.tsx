import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
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
  <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-400">
    <tr>{children}</tr>
  </thead>
);

export const Th = ({ className = "", ...p }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={`whitespace-nowrap px-6 py-3 font-medium ${className}`} {...p} />
);

export const Tr = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
  <tr onClick={onClick} className={`border-b border-slate-100 last:border-0 ${onClick ? "cursor-pointer hover:bg-brand-50/40" : "hover:bg-slate-50/50"}`}>
    {children}
  </tr>
);

export const Td = ({ className = "", ...p }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`px-6 py-3.5 align-middle ${className}`} {...p} />
);

export function Pagination({ meta, onPage }: { meta: PageMeta; onPage: (page: number) => void }) {
  if (meta.totalPages <= 1) {
    return <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{meta.total} kết quả</div>;
  }
  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-surface-container-lowest text-slate-600 shadow-soft hover:bg-slate-50 disabled:opacity-40";
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
      <span>
        Trang {meta.page} / {meta.totalPages} · {meta.total} kết quả
      </span>
      <div className="flex gap-1.5">
        <button className={btn} disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Trang trước" title="Trang trước">
          <ChevronLeft size={16} />
        </button>
        <button
          className={btn}
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
          aria-label="Trang sau" title="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
