// Email nhắc ôn: chạy mỗi ngày lúc 18:30 giờ Việt Nam
export const REMINDER_CRON = "30 18 * * *";
export const REMINDER_TIMEZONE = "Asia/Ho_Chi_Minh";
export const REMINDER_MAX_PER_RUN = 500; // trần số thư mỗi lần chạy
export const REMINDER_SEND_GAP_MS = 300; // nghỉ giữa hai thư để không dồn dập lên máy chủ thư
export const REMINDER_EXAM_WINDOW_DAYS = 60; // ngày thi còn xa hơn mức này thì thư không nhắc đếm ngược
