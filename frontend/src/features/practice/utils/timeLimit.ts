// Giới hạn thời gian (phút) của chế độ Thi. Lưu ở trình duyệt theo từng đề để làm tiếp một lượt dở dang
// vẫn giữ đúng giới hạn đã chọn lúc bắt đầu (server chỉ lưu số giây đã làm).
const KEY = (examId: number) => `fepass.timeLimit.${examId}`;

export const TIME_LIMIT_OPTIONS = [0, 30, 45, 60, 90] as const; // 0 = không giới hạn

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
