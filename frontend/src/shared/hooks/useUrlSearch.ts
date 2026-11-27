import { useEffect, useRef, useState } from "react";
import { useDebounce } from "./useDebounce";

// Ô tìm kiếm gõ trực tiếp: giá trị hiện ngay trong ô, sau khi ngừng gõ mới đưa lên URL (và về trang 1).
// Địa chỉ đổi từ nơi khác (bấm liên kết, nút Back) thì ô đổi theo.
// Trả về [giá trị trong ô, hàm đổi, từ khoá đã chốt để gọi API, pending: đã gõ nhưng chưa chốt].
export function useUrlSearch(urlQuery: string, setUrl: (patch: { q: string; page: string }) => void) {
  const [search, setSearch] = useState(urlQuery);
  const q = useDebounce(search.trim());
  const synced = useRef(urlQuery); // từ khoá mà ô và địa chỉ đã khớp nhau lần gần nhất
  useEffect(() => {
    if (q === synced.current) return;
    synced.current = q;
    if (q !== urlQuery) setUrl({ q, page: "1" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  useEffect(() => {
    if (urlQuery === synced.current) return; // do chính ô này vừa ghi lên
    synced.current = urlQuery;
    setSearch(urlQuery);
  }, [urlQuery]);
  return [search, setSearch, q, search.trim() !== q] as const;
}
