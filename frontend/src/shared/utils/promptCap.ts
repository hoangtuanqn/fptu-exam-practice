// Giới hạn tần suất lời mời: tối đa một lần mỗi phiên và `perWeek` lần mỗi 7 ngày, theo từng vị trí hiện.
// Lưu ở máy người dùng; nếu không ghi được thì coi như đã hết lượt (thà ít hơn là làm phiền).
const KEY = "prompt_cap_v1";
const WEEK_MS = 7 * 86_400_000;

const readLog = (): Record<string, number[]> => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as unknown;
    return v && typeof v === "object" ? (v as Record<string, number[]>) : {};
  } catch {
    return {};
  }
};

export const canShowPrompt = (surface: string, perWeek = 3): boolean => {
  try {
    if (sessionStorage.getItem(`${KEY}:${surface}`)) return false;
    const recent = (readLog()[surface] ?? []).filter((t) => Date.now() - t < WEEK_MS);
    return recent.length < perWeek;
  } catch {
    return false;
  }
};

export const markPromptShown = (surface: string) => {
  try {
    sessionStorage.setItem(`${KEY}:${surface}`, "1");
    const log = readLog();
    log[surface] = [...(log[surface] ?? []).filter((t) => Date.now() - t < WEEK_MS), Date.now()];
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* bỏ qua */
  }
};
