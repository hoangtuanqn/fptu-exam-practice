import { useDeferredValue, useMemo } from "react";
import { buildSearchIndex, foldText, searchSubjects, type Searchable } from "@/shared/utils/searchText";

const NONE: readonly never[] = []; // chưa có dữ liệu: dùng đúng một mảng để useMemo không tính lại mỗi lần vẽ

// Lọc môn ngay trên máy mà không làm ô nhập bị khựng: chữ gõ hiện ngay, danh sách vẽ sau (React ngắt được khi người dùng gõ tiếp).
// `term` là từ khoá ứng với danh sách đang hiện; `stale` = danh sách chưa theo kịp chữ đang gõ.
export function useSubjectSearch<T extends Searchable>(items: readonly T[] | null | undefined, query: string) {
  const deferred = useDeferredValue(query);
  const index = useMemo(() => buildSearchIndex<T>(items ?? NONE), [items]);
  const results = useMemo(() => searchSubjects(index, deferred), [index, deferred]);
  return { results, term: foldText(deferred), stale: deferred !== query };
}
