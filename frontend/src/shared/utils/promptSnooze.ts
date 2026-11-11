import { trackPrompt, type PromptSurface } from "./trackPrompt";

// "Để sau": người dùng đóng một lời mời thì ít nhất SNOOZE_DAYS ngày nữa mới hiện lại.
// Lưu ở máy người dùng; không đọc/ghi được thì coi như đang tạm ẩn (thà ít hơn là làm phiền).
const KEY = "prompt_snooze_v1";
const DAY_MS = 86_400_000;
export const SNOOZE_DAYS = 3;

const read = (): Record<string, number> => {
  const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as unknown;
  return v && typeof v === "object" ? (v as Record<string, number>) : {};
};

export const isSnoozed = (surface: string): boolean => {
  try {
    return Date.now() < (read()[surface] ?? 0);
  } catch {
    return true;
  }
};

export const snooze = (surface: string, days = SNOOZE_DAYS) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [surface]: Date.now() + days * DAY_MS }));
  } catch {
    /* bỏ qua */
  }
};

// Báo "đã hiện" tối đa một lần mỗi phiên cho mỗi vị trí, để số liệu không bị đếm lặp mỗi lần quay về trang
export const trackShownOncePerSession = (surface: PromptSurface) => {
  try {
    const k = `prompt_shown:${surface}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
  } catch {
    return;
  }
  trackPrompt(surface, "shown");
};
