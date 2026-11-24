import { useEffect, useState } from "react";
import { inputClass } from "@/shared/ui/Input";
import { Search } from "lucide-react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Segmented } from "@/shared/ui/Segmented";
import type { CatalogPage } from "./catalog.api";

// Trạng thái lọc danh sách đề của một môn (từ khoá, kỳ, trang) nằm trên địa chỉ trang; gõ xong mới tìm để đỡ gọi máy chủ mỗi phím.
export function useExamListQuery() {
  const [url, setUrl] = useUrlState({ term: "", kind: "", q: "", page: "1" });
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
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Tìm trong các đề của môn" aria-label="Tìm đề" className={`${inputClass()} !h-10 pl-9 pr-3`} />
      </label>
      <Segmented
        label="Lọc theo loại đề"
        value={url.kind}
        onChange={(v) => setUrl({ kind: v, term: "", page: "1" })}
        options={[
          { value: "", label: "Tất cả" },
          { value: "FE", label: "FE" },
          { value: "PE", label: "PE" },
        ]}
      />
      {terms && terms.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3" role="group" aria-label="Lọc theo kỳ">
          <button type="button" onClick={() => setUrl({ term: "", page: "1" })} aria-pressed={!url.term} className="site-chip text-sm">
            Tất cả
          </button>
          {terms.map((t) => (
            <button key={t.term} type="button" onClick={() => setUrl({ term: t.term, page: "1" })} aria-pressed={url.term === t.term} className="site-chip text-sm">
              {t.term} <span className="text-xs text-on-surface-variant">{t.count}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
