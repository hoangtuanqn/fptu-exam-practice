import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Gọi API khi mount và mỗi khi `deps` đổi. `reload()` để tải lại tay (sau khi sửa dữ liệu).
// Bỏ qua kết quả của lần gọi cũ nếu đã có lần gọi mới hơn (tránh dữ liệu nhảy khi đổi trang nhanh).
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const ticket = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(() => {
    const mine = ++ticket.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcherRef
      .current()
      .then((data) => mine === ticket.current && setState({ data, error: null, loading: false }))
      .catch((err: unknown) => {
        if (mine !== ticket.current) return;
        const message = err instanceof ApiError ? err.message : "Đã có lỗi xảy ra";
        setState((s) => ({ ...s, error: message, loading: false }));
      });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(run, deps);

  return { ...state, reload: run };
}
