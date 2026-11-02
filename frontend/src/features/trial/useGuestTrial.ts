import { useCallback, useState } from "react";

const KEY = "guest_trial_used";

const read = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

// Khách chưa đăng nhập được dùng thử 1 lượt (tính khi nộp bài xong). Lưu ở trình duyệt nên chỉ là
// rào mềm để mời đăng ký, không phải chặn bảo mật.
export function useGuestTrial() {
  const [used, setUsed] = useState(read);

  const markUsed = useCallback(() => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* bỏ qua: trình duyệt chặn lưu trữ */
    }
    setUsed(true);
  }, []);

  return { used, markUsed };
}
