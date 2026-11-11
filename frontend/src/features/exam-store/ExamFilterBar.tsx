import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import type { CatalogPage } from "./catalog.api";

// Trạng thái lọc danh sách đề của một môn (từ khoá, kỳ, trang) nằm trên địa chỉ trang; gõ xong mới tìm để đỡ gọi máy chủ mỗi phím.
export function useExamListQuery() {
  const [url, setUrl] = useUrlState({ term: "", q: "", page: "1" });
  const [typed, setTyped] = useState(url.q);
  const debounced = useDebounce(typed);
  useEffect(() => {
    if (debounced !== url.q) setUrl({ q: debounced, page: "1" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return { url, setUrl, page: toPage(url.page), typed, setTyped };
}

interface Props {
  query: ReturnType<typeof useExamListQuery>;
  terms: CatalogPage["terms"] | undefined;
}

// Ô tìm đề và các nút lọc theo kỳ, dùng chung cho Kho đề trong tài khoản và Kho đề công khai
export function ExamFilterBar({ query, terms }: Props) {
  const { url, setUrl, typed, setTyped } = query;
  return (
    <>
      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Tìm trong các đề của môn" aria-label="Tìm đề" className="h-10 w-full rounded-m3-md border border-outline-variant bg-surface-container-lowest pl-9 pr-3 text-sm outline-none focus:border-primary" />
      </label>
      {terms && terms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo kỳ">
          <button type="button" onClick={() => setUrl({ term: "", page: "1" })} className={`h-8 rounded-full border px-3 text-sm ${!url.term ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline-variant text-on-surface"}`}>
            Tất cả
          </button>
          {terms.map((t) => (
            <button key={t.term} type="button" onClick={() => setUrl({ term: t.term, page: "1" })} className={`h-8 rounded-full border px-3 text-sm ${url.term === t.term ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline-variant text-on-surface"}`}>
              {t.term} <span className="text-xs text-on-surface-variant">{t.count}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
