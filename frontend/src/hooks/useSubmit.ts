import { useCallback, useState } from "react";
import { ApiError } from "../api/client";

// Bọc thao tác gửi form: quản lý trạng thái đang gửi, lỗi chung và lỗi theo từng trường.
// Trả về true nếu thành công để nơi gọi quyết định bước tiếp theo.
export function useSubmit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      await action();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.errors ?? {});
        // Có lỗi theo trường thì để dưới ô nhập, tránh lặp lại thông báo chung
        if (!err.errors) setError(err.message);
      } else {
        setError("Đã có lỗi xảy ra");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  return { run, loading, error, fieldErrors, setFieldErrors, clear };
}
