// Giao diện theo mùa (hiện có: Giáng sinh). Mọi style mùa chỉ có hiệu lực dưới <html data-season="xmas">, nên tắt mùa là về đúng bản gốc.

// Hết mùa: từ 0h ngày 06/01/2027 (giờ máy người dùng) tự về giao diện thường dù cờ máy chủ còn bật
export const XMAS_END = new Date(2027, 0, 6);

/** Bật khi biến build ép (VITE_SEASON=xmas / off), hoặc cờ máy chủ bật và chưa tới ngày kết thúc */
export function isXmas(serverFlag: boolean, now: Date, force?: string): boolean {
  if (force === "xmas") return true;
  if (force === "off") return false;
  return serverFlag && now < XMAS_END;
}

const FLAG_KEY = "fepass.season.xmas"; // giá trị cờ máy chủ lần trước, dùng ngay lúc mở trang để không nháy
const DECOR_KEY = "fepass.xmasDecor"; // "off" = người dùng đã tắt trang trí (tuyết + đồ trang trí)

const get = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const set = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* trình duyệt chặn lưu trữ: chỉ áp dụng cho phiên hiện tại */
  }
};

export const readCachedFlag = () => get(FLAG_KEY) === "1";
export const writeCachedFlag = (on: boolean) => set(FLAG_KEY, on ? "1" : "0");
export const readDecor = () => get(DECOR_KEY) !== "off";
export const writeDecor = (on: boolean) => set(DECOR_KEY, on ? "on" : "off");
