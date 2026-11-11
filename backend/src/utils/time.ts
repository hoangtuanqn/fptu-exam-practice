const VN_OFFSET_MS = 7 * 3600 * 1000; // UTC+7, không có giờ mùa hè
export const DAY_MS = 24 * 3600 * 1000;

// Ngày hôm nay theo giờ Việt Nam, biểu diễn bằng 0h UTC của đúng ngày đó (để so sánh và lưu vào cột DATE)
export const vnDate = (now = Date.now()) => new Date(Math.floor((now + VN_OFFSET_MS) / DAY_MS) * DAY_MS);

// 0h hôm nay theo giờ Việt Nam: mốc đặt lại giới hạn theo ngày
export const startOfVnDay = (now = Date.now()) => new Date(Math.floor((now + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS);

// "14:05 ngày 12/11" theo giờ Việt Nam (tính tay, không phụ thuộc múi giờ/ICU của máy chủ)
export const formatVnTime = (d: Date) => {
  const v = new Date(d.getTime() + VN_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(v.getUTCHours())}:${p(v.getUTCMinutes())} ngày ${p(v.getUTCDate())}/${p(v.getUTCMonth() + 1)}`;
};
