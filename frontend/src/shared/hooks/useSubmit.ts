import { useCallback, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";

// Bọc thao tác gửi form: quản lý trạng thái đang gửi, lỗi chung và lỗi theo từng trường.
// Trả về true nếu thành công để nơi gọi quyết định bước tiếp theo.
export function useSubmit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(false);

  // Bỏ qua lần gọi thứ hai khi lần đầu chưa xong: bấm đúp hoặc Enter liên tiếp không gửi hai yêu cầu
  // (nút chỉ bị khóa sau khi React vẽ lại, chậm hơn cú bấm thứ hai).
  const run = useCallback(async (action: () => Promise<unknown>) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      await action();
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        // Có lỗi theo trường thì để dưới ô nhập, tránh lặp lại thông báo chung
        setFieldErrors(err.errors);
      } else {
        setError(errorMessage(err));
      }
      return false;
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  return { run, loading, error, fieldErrors, setFieldErrors, clear };
}
