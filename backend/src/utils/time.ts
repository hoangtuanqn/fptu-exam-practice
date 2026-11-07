const VN_OFFSET_MS = 7 * 3600 * 1000; // UTC+7, không có giờ mùa hè
export const DAY_MS = 24 * 3600 * 1000;

// Ngày hôm nay theo giờ Việt Nam, biểu diễn bằng 0h UTC của đúng ngày đó (để so sánh và lưu vào cột DATE)
export const vnDate = (now = Date.now()) => new Date(Math.floor((now + VN_OFFSET_MS) / DAY_MS) * DAY_MS);

// 0h hôm nay theo giờ Việt Nam: mốc đặt lại giới hạn theo ngày
export const startOfVnDay = (now = Date.now()) => new Date(Math.floor((now + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS);
