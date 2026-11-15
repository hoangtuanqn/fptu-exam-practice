import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { duplicatesVisibleField, errorMessage } from "@/shared/api/errors";

// Bọc thao tác gửi form: quản lý trạng thái đang gửi, lỗi chung và lỗi theo từng trường.
// Trả về true nếu thành công để nơi gọi quyết định bước tiếp theo.
// `fields`: tên các ô trang này có hiện lỗi bên dưới. Lời nhắn trùng lỗi của một ô trong đó thì không lặp ở hộp lỗi chung;
// không truyền thì hộp lỗi chung luôn hiện (ô không có trên trang thì người dùng vẫn thấy lỗi).
// `retryIn`: số giây còn phải chờ khi máy chủ báo thao tác quá nhanh (429 có Retry-After), để khóa nút gửi và đếm ngược.
export function useSubmit(fallback?: string, fields: readonly string[] = []) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [retryIn, setRetryIn] = useState(0);
  const inFlight = useRef(false);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  useEffect(() => {
    if (retryIn <= 0) return;
    const id = setTimeout(() => setRetryIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [retryIn]);

  // Bỏ qua lần gọi thứ hai khi lần đầu chưa xong: bấm đúp hoặc Enter liên tiếp không gửi hai yêu cầu
  // (nút chỉ bị khóa sau khi React vẽ lại, chậm hơn cú bấm thứ hai).
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setLoading(true);
      setError(null);
      setFieldErrors({});
      try {
        await action();
        setRetryIn(0);
        return true;
      } catch (err) {
        const message = errorMessage(err, fallback);
        if (err instanceof ApiError) {
          if (err.errors) setFieldErrors(err.errors);
          if (err.status === 429 && err.retryAfter) setRetryIn(err.retryAfter);
        }
        setError(duplicatesVisibleField(err, fieldsRef.current) ? null : message);
        return false;
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [fallback],
  );

  const clear = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  return { run, loading, error, fieldErrors, setFieldErrors, clear, retryIn };
}
