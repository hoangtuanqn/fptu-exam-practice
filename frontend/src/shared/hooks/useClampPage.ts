import { useEffect } from "react";
import type { PageMeta } from "@/shared/types/api";

/**
 * Trang đang xem vượt quá số trang hiện có (gõ ?page=99, hoặc xóa hết dòng ở trang cuối) thì tự lùi về trang cuối,
 * thay vì để người dùng nhìn bảng trống mà vẫn có nút phân trang.
 */
export function useClampPage(meta: PageMeta | undefined, onPage: (page: number) => void) {
  useEffect(() => {
    if (meta && meta.page > meta.totalPages) onPage(meta.totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.page, meta?.totalPages]);
}
