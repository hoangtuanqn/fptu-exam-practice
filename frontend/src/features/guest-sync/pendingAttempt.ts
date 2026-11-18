import type { AttemptPayload } from "@/features/history/types";
import { isUuid } from "@/shared/utils/uuid";

const KEY = "pending_attempt";

export interface PendingAttempt {
  examId: string;
  payload: AttemptPayload;
}

// Bài khách vừa nộp, chờ lưu vào lịch sử ngay khi họ đăng ký/đăng nhập. Chỉ giữ bài gần nhất.
export const pendingAttempt = {
  save(value: PendingAttempt) {
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      /* bỏ qua: trình duyệt chặn lưu trữ */
    }
  },
  take(): PendingAttempt | null {
    try {
      const raw = localStorage.getItem(KEY);
      localStorage.removeItem(KEY);
      const value = raw ? (JSON.parse(raw) as PendingAttempt) : null;
      return value && isUuid(value.examId) ? value : null; // bài lưu từ trước khi đổi id đề (id dạng số) thì bỏ
    } catch {
      return null;
    }
  },
};
