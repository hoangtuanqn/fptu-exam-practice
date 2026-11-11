import { useEffect, useRef, useState } from "react";

const POLL_MS = 4000;

// Hỏi lại ngầm (không làm mờ nội dung) khoảng 4 giây một lần khi `shouldPoll(data)` đúng, dừng khi sai,
// tạm dừng khi tab bị ẩn và hỏi lại ngay khi người dùng quay lại tab. `base` là dữ liệu của useApi:
// tải lại tay thì bỏ kết quả hỏi ngầm cũ.
export function usePolledData<T>(base: T | null, load: () => Promise<T>, shouldPoll: (data: T) => boolean): T | null {
  const [fresh, setFresh] = useState<T | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => setFresh(null), [base]);

  const data = fresh ?? base;
  const active = data !== null && shouldPoll(data);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = () => {
      loadRef
        .current()
        .then((next) => alive && setFresh(next)) // đổi state làm effect chạy lại và hẹn lần hỏi tiếp theo
        .catch(() => alive && schedule()); // lỗi tạm thời: thử lại ở lần sau
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!document.hidden) timer = setTimeout(poll, POLL_MS);
    };
    const onVisibility = () => {
      clearTimeout(timer);
      if (!document.hidden) poll();
    };
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, fresh, base]);

  return data;
}
