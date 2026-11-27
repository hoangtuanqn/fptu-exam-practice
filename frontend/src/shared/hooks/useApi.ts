import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Gọi API khi mount và mỗi khi `deps` đổi. `reload()` để tải lại tay (sau khi sửa dữ liệu).
// Bỏ qua kết quả của lần gọi cũ nếu đã có lần gọi mới hơn (tránh dữ liệu nhảy khi đổi trang nhanh).
// `fetcher` nhận tín hiệu huỷ: chuyển nó cho http.get thì lần gọi cũ được huỷ hẳn khi có lần mới.
export function useApi<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const ticket = useRef(0);
  const abort = useRef<AbortController>();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const hasData = useRef(false); // đã từng có dữ liệu: lần tải lại lỗi thì giữ dữ liệu cũ thay vì thay cả khối bằng hộp lỗi

  const run = useCallback(() => {
    const mine = ++ticket.current;
    abort.current?.abort(); // lần trước còn đang chạy thì huỷ; lỗi do huỷ bị bỏ qua vì ticket đã cũ
    abort.current = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcherRef
      .current(abort.current.signal)
      .then((data) => {
        if (mine !== ticket.current) return;
        hasData.current = true;
        setState({ data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (mine !== ticket.current) return;
        const message = errorMessage(err, "Chưa tải được nội dung. Bạn bấm Thử lại nhé.");
        if (hasData.current) {
          toastRef.current.error(message, { action: { label: "Thử lại", onClick: () => run() } });
          setState((s) => ({ ...s, loading: false }));
        } else setState((s) => ({ ...s, error: message, loading: false }));
      });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(run, deps);

  return { ...state, reload: run };
}
