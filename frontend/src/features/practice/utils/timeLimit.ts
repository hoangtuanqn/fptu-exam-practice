// Giới hạn thời gian (phút) của chế độ Thi. Lưu ở trình duyệt theo từng đề để làm tiếp một lượt dở dang
// vẫn giữ đúng giới hạn đã chọn lúc bắt đầu (server chỉ lưu số giây đã làm).
const KEY = (examId: number) => `fepass.timeLimit.${examId}`;

export const TIME_LIMIT_OPTIONS = [90, 60, 0] as const; // thứ tự hiện: 90 (mặc định), 60, "Khác" (tự nhập), rồi 0 = không giới hạn
export const TIME_LIMIT_MIN = 1;
export const TIME_LIMIT_MAX = 300; // phút

export function readTimeLimit(examId: number | null): number | null {
  if (examId === null) return null;
  try {
    const n = Number(localStorage.getItem(KEY(examId)));
    return n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function saveTimeLimit(examId: number | null, minutes: number | null) {
  if (examId === null) return;
  try {
    if (minutes && minutes > 0) localStorage.setItem(KEY(examId), String(minutes));
    else localStorage.removeItem(KEY(examId));
  } catch {
    /* trình duyệt chặn lưu trữ: bỏ qua */
  }
}
