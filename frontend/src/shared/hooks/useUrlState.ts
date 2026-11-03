import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

// Giữ trạng thái của trang (số trang, bộ lọc, từ khoá...) trên URL (?page=2&status=PAID) thay vì state cục bộ:
// tải lại trang vẫn giữ nguyên, sao chép liên kết gửi người khác cũng mở đúng chỗ, nút Back hoạt động đúng.
// Giá trị bằng mặc định thì không đưa lên URL cho gọn.
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams();
  const defaultsKey = JSON.stringify(defaults);

  const values = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [key, fallback] of Object.entries(defaults)) out[key] = params.get(key) ?? fallback;
    return out as T;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, defaultsKey]);

  const set = useCallback(
    (patch: Partial<T>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === "" || value === defaults[key]) next.delete(key);
            else next.set(key, String(value));
          }
          return next;
        },
        { replace: true },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams, defaultsKey],
  );

  return [values, set] as const;
}

// Số trang từ URL: bỏ qua giá trị rác
export const toPage = (value: string) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
};
