import { useEffect, useState } from "react";
import { useDebounce } from "./useDebounce";

// Ô tìm kiếm gõ trực tiếp: giá trị hiện ngay trong ô, sau khi ngừng gõ mới đưa lên URL (và về trang 1).
// Trả về [giá trị trong ô, hàm đổi, từ khoá đã chốt để gọi API].
export function useUrlSearch(urlQuery: string, setUrl: (patch: { q: string; page: string }) => void) {
  const [search, setSearch] = useState(urlQuery);
  const q = useDebounce(search.trim());
  useEffect(() => {
    if (q !== urlQuery) setUrl({ q, page: "1" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return [search, setSearch, q] as const;
}
